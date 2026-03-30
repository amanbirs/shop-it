import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"

// Track subscribed handlers
let productChangeHandler: ((payload: unknown) => void) | null = null
let suggestionChangeHandler: (() => void) | null = null

const mockRefresh = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: mockRefresh })),
}))

const mockRemoveChannel = vi.fn()
const mockChannel = vi.fn((name: string) => ({
  on: vi.fn((_event: string, _opts: unknown, handler: (payload: unknown) => void) => {
    if (name.includes("products")) {
      productChangeHandler = handler
    } else {
      suggestionChangeHandler = handler as unknown as () => void
    }
    return {
      subscribe: vi.fn().mockReturnValue({ id: name }),
    }
  }),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}))

const mockGenerateContextQuestions = vi.fn<(listId: string, productId: string) => Promise<void>>(() => Promise.resolve())
vi.mock("@/lib/actions/context-questions", () => ({
  generateContextQuestions: (listId: string, productId: string) =>
    mockGenerateContextQuestions(listId, productId),
}))

const { useRealtimeProducts } = await import("../../hooks/use-realtime-products")

beforeEach(() => {
  vi.clearAllMocks()
  productChangeHandler = null
  suggestionChangeHandler = null
})

describe("useRealtimeProducts", () => {
  it("subscribes to products channel for the listId", () => {
    renderHook(() => useRealtimeProducts("list-123"))

    expect(mockChannel).toHaveBeenCalledWith("list-products-list-123")
  })

  it("subscribes to suggestions channel for the listId", () => {
    renderHook(() => useRealtimeProducts("list-123"))

    expect(mockChannel).toHaveBeenCalledWith("list-suggestions-list-123")
  })

  it("calls router.refresh() on product change", () => {
    renderHook(() => useRealtimeProducts("list-123"))

    productChangeHandler?.({ new: { id: "p1" }, old: {} })

    expect(mockRefresh).toHaveBeenCalled()
  })

  it("calls router.refresh() on suggestion change", () => {
    renderHook(() => useRealtimeProducts("list-123"))

    suggestionChangeHandler?.()

    expect(mockRefresh).toHaveBeenCalled()
  })

  it("calls generateContextQuestions when extraction completes", () => {
    renderHook(() => useRealtimeProducts("list-123"))

    productChangeHandler?.({
      new: { id: "product-1", extraction_status: "completed" },
      old: { extraction_status: "pending" },
    })

    expect(mockGenerateContextQuestions).toHaveBeenCalledWith("list-123", "product-1")
  })

  it("does NOT call generateContextQuestions when status stays completed", () => {
    renderHook(() => useRealtimeProducts("list-123"))

    productChangeHandler?.({
      new: { id: "product-1", extraction_status: "completed" },
      old: { extraction_status: "completed" },
    })

    expect(mockGenerateContextQuestions).not.toHaveBeenCalled()
  })

  it("does NOT call generateContextQuestions when status changes to failed", () => {
    renderHook(() => useRealtimeProducts("list-123"))

    productChangeHandler?.({
      new: { id: "product-1", extraction_status: "failed" },
      old: { extraction_status: "pending" },
    })

    expect(mockGenerateContextQuestions).not.toHaveBeenCalled()
  })

  it("removes channels on unmount", () => {
    const { unmount } = renderHook(() => useRealtimeProducts("list-123"))

    unmount()

    expect(mockRemoveChannel).toHaveBeenCalledTimes(3)
  })
})
