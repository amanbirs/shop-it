import { describe, it, expect } from "vitest"
import {
  inviteMemberSchema,
  removeMemberSchema,
  updateRoleSchema,
  acceptInviteSchema,
  resendInviteSchema,
} from "./members"

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

  it("fails when listId is not a UUID", () => {
    const result = inviteMemberSchema.safeParse({
      listId: "bad",
      email: "test@email.com",
      role: "editor",
    })
    expect(result.success).toBe(false)
  })

  it("passes with viewer role", () => {
    const result = inviteMemberSchema.safeParse({
      listId: "550e8400-e29b-41d4-a716-446655440000",
      email: "test@email.com",
      role: "viewer",
    })
    expect(result.success).toBe(true)
  })
})

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000"
const VALID_UUID_2 = "660e8400-e29b-41d4-a716-446655440000"

describe("removeMemberSchema", () => {
  it("passes with valid listId and memberId", () => {
    const result = removeMemberSchema.safeParse({
      listId: VALID_UUID,
      memberId: VALID_UUID_2,
    })
    expect(result.success).toBe(true)
  })

  it("fails when listId is missing", () => {
    const result = removeMemberSchema.safeParse({ memberId: VALID_UUID_2 })
    expect(result.success).toBe(false)
  })

  it("fails when memberId is missing", () => {
    const result = removeMemberSchema.safeParse({ listId: VALID_UUID })
    expect(result.success).toBe(false)
  })
})

describe("updateRoleSchema", () => {
  it("passes with valid input", () => {
    const result = updateRoleSchema.safeParse({
      listId: VALID_UUID,
      memberId: VALID_UUID_2,
      role: "editor",
    })
    expect(result.success).toBe(true)
  })

  it("allows setting role to owner", () => {
    const result = updateRoleSchema.safeParse({
      listId: VALID_UUID,
      memberId: VALID_UUID_2,
      role: "owner",
    })
    expect(result.success).toBe(true)
  })

  it("fails with invalid role", () => {
    const result = updateRoleSchema.safeParse({
      listId: VALID_UUID,
      memberId: VALID_UUID_2,
      role: "admin",
    })
    expect(result.success).toBe(false)
  })
})

describe("acceptInviteSchema", () => {
  it("passes with valid UUID", () => {
    const result = acceptInviteSchema.safeParse({ listId: VALID_UUID })
    expect(result.success).toBe(true)
  })

  it("fails with non-UUID", () => {
    const result = acceptInviteSchema.safeParse({ listId: "bad" })
    expect(result.success).toBe(false)
  })
})

describe("resendInviteSchema", () => {
  it("passes with valid UUID", () => {
    const result = resendInviteSchema.safeParse({ memberId: VALID_UUID })
    expect(result.success).toBe(true)
  })

  it("fails with non-UUID", () => {
    const result = resendInviteSchema.safeParse({ memberId: "bad" })
    expect(result.success).toBe(false)
  })
})
