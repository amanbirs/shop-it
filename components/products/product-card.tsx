"use client"

import Image from "next/image"
import { Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PriceDisplay } from "@/components/common/price-display"
import { DomainBadge } from "@/components/common/domain-badge"
import { ExtractionProgress } from "@/components/products/extraction-progress"
import { ProductCardSkeleton } from "@/components/products/product-card-skeleton"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/types/database"

type ProductCardProps = {
  product: Product
  onClick?: () => void
  onRetryExtraction?: () => void
}

export function ProductCard({
  product,
  onClick,
  onRetryExtraction,
}: ProductCardProps) {
  // Show skeleton for pending/processing products
  if (product.extraction_status === "pending" || product.extraction_status === "processing") {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="h-40 w-full rounded-md bg-muted animate-pulse" />
          <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-4 w-1/4 rounded bg-muted animate-pulse" />
          <ExtractionProgress
            status={product.extraction_status}
          />
        </CardContent>
      </Card>
    )
  }

  // Failed extraction
  if (product.extraction_status === "failed") {
    return (
      <Card className="overflow-hidden border-destructive/30">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium truncate">{product.url}</p>
          <DomainBadge domain={product.domain} />
          <ExtractionProgress
            status="failed"
            error={product.extraction_error}
            onRetry={onRetryExtraction}
          />
        </CardContent>
      </Card>
    )
  }

  // Completed — full card
  return (
    <Card
      className={cn(
        "overflow-hidden cursor-pointer transition-all duration-150 hover:shadow-lg hover:-translate-y-0.5",
        product.is_shortlisted && "ring-1 ring-shortlisted/50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Product image */}
        {product.image_url ? (
          <div className="relative h-40 w-full rounded-md overflow-hidden bg-muted">
            <Image
              src={product.image_url}
              alt={product.title ?? "Product image"}
              fill
              className="object-contain dark:brightness-90"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div className="h-40 w-full rounded-md bg-muted flex items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}

        {/* Title */}
        <h3 className="font-medium text-sm leading-tight line-clamp-2">
          {product.title ?? "Untitled product"}
        </h3>

        {/* Price */}
        <PriceDisplay
          min={product.price_min}
          max={product.price_max}
          currency={product.currency}
          note={product.price_note}
          className="text-sm"
        />

        {/* Rating + domain */}
        <div className="flex items-center justify-between">
          {product.rating != null && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-shortlisted text-shortlisted" />
              {product.rating}
              {product.review_count != null && (
                <span>({product.review_count.toLocaleString()})</span>
              )}
            </span>
          )}
          <DomainBadge domain={product.domain} />
        </div>

        {/* AI verdict */}
        {product.ai_verdict && (
          <Badge
            variant="secondary"
            className="text-xs bg-ai-accent/10 text-ai-accent border-ai-accent/20"
          >
            {product.ai_verdict}
          </Badge>
        )}

        {/* Shortlisted indicator */}
        {product.is_shortlisted && (
          <Badge
            variant="secondary"
            className="text-xs bg-shortlisted/10 text-shortlisted border-shortlisted/20"
          >
            Shortlisted
          </Badge>
        )}
        {product.is_purchased && (
          <Badge
            variant="secondary"
            className="text-xs bg-purchased/10 text-purchased border-purchased/20"
          >
            Purchased
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

export { ProductCardSkeleton }
