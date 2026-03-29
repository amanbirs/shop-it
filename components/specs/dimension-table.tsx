"use client"

import { Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { DotRating } from "@/components/specs/dot-rating"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import type { Dimension, Product } from "@/lib/types/database"

type DimensionTableProps = {
  dimensions: Dimension[]
  products: Product[]
}

export function DimensionTable({ dimensions, products }: DimensionTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm" aria-label="Quality dimension ratings">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left font-medium text-muted-foreground"
            >
              Dimension
            </th>
            {products.map((p) => (
              <th
                key={p.id}
                scope="col"
                className="px-4 py-3 text-left font-medium"
              >
                <span className="line-clamp-1">{p.title ?? "Unknown"}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dimensions.map((dim, idx) => (
            <tr
              key={dim.name}
              className={cn(
                "border-b border-border",
                idx === dimensions.length - 1 && "border-b-0"
              )}
            >
              <th
                scope="row"
                className="sticky left-0 z-10 bg-card px-4 py-3 text-left"
              >
                <span className="font-medium">{dim.name}</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {dim.description}
                </span>
              </th>
              {products.map((product) => {
                const rating = dim.ratings.find(
                  (r) => r.product_id === product.id
                )
                if (!rating) {
                  return (
                    <td key={product.id} className="px-4 py-3 text-muted-foreground">
                      —
                    </td>
                  )
                }

                return (
                  <td key={product.id} className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <DotRating score={rating.score} />
                        <span className="text-xs font-medium">
                          {rating.score}/5
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {rating.reasoning}
                        {rating.uses_external_knowledge && (
                          <Tooltip>
                            <TooltipTrigger className="ml-1 inline-flex">
                              <Globe
                                className="h-3 w-3 text-blue-500 dark:text-blue-400"
                                aria-label="Rating uses external knowledge"
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              This rating factors in brand reputation and market
                              data beyond the product page.
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </p>
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
