import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ListSettingsForm } from "../lists/list-settings-form"

const mockUpdateList = vi.fn()
const mockArchiveList = vi.fn()
vi.mock("@/lib/actions/lists", () => ({
  updateList: (...args: unknown[]) => mockUpdateList(...args),
  archiveList: (...args: unknown[]) => mockArchiveList(...args),
}))

vi.mock("@/lib/actions/members", () => ({
  inviteMember: vi.fn(),
  removeMember: vi.fn(),
  updateRole: vi.fn(),
}))

const mockToastError = vi.fn()
const mockToastSuccess = vi.fn()
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}))

const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

const defaultList = {
  id: "list-1",
  name: "TV Shopping",
  description: "Looking for a 55 inch TV",
  category: "electronics",
  budget_min: 30000,
  budget_max: 60000,
  purchase_by: "2026-04-01",
  priorities: ["picture quality", "price"],
}

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
  list: defaultList,
  members: defaultMembers,
  currentUserId: "user-1",
  isOwner: true,
}

// Helpers
function getNameInput() {
  // The "Name" label, there might be duplicates from shadcn
  return screen.getAllByDisplayValue("TV Shopping")[0]
}

function getSaveButton() {
  return screen.getAllByRole("button").find(
    (b) => b.textContent?.includes("Save Settings")
  )!
}

describe("ListSettingsForm", () => {
  it("renders with existing list data pre-filled", () => {
    render(<ListSettingsForm {...defaultProps} />)

    expect(screen.getAllByDisplayValue("TV Shopping")[0]).toBeInTheDocument()
    expect(screen.getAllByDisplayValue("electronics")[0]).toBeInTheDocument()
    expect(screen.getAllByDisplayValue("Looking for a 55 inch TV")[0]).toBeInTheDocument()
  })

  it("renders budget fields pre-filled", () => {
    render(<ListSettingsForm {...defaultProps} />)

    expect(screen.getAllByDisplayValue("30000")[0]).toBeInTheDocument()
    expect(screen.getAllByDisplayValue("60000")[0]).toBeInTheDocument()
  })

  it("renders existing priorities as removable tags", () => {
    render(<ListSettingsForm {...defaultProps} />)

    // base-ui may duplicate elements; use getAllBy
    expect(screen.getAllByLabelText("Remove picture quality")[0]).toBeInTheDocument()
    expect(screen.getAllByLabelText("Remove price")[0]).toBeInTheDocument()
  })

  it("calls updateList when Save is clicked", async () => {
    const user = userEvent.setup()
    mockUpdateList.mockResolvedValue({ success: true, data: { id: "list-1" } })

    render(<ListSettingsForm {...defaultProps} />)

    await user.click(getSaveButton())

    await waitFor(() => {
      expect(mockUpdateList).toHaveBeenCalledWith(
        expect.objectContaining({
          listId: "list-1",
          name: "TV Shopping",
          priorities: ["picture quality", "price"],
        })
      )
    })
  })

  it("shows success toast after saving", async () => {
    const user = userEvent.setup()
    mockUpdateList.mockResolvedValue({ success: true, data: { id: "list-1" } })

    render(<ListSettingsForm {...defaultProps} />)

    await user.click(getSaveButton())

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Settings saved")
    })
  })

  it("shows error toast on save failure", async () => {
    const user = userEvent.setup()
    mockUpdateList.mockResolvedValue({
      success: false,
      error: { code: "FORBIDDEN", message: "Not allowed" },
    })

    render(<ListSettingsForm {...defaultProps} />)

    await user.click(getSaveButton())

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Not allowed")
    })
  })

  it("shows archive button for owners", () => {
    render(<ListSettingsForm {...defaultProps} />)

    // base-ui may duplicate the AlertDialogTrigger text; use getAllBy
    expect(screen.getAllByText("Archive this list")[0]).toBeInTheDocument()
  })

  it("hides archive button for non-owners", () => {
    const { container } = render(<ListSettingsForm {...defaultProps} isOwner={false} />)

    // When not owner, the entire Danger Zone section is not rendered.
    // Use container-scoped query to avoid cross-test DOM pollution.
    const archiveElements = container.querySelectorAll("*")
    const archiveTexts = Array.from(archiveElements).filter(
      (el) => el.textContent === "Archive this list" && el.children.length <= 1
    )
    // The AlertDialogTrigger has an SVG child + text, so check for the trigger button
    const archiveTrigger = container.querySelector("[data-slot='alert-dialog-trigger']")
    expect(archiveTrigger).toBeNull()
  })

  it("adds a priority tag via Enter key", async () => {
    const user = userEvent.setup()
    render(<ListSettingsForm {...defaultProps} />)

    const priorityInput = screen.getAllByPlaceholderText(/noise level/i)[0]
    await user.type(priorityInput, "build quality{Enter}")

    expect(screen.getByText("build quality")).toBeInTheDocument()
  })

  it("removes a priority tag", async () => {
    const user = userEvent.setup()
    const { container } = render(<ListSettingsForm {...defaultProps} />)

    // Use container-scoped query to avoid cross-test DOM pollution
    const removeButton = container.querySelector("[aria-label='Remove picture quality']") as HTMLElement
    expect(removeButton).toBeTruthy()
    await user.click(removeButton)

    await waitFor(() => {
      const remaining = container.querySelector("[aria-label='Remove picture quality']")
      expect(remaining).toBeNull()
    })
  })

  it("renders member name", () => {
    render(<ListSettingsForm {...defaultProps} />)

    // "Aman" appears in the member list (and possibly duplicated by base-ui portal
    // from InviteMemberDialog); use getAllBy
    expect(screen.getAllByText("Aman")[0]).toBeInTheDocument()
  })
})
