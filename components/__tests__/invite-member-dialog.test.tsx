import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { InviteMemberDialog } from "../collaboration/invite-member-dialog"

const mockInviteMember = vi.fn()
vi.mock("@/lib/actions/members", () => ({
  inviteMember: (...args: unknown[]) => mockInviteMember(...args),
  removeMember: vi.fn(),
  updateRole: vi.fn(),
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

const defaultMembers = [
  {
    id: "m1",
    user_id: "user-1",
    role: "owner",
    joined_at: "2026-03-01T00:00:00Z",
    created_at: "2026-03-01T00:00:00Z",
    profile: { name: "Aman", email: "aman@test.com", avatar_url: null },
  },
]

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  listId: "list-1",
  listName: "TV Shopping",
  members: defaultMembers,
  currentUserId: "user-1",
  isOwner: true,
}

// Helpers for shadcn/base-ui dual-element inputs.
// base-ui Dialog renders both an inert (aria-hidden) copy and the portal copy.
// The inert copy doesn't propagate events, so we must target the active one.
function getActiveElement(elements: HTMLElement[]): HTMLElement {
  const active = elements.find((el) => !el.closest("[aria-hidden=true]") && !el.closest("[data-base-ui-inert]"))
  return active ?? elements[elements.length - 1]
}

function getEmailInput() {
  return getActiveElement(screen.getAllByPlaceholderText(/email address/i))
}

function getSendButton() {
  const buttons = screen.getAllByRole("button").filter(
    (b) => b.textContent?.includes("Send Invite") || b.textContent?.includes("Sent")
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

describe("InviteMemberDialog", () => {
  it("renders dialog title with list name", () => {
    render(<InviteMemberDialog {...defaultProps} />)

    expect(screen.getAllByText(/TV Shopping/)[0]).toBeInTheDocument()
  })

  it("renders email input when user is owner", () => {
    render(<InviteMemberDialog {...defaultProps} />)

    expect(getEmailInput()).toBeInTheDocument()
  })

  it("hides invite form when user is not owner", () => {
    render(<InviteMemberDialog {...defaultProps} isOwner={false} />)

    // The invite form (with email input) should not render for non-owners.
    // base-ui may still render inert portal copies; check that no ACTIVE
    // (non-inert) email input exists.
    const emailInputs = screen.queryAllByPlaceholderText(/email address/i)
    const activeInputs = emailInputs.filter(
      (el) => !el.closest("[aria-hidden=true]") && !el.closest("[data-base-ui-inert]")
    )
    expect(activeInputs).toHaveLength(0)
  })

  it("disables send button when email is empty", () => {
    render(<InviteMemberDialog {...defaultProps} />)

    expect(getSendButton()).toBeDisabled()
  })

  it("calls inviteMember on submit", async () => {
    const user = userEvent.setup()
    mockInviteMember.mockResolvedValue({ success: true, data: { id: "m-new", status: "invited" } })

    render(<InviteMemberDialog {...defaultProps} />)

    // Use native setter to bypass base-ui dual-input char doubling
    setNativeValue(getEmailInput(), "friend@email.com")
    await user.click(getSendButton())

    await waitFor(() => {
      expect(mockInviteMember).toHaveBeenCalled()
      const args = mockInviteMember.mock.calls[0][0]
      expect(args.listId).toBe("list-1")
      expect(args.email).toContain("friend@email.com")
      expect(args.role).toBe("editor")
    })
  })

  it("shows error toast on invite failure", async () => {
    const user = userEvent.setup()
    mockInviteMember.mockResolvedValue({
      success: false,
      error: { code: "CONFLICT", message: "Already a member" },
    })

    render(<InviteMemberDialog {...defaultProps} />)

    // Use native setter to bypass base-ui dual-input char doubling
    setNativeValue(getEmailInput(), "existing@email.com")
    await user.click(getSendButton())

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Already a member")
    })
  })
})
