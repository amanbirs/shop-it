import { describe, it, expect, vi, beforeEach } from "vitest"
import { TEST_USER, TEST_LIST, TEST_PRODUCT, TEST_PRODUCT_FAILED } from "@/__tests__/helpers/fixtures"

// --- Mocks ---
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/actions/ai", () => ({ regenerateAiComment: vi.fn(() => Promise.resolve()) }))
vi.mock("@/lib/actions/suggestions", () => ({ triggerSuggestions: vi.fn(() => Promise.resolve()) }))

const mockGetAuthenticatedUser = vi.fn()
vi.mock("@/lib/supabase/auth", () => ({
  getAuthenticatedUser: (...args: unknown[]) => mockGetAuthenticatedUser(...args),
}))

const mockFrom = vi.fn()
const mockSupabase = { from: mockFrom }
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

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
  // Support .then() for fire-and-forget chains (e.g. count queries)
  builder.then = vi.fn((cb: (r: unknown) => void) => {
    if (cb) cb({ data, error, count: Array.isArray(data) ? data.length : 0 })
    return { catch: vi.fn() }
  })
  return builder
}

const { addProduct, toggleShortlist, markPurchased, archiveProduct, retryExtraction } =
  await import("../products")

beforeEach(() => {
  vi.clearAllMocks()
})

// ========================================================================
// addProduct
// ========================================================================

describe("addProduct", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await addProduct({ listId: TEST_LIST.id, url: "https://amazon.in/dp/B123" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns VALIDATION_ERROR for invalid URL", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const result = await addProduct({ listId: TEST_LIST.id, url: "not-a-url" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("VALIDATION_ERROR")
  })

  it("returns FORBIDDEN when user is viewer", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const memberBuilder = chain({ role: "viewer" })
    mockFrom.mockReturnValue(memberBuilder)

    const result = await addProduct({ listId: TEST_LIST.id, url: "https://amazon.in/dp/B123" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("FORBIDDEN")
  })

  it("inserts product with extracted domain on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const memberBuilder = chain({ role: "editor" })
    const insertBuilder = chain({ id: "new-product-id", extraction_status: "pending" })
    const countBuilder = chain(null) // count query (fire-and-forget)

    mockFrom
      .mockReturnValueOnce(memberBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValueOnce(countBuilder)

    const result = await addProduct({ listId: TEST_LIST.id, url: "https://www.amazon.in/dp/B123" })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe("new-product-id")
      expect(result.data.extraction_status).toBe("pending")
    }

    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://www.amazon.in/dp/B123",
        domain: "amazon.in",
        extraction_status: "pending",
        added_via: "user",
      })
    )
  })

  it("returns INTERNAL_ERROR when insert fails", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const memberBuilder = chain({ role: "owner" })
    const insertBuilder = chain(null, new Error("DB fail"))

    mockFrom
      .mockReturnValueOnce(memberBuilder)
      .mockReturnValueOnce(insertBuilder)

    const result = await addProduct({ listId: TEST_LIST.id, url: "https://amazon.in/dp/B123" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("INTERNAL_ERROR")
  })
})

// ========================================================================
// toggleShortlist
// ========================================================================

describe("toggleShortlist", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await toggleShortlist({ productId: TEST_PRODUCT.id, isShortlisted: true })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns NOT_FOUND when product doesn't exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const productBuilder = chain(null) // no product found
    mockFrom.mockReturnValue(productBuilder)

    const result = await toggleShortlist({ productId: TEST_PRODUCT.id, isShortlisted: true })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("NOT_FOUND")
  })

  it("returns FORBIDDEN when user is viewer", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const productBuilder = chain({ list_id: TEST_LIST.id })
    const memberBuilder = chain({ role: "viewer" })

    mockFrom
      .mockReturnValueOnce(productBuilder) // getProductListId
      .mockReturnValueOnce(memberBuilder)  // verifyEditorRole

    const result = await toggleShortlist({ productId: TEST_PRODUCT.id, isShortlisted: true })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("FORBIDDEN")
  })

  it("updates shortlist status on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const productBuilder = chain({ list_id: TEST_LIST.id })
    const memberBuilder = chain({ role: "editor" })
    const updateBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(productBuilder)
      .mockReturnValueOnce(memberBuilder)
      .mockReturnValueOnce(updateBuilder)

    const result = await toggleShortlist({ productId: TEST_PRODUCT.id, isShortlisted: true })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe(TEST_PRODUCT.id)
      expect(result.data.isShortlisted).toBe(true)
    }
  })
})

// ========================================================================
// markPurchased
// ========================================================================

describe("markPurchased", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await markPurchased({ productId: TEST_PRODUCT.id, isPurchased: true })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("sets purchased fields when marking as purchased", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const productBuilder = chain({ list_id: TEST_LIST.id })
    const memberBuilder = chain({ role: "owner" })
    const updateBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(productBuilder)
      .mockReturnValueOnce(memberBuilder)
      .mockReturnValueOnce(updateBuilder)

    const result = await markPurchased({
      productId: TEST_PRODUCT.id,
      isPurchased: true,
      purchasedPrice: 52000,
    })

    expect(result.success).toBe(true)
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_purchased: true,
        purchased_price: 52000,
      })
    )
  })

  it("clears purchased fields when unmarking", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const productBuilder = chain({ list_id: TEST_LIST.id })
    const memberBuilder = chain({ role: "owner" })
    const updateBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(productBuilder)
      .mockReturnValueOnce(memberBuilder)
      .mockReturnValueOnce(updateBuilder)

    const result = await markPurchased({
      productId: TEST_PRODUCT.id,
      isPurchased: false,
    })

    expect(result.success).toBe(true)
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_purchased: false,
        purchased_at: null,
        purchased_price: null,
        purchase_url: null,
      })
    )
  })
})

// ========================================================================
// archiveProduct
// ========================================================================

describe("archiveProduct", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await archiveProduct({ productId: TEST_PRODUCT.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("sets archived_at on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const productBuilder = chain({ list_id: TEST_LIST.id })
    const memberBuilder = chain({ role: "owner" })
    const updateBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(productBuilder)
      .mockReturnValueOnce(memberBuilder)
      .mockReturnValueOnce(updateBuilder)

    const result = await archiveProduct({ productId: TEST_PRODUCT.id })

    expect(result.success).toBe(true)
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ archived_at: expect.any(String) })
    )
  })
})

// ========================================================================
// retryExtraction
// ========================================================================

describe("retryExtraction", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await retryExtraction({ productId: TEST_PRODUCT.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns NOT_FOUND when product doesn't exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const productBuilder = chain(null)
    mockFrom.mockReturnValue(productBuilder)

    const result = await retryExtraction({ productId: TEST_PRODUCT.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("NOT_FOUND")
  })

  it("returns VALIDATION_ERROR when extraction_status is not failed", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const productBuilder = chain({ list_id: TEST_LIST.id, extraction_status: "completed" })
    mockFrom.mockReturnValue(productBuilder)

    const result = await retryExtraction({ productId: TEST_PRODUCT.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("VALIDATION_ERROR")
  })

  it("resets to pending on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const productBuilder = chain({ list_id: TEST_LIST.id, extraction_status: "failed" })
    const memberBuilder = chain({ role: "editor" })
    const updateBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(productBuilder)
      .mockReturnValueOnce(memberBuilder)
      .mockReturnValueOnce(updateBuilder)

    const result = await retryExtraction({ productId: TEST_PRODUCT_FAILED.id })

    expect(result.success).toBe(true)
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        extraction_status: "pending",
        extraction_error: null,
      })
    )
  })
})
