import { describe, it, expect } from "vitest"
import {
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
} from "./comments"

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000"

describe("createCommentSchema", () => {
  it("passes with valid productId and content", () => {
    const result = createCommentSchema.safeParse({
      productId: VALID_UUID,
      content: "Great product!",
    })
    expect(result.success).toBe(true)
  })

  it("passes with optional parentId", () => {
    const result = createCommentSchema.safeParse({
      productId: VALID_UUID,
      content: "I agree!",
      parentId: VALID_UUID,
    })
    expect(result.success).toBe(true)
  })

  it("fails when productId is not a UUID", () => {
    const result = createCommentSchema.safeParse({
      productId: "not-a-uuid",
      content: "Hello",
    })
    expect(result.success).toBe(false)
  })

  it("fails when content is empty", () => {
    const result = createCommentSchema.safeParse({
      productId: VALID_UUID,
      content: "",
    })
    expect(result.success).toBe(false)
  })

  it("fails when content exceeds 5000 chars", () => {
    const result = createCommentSchema.safeParse({
      productId: VALID_UUID,
      content: "x".repeat(5001),
    })
    expect(result.success).toBe(false)
  })

  it("passes at exactly 5000 chars", () => {
    const result = createCommentSchema.safeParse({
      productId: VALID_UUID,
      content: "x".repeat(5000),
    })
    expect(result.success).toBe(true)
  })

  it("fails when parentId is not a UUID", () => {
    const result = createCommentSchema.safeParse({
      productId: VALID_UUID,
      content: "Hello",
      parentId: "bad-id",
    })
    expect(result.success).toBe(false)
  })
})

describe("updateCommentSchema", () => {
  it("passes with valid commentId and content", () => {
    const result = updateCommentSchema.safeParse({
      commentId: VALID_UUID,
      content: "Updated comment",
    })
    expect(result.success).toBe(true)
  })

  it("fails when commentId is missing", () => {
    const result = updateCommentSchema.safeParse({ content: "Hello" })
    expect(result.success).toBe(false)
  })

  it("fails when content is empty", () => {
    const result = updateCommentSchema.safeParse({
      commentId: VALID_UUID,
      content: "",
    })
    expect(result.success).toBe(false)
  })

  it("fails when content exceeds 5000 chars", () => {
    const result = updateCommentSchema.safeParse({
      commentId: VALID_UUID,
      content: "x".repeat(5001),
    })
    expect(result.success).toBe(false)
  })
})

describe("deleteCommentSchema", () => {
  it("passes with valid UUID", () => {
    const result = deleteCommentSchema.safeParse({ commentId: VALID_UUID })
    expect(result.success).toBe(true)
  })

  it("fails with non-UUID string", () => {
    const result = deleteCommentSchema.safeParse({ commentId: "nope" })
    expect(result.success).toBe(false)
  })

  it("fails when commentId is missing", () => {
    const result = deleteCommentSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
