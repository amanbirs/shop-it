import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CreateListDialog } from "../lists/create-list-dialog"

const mockCreateList = vi.fn()
vi.mock("@/lib/actions/lists", () => ({
  createList: (...args: unknown[]) => mockCreateList(...args),
}))

const mockGenerateHypeTitle = vi.fn()
vi.mock("@/lib/actions/ai", () => ({
  generateHypeTitle: (...args: unknown[]) => mockGenerateHypeTitle(...args),
}))

const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
}))

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockGenerateHypeTitle.mockResolvedValue({ success: false, error: { code: "AI_ERROR", message: "skip" } })
})

// Helpers for shadcn/base-ui dual-element inputs.
// base-ui Dialog renders both an inert (aria-hidden) copy and the portal copy.
// The inert copy doesn't propagate events, so we must target the active one.
function getActiveElement(elements: HTMLElement[]): HTMLElement {
  // Return the element that is NOT inside an aria-hidden ancestor
  const active = elements.find((el) => !el.closest("[aria-hidden=true]") && !el.closest("[data-base-ui-inert]"))
  return active ?? elements[elements.length - 1]
}

function getCategoryInput() {
  return getActiveElement(screen.getAllByPlaceholderText(/e\.g\., TV/i))
}

function getNameInput() {
  return getActiveElement(screen.getAllByPlaceholderText(/name your list/i))
}

function getSubmitButton() {
  const buttons = screen.getAllByRole("button").filter(
    (b) => b.textContent?.includes("Create List") || b.textContent?.includes("Creating")
  )
  return getActiveElement(buttons)
}

// Set value on a React controlled input using native setter to
// ensure React's onChange fires correctly through base-ui wrappers
function setNativeValue(element: HTMLElement, value: string) {
  const proto =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set
  nativeSetter?.call(element, value)
  element.dispatchEvent(new Event("input", { bubbles: true }))
  element.dispatchEvent(new Event("change", { bubbles: true }))
}

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
}

describe("CreateListDialog", () => {
  it("renders dialog title when open", () => {
    render(<CreateListDialog {...defaultProps} />)

    expect(screen.getAllByText("Create a new list")[0]).toBeInTheDocument()
  })

  it("renders category and name inputs", () => {
    render(<CreateListDialog {...defaultProps} />)

    expect(getCategoryInput()).toBeInTheDocument()
    expect(getNameInput()).toBeInTheDocument()
  })

  it("disables submit when both category and name are empty", () => {
    render(<CreateListDialog {...defaultProps} />)

    expect(getSubmitButton()).toBeDisabled()
  })

  it("enables submit when name has text", async () => {
    render(<CreateListDialog {...defaultProps} />)

    // Use native setter to bypass base-ui dual-input doubling with userEvent.type
    setNativeValue(getNameInput(), "TV")

    await waitFor(() => {
      expect(getSubmitButton()).toBeEnabled()
    })
  })

  it("calls createList on submit", async () => {
    const user = userEvent.setup()
    mockCreateList.mockResolvedValue({ success: true, data: { id: "new-id", name: "My TV List" } })

    render(<CreateListDialog {...defaultProps} />)

    // Use native setter to set value without base-ui char doubling
    setNativeValue(getNameInput(), "My TV List")
    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(mockCreateList).toHaveBeenCalled()
      const args = mockCreateList.mock.calls[0][0]
      expect(args.name).toContain("TV List")
    })
  })

  it("shows error message on failed submission", async () => {
    const user = userEvent.setup()
    mockCreateList.mockResolvedValue({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Name is required" },
    })

    render(<CreateListDialog {...defaultProps} />)

    setNativeValue(getNameInput(), "Test")
    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(screen.getAllByText("Name is required")[0]).toBeInTheDocument()
    })
  })

  it("navigates to new list on success", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockCreateList.mockResolvedValue({ success: true, data: { id: "list-123", name: "TV" } })

    render(<CreateListDialog {...defaultProps} />)

    setNativeValue(getNameInput(), "Test")
    await user.click(getSubmitButton())

    await vi.advanceTimersByTimeAsync(500)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/lists/list-123")
    })

    vi.useRealTimers()
  })

  it("shows optional details when toggle is clicked", async () => {
    const user = userEvent.setup()
    render(<CreateListDialog {...defaultProps} />)

    // base-ui duplicates "Optional details" text; pick the first
    await user.click(screen.getAllByText("Optional details")[0])

    // Check for the description textarea which is inside the optional section
    await waitFor(() => {
      expect(screen.getAllByPlaceholderText(/looking for/i).length).toBeGreaterThan(0)
    })
  })
})
