import Image from "next/image"
import { ChevronDown, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { relativeTime } from "@/lib/utils"
import { formatPriceRange } from "@/lib/utils"
import type { ListAiOpinion, Product } from "@/lib/types/database"

type ExpertOpinionCardProps = {
  opinion: ListAiOpinion
  productNames: Record<string, string>
  products: Product[]
}

export function ExpertOpinionCard({
  opinion,
  productNames,
  products,
}: ExpertOpinionCardProps) {
  const topPickProduct = products.find((p) => p.id === opinion.top_pick)
  const valuePickProduct = products.find((p) => p.id === opinion.value_pick)

  return (
    <div className="space-y-4">
      {/* Attribution */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Based on your priorities</span>
        <span>{relativeTime(opinion.generated_at)}</span>
      </div>

      {/* Verdict — the hero element */}
      {opinion.verdict && (
        <div className="rounded-lg bg-muted/50 px-5 py-4">
          <p className="text-base leading-relaxed font-medium">
            &ldquo;{opinion.verdict}&rdquo;
          </p>
        </div>
      )}

      {/* Pick cards — side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {topPickProduct && (
          <PickCard
            label="Best overall"
            product={topPickProduct}
            reason={opinion.top_pick_reason}
          />
        )}
        {valuePickProduct && valuePickProduct.id !== topPickProduct?.id && (
          <PickCard
            label="Best value"
            product={valuePickProduct}
            reason={opinion.value_pick_reason}
          />
        )}
      </div>

      {/* Expandable details */}
      {opinion.comparison && (
        <ExpandableSection title="How they compare">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {opinion.comparison}
          </p>
        </ExpandableSection>
      )}

      {opinion.concerns && (
        <ExpandableSection title="Things to watch out for">
          <div className="flex gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {opinion.concerns}
            </p>
          </div>
        </ExpandableSection>
      )}
    </div>
  )
}

function PickCard({
  label,
  product,
  reason,
}: {
  label: string
  product: Product
  reason: string | null
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>

        <div className="flex gap-3">
          {product.image_url && (
            <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted shrink-0">
              <Image
                src={product.image_url.replace(/^http:\/\//, "https://")}
                alt={product.title ?? ""}
                fill
                className="object-contain"
                sizes="48px"
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug truncate">
              {product.title ?? "Unknown"}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatPriceRange(product.price_min, product.price_max, product.currency)}
            </p>
          </div>
        </div>

        {reason && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {reason}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ExpandableSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors">
        {title}
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pt-3 pb-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
