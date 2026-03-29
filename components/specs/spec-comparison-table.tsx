"use client"

import { Check, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SpecComparisonRow, Product } from "@/lib/types/database"

type SpecComparisonTableProps = {
  specs: SpecComparisonRow[]
  products: Product[]
  simplified?: boolean
}

export function SpecComparisonTable({
  specs,
  products,
  simplified = false,
}: SpecComparisonTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm" aria-label="Spec comparison">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left font-medium text-muted-foreground"
            >
              Spec
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-muted-foreground"
            >
              Why it matters
            </th>
            {!simplified &&
              products.map((p) => (
                <th
                  key={p.id}
                  scope="col"
                  className="px-4 py-3 text-left font-medium"
                >
                  <span className="line-clamp-1">{p.title ?? "Unknown"}</span>
                  {p.brand && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {p.brand}
                    </span>
                  )}
                </th>
              ))}
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-muted-foreground"
            >
              Best
            </th>
          </tr>
        </thead>
        <tbody>
          {specs.map((spec, idx) => {
            const bestNames = products
              .filter((p) => spec.best_product_ids.includes(p.id))
              .map((p) => p.title ?? "Unknown")

            return (
              <tr
                key={spec.key}
                className={cn(
                  "border-b border-border",
                  idx === specs.length - 1 && "border-b-0"
                )}
              >
                {/* Spec label */}
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-medium whitespace-nowrap"
                >
                  {spec.label}
                </th>

                {/* Explanation — always visible */}
                <td className="px-4 py-3 text-muted-foreground max-w-xs">
                  {spec.explanation}
                </td>

                {/* Product spec values — hidden in simplified mode */}
                {!simplified &&
                  products.map((product) => {
                    const specKey = spec.product_spec_keys[product.id]
                    const value = specKey ? product.specs[specKey] : null
                    const isBest = spec.best_product_ids.includes(product.id)

                    return (
                      <td key={product.id} className="px-4 py-3">
                        {value ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span>{value}</span>
                            {isBest && (
                              <span
                                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30"
                                aria-label={`Best value for ${spec.label}`}
                              >
                                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )
                  })}

                {/* Best pick + reason */}
                <td className="px-4 py-3 min-w-[200px]">
                  <div className="flex items-start gap-1.5">
                    <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <div>
                      <span className="font-medium text-sm">
                        {bestNames.join(", ")}
                      </span>
                      {spec.best_reason && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {spec.best_reason}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
