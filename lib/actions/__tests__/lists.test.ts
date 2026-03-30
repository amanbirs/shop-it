import { describe, it, expect, vi, beforeEach } from "vitest"
import { TEST_USER, TEST_LIST } from "@/__tests__/helpers/fixtures"

// --- Mocks ---
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const mockGetAuthenticatedUser = vi.fn()
vi.mock("@/lib/supabase/auth", () => ({
  getAuthenticatedUser: (...args: unknown[]) => mockGetAuthenticatedUser(...args),
}))

const mockFrom = vi.fn()
const mockSupabase = { from: mockFrom }
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

// --- Helpers ---

/** Build a chainable query builder that resolves with given data/error */
function chain(data: unknown = null, error: unknown = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {}
  const methods = [
    "select", "insert", "update", "delete",
    "eq", "neq", "is", "in", "gt", "lt",
    "order", "limit", "range", "filter",
  ]
  for (const m of methods) {
    builder[m] = vi.fn().mockReturnValue(builder)
  }
  builder.single = vi.fn().mockResolvedValue({ data, error })
  builder.maybeSingle = vi.fn().mockResolvedValue({ data, error })
  return builder
}

// --- Import actions after mocks ---
const { createList, updateList, archiveList } = await import("../lists")

beforeEach(() => {
  vi.clearAllMocks()
})

// ========================================================================
// createList
// ========================================================================

describe("createList", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await createList({ name: "Test" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns VALIDATION_ERROR when name is empty", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const result = await createList({ name: "" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("VALIDATION_ERROR")
  })

  it("returns VALIDATION_ERROR when budget_min > budget_max", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const result = await createList({
      name: "Test",
      budget_min: 50000,
      budget_max: 30000,
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("VALIDATION_ERROR")
  })

  it("creates list and adds owner as member on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const listBuilder = chain({ id: "new-list-id", name: "My List" })
    const memberBuilder = chain(null, null)

    // First call to from("lists") returns listBuilder
    // Second call to from("list_members") returns memberBuilder
    mockFrom
      .mockReturnValueOnce(listBuilder)
      .mockReturnValueOnce(memberBuilder)

    const result = await createList({ name: "My List" })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe("new-list-id")
      expect(result.data.name).toBe("My List")
    }

    // Verify insert was called on lists
    expect(listBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "My List",
        owner_id: TEST_USER.id,
      })
    )

    // Verify member insert was called
    expect(memberBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: TEST_USER.id,
        role: "owner",
      })
    )
  })

  it("returns INTERNAL_ERROR when list insert fails", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const listBuilder = chain(null, new Error("DB error"))
    mockFrom.mockReturnValue(listBuilder)

    const result = await createList({ name: "Fail" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("INTERNAL_ERROR")
  })
})

// ========================================================================
// updateList
// ========================================================================

describe("updateList", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await updateList({ listId: TEST_LIST.id, name: "New" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns VALIDATION_ERROR when listId is missing", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const result = await updateList({ name: "No ID" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("VALIDATION_ERROR")
  })

  it("returns FORBIDDEN when user is a viewer", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const memberBuilder = chain({ role: "viewer" })
    mockFrom.mockReturnValue(memberBuilder)

    const result = await updateList({ listId: TEST_LIST.id, name: "New" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("FORBIDDEN")
  })

  it("returns FORBIDDEN when user is not a member", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const memberBuilder = chain(null) // no membership found
    mockFrom.mockReturnValue(memberBuilder)

    const result = await updateList({ listId: TEST_LIST.id, name: "New" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("FORBIDDEN")
  })

  it("updates list on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const memberBuilder = chain({ role: "owner" })
    const updateBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(memberBuilder) // membership check
      .mockReturnValueOnce(updateBuilder) // update call

    const result = await updateList({ listId: TEST_LIST.id, name: "Updated" })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.id).toBe(TEST_LIST.id)
  })
})

// ========================================================================
// archiveList
// ========================================================================

describe("archiveList", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await archiveList({ listId: TEST_LIST.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns FORBIDDEN when user is editor (not owner)", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const memberBuilder = chain({ role: "editor" })
    mockFrom.mockReturnValue(memberBuilder)

    const result = await archiveList({ listId: TEST_LIST.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("FORBIDDEN")
  })

  it("returns FORBIDDEN when user is not a member", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const memberBuilder = chain(null)
    mockFrom.mockReturnValue(memberBuilder)

    const result = await archiveList({ listId: TEST_LIST.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("FORBIDDEN")
  })

  it("archives list on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const memberBuilder = chain({ role: "owner" })
    const updateBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(memberBuilder)
      .mockReturnValueOnce(updateBuilder)

    const result = await archiveList({ listId: TEST_LIST.id })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.id).toBe(TEST_LIST.id)
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "archived" })
    )
  })
})
