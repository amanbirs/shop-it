"use client"

import { useState } from "react"
import { Sparkles, Loader2, RefreshCw } from "lucide-react"
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
        toast.error(data.error?.message ?? "Failed to generate opinion")
      } else {
        toast.success("Expert opinion generated")
        // Page will revalidate via the API route
        window.location.reload()
      }
    } catch {
      toast.error("Failed to generate opinion")
    } finally {
      setLoading(false)
    }
  }

  // No opinion yet — show generate button
  if (!opinion) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-ai-accent/30 bg-ai-accent/5 p-6">
        <Sparkles className="h-6 w-6 text-ai-accent" />
        <p className="text-sm text-muted-foreground text-center">
          {canGenerate
            ? "Get an AI expert opinion comparing your products"
            : "Add at least 2 products to get an expert opinion"}
        </p>
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate || loading}
          className="bg-ai-accent hover:bg-ai-accent/90 text-white"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {loading ? "Generating..." : "Get Expert Opinion"}
        </Button>
      </div>
    )
  }

  // Opinion exists but stale
  if (isStale) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-extraction-pending/30 bg-extraction-pending/5 px-4 py-3">
        <RefreshCw className="h-4 w-4 text-extraction-pending shrink-0" />
        <p className="text-sm text-muted-foreground flex-1">
          Expert opinion may be outdated — products have changed since it was
          generated.
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

  // Opinion exists and fresh — don't show CTA
  return null
}
