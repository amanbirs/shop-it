"use client"

import Image from "next/image"
import { Star, Trash2, Heart } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
  onArchive?: () => void
  onToggleShortlist?: () => void
}

export function ProductCard({
  product,
  onClick,
  onRetryExtraction,
  onArchive,
  onToggleShortlist,
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
      <CardContent className="p-3 space-y-2">
        {/* Product image + remove button */}
        <div className="relative group/card">
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

          {/* Action buttons — top-right, visible on hover */}
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
            {onToggleShortlist && (
              <button
                className={cn(
                  "rounded-md p-1.5 transition-all border border-border/50",
                  product.is_shortlisted
                    ? "opacity-100 bg-shortlisted/20 text-shortlisted"
                    : "opacity-0 group-hover/card:opacity-100 bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-shortlisted hover:bg-shortlisted/10"
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleShortlist()
                }}
              >
                <Heart
                  className={cn(
                    "h-3.5 w-3.5",
                    product.is_shortlisted && "fill-current"
                  )}
                />
              </button>
            )}

            {onArchive && (
              <AlertDialog>
                <AlertDialogTrigger
                  className="opacity-0 group-hover/card:opacity-100 transition-opacity rounded-md p-1.5 bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove product?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the product from the list. This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onArchive}>
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-medium text-sm leading-snug line-clamp-2">
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

        {/* Verdict */}
        {product.ai_verdict && (
          <p className="text-xs text-muted-foreground italic">
            {product.ai_verdict}
          </p>
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
