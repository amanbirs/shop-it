import { z } from "zod/v4"

export const generateHypeTitleSchema = z.object({
  category: z.string().min(1).max(200),
})

// Response shape from Gemini for hype title + emoji
export const hypeTitleResponseSchema = z.object({
  title: z.string(),
  emoji: z.string(),
})

export type GenerateHypeTitleInput = z.infer<typeof generateHypeTitleSchema>
export type HypeTitleResponse = z.infer<typeof hypeTitleResponseSchema>
