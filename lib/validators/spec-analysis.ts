import { z } from "zod/v4"

// Spec comparison row — metadata only; actual values read from product.specs at render time
export const specComparisonRowSchema = z.object({
  key: z.string(),
  label: z.string(),
  explanation: z.string(),
  best_product_ids: z.array(z.string().uuid()).min(1),
  best_reason: z.string(),
  product_spec_keys: z.record(z.string(), z.string()),
})

// Dimension rating per product
export const dimensionRatingSchema = z.object({
  product_id: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  reasoning: z.string(),
  uses_external_knowledge: z.boolean(),
})

export const dimensionSchema = z.object({
  name: z.string(),
  description: z.string(),
  ratings: z.array(dimensionRatingSchema).min(1),
})

// Full response shape from Gemini — used to validate AI output
export const specAnalysisResponseSchema = z.object({
  spec_comparison: z.array(specComparisonRowSchema).min(1).max(15),
  dimensions: z.array(dimensionSchema).min(1).max(10),
})

// Input schema for the generate action
export const generateSpecAnalysisSchema = z.object({
  listId: z.string().uuid(),
})

export type SpecAnalysisResponse = z.infer<typeof specAnalysisResponseSchema>
export type GenerateSpecAnalysisInput = z.infer<typeof generateSpecAnalysisSchema>
