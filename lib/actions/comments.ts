"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/supabase/auth"
import {
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
} from "@/lib/validators/comments"
import type { ActionResult } from "@/lib/types/actions"

// See docs/system-guide/07-api-contracts.md § Comments
// No revalidation needed — Realtime handles comment updates

async function verifyCommentEditRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  userId: string
): Promise<boolean> {
  const { data: product } = await supabase
    .from("products")
    .select("list_id")
    .eq("id", productId)
    .single()
  if (!product) return false
  const { data: member } = await supabase
    .from("list_members")
    .select("role")
    .eq("list_id", product.list_id)
    .eq("user_id", userId)
    .single()
  return !!member && (member.role === "owner" || member.role === "editor")
}

export async function addComment(
  input: unknown
): Promise<ActionResult<{ id: string; content: string; createdAt: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = createCommentSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: firstError.message,
        field: firstError.path.join("."),
      },
    }
  }

  const supabase = await createClient()

  if (!(await verifyCommentEditRole(supabase, parsed.data.productId, user.id))) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "You don't have permission to comment" },
    }
  }

  // Enforce one level of threading: if parentId is provided, verify the parent
  // comment exists and is a top-level comment. If the parent itself has a parent,
  // attach this reply to the grandparent instead.
  let resolvedParentId: string | null = null
  if (parsed.data.parentId) {
    const { data: parentComment } = await supabase
      .from("comments")
      .select("id, parent_id")
      .eq("id", parsed.data.parentId)
      .single()

    if (!parentComment) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Parent comment not found" },
      }
    }

    // If parent already has a parent, flatten to one level by replying to the grandparent
    resolvedParentId = parentComment.parent_id === null
      ? parentComment.id
      : parentComment.parent_id
  }

  try {
    const { data, error } = await supabase
      .from("comments")
      .insert({
        product_id: parsed.data.productId,
        user_id: user.id,
        content: parsed.data.content,
        parent_id: resolvedParentId,
      })
      .select("id, content, created_at")
      .single()

    if (error) throw error

    return {
      success: true,
      data: { id: data.id, content: data.content, createdAt: data.created_at },
    }
  } catch (err) {
    console.error("[addComment] Failed:", err)
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to add comment" },
    }
  }
}

export async function updateComment(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = updateCommentSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: firstError.message,
        field: firstError.path.join("."),
      },
    }
  }

  const supabase = await createClient()

  // Verify the current user is the comment author
  const { data: comment } = await supabase
    .from("comments")
    .select("user_id")
    .eq("id", parsed.data.commentId)
    .single()

  if (!comment) {
    return { success: false, error: { code: "NOT_FOUND", message: "Comment not found" } }
  }

  if (comment.user_id !== user.id) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "You can only edit your own comments" },
    }
  }

  try {
    const { error } = await supabase
      .from("comments")
      .update({ content: parsed.data.content })
      .eq("id", parsed.data.commentId)

    if (error) throw error

    return { success: true, data: { id: parsed.data.commentId } }
  } catch (err) {
    console.error("[updateComment] Failed:", err)
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to update comment" },
    }
  }
}

export async function deleteComment(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = deleteCommentSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: firstError.message,
        field: firstError.path.join("."),
      },
    }
  }

  const supabase = await createClient()

  // Fetch the comment to check authorship and get the product_id for owner check
  const { data: comment } = await supabase
    .from("comments")
    .select("user_id, product_id")
    .eq("id", parsed.data.commentId)
    .single()

  if (!comment) {
    return { success: false, error: { code: "NOT_FOUND", message: "Comment not found" } }
  }

  // Allow deletion if user is the comment author OR an owner of the product's list
  if (comment.user_id !== user.id) {
    const { data: product } = await supabase
      .from("products")
      .select("list_id")
      .eq("id", comment.product_id)
      .single()

    if (!product) {
      return { success: false, error: { code: "NOT_FOUND", message: "Product not found" } }
    }

    const { data: member } = await supabase
      .from("list_members")
      .select("role")
      .eq("list_id", product.list_id)
      .eq("user_id", user.id)
      .single()

    if (!member || member.role !== "owner") {
      return {
        success: false,
        error: { code: "FORBIDDEN", message: "You don't have permission to delete this comment" },
      }
    }
  }

  try {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", parsed.data.commentId)

    if (error) throw error

    return { success: true, data: { id: parsed.data.commentId } }
  } catch (err) {
    console.error("[deleteComment] Failed:", err)
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to delete comment" },
    }
  }
}
