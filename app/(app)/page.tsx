import { createClient } from "@/lib/supabase/server"
import { DashboardContent } from "@/components/lists/dashboard-content"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch lists the user is a member of, with product counts
  const { data: memberships, error: membershipError } = await supabase
    .from("list_members")
    .select(`
      role,
      lists!inner (
        id, name, category, category_emoji, ai_comment, ai_title_edited, status
      )
    `)
    .eq("user_id", user.id)

  if (membershipError) {
    console.error("[DashboardPage] Failed to fetch memberships:", membershipError)
  }

  type ListRow = {
    id: string
    name: string
    category: string | null
    category_emoji: string
    ai_comment: string | null
    ai_title_edited: boolean
    status: string
  }

  const lists: Array<{
    id: string
    name: string
    category: string | null
    category_emoji: string
    ai_comment: string | null
    ai_title_edited: boolean
    productCount: number
    shortlistedCount: number
    purchasedCount: number
    memberCount: number
  }> = []

  if (memberships) {
    for (const m of memberships) {
      const list = m.lists as unknown as ListRow | null
      if (!list || list.status === "archived") continue

      // Fetch product stats for this list
      const { data: products } = await supabase
        .from("products")
        .select("id, is_shortlisted, is_purchased")
        .eq("list_id", list.id)
        .is("archived_at", null)

      // Fetch member count
      const { count: memberCount } = await supabase
        .from("list_members")
        .select("id", { count: "exact", head: true })
        .eq("list_id", list.id)

      lists.push({
        ...list,
        productCount: products?.length ?? 0,
        shortlistedCount: products?.filter((p) => p.is_shortlisted).length ?? 0,
        purchasedCount: products?.filter((p) => p.is_purchased).length ?? 0,
        memberCount: memberCount ?? 1,
      })
    }
  }

  return <DashboardContent lists={lists} />
}
