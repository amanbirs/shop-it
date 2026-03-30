"use client"

import { useState } from "react"
import Image from "next/image"
import { Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PriceDisplay } from "@/components/common/price-display"
import { DomainBadge } from "@/components/common/domain-badge"
import type { SearchResult } from "@/lib/actions/search"

type SearchResultCardProps = {
  result: SearchResult
  onAdd: () => Promise<boolean>
}

export function SearchResultCard({ result, onAdd }: SearchResultCardProps) {
  const [added, setAdded] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    setIsAdding(true)
    const success = await onAdd()
    if (success) setAdded(true)
    setIsAdding(false)
  }

  return (
    <div className="flex gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
      {/* Image */}
      <a
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0"
      >
        {result.image_url ? (
          <div className="relative h-20 w-20 rounded-md overflow-hidden bg-muted">
            <Image
              src={result.image_url.replace(/^http:\/\//, "https://")}
              alt={result.title}
              fill
              className="object-contain dark:brightness-90"
              sizes="80px"
            />
          </div>
        ) : (
          <div className="h-20 w-20 rounded-md bg-muted flex items-center justify-center">
            {result.domain && (
              <Image
                src={`https://www.google.com/s2/favicons?domain=${result.domain}&sz=24`}
                alt={result.domain}
                width={24}
                height={24}
                className="opacity-50"
              />
            )}
          </div>
        )}
      </a>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-medium leading-snug line-clamp-2">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {result.title}
            </a>
          </h4>
          <div className="flex items-center gap-2">
            <PriceDisplay
              min={result.price_min}
              max={result.price_max}
              currency={result.currency}
              className="text-sm"
            />
            <DomainBadge domain={result.domain} />
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {result.reason}
          </p>
        </div>
      </div>

      {/* Action */}
      <div className="shrink-0 flex items-center">
        {added ? (
          <Button size="sm" variant="ghost" disabled className="h-8 text-xs text-green-600 dark:text-green-400">
            <Check className="h-3.5 w-3.5 mr-1" />
            Added
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={handleAdd}
            disabled={isAdding}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {isAdding ? "Adding..." : "Add"}
          </Button>
        )}
      </div>
    </div>
  )
}
