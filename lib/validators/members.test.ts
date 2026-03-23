import { describe, it, expect } from "vitest"
import { inviteMemberSchema } from "./members"

describe("inviteMemberSchema", () => {
  it("passes with valid email and role", () => {
    const result = inviteMemberSchema.safeParse({
      listId: "550e8400-e29b-41d4-a716-446655440000",
      email: "mom@email.com",
      role: "editor",
    })
    expect(result.success).toBe(true)
  })

  it("fails with invalid email", () => {
    const result = inviteMemberSchema.safeParse({
      listId: "550e8400-e29b-41d4-a716-446655440000",
      email: "not-an-email",
      role: "editor",
    })
    expect(result.success).toBe(false)
  })

  it("does not allow inviting as owner", () => {
    const result = inviteMemberSchema.safeParse({
      listId: "550e8400-e29b-41d4-a716-446655440000",
      email: "test@email.com",
      role: "owner",
    })
    expect(result.success).toBe(false)
  })
})
