import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppShell } from "@/components/layout/app-shell"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, avatar_url")
    .eq("id", user.id)
    .single()

  // Fetch lists the user is a member of
  const { data: memberships } = await supabase
    .from("list_members")
    .select("role, lists(id, name, category, category_emoji)")
    .eq("user_id", user.id)

  const ownedLists: Array<{
    id: string
    name: string
    category: string | null
    category_emoji?: string
    role: string
  }> = []
  const sharedLists: Array<{
    id: string
    name: string
    category: string | null
    category_emoji?: string
    role: string
  }> = []

  if (memberships) {
    for (const m of memberships) {
      const list = m.lists as unknown as {
        id: string
        name: string
        category: string | null
        category_emoji?: string
      } | null
      if (!list) continue
      const item = { ...list, role: m.role }
      if (m.role === "owner") {
        ownedLists.push(item)
      } else {
        sharedLists.push(item)
      }
    }
  }

  const userInfo = {
    name: profile?.name ?? null,
    email: profile?.email ?? user.email ?? "",
    avatar_url: profile?.avatar_url ?? null,
  }

  return (
    <AppShell
      user={userInfo}
      ownedLists={ownedLists}
      sharedLists={sharedLists}
    >
      {children}
    </AppShell>
  )
}
