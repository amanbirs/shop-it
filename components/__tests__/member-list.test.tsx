import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemberList } from "../collaboration/member-list"

const mockRemoveMember = vi.fn()
const mockUpdateRole = vi.fn()
vi.mock("@/lib/actions/members", () => ({
  removeMember: (...args: unknown[]) => mockRemoveMember(...args),
  updateRole: (...args: unknown[]) => mockUpdateRole(...args),
}))

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

beforeEach(() => vi.clearAllMocks())

const ownerMember = {
  id: "m1",
  user_id: "user-1",
  role: "owner",
  joined_at: "2026-03-01T00:00:00Z",
  created_at: "2026-03-01T00:00:00Z",
  profile: { name: "Aman", email: "aman@test.com", avatar_url: null },
}

const editorMember = {
  id: "m2",
  user_id: "user-2",
  role: "editor",
  joined_at: "2026-03-02T00:00:00Z",
  created_at: "2026-03-02T00:00:00Z",
  profile: { name: "Sara", email: "sara@test.com", avatar_url: null },
}

const pendingMember = {
  id: "m3",
  user_id: "user-3",
  role: "viewer",
  joined_at: null, // pending invite
  created_at: "2026-03-20T00:00:00Z",
  profile: { name: null, email: "pending@test.com", avatar_url: null },
}

describe("MemberList", () => {
  it("renders member count", () => {
    render(
      <MemberList listId="list-1" members={[ownerMember, editorMember]} currentUserId="user-1" isOwner={true} />
    )
    expect(screen.getAllByText("Members (2)")[0]).toBeInTheDocument()
  })

  it("renders member names", () => {
    render(
      <MemberList listId="list-1" members={[ownerMember, editorMember]} currentUserId="user-1" isOwner={true} />
    )
    expect(screen.getAllByText("Aman")[0]).toBeInTheDocument()
    expect(screen.getAllByText("Sara")[0]).toBeInTheDocument()
  })

  it("shows (you) for current user", () => {
    render(
      <MemberList listId="list-1" members={[ownerMember]} currentUserId="user-1" isOwner={true} />
    )
    expect(screen.getAllByText("(you)")[0]).toBeInTheDocument()
  })

  it("shows Pending badge for uninvited members", () => {
    render(
      <MemberList listId="list-1" members={[ownerMember, pendingMember]} currentUserId="user-1" isOwner={true} />
    )
    expect(screen.getAllByText("Pending")[0]).toBeInTheDocument()
  })

  it("shows email instead of name for pending members", () => {
    render(
      <MemberList listId="list-1" members={[pendingMember]} currentUserId="user-1" isOwner={true} />
    )
    expect(screen.getAllByText("pending@test.com")[0]).toBeInTheDocument()
  })

  it("shows remove button for non-current members when owner", () => {
    render(
      <MemberList listId="list-1" members={[ownerMember, editorMember]} currentUserId="user-1" isOwner={true} />
    )
    expect(screen.getAllByLabelText("Remove Sara")[0]).toBeInTheDocument()
  })

  it("hides remove button for current user", () => {
    render(
      <MemberList listId="list-1" members={[ownerMember, editorMember]} currentUserId="user-1" isOwner={true} />
    )
    expect(screen.queryAllByLabelText("Remove Aman")).toHaveLength(0)
  })

  it("hides remove button when not owner", () => {
    render(
      <MemberList listId="list-1" members={[ownerMember, editorMember]} currentUserId="user-2" isOwner={false} />
    )
    expect(screen.queryAllByLabelText("Remove Aman")).toHaveLength(0)
    expect(screen.queryAllByLabelText("Remove Sara")).toHaveLength(0)
  })

  it("shows role text for non-owner viewer", () => {
    render(
      <MemberList listId="list-1" members={[ownerMember]} currentUserId="user-1" isOwner={false} />
    )
    expect(screen.getAllByText("owner")[0]).toBeInTheDocument()
  })

  it("calls removeMember when remove button is clicked", async () => {
    const user = userEvent.setup()
    mockRemoveMember.mockResolvedValue({ success: true, data: { id: "m2" } })

    render(
      <MemberList listId="list-1" members={[ownerMember, editorMember]} currentUserId="user-1" isOwner={true} />
    )

    await user.click(screen.getAllByLabelText("Remove Sara")[0])
    expect(mockRemoveMember).toHaveBeenCalledWith({
      listId: "list-1",
      memberId: "m2",
    })
  })
})
