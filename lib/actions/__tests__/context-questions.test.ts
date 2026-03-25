import { describe, it, expect, vi, beforeEach } from "vitest"
import { TEST_USER, TEST_LIST, TEST_PRODUCT, TEST_CONTEXT_QUESTION } from "@/__tests__/helpers/fixtures"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/actions/suggestions", () => ({ triggerSuggestions: vi.fn(() => Promise.resolve()) }))

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
  builder.then = vi.fn((cb: (r: unknown) => void) => {
    if (cb) cb({ data, error, count: Array.isArray(data) ? data.length : 0 })
    return { catch: vi.fn() }
  })
  return builder
}

const {
  answerContextQuestion,
  dismissContextQuestion,
  updateContextAnswer,
  deleteContextQuestion,
  undismissContextQuestion,
} = await import("../context-questions")

beforeEach(() => vi.clearAllMocks())

// ========================================================================
// answerContextQuestion
// ========================================================================

describe("answerContextQuestion", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await answerContextQuestion({
      questionId: TEST_CONTEXT_QUESTION.id,
      answer: "Yes, very important",
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns VALIDATION_ERROR when answer is empty", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const result = await answerContextQuestion({
      questionId: TEST_CONTEXT_QUESTION.id,
      answer: "   ",
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("VALIDATION_ERROR")
  })

  it("returns NOT_FOUND when question doesn't exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const questionBuilder = chain(null)
    mockFrom.mockReturnValue(questionBuilder)

    const result = await answerContextQuestion({
      questionId: TEST_CONTEXT_QUESTION.id,
      answer: "Yes",
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("NOT_FOUND")
  })

  it("updates answer and status on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const questionBuilder = chain({ list_id: TEST_LIST.id })
    const updateBuilder = chain(null, null)
    const countBuilder = chain(null) // for suggestion trigger count

    mockFrom
      .mockReturnValueOnce(questionBuilder) // fetch question
      .mockReturnValueOnce(updateBuilder)   // update answer
      .mockReturnValueOnce(countBuilder)    // count for trigger

    const result = await answerContextQuestion({
      questionId: TEST_CONTEXT_QUESTION.id,
      answer: "Dolby Vision is a must-have",
    })

    expect(result.success).toBe(true)
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        answer: "Dolby Vision is a must-have",
        status: "answered",
      })
    )
  })
})

// ========================================================================
// dismissContextQuestion
// ========================================================================

describe("dismissContextQuestion", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await dismissContextQuestion({ questionId: TEST_CONTEXT_QUESTION.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns NOT_FOUND when question doesn't exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const builder = chain(null)
    mockFrom.mockReturnValue(builder)

    const result = await dismissContextQuestion({ questionId: TEST_CONTEXT_QUESTION.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("NOT_FOUND")
  })

  it("sets status to dismissed on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const questionBuilder = chain({ list_id: TEST_LIST.id })
    const updateBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(questionBuilder)
      .mockReturnValueOnce(updateBuilder)

    const result = await dismissContextQuestion({ questionId: TEST_CONTEXT_QUESTION.id })

    expect(result.success).toBe(true)
    expect(updateBuilder.update).toHaveBeenCalledWith({ status: "dismissed" })
  })
})

// ========================================================================
// updateContextAnswer
// ========================================================================

describe("updateContextAnswer", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await updateContextAnswer({
      questionId: TEST_CONTEXT_QUESTION.id,
      answer: "Updated",
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("sets status to answered when answer has content", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const questionBuilder = chain({ list_id: TEST_LIST.id })
    const updateBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(questionBuilder)
      .mockReturnValueOnce(updateBuilder)

    const result = await updateContextAnswer({
      questionId: TEST_CONTEXT_QUESTION.id,
      answer: "Updated answer",
    })

    expect(result.success).toBe(true)
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        answer: "Updated answer",
        status: "answered",
      })
    )
  })

  it("resets to pending when answer is empty", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const questionBuilder = chain({ list_id: TEST_LIST.id })
    const updateBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(questionBuilder)
      .mockReturnValueOnce(updateBuilder)

    const result = await updateContextAnswer({
      questionId: TEST_CONTEXT_QUESTION.id,
      answer: "",
    })

    expect(result.success).toBe(true)
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        answer: null,
        status: "pending",
      })
    )
  })
})

// ========================================================================
// deleteContextQuestion
// ========================================================================

describe("deleteContextQuestion", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await deleteContextQuestion({ questionId: TEST_CONTEXT_QUESTION.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("deletes the question on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const questionBuilder = chain({ list_id: TEST_LIST.id })
    const deleteBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(questionBuilder)
      .mockReturnValueOnce(deleteBuilder)

    const result = await deleteContextQuestion({ questionId: TEST_CONTEXT_QUESTION.id })

    expect(result.success).toBe(true)
  })
})

// ========================================================================
// undismissContextQuestion
// ========================================================================

describe("undismissContextQuestion", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await undismissContextQuestion({ questionId: TEST_CONTEXT_QUESTION.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns VALIDATION_ERROR when question is not dismissed", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const builder = chain({ list_id: TEST_LIST.id, status: "pending" })
    mockFrom.mockReturnValue(builder)

    const result = await undismissContextQuestion({ questionId: TEST_CONTEXT_QUESTION.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("VALIDATION_ERROR")
  })

  it("restores to pending on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const questionBuilder = chain({ list_id: TEST_LIST.id, status: "dismissed" })
    const updateBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(questionBuilder)
      .mockReturnValueOnce(updateBuilder)

    const result = await undismissContextQuestion({ questionId: TEST_CONTEXT_QUESTION.id })

    expect(result.success).toBe(true)
    expect(updateBuilder.update).toHaveBeenCalledWith({ status: "pending" })
  })
})
