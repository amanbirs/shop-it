"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/supabase/auth"
import { createListSchema, updateListSchema, archiveListSchema } from "@/lib/validators/lists"
import type { ActionResult } from "@/lib/types/actions"

// See docs/system-guide/07-api-contracts.md § Revalidation Strategy

export async function createList(
  input: unknown
): Promise<ActionResult<{ id: string; name: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = createListSchema.safeParse(input)
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

  try {
    // Insert list
    const { data: list, error: listError } = await supabase
      .from("lists")
      .insert({
        name: parsed.data.name,
        category: parsed.data.category ?? null,
        category_emoji: parsed.data.category_emoji ?? "📋",
        description: parsed.data.description ?? null,
        budget_min: parsed.data.budget_min ?? null,
        budget_max: parsed.data.budget_max ?? null,
        purchase_by: parsed.data.purchase_by ?? null,
        owner_id: user.id,
      })
      .select("id, name")
      .single()

    if (listError) throw listError

    // Insert owner as member
    const { error: memberError } = await supabase.from("list_members").insert({
      list_id: list.id,
      user_id: user.id,
      role: "owner",
      joined_at: new Date().toISOString(),
    })

    if (memberError) throw memberError

    revalidatePath("/")
    return { success: true, data: { id: list.id, name: list.name } }
  } catch (err) {
    console.error("[createList] Failed:", err)
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to create list" },
    }
  }
}

export async function updateList(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = updateListSchema.safeParse(input)
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

  const { listId, ...updates } = parsed.data
  const supabase = await createClient()

  // Verify editor+ role
  const { data: membership } = await supabase
    .from("list_members")
    .select("role")
    .eq("list_id", listId)
    .eq("user_id", user.id)
    .single()

  if (!membership || membership.role === "viewer") {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "You don't have permission to edit this list" },
    }
  }

  try {
    const { error } = await supabase
      .from("lists")
      .update(updates)
      .eq("id", listId)

    if (error) throw error

    revalidatePath("/")
    revalidatePath(`/lists/${listId}`)
    return { success: true, data: { id: listId } }
  } catch (err) {
    console.error("[updateList] Failed:", err)
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to update list" },
    }
  }
}

export async function archiveList(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = archiveListSchema.safeParse(input)
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

  // Verify owner role
  const { data: membership } = await supabase
    .from("list_members")
    .select("role")
    .eq("list_id", parsed.data.listId)
    .eq("user_id", user.id)
    .single()

  if (!membership || membership.role !== "owner") {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only the list owner can archive it" },
    }
  }

  try {
    const { error } = await supabase
      .from("lists")
      .update({
        archived_at: new Date().toISOString(),
        status: "archived",
      })
      .eq("id", parsed.data.listId)

    if (error) throw error

    revalidatePath("/")
    revalidatePath(`/lists/${parsed.data.listId}`)
    return { success: true, data: { id: parsed.data.listId } }
  } catch (err) {
    console.error("[archiveList] Failed:", err)
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to archive list" },
    }
  }
}
