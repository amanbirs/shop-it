import { describe, it, expect } from "vitest"
import { addProductSchema, toggleShortlistSchema } from "./products"

describe("addProductSchema", () => {
  it("passes with valid URL", () => {
    const result = addProductSchema.safeParse({
      listId: "550e8400-e29b-41d4-a716-446655440000",
      url: "https://www.amazon.in/dp/B0EXAMPLE",
    })
    expect(result.success).toBe(true)
  })

  it("fails with invalid URL", () => {
    const result = addProductSchema.safeParse({
      listId: "550e8400-e29b-41d4-a716-446655440000",
      url: "not-a-url",
    })
    expect(result.success).toBe(false)
  })

  it("fails when URL exceeds 2048 chars", () => {
    const result = addProductSchema.safeParse({
      listId: "550e8400-e29b-41d4-a716-446655440000",
      url: "https://example.com/" + "x".repeat(2048),
    })
    expect(result.success).toBe(false)
  })
})

describe("toggleShortlistSchema", () => {
  it("passes with valid input", () => {
    const result = toggleShortlistSchema.safeParse({
      productId: "550e8400-e29b-41d4-a716-446655440000",
      isShortlisted: true,
    })
    expect(result.success).toBe(true)
  })
})
