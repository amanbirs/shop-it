import Link from "next/link"
import { ArrowLeft, Settings, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/utils"
import type { List } from "@/lib/types/database"

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
    | "ai_comment"
    | "ai_title_edited"
    | "priorities"
  >
  memberCount: number
  userRole: string
}

export function ListHeader({ list, memberCount, userRole }: ListHeaderProps) {
  return (
    <div className="space-y-3">
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
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold leading-snug truncate">
              {list.category_emoji !== "📋" && (
                <span className="mr-1">{list.category_emoji}</span>
              )}
              {list.name}
            </h1>
            {list.ai_comment && (
              <p className="mt-1 text-sm text-muted-foreground">
                {list.ai_comment}
              </p>
            )}
          </div>
        </div>

        {userRole === "owner" && (
          <Link href={`/lists/${list.id}/settings`}>
            <Button variant="ghost" size="icon" aria-label="List settings">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {/* Meta row: budget, deadline, members, priorities */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {list.budget_min != null && (
          <span>
            Budget: {formatPrice(list.budget_min)}
            {list.budget_max != null && ` – ${formatPrice(list.budget_max)}`}
          </span>
        )}
        {list.purchase_by && (
          <span>
            By: {new Date(list.purchase_by).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {memberCount}
        </span>
      </div>

      {/* Priority chips */}
      {list.priorities && list.priorities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {list.priorities.map((p) => (
            <Badge key={p} variant="secondary" className="text-xs">
              {p}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
