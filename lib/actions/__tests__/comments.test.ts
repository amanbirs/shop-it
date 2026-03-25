import { describe, it, expect, vi, beforeEach } from "vitest"
import { TEST_USER, TEST_USER_2, TEST_PRODUCT, TEST_COMMENT } from "@/__tests__/helpers/fixtures"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const mockGetAuthenticatedUser = vi.fn()
vi.mock("@/lib/supabase/auth", () => ({
  getAuthenticatedUser: (...args: unknown[]) => mockGetAuthenticatedUser(...args),
}))

const mockFrom = vi.fn()
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}))

function chain(data: unknown = null, error: unknown = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const m of ["select", "insert", "update", "delete", "eq", "neq", "is", "in", "order", "limit", "filter"]) {
    builder[m] = vi.fn().mockReturnValue(builder)
  }
  builder.single = vi.fn().mockResolvedValue({ data, error })
  builder.maybeSingle = vi.fn().mockResolvedValue({ data, error })
  return builder
}

const { addComment, updateComment, deleteComment } = await import("../comments")

beforeEach(() => vi.clearAllMocks())

// ========================================================================
// addComment
// ========================================================================

describe("addComment", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await addComment({
      productId: TEST_PRODUCT.id,
      content: "Nice!",
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns VALIDATION_ERROR when content is empty", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const result = await addComment({
      productId: TEST_PRODUCT.id,
      content: "",
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("VALIDATION_ERROR")
  })

  it("returns FORBIDDEN when user is viewer", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    // verifyCommentEditRole: product lookup → member lookup
    const productBuilder = chain({ list_id: "list-1" })
    const memberBuilder = chain({ role: "viewer" })

    mockFrom
      .mockReturnValueOnce(productBuilder) // products.select
      .mockReturnValueOnce(memberBuilder)  // list_members.select

    const result = await addComment({
      productId: TEST_PRODUCT.id,
      content: "Hello",
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("FORBIDDEN")
  })

  it("creates comment without parentId on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const productBuilder = chain({ list_id: "list-1" })
    const memberBuilder = chain({ role: "editor" })
    const insertBuilder = chain({
      id: "new-comment",
      content: "Great!",
      created_at: "2026-03-25T00:00:00Z",
    })

    mockFrom
      .mockReturnValueOnce(productBuilder)
      .mockReturnValueOnce(memberBuilder)
      .mockReturnValueOnce(insertBuilder)

    const result = await addComment({
      productId: TEST_PRODUCT.id,
      content: "Great!",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe("new-comment")
      expect(result.data.content).toBe("Great!")
    }
  })

  it("flattens deeply nested replies to one level", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const productBuilder = chain({ list_id: "list-1" })
    const memberBuilder = chain({ role: "editor" })
    const childCommentId = "110e8400-e29b-41d4-a716-446655440000"
    const grandparentId = "220e8400-e29b-41d4-a716-446655440000"
    // Parent comment itself has a parent (grandparent)
    const parentCommentBuilder = chain({ id: childCommentId, parent_id: grandparentId })
    const insertBuilder = chain({
      id: "330e8400-e29b-41d4-a716-446655440000",
      content: "Reply",
      created_at: "2026-03-25T00:00:00Z",
    })

    mockFrom
      .mockReturnValueOnce(productBuilder)
      .mockReturnValueOnce(memberBuilder)
      .mockReturnValueOnce(parentCommentBuilder) // fetch parent comment
      .mockReturnValueOnce(insertBuilder)

    const result = await addComment({
      productId: TEST_PRODUCT.id,
      content: "Reply",
      parentId: childCommentId,
    })

    expect(result.success).toBe(true)
    // The insert should use grandparent as parent_id (flatten)
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ parent_id: grandparentId })
    )
  })

  it("returns NOT_FOUND when parentId points to non-existent comment", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const productBuilder = chain({ list_id: "list-1" })
    const memberBuilder = chain({ role: "editor" })
    const nonexistentId = "440e8400-e29b-41d4-a716-446655440000"
    const parentCommentBuilder = chain(null) // not found

    mockFrom
      .mockReturnValueOnce(productBuilder)
      .mockReturnValueOnce(memberBuilder)
      .mockReturnValueOnce(parentCommentBuilder)

    const result = await addComment({
      productId: TEST_PRODUCT.id,
      content: "Reply",
      parentId: nonexistentId,
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("NOT_FOUND")
  })
})

// ========================================================================
// updateComment
// ========================================================================

describe("updateComment", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await updateComment({ commentId: TEST_COMMENT.id, content: "Edited" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns NOT_FOUND when comment doesn't exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const commentBuilder = chain(null)
    mockFrom.mockReturnValue(commentBuilder)

    const result = await updateComment({ commentId: TEST_COMMENT.id, content: "Edited" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("NOT_FOUND")
  })

  it("returns FORBIDDEN when user is not the comment author", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER_2) // different user

    const commentBuilder = chain({ user_id: TEST_USER.id }) // authored by TEST_USER
    mockFrom.mockReturnValue(commentBuilder)

    const result = await updateComment({ commentId: TEST_COMMENT.id, content: "Edited" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("FORBIDDEN")
  })

  it("updates content on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const commentBuilder = chain({ user_id: TEST_USER.id })
    const updateBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(commentBuilder)
      .mockReturnValueOnce(updateBuilder)

    const result = await updateComment({ commentId: TEST_COMMENT.id, content: "Edited" })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.id).toBe(TEST_COMMENT.id)
  })
})

// ========================================================================
// deleteComment
// ========================================================================

describe("deleteComment", () => {
  it("returns UNAUTHORIZED when not signed in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const result = await deleteComment({ commentId: TEST_COMMENT.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("UNAUTHORIZED")
  })

  it("returns NOT_FOUND when comment doesn't exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const commentBuilder = chain(null)
    mockFrom.mockReturnValue(commentBuilder)

    const result = await deleteComment({ commentId: TEST_COMMENT.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("NOT_FOUND")
  })

  it("allows deletion by comment author", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER)

    const commentBuilder = chain({ user_id: TEST_USER.id, product_id: TEST_PRODUCT.id })
    const deleteBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(commentBuilder)
      .mockReturnValueOnce(deleteBuilder)

    const result = await deleteComment({ commentId: TEST_COMMENT.id })

    expect(result.success).toBe(true)
  })

  it("allows deletion by list owner even if not the author", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER) // owner

    const commentBuilder = chain({ user_id: TEST_USER_2.id, product_id: TEST_PRODUCT.id })
    const productBuilder = chain({ list_id: "list-1" })
    const memberBuilder = chain({ role: "owner" })
    const deleteBuilder = chain(null, null)

    mockFrom
      .mockReturnValueOnce(commentBuilder)  // fetch comment
      .mockReturnValueOnce(productBuilder)  // fetch product.list_id
      .mockReturnValueOnce(memberBuilder)   // verify owner role
      .mockReturnValueOnce(deleteBuilder)   // delete

    const result = await deleteComment({ commentId: TEST_COMMENT.id })

    expect(result.success).toBe(true)
  })

  it("returns FORBIDDEN when user is neither author nor owner", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(TEST_USER_2) // not the author

    const commentBuilder = chain({ user_id: TEST_USER.id, product_id: TEST_PRODUCT.id })
    const productBuilder = chain({ list_id: "list-1" })
    const memberBuilder = chain({ role: "editor" }) // not owner

    mockFrom
      .mockReturnValueOnce(commentBuilder)
      .mockReturnValueOnce(productBuilder)
      .mockReturnValueOnce(memberBuilder)

    const result = await deleteComment({ commentId: TEST_COMMENT.id })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe("FORBIDDEN")
  })
})
