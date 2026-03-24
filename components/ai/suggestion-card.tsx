"use client"

import Image from "next/image"
import { Sparkles, Plus, X, Info } from "lucide-react"
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
        {/* Image */}
        <div className="relative">
          {suggestion.image_url ? (
            <div className="relative h-40 w-full rounded-md overflow-hidden bg-muted">
              <Image
                src={suggestion.image_url}
                alt={suggestion.title}
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

        {/* Title */}
        <h3 className="font-medium text-sm leading-snug line-clamp-2">
          {suggestion.title}
        </h3>

        {/* Price */}
        <PriceDisplay
          min={suggestion.price_min}
          max={suggestion.price_max}
          currency={suggestion.currency}
          className="text-sm"
        />

        {/* Domain + info */}
        <div className="flex items-center justify-between">
          <DomainBadge domain={suggestion.domain} />

          {suggestion.source_urls.length > 0 && (
            <a
              href={suggestion.source_urls[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
              title={`Source: ${suggestion.source_urls[0]}`}
            >
              <Info className="h-3.5 w-3.5" />
            </a>
          )}
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
