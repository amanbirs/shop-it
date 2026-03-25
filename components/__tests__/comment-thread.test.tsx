import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CommentThread } from "../collaboration/comment-thread"

const mockDeleteComment = vi.fn()
vi.mock("@/lib/actions/comments", () => ({
  deleteComment: (...args: unknown[]) => mockDeleteComment(...args),
  addComment: vi.fn().mockResolvedValue({ success: true, data: { id: "c-new", content: "test", createdAt: "2026-03-25" } }),
}))

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// Mock supabase client for realtime subscription
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  })),
}))

beforeEach(() => vi.clearAllMocks())

const topComment = {
  id: "c1",
  content: "This TV looks great!",
  parent_id: null,
  created_at: new Date().toISOString(),
  user_id: "user-1",
  profile: { name: "Aman", avatar_url: null },
}

const replyComment = {
  id: "c2",
  content: "I agree, the picture quality is amazing",
  parent_id: "c1",
  created_at: new Date().toISOString(),
  user_id: "user-2",
  profile: { name: "Sara", avatar_url: null },
}

const otherComment = {
  id: "c3",
  content: "What about the LG alternative?",
  parent_id: null,
  created_at: new Date().toISOString(),
  user_id: "user-2",
  profile: { name: "Sara", avatar_url: null },
}

describe("CommentThread", () => {
  it("renders comment count", () => {
    render(
      <CommentThread
        productId="p-1"
        comments={[topComment, replyComment]}
        currentUserId="user-1"
        canEdit={true}
        isOwner={true}
      />
    )
    expect(screen.getAllByText("Comments (2)")[0]).toBeInTheDocument()
  })

  it("renders top-level comment content", () => {
    render(
      <CommentThread
        productId="p-1"
        comments={[topComment]}
        currentUserId="user-1"
        canEdit={true}
        isOwner={false}
      />
    )
    expect(screen.getAllByText("This TV looks great!")[0]).toBeInTheDocument()
  })

  it("renders comment author name", () => {
    render(
      <CommentThread
        productId="p-1"
        comments={[topComment]}
        currentUserId="user-1"
        canEdit={true}
        isOwner={false}
      />
    )
    expect(screen.getAllByText("Aman")[0]).toBeInTheDocument()
  })

  it("renders replies under their parent", () => {
    render(
      <CommentThread
        productId="p-1"
        comments={[topComment, replyComment]}
        currentUserId="user-1"
        canEdit={true}
        isOwner={false}
      />
    )
    expect(screen.getAllByText("This TV looks great!")[0]).toBeInTheDocument()
    expect(screen.getAllByText("I agree, the picture quality is amazing")[0]).toBeInTheDocument()
  })

  it("shows delete button for own comments", () => {
    render(
      <CommentThread
        productId="p-1"
        comments={[topComment]}
        currentUserId="user-1"
        canEdit={true}
        isOwner={false}
      />
    )
    expect(screen.getAllByLabelText("Delete comment by Aman")[0]).toBeInTheDocument()
  })

  it("shows delete button for all comments when user is owner", () => {
    render(
      <CommentThread
        productId="p-1"
        comments={[otherComment]}
        currentUserId="user-1"
        canEdit={true}
        isOwner={true}
      />
    )
    // user-1 is not author but is owner — should see delete
    expect(screen.getAllByLabelText("Delete comment by Sara")[0]).toBeInTheDocument()
  })

  it("hides delete button for other users' comments when not owner", () => {
    render(
      <CommentThread
        productId="p-1"
        comments={[otherComment]}
        currentUserId="user-1"
        canEdit={true}
        isOwner={false}
      />
    )
    expect(screen.queryAllByLabelText("Delete comment by Sara")).toHaveLength(0)
  })

  it("shows comment input when canEdit is true", () => {
    render(
      <CommentThread
        productId="p-1"
        comments={[]}
        currentUserId="user-1"
        canEdit={true}
        isOwner={false}
      />
    )
    expect(screen.getAllByPlaceholderText(/add a comment/i)[0]).toBeInTheDocument()
  })

  it("hides comment input when canEdit is false", () => {
    render(
      <CommentThread
        productId="p-1"
        comments={[]}
        currentUserId="user-1"
        canEdit={false}
        isOwner={false}
      />
    )
    expect(screen.queryAllByPlaceholderText(/add a comment/i)).toHaveLength(0)
  })

  it("shows Reply button for top-level comments when canEdit", () => {
    render(
      <CommentThread
        productId="p-1"
        comments={[topComment]}
        currentUserId="user-1"
        canEdit={true}
        isOwner={false}
      />
    )
    expect(screen.getAllByText("Reply")[0]).toBeInTheDocument()
  })

  it("calls deleteComment when delete is clicked", async () => {
    const user = userEvent.setup()
    mockDeleteComment.mockResolvedValue({ success: true, data: { id: "c1" } })

    render(
      <CommentThread
        productId="p-1"
        comments={[topComment]}
        currentUserId="user-1"
        canEdit={true}
        isOwner={false}
      />
    )

    await user.click(screen.getAllByLabelText("Delete comment by Aman")[0])
    expect(mockDeleteComment).toHaveBeenCalledWith({ commentId: "c1" })
  })
})
