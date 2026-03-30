"use client"

import { X, Search, MessageSquare, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { SearchResultCard } from "@/components/products/search-result-card"
import { addProductFromSearch } from "@/lib/actions/search"
import type { SearchResult } from "@/lib/actions/search"

type SearchResultsPanelProps = {
  query: string
  results: SearchResult[]
  isSearching: boolean
  listId: string
  onClose: () => void
  onOpenChat: (prefill: string) => void
}

export function SearchResultsPanel({
  query,
  results,
  isSearching,
  listId,
  onClose,
  onOpenChat,
}: SearchResultsPanelProps) {
  const handleAdd = async (result: SearchResult): Promise<boolean> => {
    const res = await addProductFromSearch({
      listId,
      title: result.title,
      url: result.url,
      domain: result.domain,
      image_url: result.image_url,
      brand: result.brand,
      price_min: result.price_min,
      price_max: result.price_max,
      currency: result.currency,
    })

    if (res.success) {
      toast.success("Product added — extracting data...")
      return true
    } else {
      toast.error(res.error.message)
      return false
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.4, 0, 1] }}
      className="overflow-hidden"
    >
      <div className="rounded-lg border border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              Results for &ldquo;{query}&rdquo;
            </span>
            {!isSearching && results.length > 0 && (
              <span className="text-xs text-muted-foreground/60 shrink-0">
                {results.length} product{results.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Close search results"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-2 max-h-[480px] overflow-y-auto">
          {isSearching && (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Searching...</span>
            </div>
          )}

          {!isSearching && results.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                No products found. Try a different search or refine with chat.
              </p>
            </div>
          )}

          {!isSearching &&
            results.map((result) => (
              <SearchResultCard
                key={result.id}
                result={result}
                onAdd={() => handleAdd(result)}
              />
            ))}
        </div>

        {/* Footer — chat escalation */}
        {!isSearching && (
          <div className="px-4 py-2.5 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChat(query)}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Need help narrowing down? Chat with AI
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
