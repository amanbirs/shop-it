import { z } from "zod/v4"

export const createCommentSchema = z.object({
  productId: z.string().uuid(),
  content: z.string().min(1, "Comment cannot be empty").max(5000),
  parentId: z.string().uuid().optional(),
})

export const updateCommentSchema = z.object({
  commentId: z.string().uuid(),
  content: z.string().min(1).max(5000),
})

export const deleteCommentSchema = z.object({
  commentId: z.string().uuid(),
})

export type CreateCommentInput = z.infer<typeof createCommentSchema>
