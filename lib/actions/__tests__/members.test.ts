import { describe, it, expect, vi, beforeEach } from "vitest"
import { TEST_USER, TEST_USER_2, TEST_LIST, TEST_MEMBER_OWNER, TEST_MEMBER_EDITOR } from "@/__tests__/helpers/fixtures"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const mockGetAuthenticatedUser = vi.fn()
vi.mock("@/lib/supabase/auth", () => ({
  getAuthenticatedUser: (...args: unknown[]) => mockGetAuthenticatedUser(...args),
}))

const mockFrom = vi.fn()
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}))

function chain(data: unknown = null, error: unknown = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const m of ["select", "insert", "update", "delete", "eq", "neq", "is", "in", "order", "limit", "filter"]) {
    builder[m] = vi.fn().mockReturnValue(builder)
  }
  builder.single = vi.fn().mockResolvedValue({ data, error })
  builder.maybeSingle = vi.fn().mockResolvedValue({ data, error })
  return builder
}

const { inviteMember, removeMember, updateRole, acceptInvite, resendInvite } =
  await import("../members")

beforeEach(() => vi.clearAllMocks())

// ========================================================================
// inviteMember
// ========================================================================

describe("inviteMember", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await inviteMember({
      listId: TEST_LIST.id,
      email: "friend@email.com",
      role: "editor",
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns VALIDATION_ERROR for invalid email", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const result = await inviteMember({
      listId: TEST_LIST.id,
      email: "not-an-email",
      role: "editor",
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("VALIDATION_ERROR")
  })

  it("returns VALIDATION_ERROR when inviting yourself", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const result = await inviteMember({
      listId: TEST_LIST.id,
      email: TEST_USER.email,
      role: "editor",
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("VALIDATION_ERROR")
    if (!result.success) expect(result.error.message).toContain("yourself")
  })

  it("returns FORBIDDEN when caller is not owner", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const memberBuilder = chain({ role: "editor" })
    mockFrom.mockReturnValue(memberBuilder)

    const result = await inviteMember({
      listId: TEST_LIST.id,
      email: "friend@email.com",
      role: "editor",
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("FORBIDDEN")
  })

  it("returns CONFLICT when email is already a member", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const ownerBuilder = chain({ role: "owner" })
    const existingBuilder = chain({ id: "existing-member" }) // already exists

    mockFrom
      .mockReturnValueOnce(ownerBuilder)     // verifyOwnerRole
      .mockReturnValueOnce(existingBuilder)  // check existing

    const result = await inviteMember({
      listId: TEST_LIST.id,
      email: "friend@email.com",
      role: "editor",
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("CONFLICT")
  })

  it("creates pending member on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const ownerBuilder = chain({ role: "owner" })
    const existingBuilder = chain(null) // no existing member
    const profileBuilder = chain({ id: "target-user-id" }) // found profile
    const insertBuilder = chain({ id: "new-member-id" })

    mockFrom
      .mockReturnValueOnce(ownerBuilder)
      .mockReturnValueOnce(existingBuilder)
      .mockReturnValueOnce(profileBuilder)
      .mockReturnValueOnce(insertBuilder)

    const result = await inviteMember({
      listId: TEST_LIST.id,
      email: "friend@email.com",
      role: "editor",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe("new-member-id")
      expect(result.data.status).toBe("invited")
    }

    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "target-user-id",
        role: "editor",
        joined_at: null,
      })
    )
  })
})

// ========================================================================
// removeMember
// ========================================================================

describe("removeMember", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await removeMember({
      listId: TEST_LIST.id,
      memberId: TEST_MEMBER_EDITOR.id,
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns FORBIDDEN when caller is not owner", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const memberBuilder = chain({ role: "editor" })
    mockFrom.mockReturnValue(memberBuilder)

    const result = await removeMember({
      listId: TEST_LIST.id,
      memberId: TEST_MEMBER_EDITOR.id,
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("FORBIDDEN")
  })

  it("returns NOT_FOUND when memberId doesn't exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const ownerBuilder = chain({ role: "owner" })
    const targetBuilder = chain(null) // not found

    mockFrom
      .mockReturnValueOnce(ownerBuilder)
      .mockReturnValueOnce(targetBuilder)

    const result = await removeMember({
      listId: TEST_LIST.id,
      memberId: "aa0e8400-e29b-41d4-a716-446655449999",
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("NOT_FOUND")
  })

  it("returns VALIDATION_ERROR when trying to remove yourself", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const ownerBuilder = chain({ role: "owner" })
    const targetBuilder = chain({ id: TEST_MEMBER_OWNER.id, user_id: TEST_USER.id })

    mockFrom
      .mockReturnValueOnce(ownerBuilder)
      .mockReturnValueOnce(targetBuilder)

    const result = await removeMember({
      listId: TEST_LIST.id,
      memberId: TEST_MEMBER_OWNER.id,
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("VALIDATION_ERROR")
    if (!result.success) expect(result.error.message).toContain("yourself")
  })

  it("deletes member on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const ownerBuilder = chain({ role: "owner" })
    const targetBuilder = chain({ id: TEST_MEMBER_EDITOR.id, user_id: TEST_USER_2.id })
    const deleteBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(ownerBuilder)
      .mockReturnValueOnce(targetBuilder)
      .mockReturnValueOnce(deleteBuilder)

    const result = await removeMember({
      listId: TEST_LIST.id,
      memberId: TEST_MEMBER_EDITOR.id,
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.id).toBe(TEST_MEMBER_EDITOR.id)
  })
})

// ========================================================================
// updateRole
// ========================================================================

describe("updateRole", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await updateRole({
      listId: TEST_LIST.id,
      memberId: TEST_MEMBER_EDITOR.id,
      role: "viewer",
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns FORBIDDEN when caller is not owner", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const memberBuilder = chain({ role: "editor" })
    mockFrom.mockReturnValue(memberBuilder)

    const result = await updateRole({
      listId: TEST_LIST.id,
      memberId: TEST_MEMBER_EDITOR.id,
      role: "viewer",
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("FORBIDDEN")
  })

  it("updates role on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const ownerBuilder = chain({ role: "owner" })
    const updateBuilder = chain({ id: TEST_MEMBER_EDITOR.id, role: "viewer" })

    mockFrom
      .mockReturnValueOnce(ownerBuilder)
      .mockReturnValueOnce(updateBuilder)

    const result = await updateRole({
      listId: TEST_LIST.id,
      memberId: TEST_MEMBER_EDITOR.id,
      role: "viewer",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe(TEST_MEMBER_EDITOR.id)
      expect(result.data.role).toBe("viewer")
    }
  })
})

// ========================================================================
// acceptInvite
// ========================================================================

describe("acceptInvite", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await acceptInvite({ listId: TEST_LIST.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns NOT_FOUND when no pending invite exists", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const pendingBuilder = chain(null) // no pending invite
    mockFrom.mockReturnValue(pendingBuilder)

    const result = await acceptInvite({ listId: TEST_LIST.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("NOT_FOUND")
  })

  it("accepts invite on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const pendingBuilder = chain({ id: "aa0e8400-e29b-41d4-a716-446655449997", role: "editor", user_id: null })
    const acceptBuilder = chain({ id: "aa0e8400-e29b-41d4-a716-446655449997", role: "editor" })

    mockFrom
      .mockReturnValueOnce(pendingBuilder)
      .mockReturnValueOnce(acceptBuilder)

    const result = await acceptInvite({ listId: TEST_LIST.id })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe("aa0e8400-e29b-41d4-a716-446655449997")
      expect(result.data.role).toBe("editor")
    }
  })
})

// ========================================================================
// resendInvite
// ========================================================================

describe("resendInvite", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await resendInvite({ memberId: TEST_MEMBER_EDITOR.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns NOT_FOUND when member doesn't exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const memberBuilder = chain(null)
    mockFrom.mockReturnValue(memberBuilder)

    const result = await resendInvite({ memberId: "aa0e8400-e29b-41d4-a716-446655449998" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("NOT_FOUND")
  })

  it("returns VALIDATION_ERROR when member has already joined", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const memberBuilder = chain({
      id: TEST_MEMBER_EDITOR.id,
      list_id: TEST_LIST.id,
      joined_at: "2026-03-01T00:00:00Z",
    })
    const ownerBuilder = chain({ role: "owner" })

    mockFrom
      .mockReturnValueOnce(memberBuilder) // fetch member
      .mockReturnValueOnce(ownerBuilder)  // verify owner

    const result = await resendInvite({ memberId: TEST_MEMBER_EDITOR.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("VALIDATION_ERROR")
    if (!result.success) expect(result.error.message).toContain("already joined")
  })

  it("returns success for pending member", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const memberBuilder = chain({
      id: "aa0e8400-e29b-41d4-a716-446655449997",
      list_id: TEST_LIST.id,
      joined_at: null, // still pending
    })
    const ownerBuilder = chain({ role: "owner" })

    mockFrom
      .mockReturnValueOnce(memberBuilder)
      .mockReturnValueOnce(ownerBuilder)

    const result = await resendInvite({ memberId: "aa0e8400-e29b-41d4-a716-446655449997" })

    expect(result.success).toBe(true)
  })
})
