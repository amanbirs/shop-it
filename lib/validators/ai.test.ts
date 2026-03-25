import { describe, it, expect } from "vitest"
import { generateHypeTitleSchema, hypeTitleResponseSchema } from "./ai"

describe("generateHypeTitleSchema", () => {
  it("passes with valid category", () => {
    const result = generateHypeTitleSchema.safeParse({ category: "TV" })
    expect(result.success).toBe(true)
  })

  it("fails when category is empty", () => {
    const result = generateHypeTitleSchema.safeParse({ category: "" })
    expect(result.success).toBe(false)
  })

  it("fails when category exceeds 200 chars", () => {
    const result = generateHypeTitleSchema.safeParse({
      category: "x".repeat(201),
    })
    expect(result.success).toBe(false)
  })

  it("passes at exactly 200 chars", () => {
    const result = generateHypeTitleSchema.safeParse({
      category: "x".repeat(200),
    })
    expect(result.success).toBe(true)
  })

  it("fails when category is missing", () => {
    const result = generateHypeTitleSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe("hypeTitleResponseSchema", () => {
  it("passes with title and emoji", () => {
    const result = hypeTitleResponseSchema.safeParse({
      title: "The Great TV Showdown",
      emoji: "📺",
    })
    expect(result.success).toBe(true)
  })

  it("fails when title is missing", () => {
    const result = hypeTitleResponseSchema.safeParse({ emoji: "📺" })
    expect(result.success).toBe(false)
  })

  it("fails when emoji is missing", () => {
    const result = hypeTitleResponseSchema.safeParse({
      title: "The Great TV Showdown",
    })
    expect(result.success).toBe(false)
  })
})
