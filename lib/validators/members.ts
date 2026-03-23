import { z } from "zod/v4"

export const inviteMemberSchema = z.object({
  listId: z.string().uuid(),
  email: z.string().email("Must be a valid email"),
  role: z.enum(["editor", "viewer"]),
})

export const removeMemberSchema = z.object({
  listId: z.string().uuid(),
  memberId: z.string().uuid(),
})

export const updateRoleSchema = z.object({
  listId: z.string().uuid(),
  memberId: z.string().uuid(),
  role: z.enum(["owner", "editor", "viewer"]),
})

export const acceptInviteSchema = z.object({
  listId: z.string().uuid(),
})

export const resendInviteSchema = z.object({
  memberId: z.string().uuid(),
})

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
