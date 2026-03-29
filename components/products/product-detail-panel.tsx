"use client"

import Image from "next/image"
import { ExternalLink, Star, ChevronDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { PriceDisplay } from "@/components/common/price-display"
import { DomainBadge } from "@/components/common/domain-badge"
import { ExtractionProgress } from "@/components/products/extraction-progress"
import { ProductSpecs } from "@/components/products/product-specs"
import { ProductProsCons } from "@/components/products/product-pros-cons"
import { ProductReviews } from "@/components/products/product-reviews"
import { ProductActions } from "@/components/products/product-actions"
import { CommentThreadLoader } from "@/components/collaboration/comment-thread-loader"
import { relativeTime } from "@/lib/utils"
import type { Product } from "@/lib/types/database"

type ProductDetailPanelProps = {
  product: Product
  canEdit: boolean
  currentUserId: string
  isOwner: boolean
  onClose: () => void
  onRetryExtraction?: () => void
}

export function ProductDetailPanel({
  product,
  canEdit,
  currentUserId,
  isOwner,
  onClose,
  onRetryExtraction,
}: ProductDetailPanelProps) {
  const isExtracting =
    product.extraction_status === "pending" ||
    product.extraction_status === "processing"
  const isFailed = product.extraction_status === "failed"
  const isReady = product.extraction_status === "completed"

  return (
    <div className="p-6 pb-12 space-y-5">
      {/* Close button */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          Product Details
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
          aria-label="Close detail panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Extraction states */}
      {(isExtracting || isFailed) && (
        <ExtractionProgress
          status={product.extraction_status}
          error={product.extraction_error}
          onRetry={onRetryExtraction}
        />
      )}

      {/* Hero image */}
      {product.image_url && isReady && (
        <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted">
          <Image
            src={product.image_url.replace(/^http:\/\//, "https://")}
            alt={product.title ?? "Product image"}
            fill
            className="object-contain dark:brightness-90"
            sizes="(max-width: 1024px) 100vw, 40vw"
          />
        </div>
      )}

      {/* Title + brand + domain */}
      <div className="space-y-1">
        <h2 className="text-xl font-semibold leading-snug">
          {product.title ?? product.url}
        </h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {product.brand && <span>{product.brand}</span>}
          {product.brand && product.domain && <span>·</span>}
          <DomainBadge domain={product.domain} />
          {product.url && (
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
              aria-label="View on source site"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Price + rating */}
      {isReady && (
        <div className="flex items-center justify-between">
          <PriceDisplay
            min={product.price_min}
            max={product.price_max}
            currency={product.currency}
            note={product.price_note}
            className="text-lg"
          />
          {product.rating != null && (
            <span className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-shortlisted text-shortlisted" />
              {product.rating}
              {product.review_count != null && (
                <span className="text-muted-foreground">
                  ({product.review_count.toLocaleString()})
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {/* Verdict */}
      {product.ai_verdict && (
        <p className="text-sm text-muted-foreground italic">
          {product.ai_verdict}
        </p>
      )}

      <Separator />

      {/* Action buttons */}
      {isReady && (
        <>
          <ProductActions
            productId={product.id}
            isShortlisted={product.is_shortlisted}
            isPurchased={product.is_purchased}
            canEdit={canEdit}
          />
          <Separator />
        </>
      )}

      {/* Accordion sections */}
      {isReady && (
        <div className="space-y-1">
          {product.ai_summary && (
            <AccordionSection title="Summary" defaultOpen>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.ai_summary}
              </p>
            </AccordionSection>
          )}

          {Object.keys(product.specs).length > 0 && (
            <AccordionSection
              title={`Specs (${Object.keys(product.specs).length})`}
            >
              <ProductSpecs specs={product.specs} />
            </AccordionSection>
          )}

          {(product.pros.length > 0 || product.cons.length > 0) && (
            <AccordionSection title="Pros & Cons">
              <ProductProsCons pros={product.pros} cons={product.cons} />
            </AccordionSection>
          )}

          {(product.ai_review_summary ||
            product.scraped_reviews.length > 0) && (
            <AccordionSection title="Reviews">
              <ProductReviews
                aiReviewSummary={product.ai_review_summary}
                scrapedReviews={product.scraped_reviews}
              />
            </AccordionSection>
          )}
        </div>
      )}

      <Separator />

      {/* Comments */}
      {isReady && (
        <CommentThreadLoader
          productId={product.id}
          currentUserId={currentUserId}
          canEdit={canEdit}
          isOwner={isOwner}
        />
      )}

      <Separator />

      {/* Footer metadata */}
      <div className="space-y-2 text-xs text-muted-foreground">
        {product.notes && <p className="text-sm">{product.notes}</p>}
        <p>Added {relativeTime(product.created_at)}</p>
        {product.url && (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            View on {product.domain ?? "source site"}
          </a>
        )}
      </div>
    </div>
  )
}

function AccordionSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium hover:text-foreground transition-colors">
        {title}
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
