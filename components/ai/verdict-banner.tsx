"use client"

import { useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { ExpertOpinionCard } from "@/components/ai/expert-opinion-card"
import { Button } from "@/components/ui/button"
import type { ListAiOpinion, Product } from "@/lib/types/database"

type VerdictBannerProps = {
  listId: string
  opinion: ListAiOpinion | null
  products: Product[]
  productNames: Record<string, string>
  completedProductCount: number
  onOpenChat?: () => void
}

export function VerdictBanner({
  listId,
  opinion,
  products,
  productNames,
  completedProductCount,
  onOpenChat,
}: VerdictBannerProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  const isStale = opinion && opinion.product_count !== completedProductCount
  const canGenerate = completedProductCount >= 2

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/lists/${listId}/expert-opinion`, {
        method: "POST",
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error?.message ?? "Failed to generate")
      } else {
        toast.success("Analysis updated")
        window.location.reload()
      }
    } catch {
      toast.error("Failed to generate")
    } finally {
      setLoading(false)
    }
  }

  // No opinion and can't generate
  if (!opinion && !canGenerate) return null

  // No opinion but can generate — subtle CTA
  if (!opinion) {
    return (
      <div className="rounded-lg bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {completedProductCount} products ready to compare
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : null}
            {loading ? "Analyzing..." : "Get recommendation"}
          </Button>
        </div>
      </div>
    )
  }

  // Has opinion
  const topPickName = opinion.top_pick
    ? productNames[opinion.top_pick] ?? null
    : null
  const valuePickName = opinion.value_pick
    ? productNames[opinion.value_pick] ?? null
    : null

  // Build the picks summary line
  let picksLine = ""
  if (topPickName && valuePickName && opinion.top_pick !== opinion.value_pick) {
    picksLine = `${topPickName} is the top pick. ${valuePickName} for value.`
  } else if (topPickName) {
    picksLine = `${topPickName} is the top pick.`
  }

  // Get first sentence of verdict for the summary line
  const verdictSummary = opinion.verdict
    ? opinion.verdict.split(/[.!?]/)[0] + "."
    : null

  return (
    <div className="rounded-lg bg-muted/30 px-4 py-3 space-y-1.5">
      {/* Section label */}
      <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
        Expert Opinion
      </p>

      {/* Picks line */}
      {picksLine && (
        <p className="text-base font-semibold text-foreground">
          {picksLine}
        </p>
      )}

      {/* Verdict summary */}
      {verdictSummary && !expanded && (
        <p className="text-sm text-muted-foreground line-clamp-1">
          {verdictSummary}
        </p>
      )}

      {/* Action links + stale indicator */}
      <div className="flex items-center gap-3 text-xs text-foreground/60">
        <button
          onClick={() => setExpanded(!expanded)}
          className="hover:text-foreground underline-offset-4 hover:underline transition-colors"
        >
          {expanded ? "Hide analysis" : "Full analysis"}
        </button>
        <span>·</span>
        {onOpenChat && (
          <>
            <button
              onClick={onOpenChat}
              className="hover:text-foreground underline-offset-4 hover:underline transition-colors"
            >
              Ask a question
            </button>
            <span>·</span>
          </>
        )}
        {isStale && (
          <span className="flex items-center gap-1">
            <span className="text-muted-foreground/60">(outdated)</span>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="hover:text-foreground transition-colors"
              aria-label="Refresh analysis"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </button>
          </span>
        )}
      </div>

      {/* Expanded full analysis */}
      {expanded && (
        <div className="pt-3 border-t border-border">
          <ExpertOpinionCard
            opinion={opinion}
            productNames={productNames}
            products={products}
          />
        </div>
      )}
    </div>
  )
}
