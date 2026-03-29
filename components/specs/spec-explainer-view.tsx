"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Sparkles, BarChart3, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SpecComparisonTable } from "@/components/specs/spec-comparison-table"
import { SpecComparisonCards } from "@/components/specs/spec-comparison-cards"
import { DimensionTable } from "@/components/specs/dimension-table"
import { DimensionCards } from "@/components/specs/dimension-cards"
import { SpecStalenessAlert } from "@/components/specs/spec-staleness-alert"
import { SpecEmptyState } from "@/components/specs/spec-empty-state"
import { SpecLegend } from "@/components/specs/spec-legend"
import type { ListSpecAnalysis, Product } from "@/lib/types/database"

type SpecExplainerViewProps = {
  specAnalysis: ListSpecAnalysis | null
  products: Product[]
  listId: string
  category: string | null
  isStale: boolean
  staleDelta: number
}

export function SpecExplainerView({
  specAnalysis,
  products,
  listId,
  category,
  isStale,
  staleDelta,
}: SpecExplainerViewProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [simplified, setSimplified] = useState(false)

  const completedProducts = products.filter(
    (p) => p.extraction_status === "completed" && !p.archived_at
  )

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      const res = await fetch(`/api/lists/${listId}/spec-analysis`, {
        method: "POST",
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Spec analysis generated")
        router.refresh()
      } else {
        toast.error(data.error?.message ?? "Failed to generate spec analysis")
      }
    } catch {
      toast.error("Failed to generate spec analysis")
    } finally {
      setIsGenerating(false)
    }
  }

  // Not enough products
  if (completedProducts.length < 2) {
    return (
      <SpecEmptyState
        variant="not-enough"
        productCount={completedProducts.length}
        category={category}
      />
    )
  }

  // No analysis yet
  if (!specAnalysis) {
    return (
      <SpecEmptyState
        variant="generate"
        productCount={completedProducts.length}
        category={category}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
      />
    )
  }

  // Has analysis — render tables
  return (
    <div className="space-y-6 pb-6">
      {/* Staleness alert */}
      {isStale && (
        <SpecStalenessAlert
          changedCount={staleDelta}
          onRegenerate={handleGenerate}
          isRegenerating={isGenerating}
        />
      )}

      {/* Spec Comparison section */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-4 w-4 text-ai-accent" />
            Spec Comparison
          </h3>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSimplified(!simplified)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {simplified ? (
                <><Eye className="h-3.5 w-3.5 mr-1.5" />Show specs</>
              ) : (
                <><EyeOff className="h-3.5 w-3.5 mr-1.5" />Hide specs</>
              )}
            </Button>
            {!isStale && (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {isGenerating ? "Analyzing..." : "Regenerate"}
              </button>
            )}
          </div>
        </div>
        {/* Desktop: table */}
        <div className="hidden sm:block">
          <SpecComparisonTable
            specs={specAnalysis.spec_comparison}
            products={completedProducts}
            simplified={simplified}
          />
        </div>
        {/* Mobile: cards */}
        <div className="sm:hidden">
          <SpecComparisonCards
            specs={specAnalysis.spec_comparison}
            products={completedProducts}
          />
        </div>
      </section>

      {/* Quality Dimensions section */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <BarChart3 className="h-4 w-4 text-ai-accent" />
          Quality Dimensions
        </h3>
        {/* Desktop: table */}
        <div className="hidden sm:block">
          <DimensionTable
            dimensions={specAnalysis.dimensions}
            products={completedProducts}
          />
        </div>
        {/* Mobile: cards */}
        <div className="sm:hidden">
          <DimensionCards
            dimensions={specAnalysis.dimensions}
            products={completedProducts}
          />
        </div>
      </section>

      {/* Legend */}
      <SpecLegend
        generatedAt={specAnalysis.generated_at}
        modelVersion={specAnalysis.model_version}
      />
    </div>
  )
}
