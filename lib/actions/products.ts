"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/supabase/auth"
import {
  addProductSchema,
  toggleShortlistSchema,
  markPurchasedSchema,
  archiveProductSchema,
  retryExtractionSchema,
} from "@/lib/validators/products"
import type { ActionResult } from "@/lib/types/actions"
import { extractDomain } from "@/lib/utils"
import { regenerateAiComment } from "@/lib/actions/ai"
import { triggerSuggestions } from "@/lib/actions/suggestions"

// See docs/system-guide/07-api-contracts.md § Revalidation Strategy

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

async function getProductListId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("products")
    .select("list_id")
    .eq("id", productId)
    .single()
  return data?.list_id ?? null
}

export async function addProduct(
  input: unknown
): Promise<ActionResult<{ id: string; extraction_status: "pending" }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = addProductSchema.safeParse(input)
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

  if (!(await verifyEditorRole(supabase, parsed.data.listId, user.id))) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "You don't have permission to add products" },
    }
  }

  try {
    const domain = extractDomain(parsed.data.url)

    const { data, error } = await supabase
      .from("products")
      .insert({
        list_id: parsed.data.listId,
        url: parsed.data.url,
        domain,
        added_by: user.id,
        added_via: "user",
        extraction_status: "pending",
        notes: parsed.data.notes ?? null,
      })
      .select("id, extraction_status")
      .single()

    if (error) throw error

    revalidatePath(`/lists/${parsed.data.listId}`)
    // Non-blocking AI comment regeneration
    regenerateAiComment(parsed.data.listId).catch(() => {})

    // Non-blocking: trigger smart suggestions every 3rd product added
    Promise.resolve(
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("list_id", parsed.data.listId)
        .is("archived_at", null)
    )
      .then(({ count }) => {
        if (count && count % 3 === 0) {
          triggerSuggestions(parsed.data.listId, "product_added").catch(() => {})
        }
      })
      .catch(() => {})

    return { success: true, data: { id: data.id, extraction_status: "pending" } }
  } catch (err) {
    console.error("[addProduct] Failed:", err)
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to add product" },
    }
  }
}

export async function toggleShortlist(
  input: unknown
): Promise<ActionResult<{ id: string; isShortlisted: boolean }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = toggleShortlistSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: firstError.message, field: firstError.path.join(".") },
    }
  }

  const supabase = await createClient()
  const listId = await getProductListId(supabase, parsed.data.productId)
  if (!listId) {
    return { success: false, error: { code: "NOT_FOUND", message: "Product not found" } }
  }

  if (!(await verifyEditorRole(supabase, listId, user.id))) {
    return { success: false, error: { code: "FORBIDDEN", message: "You don't have permission" } }
  }

  try {
    const { error } = await supabase
      .from("products")
      .update({ is_shortlisted: parsed.data.isShortlisted })
      .eq("id", parsed.data.productId)

    if (error) throw error

    revalidatePath(`/lists/${listId}`)
    regenerateAiComment(listId).catch(() => {})
    return {
      success: true,
      data: { id: parsed.data.productId, isShortlisted: parsed.data.isShortlisted },
    }
  } catch (err) {
    console.error("[toggleShortlist] Failed:", err)
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update" } }
  }
}

export async function markPurchased(
  input: unknown
): Promise<ActionResult<{ id: string; isPurchased: boolean }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = markPurchasedSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: firstError.message, field: firstError.path.join(".") },
    }
  }

  const supabase = await createClient()
  const listId = await getProductListId(supabase, parsed.data.productId)
  if (!listId) {
    return { success: false, error: { code: "NOT_FOUND", message: "Product not found" } }
  }

  if (!(await verifyEditorRole(supabase, listId, user.id))) {
    return { success: false, error: { code: "FORBIDDEN", message: "You don't have permission" } }
  }

  try {
    const updates = parsed.data.isPurchased
      ? {
          is_purchased: true,
          purchased_at: new Date().toISOString(),
          purchased_price: parsed.data.purchasedPrice ?? null,
          purchase_url: parsed.data.purchaseUrl ?? null,
        }
      : {
          is_purchased: false,
          purchased_at: null,
          purchased_price: null,
          purchase_url: null,
        }

    const { error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", parsed.data.productId)

    if (error) throw error

    revalidatePath(`/lists/${listId}`)
    regenerateAiComment(listId).catch(() => {})
    return {
      success: true,
      data: { id: parsed.data.productId, isPurchased: parsed.data.isPurchased },
    }
  } catch (err) {
    console.error("[markPurchased] Failed:", err)
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update" } }
  }
}

export async function archiveProduct(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = archiveProductSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: firstError.message, field: firstError.path.join(".") },
    }
  }

  const supabase = await createClient()
  const listId = await getProductListId(supabase, parsed.data.productId)
  if (!listId) {
    return { success: false, error: { code: "NOT_FOUND", message: "Product not found" } }
  }

  if (!(await verifyEditorRole(supabase, listId, user.id))) {
    return { success: false, error: { code: "FORBIDDEN", message: "You don't have permission" } }
  }

  try {
    const { error } = await supabase
      .from("products")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", parsed.data.productId)

    if (error) throw error

    revalidatePath(`/lists/${listId}`)
    regenerateAiComment(listId).catch(() => {})
    return { success: true, data: { id: parsed.data.productId } }
  } catch (err) {
    console.error("[archiveProduct] Failed:", err)
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to archive" } }
  }
}

export async function retryExtraction(
  input: unknown
): Promise<ActionResult<{ id: string; extraction_status: "pending" }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = retryExtractionSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: firstError.message, field: firstError.path.join(".") },
    }
  }

  const supabase = await createClient()

  // Fetch product to verify status and get list_id
  const { data: product } = await supabase
    .from("products")
    .select("list_id, extraction_status")
    .eq("id", parsed.data.productId)
    .single()

  if (!product) {
    return { success: false, error: { code: "NOT_FOUND", message: "Product not found" } }
  }

  if (product.extraction_status !== "failed") {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Can only retry failed extractions" },
    }
  }

  if (!(await verifyEditorRole(supabase, product.list_id, user.id))) {
    return { success: false, error: { code: "FORBIDDEN", message: "You don't have permission" } }
  }

  try {
    const { error } = await supabase
      .from("products")
      .update({
        extraction_status: "pending",
        extraction_error: null,
      })
      .eq("id", parsed.data.productId)

    if (error) throw error

    revalidatePath(`/lists/${product.list_id}`)
    return {
      success: true,
      data: { id: parsed.data.productId, extraction_status: "pending" },
    }
  } catch (err) {
    console.error("[retryExtraction] Failed:", err)
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to retry" } }
  }
}
