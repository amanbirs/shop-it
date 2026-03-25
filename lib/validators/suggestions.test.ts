import { describe, it, expect } from "vitest"
import {
  acceptSuggestionSchema,
  dismissSuggestionSchema,
  requestSuggestionsSchema,
} from "./suggestions"

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000"

describe("acceptSuggestionSchema", () => {
  it("passes with valid UUID", () => {
    const result = acceptSuggestionSchema.safeParse({ suggestionId: VALID_UUID })
    expect(result.success).toBe(true)
  })

  it("fails with non-UUID string", () => {
    const result = acceptSuggestionSchema.safeParse({ suggestionId: "bad" })
    expect(result.success).toBe(false)
  })

  it("fails when suggestionId is missing", () => {
    const result = acceptSuggestionSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe("dismissSuggestionSchema", () => {
  it("passes with valid UUID", () => {
    const result = dismissSuggestionSchema.safeParse({ suggestionId: VALID_UUID })
    expect(result.success).toBe(true)
  })

  it("fails with non-UUID string", () => {
    const result = dismissSuggestionSchema.safeParse({ suggestionId: "bad" })
    expect(result.success).toBe(false)
  })
})

describe("requestSuggestionsSchema", () => {
  it("passes with valid UUID", () => {
    const result = requestSuggestionsSchema.safeParse({ listId: VALID_UUID })
    expect(result.success).toBe(true)
  })

  it("fails with non-UUID string", () => {
    const result = requestSuggestionsSchema.safeParse({ listId: "bad" })
    expect(result.success).toBe(false)
  })

  it("fails when listId is missing", () => {
    const result = requestSuggestionsSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
