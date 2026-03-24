"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthenticatedUser } from "@/lib/supabase/auth"
import {
  acceptSuggestionSchema,
  dismissSuggestionSchema,
  requestSuggestionsSchema,
} from "@/lib/validators/suggestions"
import { regenerateAiComment } from "@/lib/actions/ai"
import { extractDomain } from "@/lib/utils"
import type { ActionResult } from "@/lib/types/actions"
import type { SuggestionTrigger } from "@/lib/types/database"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyEditorRole(
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
  return !!data && (data.role === "owner" || data.role === "editor")
}

async function invokeSuggestEdgeFunction(
  listId: string,
  trigger: SuggestionTrigger
): Promise<void> {
  const admin = createAdminClient()

  const { error } = await admin.functions.invoke("suggest-products", {
    body: { list_id: listId, trigger },
  })

  if (error) {
    throw new Error(`Edge Function error: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// Fire-and-forget trigger (called by automated triggers)
// ---------------------------------------------------------------------------

/**
 * Trigger smart suggestions in the background.
 * Called non-blocking from addProduct, expert-opinion, and answerContextQuestion.
 */
export async function triggerSuggestions(
  listId: string,
  trigger: SuggestionTrigger
): Promise<void> {
  try {
    await invokeSuggestEdgeFunction(listId, trigger)
  } catch (err) {
    console.error("[triggerSuggestions] Failed:", err)
    // Non-fatal — never break the user flow
  }
}

// ---------------------------------------------------------------------------
// User-facing: manual "Find more" button
// ---------------------------------------------------------------------------

export async function requestSuggestions(
  input: unknown
): Promise<ActionResult<{ triggered: boolean }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = requestSuggestionsSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: firstError.message, field: firstError.path.join(".") },
    }
  }

  const supabase = await createClient()

  if (!(await verifyEditorRole(supabase, parsed.data.listId, user.id))) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "You don't have permission" },
    }
  }

  try {
    await invokeSuggestEdgeFunction(parsed.data.listId, "manual")
    return { success: true, data: { triggered: true } }
  } catch (err) {
    console.error("[requestSuggestions] Failed:", err)
    return {
      success: false,
      error: { code: "AI_ERROR", message: "Failed to search for suggestions" },
    }
  }
}

// ---------------------------------------------------------------------------
// Accept a suggestion → add product to the list
// ---------------------------------------------------------------------------

export async function acceptSuggestion(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = acceptSuggestionSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: firstError.message, field: firstError.path.join(".") },
    }
  }

  const supabase = await createClient()

  try {
    // Fetch the suggestion
    const { data: suggestion, error: fetchErr } = await supabase
      .from("product_suggestions")
      .select("*")
      .eq("id", parsed.data.suggestionId)
      .single()

    if (fetchErr || !suggestion) {
      return { success: false, error: { code: "NOT_FOUND", message: "Suggestion not found" } }
    }

    if (suggestion.status !== "pending") {
      return {
        success: false,
        error: { code: "CONFLICT", message: "Suggestion has already been processed" },
      }
    }

    if (!(await verifyEditorRole(supabase, suggestion.list_id, user.id))) {
      return {
        success: false,
        error: { code: "FORBIDDEN", message: "You don't have permission" },
      }
    }

    // Insert a new product from the suggestion data
    const { data: product, error: insertErr } = await supabase
      .from("products")
      .insert({
        list_id: suggestion.list_id,
        url: suggestion.url,
        domain: suggestion.domain ?? extractDomain(suggestion.url),
        title: suggestion.title,
        brand: suggestion.brand,
        image_url: suggestion.image_url,
        price_min: suggestion.price_min,
        price_max: suggestion.price_max,
        currency: suggestion.currency ?? "INR",
        added_by: user.id,
        added_via: "ai",
        extraction_status: "pending",
      })
      .select("id")
      .single()

    if (insertErr) throw insertErr

    // Update suggestion status to accepted
    await supabase
      .from("product_suggestions")
      .update({
        status: "accepted",
        accepted_product_id: product.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.suggestionId)

    revalidatePath(`/lists/${suggestion.list_id}`)
    regenerateAiComment(suggestion.list_id).catch(() => {})

    return { success: true, data: { id: product.id } }
  } catch (err) {
    console.error("[acceptSuggestion] Failed:", err)
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to add suggested product" },
    }
  }
}

// ---------------------------------------------------------------------------
// Dismiss a suggestion
// ---------------------------------------------------------------------------

export async function dismissSuggestion(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = dismissSuggestionSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: firstError.message, field: firstError.path.join(".") },
    }
  }

  const supabase = await createClient()

  try {
    const { data: suggestion, error: fetchErr } = await supabase
      .from("product_suggestions")
      .select("list_id, status")
      .eq("id", parsed.data.suggestionId)
      .single()

    if (fetchErr || !suggestion) {
      return { success: false, error: { code: "NOT_FOUND", message: "Suggestion not found" } }
    }

    if (suggestion.status !== "pending") {
      return {
        success: false,
        error: { code: "CONFLICT", message: "Suggestion has already been processed" },
      }
    }

    if (!(await verifyEditorRole(supabase, suggestion.list_id, user.id))) {
      return {
        success: false,
        error: { code: "FORBIDDEN", message: "You don't have permission" },
      }
    }

    const { error } = await supabase
      .from("product_suggestions")
      .update({
        status: "dismissed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.suggestionId)

    if (error) throw error

    revalidatePath(`/lists/${suggestion.list_id}`)
    return { success: true, data: { id: parsed.data.suggestionId } }
  } catch (err) {
    console.error("[dismissSuggestion] Failed:", err)
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to dismiss suggestion" },
    }
  }
}
