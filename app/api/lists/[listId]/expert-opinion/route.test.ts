import { describe, it, expect, vi, beforeEach } from "vitest"
import { TEST_USER, TEST_LIST, TEST_PRODUCT, TEST_PRODUCT_2 } from "@/__tests__/helpers/fixtures"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/actions/suggestions", () => ({ triggerSuggestions: vi.fn(() => Promise.resolve()) }))

const mockCallGemini = vi.fn()
vi.mock("@/lib/ai/gemini", () => ({
  callGemini: (...args: unknown[]) => mockCallGemini(...args),
}))

const mockFrom = vi.fn()
const mockAuthGetUser = vi.fn()
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
      auth: { getUser: mockAuthGetUser },
    })
  ),
}))

const mockAdminFrom = vi.fn()
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}))

function chain(data: unknown = null, error: unknown = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "is", "in", "order", "limit", "filter",
  ]) {
    builder[m] = vi.fn().mockReturnValue(builder)
  }
  builder.single = vi.fn().mockResolvedValue({ data, error })
  builder.maybeSingle = vi.fn().mockResolvedValue({ data, error })
  // Make the chain thenable for queries that don't end with .single()
  builder.then = vi.fn((resolve: (v: unknown) => void) => {
    resolve({ data, error, count: Array.isArray(data) ? data.length : 0 })
  })
  return builder
}

const { POST } = await import("./route")

beforeEach(() => vi.clearAllMocks())

function makeRequest() {
  return new Request("http://localhost/api/lists/test/expert-opinion", { method: "POST" })
}

function makeParams() {
  return { params: Promise.resolve({ listId: TEST_LIST.id }) }
}

describe("POST /api/lists/[listId]/expert-opinion", () => {
  it("returns 401 when user is not signed in", async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const response = await POST(makeRequest(), makeParams())
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe("UNAUTHORIZED")
  })

  it("returns 404 when user is not a member", async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: TEST_USER }, error: null })

    const memberBuilder = chain(null) // not a member
    mockFrom.mockReturnValue(memberBuilder)

    const response = await POST(makeRequest(), makeParams())
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error.code).toBe("NOT_FOUND")
  })

  it("returns 422 when fewer than 2 completed products", async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: TEST_USER }, error: null })

    const memberBuilder = chain({ role: "editor" })
    const productsBuilder = chain([TEST_PRODUCT]) // only 1 product

    mockFrom
      .mockReturnValueOnce(memberBuilder)
      .mockReturnValueOnce(productsBuilder)

    const response = await POST(makeRequest(), makeParams())
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error.code).toBe("VALIDATION_ERROR")
  })

  it("returns 200 with expert opinion on success", async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: TEST_USER }, error: null })

    const memberBuilder = chain({ role: "editor" })
    const productsBuilder = chain([
      { ...TEST_PRODUCT, specs: {}, pros: [], cons: [] },
      { ...TEST_PRODUCT_2, specs: {}, pros: [], cons: [] },
    ])
    const listBuilder = chain({
      budget_min: 30000,
      budget_max: 60000,
      purchase_by: null,
      category: "electronics",
      priorities: [],
    })
    const profileBuilder = chain({ context: {} })

    mockFrom
      .mockReturnValueOnce(memberBuilder)   // membership
      .mockReturnValueOnce(productsBuilder) // products
      .mockReturnValueOnce(listBuilder)     // list metadata
      .mockReturnValueOnce(profileBuilder)  // profile context

    const opinion = {
      top_pick: TEST_PRODUCT.id,
      top_pick_reason: "Best value",
      value_pick: TEST_PRODUCT_2.id,
      value_pick_reason: "Premium OLED",
      summary: "Both great options",
      comparison: "Sony vs LG",
      concerns: "Price gap",
      verdict: "Go Sony",
    }
    mockCallGemini.mockResolvedValue(JSON.stringify(opinion))

    const upsertBuilder = chain({ ...opinion, list_id: TEST_LIST.id })
    mockAdminFrom.mockReturnValue(upsertBuilder)

    const response = await POST(makeRequest(), makeParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockCallGemini).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ jsonMode: true, maxTokens: 8192 })
    )
  })

  it("returns 500 when callGemini throws", async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: TEST_USER }, error: null })

    const memberBuilder = chain({ role: "editor" })
    const productsBuilder = chain([
      { ...TEST_PRODUCT, specs: {}, pros: [], cons: [] },
      { ...TEST_PRODUCT_2, specs: {}, pros: [], cons: [] },
    ])
    const listBuilder = chain({ budget_min: null, budget_max: null, purchase_by: null, category: null, priorities: [] })
    const profileBuilder = chain({ context: {} })

    mockFrom
      .mockReturnValueOnce(memberBuilder)
      .mockReturnValueOnce(productsBuilder)
      .mockReturnValueOnce(listBuilder)
      .mockReturnValueOnce(profileBuilder)

    mockCallGemini.mockRejectedValue(new Error("Gemini timeout"))

    const response = await POST(makeRequest(), makeParams())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error.code).toBe("AI_ERROR")
  })
})
