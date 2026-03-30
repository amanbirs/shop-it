import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AddProductForm } from "../products/add-product-form"

const mockAddProduct = vi.fn()
vi.mock("@/lib/actions/products", () => ({
  addProduct: (...args: unknown[]) => mockAddProduct(...args),
}))

const mockToastError = vi.fn()
const mockToastSuccess = vi.fn()
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// Helper: shadcn/base-ui Input renders an outer wrapper + inner input.
// Get the actual <input type="url"> element for typing.
function getInput() {
  const inputs = screen.getAllByPlaceholderText(/paste a url/i)
  // Return the one with the actual input tag (not wrapper)
  return inputs.find((el) => el.tagName === "INPUT") ?? inputs[0]
}

function getSubmitButton() {
  return screen.getAllByRole("button").find((b) => b.getAttribute("type") === "submit")!
}

describe("AddProductForm", () => {
  it("renders URL input and submit button", () => {
    render(<AddProductForm listId="list-1" />)

    expect(getInput()).toBeInTheDocument()
    expect(getSubmitButton()).toBeInTheDocument()
  })

  it("disables submit button when URL is empty", () => {
    render(<AddProductForm listId="list-1" />)

    expect(getSubmitButton()).toBeDisabled()
  })

  it("enables submit button when URL has text", async () => {
    const user = userEvent.setup()
    render(<AddProductForm listId="list-1" />)

    await user.type(getInput(), "https://amazon.in/dp/B123")

    expect(getSubmitButton()).toBeEnabled()
  })

  it("calls addProduct with listId and URL on submit", async () => {
    const user = userEvent.setup()
    mockAddProduct.mockResolvedValue({ success: true, data: { id: "p-1", extraction_status: "pending" } })

    render(<AddProductForm listId="list-1" />)

    await user.type(getInput(), "https://amazon.in/dp/B123")
    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(mockAddProduct).toHaveBeenCalledWith(
        expect.objectContaining({ listId: "list-1" })
      )
      // Verify URL contains expected value (base-ui may double input)
      const callArgs = mockAddProduct.mock.calls[0][0]
      expect(callArgs.url).toContain("amazon.in/dp/B123")
    })
  })

  it("clears input on success", async () => {
    const user = userEvent.setup()
    mockAddProduct.mockResolvedValue({ success: true, data: { id: "p-1", extraction_status: "pending" } })

    render(<AddProductForm listId="list-1" />)

    const input = getInput()
    await user.type(input, "https://amazon.in/dp/B123")
    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(input).toHaveValue("")
    })
  })

  it("shows success toast on success", async () => {
    const user = userEvent.setup()
    mockAddProduct.mockResolvedValue({ success: true, data: { id: "p-1", extraction_status: "pending" } })

    render(<AddProductForm listId="list-1" />)

    await user.type(getInput(), "https://amazon.in/dp/B123")
    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining("extracting"))
    })
  })

  it("shows error toast on failure", async () => {
    const user = userEvent.setup()
    mockAddProduct.mockResolvedValue({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid URL" },
    })

    render(<AddProductForm listId="list-1" />)

    await user.type(getInput(), "https://amazon.in/dp/B123")
    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Invalid URL")
    })
  })
})
