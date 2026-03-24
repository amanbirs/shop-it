"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { useRealtimeProducts } from "@/hooks/use-realtime-products"
import { retryExtraction } from "@/lib/actions/products"
import { AddProductForm } from "@/components/products/add-product-form"
import { ProductGrid } from "@/components/products/product-grid"
import { ProductDetailPanel } from "@/components/products/product-detail-panel"
import { ListFilters, type FilterValue } from "@/components/lists/list-filters"
import { ExpertOpinionCard } from "@/components/ai/expert-opinion-card"
import { ExpertOpinionCta } from "@/components/ai/expert-opinion-cta"
import { EmptyState } from "@/components/common/empty-state"
import type { Product, ListAiOpinion } from "@/lib/types/database"

type ListDetailContentProps = {
  listId: string
  products: Product[]
  userRole: string
  currentUserId: string
  opinion: ListAiOpinion | null
  productNames: Record<string, string>
}

export function ListDetailContent({
  listId,
  products,
  userRole,
  currentUserId,
  opinion,
  productNames,
}: ListDetailContentProps) {
  const [filter, setFilter] = useState<FilterValue>("all")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
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

  const currentProduct = selectedProduct
    ? products.find((p) => p.id === selectedProduct.id) ?? selectedProduct
    : null

  return (
    <div className="flex -mx-6 h-full">
      {/* Left panel: product grid — independent scroll */}
      <div
        className={`flex-1 min-w-0 overflow-y-auto px-6 pb-6 ${
          currentProduct ? "lg:w-[60%] lg:flex-none" : ""
        }`}
      >
        <div className="space-y-4">
          {canEdit && <AddProductForm listId={listId} />}

          {products.length > 0 && (
            <ListFilters active={filter} onChange={setFilter} counts={counts} />
          )}

          {filtered.length > 0 ? (
            <ProductGrid
              products={filtered}
              onProductClick={setSelectedProduct}
              onRetryExtraction={handleRetry}
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

          {/* Expert Opinion section */}
          {!currentProduct && (
            <div className="space-y-4 pt-4">
              {opinion && (
                <ExpertOpinionCard
                  opinion={opinion}
                  productNames={productNames}
                  products={products}
                />
              )}
              <ExpertOpinionCta
                listId={listId}
                productCount={completedProductCount}
                opinion={opinion}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right panel: product detail — independent scroll */}
      {currentProduct && (
        <div className="hidden lg:flex lg:w-[40%] lg:flex-none border-l border-border overflow-y-auto">
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
    </div>
  )
}
