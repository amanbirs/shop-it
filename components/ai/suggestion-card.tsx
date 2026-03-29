"use client"

import Image from "next/image"
import { Sparkles, Plus, X, Info, ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PriceDisplay } from "@/components/common/price-display"
import { DomainBadge } from "@/components/common/domain-badge"
import { cn } from "@/lib/utils"
import type { ProductSuggestion } from "@/lib/types/database"

type SuggestionCardProps = {
  suggestion: ProductSuggestion
  onAccept: () => void
  onDismiss: () => void
  isAccepting?: boolean
}

export function SuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
  isAccepting,
}: SuggestionCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-dashed border-2 transition-all duration-150",
        "border-ai-accent/30 bg-ai-accent/5",
        "dark:border-ai-accent/40 dark:bg-ai-accent/[0.08]"
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Image — links to product page */}
        <div className="relative">
          <a
            href={suggestion.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="block"
          >
            {suggestion.image_url ? (
              <div className="relative h-40 w-full rounded-md overflow-hidden bg-muted">
                <Image
                  src={suggestion.image_url.replace(/^http:\/\//, "https://")}
                  alt={suggestion.title}
                  fill
                  className="object-contain dark:brightness-90"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
            ) : (
              <div className="h-40 w-full rounded-md bg-muted flex flex-col items-center justify-center gap-2">
                {suggestion.domain && (
                  <Image
                    src={`https://www.google.com/s2/favicons?domain=${suggestion.domain}&sz=32`}
                    alt={suggestion.domain}
                    width={32}
                    height={32}
                    className="opacity-50"
                  />
                )}
                <span className="text-xs text-muted-foreground">
                  View on {suggestion.domain ?? "product page"}
                </span>
              </div>
            )}
          </a>

          {/* AI badge — top-left */}
          <Badge
            className="absolute top-1.5 left-1.5 bg-ai-accent/10 text-ai-accent border-ai-accent/20 dark:bg-ai-accent/15"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            AI Suggests
          </Badge>

          {/* Dismiss — top-right */}
          <button
            className="absolute top-1.5 right-1.5 opacity-0 group-hover/suggestion:opacity-100 transition-opacity rounded-md p-1.5 bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground border border-border/50"
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
            aria-label="Dismiss suggestion"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Title — links to product page */}
        <h3 className="font-medium text-sm leading-snug line-clamp-2">
          <a
            href={suggestion.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {suggestion.title}
          </a>
        </h3>

        {/* Price */}
        <PriceDisplay
          min={suggestion.price_min}
          max={suggestion.price_max}
          currency={suggestion.currency}
          className="text-sm"
        />

        {/* Domain + view link */}
        <div className="flex items-center justify-between">
          <DomainBadge domain={suggestion.domain} />

          <a
            href={suggestion.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            View product
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Reason text */}
        <p className="text-xs text-ai-accent/80 italic line-clamp-2">
          {suggestion.reason}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onAccept()
            }}
            disabled={isAccepting}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {isAccepting ? "Adding..." : "Add to List"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
