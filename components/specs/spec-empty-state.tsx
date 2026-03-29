"use client"

import { Columns3, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

type SpecEmptyStateProps = {
  variant: "generate" | "not-enough"
  productCount: number
  category: string | null
  onGenerate?: () => void
  isGenerating?: boolean
}

export function SpecEmptyState({
  variant,
  productCount,
  category,
  onGenerate,
  isGenerating = false,
}: SpecEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-3">
        <Columns3 className="h-6 w-6 text-muted-foreground" />
      </div>

      {variant === "not-enough" ? (
        <>
          <h3 className="text-lg font-semibold">Spec Explainer</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Add at least 2 products to compare specs and see quality ratings.
          </p>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold">Spec Explainer</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Compare specs and see AI-generated quality ratings across your products.
          </p>
          <Button
            className="mt-4"
            onClick={onGenerate}
            disabled={isGenerating}
          >
            <Sparkles className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
            {isGenerating ? "Analyzing..." : "Generate Spec Analysis"}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Analyzes {productCount} products across key specs and rates them on quality
            dimensions{category ? ` tailored to ${category}` : ""}.
          </p>
        </>
      )}
    </div>
  )
}
