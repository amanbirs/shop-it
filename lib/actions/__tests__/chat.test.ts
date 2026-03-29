import { describe, it, expect, vi, beforeEach } from "vitest"
import { TEST_USER, TEST_LIST } from "@/__tests__/helpers/fixtures"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const mockGetAuthenticatedUser = vi.fn()
vi.mock("@/lib/supabase/auth", () => ({
  getAuthenticatedUser: (...args: unknown[]) => mockGetAuthenticatedUser(...args),
}))

const mockCallGemini = vi.fn()
vi.mock("@/lib/ai/gemini", () => ({
  callGemini: (...args: unknown[]) => mockCallGemini(...args),
}))

const mockFrom = vi.fn()
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}))

function chain(data: unknown = null, error: unknown = null) {
  const result = { data, error }
  const builder: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const m of ["select", "insert", "update", "delete", "eq", "neq", "is", "in", "order", "limit", "filter"]) {
    builder[m] = vi.fn().mockReturnValue(builder)
  }
  builder.single = vi.fn().mockResolvedValue(result)
  builder.maybeSingle = vi.fn().mockResolvedValue(result)
  // Make the chain thenable so queries without .single() can be awaited
  builder.then = vi.fn((resolve: (v: unknown) => void) => resolve(result))
  return builder
}

const { callChatAction, loadChatMessages, updateChatInsights } = await import("../chat")

beforeEach(() => vi.clearAllMocks())

// ========================================================================
// callChatAction
// ========================================================================

describe("callChatAction", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await callChatAction({
      listId: TEST_LIST.id,
      message: "Which TV is better?",
      history: [],
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns AI response and persists messages on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)
    mockCallGemini.mockResolvedValue("The Sony is better for movies.")

    const listChain = chain({
      name: "TV Shopping",
      category: "electronics",
      budget_min: 30000,
      budget_max: 60000,
      priorities: ["picture quality"],
    })
    const productsChain = chain([])
    const opinionChain = chain(null)
    const contextChain = chain([])
    const insertChain = chain(null)

    mockFrom
      .mockReturnValueOnce(listChain)      // lists
      .mockReturnValueOnce(productsChain)   // products
      .mockReturnValueOnce(opinionChain)    // list_ai_opinions
      .mockReturnValueOnce(contextChain)    // context_questions
      .mockReturnValueOnce(insertChain)     // chat_messages insert

    const result = await callChatAction({
      listId: TEST_LIST.id,
      message: "Which TV is better?",
      history: [],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.response).toBe("The Sony is better for movies.")
    }

    // Verify messages were persisted
    expect(mockFrom).toHaveBeenCalledWith("chat_messages")
    expect(insertChain.insert).toHaveBeenCalledWith([
      expect.objectContaining({ role: "user", content: "Which TV is better?" }),
      expect.objectContaining({ role: "assistant", content: "The Sony is better for movies." }),
    ])
  })

  it("returns AI_ERROR when Gemini call fails", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)
    mockCallGemini.mockRejectedValue(new Error("API down"))

    const listChain = chain({ name: "TV", category: null, budget_min: null, budget_max: null, priorities: [] })
    const productsChain = chain([])
    const opinionChain = chain(null)
    const contextChain = chain([])

    mockFrom
      .mockReturnValueOnce(listChain)
      .mockReturnValueOnce(productsChain)
      .mockReturnValueOnce(opinionChain)
      .mockReturnValueOnce(contextChain)

    const result = await callChatAction({
      listId: TEST_LIST.id,
      message: "Hello",
      history: [],
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("AI_ERROR")
  })
})

// ========================================================================
// loadChatMessages
// ========================================================================

describe("loadChatMessages", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await loadChatMessages(TEST_LIST.id)

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns messages ordered by created_at", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const messages = [
      { id: "m1", list_id: TEST_LIST.id, user_id: TEST_USER.id, role: "user", content: "Hi", created_at: "2026-03-29T10:00:00Z" },
      { id: "m2", list_id: TEST_LIST.id, user_id: TEST_USER.id, role: "assistant", content: "Hello!", created_at: "2026-03-29T10:00:01Z" },
    ]

    const messagesChain = chain(messages)
    mockFrom.mockReturnValueOnce(messagesChain)

    const result = await loadChatMessages(TEST_LIST.id)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.messages).toHaveLength(2)
      expect(result.data.messages[0].content).toBe("Hi")
      expect(result.data.messages[1].role).toBe("assistant")
    }

    expect(messagesChain.order).toHaveBeenCalledWith("created_at", { ascending: true })
  })

  it("returns empty array when no messages exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const messagesChain = chain([])
    mockFrom.mockReturnValueOnce(messagesChain)

    const result = await loadChatMessages(TEST_LIST.id)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.messages).toEqual([])
    }
  })

  it("returns INTERNAL_ERROR when query fails", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const messagesChain = chain(null, { message: "db error" })
    mockFrom.mockReturnValueOnce(messagesChain)

    const result = await loadChatMessages(TEST_LIST.id)

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("INTERNAL_ERROR")
  })
})

// ========================================================================
// updateChatInsights
// ========================================================================

describe("updateChatInsights", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await updateChatInsights(TEST_LIST.id)

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns empty insights when no messages exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const messagesChain = chain([])
    mockFrom.mockReturnValueOnce(messagesChain)

    const result = await updateChatInsights(TEST_LIST.id)

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.insights).toBe("")
  })

  it("calls Gemini and updates list with extracted insights", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)
    mockCallGemini.mockResolvedValue("- Prefers LG for noise level\n- Budget flexible up to 5K")

    const messagesChain = chain([
      { role: "user", content: "Is the LG quieter?" },
      { role: "assistant", content: "Yes, the LG operates at 38dB vs 45dB for Samsung." },
    ])
    const listChain = chain({ name: "AC Shopping", category: "electronics", chat_insights: null })
    const updateChain = chain(null)

    mockFrom
      .mockReturnValueOnce(messagesChain)   // chat_messages select
      .mockReturnValueOnce(listChain)       // lists select
      .mockReturnValueOnce(updateChain)     // lists update

    const result = await updateChatInsights(TEST_LIST.id)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.insights).toContain("Prefers LG")
    }

    // Verify list was updated with insights
    expect(mockFrom).toHaveBeenCalledWith("lists")
    expect(updateChain.update).toHaveBeenCalledWith({
      chat_insights: expect.stringContaining("Prefers LG"),
    })
  })

  it("returns AI_ERROR when Gemini fails", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)
    mockCallGemini.mockRejectedValue(new Error("API error"))

    const messagesChain = chain([
      { role: "user", content: "Hello" },
    ])
    const listChain = chain({ name: "TV", category: null, chat_insights: null })

    mockFrom
      .mockReturnValueOnce(messagesChain)
      .mockReturnValueOnce(listChain)

    const result = await updateChatInsights(TEST_LIST.id)

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("AI_ERROR")
  })
})
