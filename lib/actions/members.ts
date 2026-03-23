"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/supabase/auth"
import {
  inviteMemberSchema,
  removeMemberSchema,
  updateRoleSchema,
  acceptInviteSchema,
  resendInviteSchema,
} from "@/lib/validators/members"
import type { ActionResult } from "@/lib/types/actions"

// See docs/system-guide/07-api-contracts.md § Server Actions — Members

async function verifyOwnerRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("list_members")
    .select("role")
    .eq("list_id", listId)
    .eq("user_id", userId)
    .single()
  return data?.role === "owner"
}

export async function inviteMember(
  input: unknown
): Promise<ActionResult<{ id: string; status: "invited" }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = inviteMemberSchema.safeParse(input)
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

  const { listId, email, role } = parsed.data

  // Cannot invite yourself
  if (user.email === email) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "You cannot invite yourself" },
    }
  }

  const supabase = await createClient()

  // Verify caller is owner
  if (!(await verifyOwnerRole(supabase, listId, user.id))) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only the list owner can invite members" },
    }
  }

  try {
    // Check for conflict: email already a member (joined or pending)
    const { data: existing } = await supabase
      .from("list_members")
      .select("id, profiles!inner(email)")
      .eq("list_id", listId)
      .eq("profiles.email", email)
      .maybeSingle()

    if (existing) {
      return {
        success: false,
        error: { code: "CONFLICT", message: "This person is already a member or has a pending invite" },
      }
    }

    // Look up profile by email — if exists get user_id, otherwise null
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    const targetUserId = profile?.id ?? null

    // Insert pending member row (joined_at = null means pending)
    const { data: member, error: insertError } = await supabase
      .from("list_members")
      .insert({
        list_id: listId,
        user_id: targetUserId,
        role,
        invited_by: user.id,
        joined_at: null,
      })
      .select("id")
      .single()

    if (insertError) throw insertError

    revalidatePath(`/lists/${listId}`)
    return { success: true, data: { id: member.id, status: "invited" } }
  } catch (err) {
    console.error("[inviteMember] Failed:", err)
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to invite member" },
    }
  }
}

export async function removeMember(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = removeMemberSchema.safeParse(input)
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

  const { listId, memberId } = parsed.data
  const supabase = await createClient()

  // Verify caller is owner
  if (!(await verifyOwnerRole(supabase, listId, user.id))) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only the list owner can remove members" },
    }
  }

  // Fetch the target member to verify it's not the caller
  const { data: targetMember } = await supabase
    .from("list_members")
    .select("id, user_id")
    .eq("id", memberId)
    .eq("list_id", listId)
    .single()

  if (!targetMember) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Member not found" },
    }
  }

  if (targetMember.user_id === user.id) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "You cannot remove yourself. Archive the list instead." },
    }
  }

  try {
    const { error } = await supabase
      .from("list_members")
      .delete()
      .eq("id", memberId)

    if (error) throw error

    revalidatePath(`/lists/${listId}`)
    return { success: true, data: { id: memberId } }
  } catch (err) {
    console.error("[removeMember] Failed:", err)
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to remove member" },
    }
  }
}

export async function updateRole(
  input: unknown
): Promise<ActionResult<{ id: string; role: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = updateRoleSchema.safeParse(input)
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

  const { listId, memberId, role } = parsed.data
  const supabase = await createClient()

  // Verify caller is owner
  if (!(await verifyOwnerRole(supabase, listId, user.id))) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only the list owner can change roles" },
    }
  }

  try {
    const { data: updated, error } = await supabase
      .from("list_members")
      .update({ role })
      .eq("id", memberId)
      .eq("list_id", listId)
      .select("id, role")
      .single()

    if (error) throw error

    if (!updated) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Member not found" },
      }
    }

    revalidatePath(`/lists/${listId}`)
    return { success: true, data: { id: updated.id, role: updated.role } }
  } catch (err) {
    console.error("[updateRole] Failed:", err)
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to update role" },
    }
  }
}

export async function acceptInvite(
  input: unknown
): Promise<ActionResult<{ id: string; role: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = acceptInviteSchema.safeParse(input)
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

  const { listId } = parsed.data
  const supabase = await createClient()

  try {
    // Find pending member row where the authenticated user's email matches
    // the invited profile's email and joined_at is null (pending)
    const { data: pendingMember } = await supabase
      .from("list_members")
      .select("id, role, user_id, profiles!inner(email)")
      .eq("list_id", listId)
      .is("joined_at", null)
      .eq("profiles.email", user.email!)
      .maybeSingle()

    if (!pendingMember) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "No pending invite found for your email" },
      }
    }

    // Accept the invite: set joined_at and ensure user_id is current user
    const { data: accepted, error } = await supabase
      .from("list_members")
      .update({
        joined_at: new Date().toISOString(),
        user_id: user.id,
      })
      .eq("id", pendingMember.id)
      .select("id, role")
      .single()

    if (error) throw error

    revalidatePath(`/lists/${listId}`)
    revalidatePath("/")
    return { success: true, data: { id: accepted.id, role: accepted.role } }
  } catch (err) {
    console.error("[acceptInvite] Failed:", err)
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to accept invite" },
    }
  }
}

export async function resendInvite(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = resendInviteSchema.safeParse(input)
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

  const { memberId } = parsed.data
  const supabase = await createClient()

  // Fetch the member row to get list_id and verify pending status
  const { data: member } = await supabase
    .from("list_members")
    .select("id, list_id, joined_at")
    .eq("id", memberId)
    .single()

  if (!member) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Member not found" },
    }
  }

  // Verify caller is owner of the list
  if (!(await verifyOwnerRole(supabase, member.list_id, user.id))) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only the list owner can resend invites" },
    }
  }

  // Verify member is still pending (joined_at is null)
  if (member.joined_at !== null) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "This member has already joined" },
    }
  }

  // Email sending deferred — return success for now
  // Future: trigger invite email via Supabase Auth hook or Edge Function

  revalidatePath(`/lists/${member.list_id}`)
  return { success: true, data: { id: memberId } }
}
