import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { ListSettingsForm } from "@/components/lists/list-settings-form"
import { ContextAnswersManager } from "@/components/ai/context-answers-manager"
import type { ContextQuestion } from "@/lib/types/database"

export default async function ListSettingsPage({
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

  const [listResult, membershipResult, membersResult, questionsResult] = await Promise.all([
    supabase
      .from("lists")
      .select(
        "id, name, description, category, budget_min, budget_max, purchase_by, priorities"
      )
      .eq("id", listId)
      .single(),
    supabase
      .from("list_members")
      .select("role")
      .eq("list_id", listId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("list_members")
      .select(
        "id, user_id, role, joined_at, created_at, profiles(name, email, avatar_url)"
      )
      .eq("list_id", listId)
      .order("created_at", { ascending: true }),
    supabase
      .from("context_questions")
      .select("*")
      .eq("list_id", listId)
      .order("created_at", { ascending: true }),
  ])

  const list = listResult.data
  const membership = membershipResult.data

  if (!list || !membership) notFound()

  const members = (membersResult.data ?? []).map((m) => ({
    ...m,
    profile:
      (m.profiles as unknown as {
        name: string | null
        email: string
        avatar_url: string | null
      }) ?? null,
  }))

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="flex items-center gap-3">
        <Link
          href={`/lists/${listId}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to list"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      <ListSettingsForm
        list={{
          ...list,
          priorities: (list.priorities as string[]) ?? [],
        }}
        members={members}
        currentUserId={user.id}
        isOwner={membership.role === "owner"}
      />

      <ContextAnswersManager
        questions={(questionsResult.data as ContextQuestion[]) ?? []}
      />
    </div>
  )
}
