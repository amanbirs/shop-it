import { describe, it, expect } from "vitest"
import { createListSchema, updateListSchema } from "./lists"

describe("createListSchema", () => {
  it("passes with valid name only", () => {
    const result = createListSchema.safeParse({ name: "New TV" })
    expect(result.success).toBe(true)
  })

  it("passes with all optional fields", () => {
    const result = createListSchema.safeParse({
      name: "TV Shopping",
      category: "electronics",
      description: "Looking for a 55 inch TV",
      budget_min: 30000,
      budget_max: 50000,
      purchase_by: "2026-04-01",
    })
    expect(result.success).toBe(true)
  })

  it("fails when name is empty", () => {
    const result = createListSchema.safeParse({ name: "" })
    expect(result.success).toBe(false)
  })

  it("fails when name exceeds 200 chars", () => {
    const result = createListSchema.safeParse({ name: "x".repeat(201) })
    expect(result.success).toBe(false)
  })

  it("fails when budget_min > budget_max", () => {
    const result = createListSchema.safeParse({
      name: "Test",
      budget_min: 50000,
      budget_max: 30000,
    })
    expect(result.success).toBe(false)
  })

  it("passes when budget_min = budget_max", () => {
    const result = createListSchema.safeParse({
      name: "Test",
      budget_min: 30000,
      budget_max: 30000,
    })
    expect(result.success).toBe(true)
  })
})

describe("updateListSchema", () => {
  it("passes with listId and optional name", () => {
    const result = updateListSchema.safeParse({
      listId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Updated Name",
    })
    expect(result.success).toBe(true)
  })

  it("fails without listId", () => {
    const result = updateListSchema.safeParse({ name: "Updated" })
    expect(result.success).toBe(false)
  })
})
