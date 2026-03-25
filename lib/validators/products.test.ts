import { describe, it, expect } from "vitest"
import {
  addProductSchema,
  toggleShortlistSchema,
  markPurchasedSchema,
  archiveProductSchema,
  retryExtractionSchema,
} from "./products"

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

  it("fails when productId is not a UUID", () => {
    const result = toggleShortlistSchema.safeParse({
      productId: "bad",
      isShortlisted: true,
    })
    expect(result.success).toBe(false)
  })

  it("fails when isShortlisted is not a boolean", () => {
    const result = toggleShortlistSchema.safeParse({
      productId: "550e8400-e29b-41d4-a716-446655440000",
      isShortlisted: "yes",
    })
    expect(result.success).toBe(false)
  })
})

describe("markPurchasedSchema", () => {
  it("passes with productId and isPurchased", () => {
    const result = markPurchasedSchema.safeParse({
      productId: "550e8400-e29b-41d4-a716-446655440000",
      isPurchased: true,
    })
    expect(result.success).toBe(true)
  })

  it("passes with optional purchasedPrice and purchaseUrl", () => {
    const result = markPurchasedSchema.safeParse({
      productId: "550e8400-e29b-41d4-a716-446655440000",
      isPurchased: true,
      purchasedPrice: 54990,
      purchaseUrl: "https://www.amazon.in/dp/B0EXAMPLE",
    })
    expect(result.success).toBe(true)
  })

  it("fails when productId is missing", () => {
    const result = markPurchasedSchema.safeParse({ isPurchased: true })
    expect(result.success).toBe(false)
  })

  it("fails when purchasedPrice is negative", () => {
    const result = markPurchasedSchema.safeParse({
      productId: "550e8400-e29b-41d4-a716-446655440000",
      isPurchased: true,
      purchasedPrice: -100,
    })
    expect(result.success).toBe(false)
  })

  it("fails when purchaseUrl is not a valid URL", () => {
    const result = markPurchasedSchema.safeParse({
      productId: "550e8400-e29b-41d4-a716-446655440000",
      isPurchased: true,
      purchaseUrl: "not-a-url",
    })
    expect(result.success).toBe(false)
  })
})

describe("archiveProductSchema", () => {
  it("passes with valid UUID", () => {
    const result = archiveProductSchema.safeParse({
      productId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(true)
  })

  it("fails with non-UUID", () => {
    const result = archiveProductSchema.safeParse({ productId: "bad" })
    expect(result.success).toBe(false)
  })
})

describe("retryExtractionSchema", () => {
  it("passes with valid UUID", () => {
    const result = retryExtractionSchema.safeParse({
      productId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(true)
  })

  it("fails with non-UUID", () => {
    const result = retryExtractionSchema.safeParse({ productId: "bad" })
    expect(result.success).toBe(false)
  })
})
