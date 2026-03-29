"use client"

import { Globe } from "lucide-react"
import { Card } from "@/components/ui/card"
import { DotRating } from "@/components/specs/dot-rating"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import type { Dimension, Product } from "@/lib/types/database"

type DimensionCardsProps = {
  dimensions: Dimension[]
  products: Product[]
}

export function DimensionCards({ dimensions, products }: DimensionCardsProps) {
  return (
    <div className="space-y-3">
      {dimensions.map((dim) => (
        <Card key={dim.name} className="p-4">
          <h4 className="font-medium">{dim.name}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">{dim.description}</p>

          <div className="mt-3 space-y-2">
            {products.map((product) => {
              const rating = dim.ratings.find(
                (r) => r.product_id === product.id
              )
              if (!rating) return null

              return (
                <div
                  key={product.id}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {product.title ?? "Unknown"}
                  </span>
                  <DotRating score={rating.score} className="shrink-0" />
                  <span className="shrink-0 text-xs font-medium w-6 text-right">
                    {rating.score}
                  </span>
                  {rating.uses_external_knowledge && (
                    <Tooltip>
                      <TooltipTrigger className="shrink-0">
                        <Globe
                          className="h-3 w-3 text-blue-500 dark:text-blue-400"
                          aria-label="Rating uses external knowledge"
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        Uses brand reputation and market data beyond the product page.
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      ))}
    </div>
  )
}
