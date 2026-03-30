"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useRealtimeProducts } from "@/hooks/use-realtime-products"
import { retryExtraction, archiveProduct, toggleShortlist } from "@/lib/actions/products"
import { acceptSuggestion, dismissSuggestion, requestSuggestions } from "@/lib/actions/suggestions"
import { AddProductForm } from "@/components/products/add-product-form"
import { ProductGrid } from "@/components/products/product-grid"
import { ProductDetailPanel } from "@/components/products/product-detail-panel"
import { SearchResultsPanel } from "@/components/products/search-results-panel"
import { ListFilters, type FilterValue } from "@/components/lists/list-filters"
import { VerdictBanner } from "@/components/ai/verdict-banner"
import { ChatPanel } from "@/components/ai/chat-panel"
import { SuggestionCard } from "@/components/ai/suggestion-card"
import { EmptyState } from "@/components/common/empty-state"
import { Sparkles } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ViewToggle, type ViewMode } from "@/components/lists/view-toggle"
import { SpecExplainerView } from "@/components/specs/spec-explainer-view"
import { searchProducts, type SearchResult } from "@/lib/actions/search"
import type { Product, List, ListAiOpinion, ListSpecAnalysis, ProductSuggestion } from "@/lib/types/database"

type ListDetailContentProps = {
  listId: string
  list: Pick<List, "category">
  products: Product[]
  suggestions: ProductSuggestion[]
  userRole: string
  currentUserId: string
  opinion: ListAiOpinion | null
  productNames: Record<string, string>
  specAnalysis: ListSpecAnalysis | null
  isSpecAnalysisStale: boolean
  specStaleDelta: number
}

export function ListDetailContent({
  listId,
  list,
  products,
  suggestions,
  userRole,
  currentUserId,
  opinion,
  productNames,
  specAnalysis,
  isSpecAnalysisStale,
  specStaleDelta,
}: ListDetailContentProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterValue>("all")
  const [view, setView] = useState<ViewMode>("grid")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatPrefill, setChatPrefill] = useState("")
  const [isFindingMore, setIsFindingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [, startTransition] = useTransition()

  useRealtimeProducts(listId)

  const canEdit = userRole === "owner" || userRole === "editor"

  const filtered = products.filter((p) => {
    if (filter === "shortlisted") return p.is_shortlisted
    if (filter === "purchased") return p.is_purchased
    return true
  })

  const counts = {
    all: products.length,
    shortlisted: products.filter((p) => p.is_shortlisted).length,
    purchased: products.filter((p) => p.is_purchased).length,
  }

  const completedProductCount = products.filter(
    (p) => p.extraction_status === "completed"
  ).length

  const handleRetry = (productId: string) => {
    startTransition(async () => {
      const result = await retryExtraction({ productId })
      if (!result.success) {
        toast.error(result.error.message)
      } else {
        toast.success("Retrying extraction...")
      }
    })
  }

  const handleToggleShortlist = (productId: string, isShortlisted: boolean) => {
    startTransition(async () => {
      const result = await toggleShortlist({
        productId,
        isShortlisted: !isShortlisted,
      })
      if (!result.success) toast.error(result.error.message)
    })
  }

  const handleArchive = (productId: string) => {
    startTransition(async () => {
      const result = await archiveProduct({ productId })
      if (!result.success) {
        toast.error(result.error.message)
      } else {
        toast.success("Product removed from list")
        if (selectedProduct?.id === productId) {
          setSelectedProduct(null)
        }
      }
    })
  }

  const handleAcceptSuggestion = (suggestionId: string) => {
    startTransition(async () => {
      const result = await acceptSuggestion({ suggestionId })
      if (result.success) {
        toast.success("Product added to your list")
      } else {
        toast.error(result.error.message)
      }
    })
  }

  const handleDismissSuggestion = (suggestionId: string) => {
    startTransition(async () => {
      const result = await dismissSuggestion({ suggestionId })
      if (!result.success) {
        toast.error(result.error.message)
      }
    })
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    setSearchResults([])
    setIsSearching(true)

    try {
      const result = await searchProducts({ listId, query })
      if (result.success) {
        setSearchResults(result.data.results)
      } else {
        toast.error(result.error.message)
      }
    } catch {
      toast.error("Search failed. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  const handleCloseSearch = () => {
    setSearchQuery(null)
    setSearchResults([])
    setIsSearching(false)
  }

  const handleOpenChatWithPrefill = (prefill: string) => {
    handleCloseSearch()
    setChatPrefill(prefill)
    setChatOpen(true)
  }

  const handleFindMore = async () => {
    setIsFindingMore(true)
    const result = await requestSuggestions({ listId })
    if (result.success) {
      toast.success("Found new suggestions")
      router.refresh()
    } else {
      toast.error(result.error.message)
    }
    setIsFindingMore(false)
  }

  const currentProduct = selectedProduct
    ? products.find((p) => p.id === selectedProduct.id) ?? selectedProduct
    : null

  return (
    <div className="flex -mx-6 h-full">
      {/* Left panel: product grid — independent scroll */}
      <div
        className={`flex-1 min-w-0 overflow-y-auto px-6 pb-6 transition-[width] duration-250 ease-out ${
          currentProduct ? "lg:w-[55%] lg:flex-none" : ""
        }`}
      >
        <div className="space-y-4">
          {/* Verdict banner — always visible when opinion exists */}
          <VerdictBanner
            listId={listId}
            opinion={opinion}
            products={products}
            productNames={productNames}
            completedProductCount={completedProductCount}
            onOpenChat={() => setChatOpen(true)}
          />

          {/* Add product form + search */}
          {canEdit && (
            <AddProductForm listId={listId} onSearch={handleSearch} />
          )}

          {/* Search results panel */}
          <AnimatePresence>
            {searchQuery && (
              <SearchResultsPanel
                query={searchQuery}
                results={searchResults}
                isSearching={isSearching}
                listId={listId}
                onClose={handleCloseSearch}
                onOpenChat={handleOpenChatWithPrefill}
              />
            )}
          </AnimatePresence>

          {/* Filters + View toggle */}
          {products.length > 0 && (
            <div className="flex items-center justify-between gap-4">
              <ListFilters active={filter} onChange={setFilter} counts={counts} />
              <ViewToggle value={view} onChange={setView} />
            </div>
          )}

          {/* Specs view */}
          {view === "specs" ? (
            <SpecExplainerView
              specAnalysis={specAnalysis}
              products={products}
              listId={listId}
              category={list.category}
              isStale={isSpecAnalysisStale}
              staleDelta={specStaleDelta}
            />
          ) : (
            <>
              {/* Product grid or empty state */}
              {filtered.length > 0 ? (
                <ProductGrid
                  products={filtered}
                  onProductClick={setSelectedProduct}
                  onRetryExtraction={handleRetry}
                  onArchive={handleArchive}
                  onToggleShortlist={handleToggleShortlist}
                  canEdit={canEdit}
                  compact={!!currentProduct}
                />
              ) : products.length === 0 ? (
                <EmptyState
                  title="No products yet"
                  description={
                    canEdit
                      ? "Paste a product URL above to get started."
                      : "The list owner hasn't added any products yet."
                  }
                />
              ) : (
                <EmptyState
                  title={`No ${filter} products`}
                  description="Try a different filter."
                />
              )}
            </>
          )}

          {/* AI Suggestions section */}
          {suggestions.length > 0 && filter === "all" && (
            <div className="mt-6 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-ai-accent" />
                AI found products that might fit your list
              </p>
              <div
                className={
                  currentProduct
                    ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                }
              >
                <AnimatePresence>
                  {suggestions.map((s) => (
                    <motion.div
                      key={s.id}
                      layout
                      exit={{ scale: 0.95, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="group/suggestion"
                    >
                      <SuggestionCard
                        suggestion={s}
                        onAccept={() => handleAcceptSuggestion(s.id)}
                        onDismiss={() => handleDismissSuggestion(s.id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Find more button */}
          {canEdit && completedProductCount >= 2 && filter === "all" && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-ai-accent hover:text-ai-accent/80 hover:bg-ai-accent/5"
                onClick={handleFindMore}
                disabled={isFindingMore}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {isFindingMore ? "Searching..." : "Find more products"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right panel: product detail — independent scroll */}
      {currentProduct && (
        <div className="hidden lg:flex lg:w-[45%] lg:flex-none border-l border-border overflow-y-auto">
          <ProductDetailPanel
            product={currentProduct}
            canEdit={canEdit}
            currentUserId={currentUserId}
            isOwner={userRole === "owner"}
            onClose={() => setSelectedProduct(null)}
            onRetryExtraction={() => handleRetry(currentProduct.id)}
          />
        </div>
      )}

      {/* Mobile: full-screen overlay for product detail */}
      {currentProduct && (
        <div className="fixed inset-0 z-40 bg-background overflow-y-auto lg:hidden">
          <ProductDetailPanel
            product={currentProduct}
            canEdit={canEdit}
            currentUserId={currentUserId}
            isOwner={userRole === "owner"}
            onClose={() => setSelectedProduct(null)}
            onRetryExtraction={() => handleRetry(currentProduct.id)}
          />
        </div>
      )}

      {/* Chat panel */}
      <ChatPanel
        open={chatOpen}
        onClose={() => {
          setChatOpen(false)
          setChatPrefill("")
        }}
        listId={listId}
        prefill={chatPrefill}
      />
    </div>
  )
}
