import Link from "next/link"
import { ArrowLeft, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ListHeaderMeta } from "@/components/lists/list-header-meta"
import type { List } from "@/lib/types/database"

type Member = {
  id: string
  user_id: string
  role: string
  joined_at: string | null
  created_at: string
  profile: { name: string | null; email: string; avatar_url: string | null } | null
}

type ListHeaderProps = {
  list: Pick<
    List,
    | "id"
    | "name"
    | "category"
    | "category_emoji"
    | "budget_min"
    | "budget_max"
    | "purchase_by"
    | "priorities"
  >
  memberCount: number
  members: Member[]
  currentUserId: string
  userRole: string
}

export function ListHeader({ list, memberCount, members, currentUserId, userRole }: ListHeaderProps) {
  return (
    <div className="space-y-2">
      {/* Top row: back + title + settings */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            href="/"
            className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-semibold leading-snug truncate">
            {list.category_emoji !== "📋" && (
              <span className="mr-1">{list.category_emoji}</span>
            )}
            {list.name}
          </h1>
        </div>

        {userRole === "owner" && (
          <Link href={`/lists/${list.id}/settings`}>
            <Button variant="ghost" size="icon" aria-label="List settings">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {/* Interactive metadata row */}
      <ListHeaderMeta
        listId={list.id}
        budgetMin={list.budget_min}
        budgetMax={list.budget_max}
        purchaseBy={list.purchase_by}
        priorities={(list.priorities as string[]) ?? []}
        memberCount={memberCount}
        members={members}
        currentUserId={currentUserId}
        isOwner={userRole === "owner"}
        listName={list.name}
      />
    </div>
  )
}
