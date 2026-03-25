import { describe, it, expect, vi, beforeEach } from "vitest"
import { TEST_USER, TEST_LIST, TEST_SUGGESTION } from "@/__tests__/helpers/fixtures"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/actions/ai", () => ({ regenerateAiComment: vi.fn(() => Promise.resolve()) }))

const mockGetAuthenticatedUser = vi.fn()
vi.mock("@/lib/supabase/auth", () => ({
  getAuthenticatedUser: (...args: unknown[]) => mockGetAuthenticatedUser(...args),
}))

const mockFrom = vi.fn()
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}))

const mockAdminInvoke = vi.fn().mockResolvedValue({ data: null, error: null })
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    functions: { invoke: mockAdminInvoke },
  })),
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

const { requestSuggestions, acceptSuggestion, dismissSuggestion } =
  await import("../suggestions")

beforeEach(() => vi.clearAllMocks())

// ========================================================================
// requestSuggestions
// ========================================================================

describe("requestSuggestions", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await requestSuggestions({ listId: TEST_LIST.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns FORBIDDEN when user is viewer", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const memberBuilder = chain({ role: "viewer" })
    mockFrom.mockReturnValue(memberBuilder)

    const result = await requestSuggestions({ listId: TEST_LIST.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("FORBIDDEN")
  })

  it("invokes edge function on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const memberBuilder = chain({ role: "editor" })
    mockFrom.mockReturnValue(memberBuilder)

    const result = await requestSuggestions({ listId: TEST_LIST.id })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.triggered).toBe(true)
    expect(mockAdminInvoke).toHaveBeenCalledWith("suggest-products", expect.any(Object))
  })

  it("returns AI_ERROR when edge function fails", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const memberBuilder = chain({ role: "editor" })
    mockFrom.mockReturnValue(memberBuilder)
    mockAdminInvoke.mockResolvedValueOnce({ data: null, error: { message: "Failed" } })

    const result = await requestSuggestions({ listId: TEST_LIST.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("AI_ERROR")
  })
})

// ========================================================================
// acceptSuggestion
// ========================================================================

describe("acceptSuggestion", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await acceptSuggestion({ suggestionId: TEST_SUGGESTION.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns NOT_FOUND when suggestion doesn't exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const suggestionBuilder = chain(null)
    mockFrom.mockReturnValue(suggestionBuilder)

    const result = await acceptSuggestion({ suggestionId: TEST_SUGGESTION.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("NOT_FOUND")
  })

  it("returns CONFLICT when suggestion is not pending", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const suggestionBuilder = chain({ ...TEST_SUGGESTION, status: "accepted" })
    mockFrom.mockReturnValue(suggestionBuilder)

    const result = await acceptSuggestion({ suggestionId: TEST_SUGGESTION.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("CONFLICT")
  })

  it("creates product from suggestion on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const suggestionBuilder = chain({ ...TEST_SUGGESTION, status: "pending" })
    const memberBuilder = chain({ role: "editor" })
    const insertBuilder = chain({ id: "new-product-from-suggestion" })
    const updateBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(suggestionBuilder) // fetch suggestion
      .mockReturnValueOnce(memberBuilder)     // verifyEditorRole
      .mockReturnValueOnce(insertBuilder)     // insert product
      .mockReturnValueOnce(updateBuilder)     // update suggestion status

    const result = await acceptSuggestion({ suggestionId: TEST_SUGGESTION.id })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.id).toBe("new-product-from-suggestion")

    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        added_via: "ai",
        extraction_status: "pending",
      })
    )
  })
})

// ========================================================================
// dismissSuggestion
// ========================================================================

describe("dismissSuggestion", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await dismissSuggestion({ suggestionId: TEST_SUGGESTION.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns NOT_FOUND when suggestion doesn't exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const builder = chain(null)
    mockFrom.mockReturnValue(builder)

    const result = await dismissSuggestion({ suggestionId: TEST_SUGGESTION.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("NOT_FOUND")
  })

  it("returns CONFLICT when suggestion is not pending", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const builder = chain({ list_id: TEST_LIST.id, status: "accepted" })
    mockFrom.mockReturnValue(builder)

    const result = await dismissSuggestion({ suggestionId: TEST_SUGGESTION.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("CONFLICT")
  })

  it("updates status to dismissed on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const fetchBuilder = chain({ list_id: TEST_LIST.id, status: "pending" })
    const memberBuilder = chain({ role: "editor" })
    const updateBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(fetchBuilder)
      .mockReturnValueOnce(memberBuilder)
      .mockReturnValueOnce(updateBuilder)

    const result = await dismissSuggestion({ suggestionId: TEST_SUGGESTION.id })

    expect(result.success).toBe(true)
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "dismissed" })
    )
  })
})
