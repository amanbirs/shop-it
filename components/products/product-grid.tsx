"use client"

import { ProductCard } from "@/components/products/product-card"
import type { Product } from "@/lib/types/database"

type ProductGridProps = {
  products: Product[]
  onProductClick?: (product: Product) => void
  onRetryExtraction?: (productId: string) => void
}

export function ProductGrid({
  products,
  onProductClick,
  onRetryExtraction,
}: ProductGridProps) {
  if (products.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={() => onProductClick?.(product)}
          onRetryExtraction={() => onRetryExtraction?.(product.id)}
        />
      ))}
    </div>
  )
}
