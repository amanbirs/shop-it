"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import type { ListAiOpinion } from "@/lib/types/database"

type ExpertOpinionCtaProps = {
  listId: string
  productCount: number
  opinion: ListAiOpinion | null
}

export function ExpertOpinionCta({
  listId,
  productCount,
  opinion,
}: ExpertOpinionCtaProps) {
  const [loading, setLoading] = useState(false)

  const isStale = opinion && opinion.product_count !== productCount
  const canGenerate = productCount >= 2

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/lists/${listId}/expert-opinion`, {
        method: "POST",
      })
      const data = await res.json()

      if (!data.success) {
        toast.error(data.error?.message ?? "Failed to generate recommendation")
      } else {
        toast.success("Recommendation updated")
        window.location.reload()
      }
    } catch {
      toast.error("Failed to generate recommendation")
    } finally {
      setLoading(false)
    }
  }

  // No opinion yet
  if (!opinion) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-sm text-muted-foreground">
          {canGenerate
            ? "Compare your products and get a recommendation"
            : "Add at least 2 products to compare"}
        </p>
        {canGenerate && (
          <p className="text-xs text-muted-foreground">
            Based on your priorities and budget.
          </p>
        )}
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate || loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {loading ? "Analyzing..." : "Get recommendation"}
        </Button>
      </div>
    )
  }

  // Stale opinion
  if (isStale) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Products have changed since this was generated.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Regenerate"
          )}
        </Button>
      </div>
    )
  }

  return null
}
