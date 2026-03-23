import { z } from "zod/v4"

export const generateHypeTitleSchema = z.object({
  category: z.string().min(1).max(200),
})

export type GenerateHypeTitleInput = z.infer<typeof generateHypeTitleSchema>
