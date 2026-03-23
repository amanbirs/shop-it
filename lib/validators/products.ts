import { z } from "zod/v4"

export const addProductSchema = z.object({
  listId: z.string().uuid(),
  url: z.string().url("Must be a valid URL").max(2048),
  notes: z.string().max(2000).optional(),
})

export const updateProductSchema = z.object({
  productId: z.string().uuid(),
  notes: z.string().max(2000).nullable().optional(),
  position: z.number().int().min(0).optional(),
})

export const toggleShortlistSchema = z.object({
  productId: z.string().uuid(),
  isShortlisted: z.boolean(),
})

export const markPurchasedSchema = z.object({
  productId: z.string().uuid(),
  isPurchased: z.boolean(),
  purchasedPrice: z.number().positive().optional(),
  purchaseUrl: z.string().url().optional(),
})

export const archiveProductSchema = z.object({
  productId: z.string().uuid(),
})

export const retryExtractionSchema = z.object({
  productId: z.string().uuid(),
})

export type AddProductInput = z.infer<typeof addProductSchema>
export type ToggleShortlistInput = z.infer<typeof toggleShortlistSchema>
export type MarkPurchasedInput = z.infer<typeof markPurchasedSchema>
