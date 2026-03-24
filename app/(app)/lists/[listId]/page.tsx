import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ListHeader } from "@/components/lists/list-header"
import { ListDetailContent } from "@/components/lists/list-detail-content"
import { ContextQuestionPopup } from "@/components/ai/context-question-popup"
import type { Product, ListAiOpinion, ContextQuestion } from "@/lib/types/database"

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

  // Parallel fetches for performance
  const [listResult, membershipResult, memberCountResult, productsResult, opinionResult, questionsResult] =
    await Promise.all([
      supabase
        .from("lists")
        .select(
          "id, name, category, category_emoji, description, budget_min, budget_max, purchase_by, priorities, ai_comment, ai_title_edited"
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
        .select("id, user_id, role, joined_at, created_at, profiles(name, email, avatar_url)")
        .eq("list_id", listId)
        .order("created_at", { ascending: true }),
      supabase
        .from("products")
        .select("*")
        .eq("list_id", listId)
        .is("archived_at", null)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("list_ai_opinions")
        .select("*")
        .eq("list_id", listId)
        .single(),
      supabase
        .from("context_questions")
        .select("*")
        .eq("list_id", listId)
        .order("created_at", { ascending: true }),
    ])

  const list = listResult.data
  const membership = membershipResult.data

  if (!list || !membership) notFound()

  // Build product name lookup for expert opinion
  const products = (productsResult.data as Product[]) ?? []
  const productNames: Record<string, string> = {}
  for (const p of products) {
    if (p.title) productNames[p.id] = p.title
  }

  // Build members list for header
  const members = (memberCountResult.data ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    user_id: m.user_id as string,
    role: m.role as string,
    joined_at: m.joined_at as string | null,
    created_at: m.created_at as string,
    profile: (m.profiles as { name: string | null; email: string; avatar_url: string | null }) ?? null,
  }))

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 shrink-0">
        <ListHeader
          list={list}
          memberCount={members.length}
          members={members}
          currentUserId={user.id}
          userRole={membership.role}
        />
      </div>
      <div className="flex-1 min-h-0 px-6">
        <ListDetailContent
          listId={listId}
          products={products}
          userRole={membership.role}
          currentUserId={user.id}
          opinion={(opinionResult.data as ListAiOpinion) ?? null}
          productNames={productNames}
        />
      </div>

      {/* Context question popup */}
      <ContextQuestionPopup
        questions={(questionsResult.data as ContextQuestion[]) ?? []}
      />
    </div>
  )
}
