import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ListHeader } from "@/components/lists/list-header"
import { ListDetailContent } from "@/components/lists/list-detail-content"
import type { Product } from "@/lib/types/database"

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ listId: string }>
}) {
  const { listId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  // Fetch list
  const { data: list } = await supabase
    .from("lists")
    .select(
      "id, name, category, category_emoji, description, budget_min, budget_max, purchase_by, priorities, ai_comment, ai_title_edited"
    )
    .eq("id", listId)
    .single()

  if (!list) notFound()

  // Fetch user's role in this list
  const { data: membership } = await supabase
    .from("list_members")
    .select("role")
    .eq("list_id", listId)
    .eq("user_id", user.id)
    .single()

  if (!membership) notFound()

  // Fetch member count
  const { count: memberCount } = await supabase
    .from("list_members")
    .select("id", { count: "exact", head: true })
    .eq("list_id", listId)

  // Fetch products (non-archived)
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("list_id", listId)
    .is("archived_at", null)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false })

  return (
    <div className="p-6 space-y-6">
      <ListHeader
        list={list}
        memberCount={memberCount ?? 1}
        userRole={membership.role}
      />
      <ListDetailContent
        listId={listId}
        products={(products as Product[]) ?? []}
        userRole={membership.role}
      />
    </div>
  )
}
