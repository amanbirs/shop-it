"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { useRealtimeProducts } from "@/hooks/use-realtime-products"
import { retryExtraction } from "@/lib/actions/products"
import { AddProductForm } from "@/components/products/add-product-form"
import { ProductGrid } from "@/components/products/product-grid"
import { ListFilters, type FilterValue } from "@/components/lists/list-filters"
import { EmptyState } from "@/components/common/empty-state"
import type { Product } from "@/lib/types/database"

type ListDetailContentProps = {
  listId: string
  products: Product[]
  userRole: string
}

export function ListDetailContent({
  listId,
  products,
  userRole,
}: ListDetailContentProps) {
  const [filter, setFilter] = useState<FilterValue>("all")
  const [, startTransition] = useTransition()

  // Subscribe to Realtime updates for this list's products
  useRealtimeProducts(listId)

  const canEdit = userRole === "owner" || userRole === "editor"

  // Filter products
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

  return (
    <div className="space-y-4">
      {/* Add product form */}
      {canEdit && <AddProductForm listId={listId} />}

      {/* Filters */}
      {products.length > 0 && (
        <ListFilters active={filter} onChange={setFilter} counts={counts} />
      )}

      {/* Product grid or empty state */}
      {filtered.length > 0 ? (
        <ProductGrid
          products={filtered}
          onRetryExtraction={handleRetry}
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
    </div>
  )
}
