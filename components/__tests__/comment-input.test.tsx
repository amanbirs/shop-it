import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CommentInput } from "../collaboration/comment-input"

const mockAddComment = vi.fn()
vi.mock("@/lib/actions/comments", () => ({
  addComment: (...args: unknown[]) => mockAddComment(...args),
}))

const mockToastError = vi.fn()
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// Helper: shadcn Textarea may render duplicates
function getTextarea(placeholder = /add a comment/i) {
  return screen.getAllByPlaceholderText(placeholder)[0]
}

function getSubmitButton() {
  return screen.getAllByRole("button").find((b) => b.getAttribute("type") === "submit")!
}


describe("CommentInput", () => {
  it("renders textarea with placeholder", () => {
    render(<CommentInput productId="p-1" />)

    expect(getTextarea()).toBeInTheDocument()
  })

  it("renders custom placeholder when provided", () => {
    render(<CommentInput productId="p-1" placeholder="Write a reply..." />)

    expect(getTextarea(/write a reply/i)).toBeInTheDocument()
  })

  it("disables submit when content is empty", () => {
    render(<CommentInput productId="p-1" />)

    expect(getSubmitButton()).toBeDisabled()
  })

  it("calls addComment with productId and content on submit", async () => {
    const user = userEvent.setup()
    mockAddComment.mockResolvedValue({
      success: true,
      data: { id: "c-1", content: "Great!", createdAt: "2026-03-25" },
    })

    render(<CommentInput productId="p-1" />)

    // Textarea is plain <textarea> (not base-ui), so userEvent.type works
    await user.type(getTextarea(), "Great product!")
    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(mockAddComment).toHaveBeenCalledWith({
        productId: "p-1",
        content: "Great product!",
        parentId: undefined,
      })
    })
  })

  it("clears textarea on success", async () => {
    const user = userEvent.setup()
    mockAddComment.mockResolvedValue({
      success: true,
      data: { id: "c-1", content: "Test", createdAt: "2026-03-25" },
    })

    render(<CommentInput productId="p-1" />)

    const textarea = getTextarea()
    await user.type(textarea, "Test comment")
    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(textarea).toHaveValue("")
    })
  })

  it("passes parentId when replying", async () => {
    // Reset mock to ensure clean state (avoid leaking from prior transitions)
    mockAddComment.mockReset()
    mockAddComment.mockResolvedValue({
      success: true,
      data: { id: "c-2", content: "Reply", createdAt: "2026-03-25" },
    })

    const user = userEvent.setup()
    const onCancel = vi.fn()
    const { container } = render(<CommentInput productId="p-1" parentId="parent-1" onCancel={onCancel} />)

    // Use container-scoped query to avoid cross-test element pollution
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement
    await user.type(textarea, "My reply")

    const submitBtn = container.querySelector("button[type='submit']") as HTMLElement
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockAddComment).toHaveBeenCalled()
      const args = mockAddComment.mock.calls[0][0]
      expect(args.parentId).toBe("parent-1")
    })
  })

  it("shows cancel button and replying label when parentId + onCancel are set", () => {
    const onCancel = vi.fn()
    render(<CommentInput productId="p-1" parentId="parent-1" onCancel={onCancel} />)

    // CommentInput is not inside a dialog, but base-ui may still duplicate;
    // use getAllBy to be safe
    expect(screen.getAllByText("Replying")[0]).toBeInTheDocument()
    expect(screen.getAllByText("Cancel")[0]).toBeInTheDocument()
  })

  it("calls onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const { container } = render(<CommentInput productId="p-1" parentId="parent-1" onCancel={onCancel} />)

    // Find the cancel button within this specific render's container
    const cancelBtn = container.querySelector("button[type='button']") as HTMLElement
    await user.click(cancelBtn)

    expect(onCancel).toHaveBeenCalled()
  })

  it("shows error toast on failure", async () => {
    const user = userEvent.setup()
    mockAddComment.mockResolvedValue({
      success: false,
      error: { code: "FORBIDDEN", message: "No permission" },
    })

    render(<CommentInput productId="p-1" />)

    await user.type(getTextarea(), "Test")
    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("No permission")
    })
  })
})
