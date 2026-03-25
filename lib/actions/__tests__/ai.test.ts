import { describe, it, expect, vi, beforeEach } from "vitest"
import { TEST_USER, TEST_LIST } from "@/__tests__/helpers/fixtures"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const mockGetAuthenticatedUser = vi.fn()
vi.mock("@/lib/supabase/auth", () => ({
  getAuthenticatedUser: (...args: unknown[]) => mockGetAuthenticatedUser(...args),
}))

const mockFrom = vi.fn()
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}))

const mockCallGemini = vi.fn()
vi.mock("@/lib/ai/gemini", () => ({
  callGemini: (...args: unknown[]) => mockCallGemini(...args),
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

const { generateHypeTitle, regenerateAiComment } = await import("../ai")

beforeEach(() => vi.clearAllMocks())

// ========================================================================
// generateHypeTitle
// ========================================================================

describe("generateHypeTitle", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await generateHypeTitle({ category: "TV" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns VALIDATION_ERROR when category is empty", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const result = await generateHypeTitle({ category: "" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("VALIDATION_ERROR")
  })

  it("returns parsed title and emoji from Gemini", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)
    mockCallGemini.mockResolvedValue('{"title": "The Great TV Showdown", "emoji": "📺"}')

    const result = await generateHypeTitle({ category: "TV" })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe("The Great TV Showdown")
      expect(result.data.emoji).toBe("📺")
    }
  })

  it("uses fallback values when Gemini JSON is incomplete", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)
    mockCallGemini.mockResolvedValue('{}')

    const result = await generateHypeTitle({ category: "TV" })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe("TV") // falls back to category
      expect(result.data.emoji).toBe("📦") // default
    }
  })

  it("returns AI_ERROR when callGemini throws", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)
    mockCallGemini.mockRejectedValue(new Error("API down"))

    const result = await generateHypeTitle({ category: "TV" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("AI_ERROR")
  })
})

// ========================================================================
// regenerateAiComment
// ========================================================================

describe("regenerateAiComment", () => {
  it("fetches list + products and updates ai_comment", async () => {
    const listBuilder = chain({
      name: "TV Shopping",
      category: "electronics",
      budget_min: 30000,
      budget_max: 60000,
    })
    const productsBuilder = {
      ...chain([
        { is_shortlisted: true, is_purchased: false },
        { is_shortlisted: false, is_purchased: false },
      ]),
      // Override single to not be called — products returns array
    }
    const updateBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(listBuilder)      // lists
      .mockReturnValueOnce(productsBuilder)   // products
      .mockReturnValueOnce(updateBuilder)     // update

    mockCallGemini.mockResolvedValue('"Research mode activated"')

    await regenerateAiComment(TEST_LIST.id)

    expect(mockCallGemini).toHaveBeenCalled()
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ ai_comment: "Research mode activated" })
    )
  })

  it("does nothing if list is not found", async () => {
    const listBuilder = chain(null) // not found
    mockFrom.mockReturnValue(listBuilder)

    await regenerateAiComment(TEST_LIST.id)

    expect(mockCallGemini).not.toHaveBeenCalled()
  })

  it("strips surrounding quotes from Gemini response", async () => {
    const listBuilder = chain({ name: "Test", category: null, budget_min: null, budget_max: null })
    const productsBuilder = chain([])
    const updateBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(listBuilder)
      .mockReturnValueOnce(productsBuilder)
      .mockReturnValueOnce(updateBuilder)

    mockCallGemini.mockResolvedValue('"The hunt begins."')

    await regenerateAiComment(TEST_LIST.id)

    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ ai_comment: "The hunt begins." })
    )
  })
})
