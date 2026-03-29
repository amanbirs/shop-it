"use client"

import { useState } from "react"
import { Trophy, ChevronDown } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Check } from "lucide-react"
import type { SpecComparisonRow, Product } from "@/lib/types/database"

type SpecComparisonCardsProps = {
  specs: SpecComparisonRow[]
  products: Product[]
}

export function SpecComparisonCards({ specs, products }: SpecComparisonCardsProps) {
  return (
    <div className="space-y-3">
      {specs.map((spec) => (
        <SpecCard key={spec.key} spec={spec} products={products} />
      ))}
    </div>
  )
}

function SpecCard({
  spec,
  products,
}: {
  spec: SpecComparisonRow
  products: Product[]
}) {
  const [open, setOpen] = useState(false)

  const bestProducts = products.filter((p) =>
    spec.best_product_ids.includes(p.id)
  )

  const bestValues = bestProducts.map((p) => {
    const specKey = spec.product_spec_keys[p.id]
    const value = specKey ? p.specs[specKey] : null
    return { name: p.title ?? "Unknown", value }
  })

  return (
    <Card className="p-4">
      <h4 className="font-medium">{spec.label}</h4>
      <p className="mt-1 text-sm text-muted-foreground">{spec.explanation}</p>

      {bestValues.length > 0 && (
        <div className="mt-3 flex items-start gap-2 text-sm">
          <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          <div>
            <span className="font-medium">
              Best:{" "}
              {bestValues
                .map((b) => `${b.name}${b.value ? ` (${b.value})` : ""}`)
                .join(", ")}
            </span>
            {spec.best_reason && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {spec.best_reason}
              </p>
            )}
          </div>
        </div>
      )}

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
          {open ? "Hide all values" : "Show all values"}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-1.5">
            {products.map((product) => {
              const specKey = spec.product_spec_keys[product.id]
              const value = specKey ? product.specs[specKey] : null
              const isBest = spec.best_product_ids.includes(product.id)

              return (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-sm"
                >
                  <span className="line-clamp-1 text-muted-foreground">
                    {product.title ?? "Unknown"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 shrink-0 ml-2">
                    {value ?? "—"}
                    {isBest && (
                      <Check className="h-3 w-3 text-emerald-500" />
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
