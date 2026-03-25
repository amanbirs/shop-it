import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProductActions } from "../products/product-actions"

const mockToggleShortlist = vi.fn()
const mockMarkPurchased = vi.fn()
const mockArchiveProduct = vi.fn()
vi.mock("@/lib/actions/products", () => ({
  toggleShortlist: (...args: unknown[]) => mockToggleShortlist(...args),
  markPurchased: (...args: unknown[]) => mockMarkPurchased(...args),
  archiveProduct: (...args: unknown[]) => mockArchiveProduct(...args),
}))

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

beforeEach(() => vi.clearAllMocks())

describe("ProductActions", () => {
  it("renders nothing when canEdit is false", () => {
    const { container } = render(
      <ProductActions productId="p-1" isShortlisted={false} isPurchased={false} canEdit={false} />
    )
    expect(container.innerHTML).toBe("")
  })

  it("renders shortlist, purchase, and archive buttons when canEdit is true", () => {
    render(
      <ProductActions productId="p-1" isShortlisted={false} isPurchased={false} canEdit={true} />
    )

    expect(screen.getAllByText("Shortlist")[0]).toBeInTheDocument()
    expect(screen.getAllByText("Mark Purchased")[0]).toBeInTheDocument()
  })

  it("shows 'Shortlisted' text when product is shortlisted", () => {
    render(
      <ProductActions productId="p-1" isShortlisted={true} isPurchased={false} canEdit={true} />
    )

    expect(screen.getAllByText("Shortlisted")[0]).toBeInTheDocument()
  })

  it("shows 'Purchased' text when product is purchased", () => {
    render(
      <ProductActions productId="p-1" isShortlisted={false} isPurchased={true} canEdit={true} />
    )

    expect(screen.getAllByText("Purchased")[0]).toBeInTheDocument()
  })

  it("calls toggleShortlist when shortlist button is clicked", async () => {
    const user = userEvent.setup()
    mockToggleShortlist.mockResolvedValue({ success: true, data: { id: "p-1", isShortlisted: true } })

    render(
      <ProductActions productId="p-1" isShortlisted={false} isPurchased={false} canEdit={true} />
    )

    const btn = screen.getAllByText("Shortlist")[0]
    await user.click(btn)

    expect(mockToggleShortlist).toHaveBeenCalledWith({
      productId: "p-1",
      isShortlisted: true,
    })
  })

  it("calls markPurchased when purchase button is clicked", async () => {
    const user = userEvent.setup()
    mockMarkPurchased.mockResolvedValue({ success: true, data: { id: "p-1", isPurchased: true } })

    render(
      <ProductActions productId="p-1" isShortlisted={false} isPurchased={false} canEdit={true} />
    )

    const btn = screen.getAllByText("Mark Purchased")[0]
    await user.click(btn)

    expect(mockMarkPurchased).toHaveBeenCalledWith({
      productId: "p-1",
      isPurchased: true,
    })
  })
})
