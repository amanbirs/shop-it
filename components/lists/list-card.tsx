import Link from "next/link"
import { Package, Star, CheckCircle2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, getCategoryEmoji } from "@/lib/utils"

type ListCardProps = {
  list: {
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
  }
}

function getStatusBadge(shortlisted: number, purchased: number) {
  if (purchased > 0)
    return { label: "Purchased", className: "bg-purchased/20 text-purchased border-purchased/30" }
  if (shortlisted > 0)
    return { label: "Deciding", className: "bg-shortlisted/20 text-shortlisted border-shortlisted/30" }
  return { label: "Researching", className: "" }
}

export function ListCard({ list }: ListCardProps) {
  // Use AI-generated emoji if available, fall back to deterministic mapping
  const emoji = list.category_emoji !== "📋"
    ? list.category_emoji
    : getCategoryEmoji(list.category)
  const status = getStatusBadge(list.shortlistedCount, list.purchasedCount)

  return (
    <Link href={`/lists/${list.id}`} className="block group">
      <Card className="h-full transition-all duration-150 hover:shadow-lg group-hover:-translate-y-0.5 cursor-pointer">
        <CardContent className="p-4 space-y-2.5">
          {/* Emoji + Title */}
          <div className="space-y-0.5">
            <span className="text-xl leading-none">{emoji}</span>
            <h3 className="font-semibold text-base leading-snug line-clamp-2">
              {list.name}
            </h3>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Package className="h-3.5 w-3.5" />
              {list.productCount}
            </span>
            {list.shortlistedCount > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5" />
                {list.shortlistedCount}
              </span>
            )}
            {list.purchasedCount > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {list.purchasedCount}
              </span>
            )}
          </div>

          {/* Comment */}
          {list.ai_comment && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {list.ai_comment}
            </p>
          )}

          {/* Bottom row: status + member count */}
          <div className="flex items-center justify-between">
            <Badge
              variant="secondary"
              className={cn("text-xs", status.className)}
            >
              {status.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {list.memberCount} {list.memberCount === 1 ? "member" : "members"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
