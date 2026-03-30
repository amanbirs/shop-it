import { z } from "zod/v4"

export const searchProductsSchema = z.object({
  listId: z.string().uuid(),
  query: z.string().min(2, "Search query is too short").max(500),
})

export const addFromSearchSchema = z.object({
  listId: z.string().uuid(),
  title: z.string().min(1),
  url: z.string().url(),
  domain: z.string().nullable(),
  image_url: z.string().nullable(),
  brand: z.string().nullable(),
  price_min: z.number().nullable(),
  price_max: z.number().nullable(),
  currency: z.string().default("INR"),
})

export type SearchProductsInput = z.infer<typeof searchProductsSchema>
export type AddFromSearchInput = z.infer<typeof addFromSearchSchema>
