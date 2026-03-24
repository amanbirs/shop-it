import { z } from "zod/v4"

export const acceptSuggestionSchema = z.object({
  suggestionId: z.string().uuid(),
})

export const dismissSuggestionSchema = z.object({
  suggestionId: z.string().uuid(),
})

export const requestSuggestionsSchema = z.object({
  listId: z.string().uuid(),
})

export type AcceptSuggestionInput = z.infer<typeof acceptSuggestionSchema>
export type DismissSuggestionInput = z.infer<typeof dismissSuggestionSchema>
export type RequestSuggestionsInput = z.infer<typeof requestSuggestionsSchema>
