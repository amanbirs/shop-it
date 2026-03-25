import { describe, it, expect } from "vitest"
import { createListSchema, updateListSchema, archiveListSchema } from "./lists"

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

  it("passes with priorities array", () => {
    const result = updateListSchema.safeParse({
      listId: "550e8400-e29b-41d4-a716-446655440000",
      priorities: ["picture quality", "price"],
    })
    expect(result.success).toBe(true)
  })

  it("fails when priorities exceeds 10 items", () => {
    const result = updateListSchema.safeParse({
      listId: "550e8400-e29b-41d4-a716-446655440000",
      priorities: Array.from({ length: 11 }, (_, i) => `priority-${i}`),
    })
    expect(result.success).toBe(false)
  })

  it("passes with nullable fields set to null", () => {
    const result = updateListSchema.safeParse({
      listId: "550e8400-e29b-41d4-a716-446655440000",
      description: null,
      category: null,
      budget_min: null,
      budget_max: null,
      purchase_by: null,
    })
    expect(result.success).toBe(true)
  })
})

describe("archiveListSchema", () => {
  it("passes with valid UUID", () => {
    const result = archiveListSchema.safeParse({
      listId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(true)
  })

  it("fails with non-UUID", () => {
    const result = archiveListSchema.safeParse({ listId: "bad" })
    expect(result.success).toBe(false)
  })

  it("fails when listId is missing", () => {
    const result = archiveListSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
