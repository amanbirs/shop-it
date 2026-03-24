"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/supabase/auth"
import { generateHypeTitleSchema } from "@/lib/validators/ai"
import { callGemini } from "@/lib/ai/gemini"
import { buildHypeTitlePrompt, buildAiCommentPrompt } from "@/lib/ai/prompts"
import { FALLBACK_AI_COMMENTS } from "@/lib/constants"
import type { ActionResult } from "@/lib/types/actions"

// See docs/system-guide/07-api-contracts.md § Server Actions — AI

export async function generateHypeTitle(
  input: unknown
): Promise<ActionResult<{ title: string; emoji: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = generateHypeTitleSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: firstError.message, field: firstError.path.join(".") },
    }
  }

  try {
    const prompt = buildHypeTitlePrompt(parsed.data.category)
    const response = await callGemini(prompt, { jsonMode: true })

    // Parse the JSON response
    const data = JSON.parse(response)
    const title = data.title || parsed.data.category
    const emoji = data.emoji || "📦"

    return { success: true, data: { title, emoji } }
  } catch (err) {
    console.error("[generateHypeTitle] Failed:", err)
    return {
      success: false,
      error: { code: "AI_ERROR", message: "Failed to generate title" },
    }
  }
}

/**
 * Regenerate the AI comment for a list based on its current state.
 * Called after list mutations (add/remove product, shortlist, purchase).
 * Non-blocking — failures use a static fallback.
 */
export async function regenerateAiComment(listId: string): Promise<void> {
  try {
    const supabase = await createClient()

    // Fetch list + product stats
    const { data: list } = await supabase
      .from("lists")
      .select("name, category, budget_min, budget_max")
      .eq("id", listId)
      .single()

    if (!list) return

    const { data: products } = await supabase
      .from("products")
      .select("is_shortlisted, is_purchased")
      .eq("list_id", listId)
      .is("archived_at", null)

    const stats = {
      listName: list.name,
      category: list.category,
      productCount: products?.length ?? 0,
      shortlistedCount: products?.filter((p) => p.is_shortlisted).length ?? 0,
      purchasedCount: products?.filter((p) => p.is_purchased).length ?? 0,
      budgetMin: list.budget_min,
      budgetMax: list.budget_max,
      currency: "INR",
    }

    const prompt = buildAiCommentPrompt(stats)
    const comment = await callGemini(prompt)

    // Clean up the response (remove quotes if present)
    const cleaned = comment.replace(/^["']|["']$/g, "").trim()

    await supabase
      .from("lists")
      .update({ ai_comment: cleaned })
      .eq("id", listId)

    // No revalidatePath here — this function is called non-blocking
    // from product mutations which already handle their own revalidation.
    // The updated comment will appear on the next page load or Realtime refresh.
  } catch (err) {
    console.error("[regenerateAiComment] Failed, using fallback:", err)

    // Use a random fallback
    const fallback = FALLBACK_AI_COMMENTS[
      Math.floor(Math.random() * FALLBACK_AI_COMMENTS.length)
    ]

    try {
      const supabase = await createClient()
      await supabase
        .from("lists")
        .update({ ai_comment: fallback })
        .eq("id", listId)
    } catch {
      // Silent failure — comment stays as-is
    }
  }
}
