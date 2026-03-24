"use client"

import { motion, LayoutGroup } from "framer-motion"
import { ProductCard } from "@/components/products/product-card"
import type { Product } from "@/lib/types/database"

type ProductGridProps = {
  products: Product[]
  onProductClick?: (product: Product) => void
  onRetryExtraction?: (productId: string) => void
  compact?: boolean
}

export function ProductGrid({
  products,
  onProductClick,
  onRetryExtraction,
  compact = false,
}: ProductGridProps) {
  if (products.length === 0) return null

  return (
    <LayoutGroup>
      <motion.div
        layout
        className={
          compact
            ? "grid grid-cols-1 md:grid-cols-2 gap-4"
            : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        }
        transition={{ duration: 0.25, ease: [0.25, 0.4, 0, 1] }}
      >
        {products.map((product) => (
          <motion.div
            key={product.id}
            layout
            transition={{ duration: 0.25, ease: [0.25, 0.4, 0, 1] }}
          >
            <ProductCard
              product={product}
              onClick={() => onProductClick?.(product)}
              onRetryExtraction={() => onRetryExtraction?.(product.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    </LayoutGroup>
  )
}
