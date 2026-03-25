"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/supabase/auth"
import { callGemini } from "@/lib/ai/gemini"
import { buildContextQuestionsPrompt } from "@/lib/ai/prompts"
import type { ActionResult } from "@/lib/types/actions"
import { triggerSuggestions } from "@/lib/actions/suggestions"

/**
 * Generate contextual questions after a product extraction completes.
 * Called non-blocking from the Realtime handler or after extraction.
 */
export async function generateContextQuestions(
  listId: string,
  triggeredByProductId: string
): Promise<void> {
  try {
    const supabase = await createClient()

    // Fetch all completed products in the list
    const { data: products } = await supabase
      .from("products")
      .select("title, brand, price_min, price_max, specs")
      .eq("list_id", listId)
      .eq("extraction_status", "completed")
      .is("archived_at", null)

    if (!products || products.length < 1) return

    // Fetch list category
    const { data: list } = await supabase
      .from("lists")
      .select("category")
      .eq("id", listId)
      .single()

    // Fetch existing answered + pending questions to avoid repeats
    const { data: existingQuestions } = await supabase
      .from("context_questions")
      .select("question, answer, status")
      .eq("list_id", listId)

    const existingAnswers = (existingQuestions ?? [])
      .filter((q) => q.status === "answered" && q.answer)
      .map((q) => ({ question: q.question, answer: q.answer! }))

    const existingPendingQuestions = (existingQuestions ?? [])
      .filter((q) => q.status === "pending" || q.status === "dismissed")
      .map((q) => q.question)

    // Don't generate if there are already pending questions
    const pendingCount = (existingQuestions ?? []).filter(
      (q) => q.status === "pending"
    ).length
    if (pendingCount >= 3) return

    const prompt = buildContextQuestionsPrompt({
      products: products.map((p) => ({
        title: p.title,
        brand: p.brand,
        price_min: p.price_min,
        price_max: p.price_max,
        specs: (p.specs as Record<string, string>) ?? {},
      })),
      listCategory: list?.category ?? null,
      existingAnswers,
      existingPendingQuestions,
    })

    const response = await callGemini(prompt, { jsonMode: true })
    const data = JSON.parse(response)
    const questions: string[] = data.questions ?? []

    if (questions.length === 0) return

    // Insert new questions
    const rows = questions.map((q) => ({
      list_id: listId,
      question: q,
      status: "pending" as const,
      triggered_by: triggeredByProductId,
    }))

    await supabase.from("context_questions").insert(rows)
  } catch (err) {
    console.error("[generateContextQuestions] Failed:", err)
    // Non-fatal — don't break the user flow
  }
}

/**
 * Answer a context question.
 */
export async function answerContextQuestion(
  input: { questionId: string; answer: string }
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  if (!input.answer.trim()) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Answer cannot be empty", field: "answer" },
    }
  }

  const supabase = await createClient()

  try {
    const { data: question, error: fetchErr } = await supabase
      .from("context_questions")
      .select("list_id")
      .eq("id", input.questionId)
      .single()

    if (fetchErr || !question) {
      return { success: false, error: { code: "NOT_FOUND", message: "Question not found" } }
    }

    const { error } = await supabase
      .from("context_questions")
      .update({
        answer: input.answer.trim(),
        status: "answered",
        answered_at: new Date().toISOString(),
      })
      .eq("id", input.questionId)

    if (error) throw error

    revalidatePath(`/lists/${question.list_id}`)
    revalidatePath(`/lists/${question.list_id}/settings`)

    // Non-blocking: trigger smart suggestions every 5th answered question
    Promise.resolve(
      supabase
        .from("context_questions")
        .select("id", { count: "exact", head: true })
        .eq("list_id", question.list_id)
        .eq("status", "answered")
    )
      .then(({ count }) => {
        if (count && count % 5 === 0) {
          triggerSuggestions(question.list_id, "context_answered").catch(() => {})
        }
      })
      .catch(() => {})

    return { success: true, data: { id: input.questionId } }
  } catch (err) {
    console.error("[answerContextQuestion] Failed:", err)
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to save answer" } }
  }
}

/**
 * Dismiss a context question (won't be asked again).
 */
export async function dismissContextQuestion(
  input: { questionId: string }
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const supabase = await createClient()

  try {
    const { data: question, error: fetchErr } = await supabase
      .from("context_questions")
      .select("list_id")
      .eq("id", input.questionId)
      .single()

    if (fetchErr || !question) {
      return { success: false, error: { code: "NOT_FOUND", message: "Question not found" } }
    }

    const { error } = await supabase
      .from("context_questions")
      .update({ status: "dismissed" })
      .eq("id", input.questionId)

    if (error) throw error

    revalidatePath(`/lists/${question.list_id}`)
    return { success: true, data: { id: input.questionId } }
  } catch (err) {
    console.error("[dismissContextQuestion] Failed:", err)
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to dismiss" } }
  }
}

/**
 * Update an existing answer.
 */
export async function updateContextAnswer(
  input: { questionId: string; answer: string }
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const supabase = await createClient()

  try {
    const { data: question, error: fetchErr } = await supabase
      .from("context_questions")
      .select("list_id")
      .eq("id", input.questionId)
      .single()

    if (fetchErr || !question) {
      return { success: false, error: { code: "NOT_FOUND", message: "Question not found" } }
    }

    const { error } = await supabase
      .from("context_questions")
      .update({
        answer: input.answer.trim() || null,
        status: input.answer.trim() ? "answered" : "pending",
        answered_at: input.answer.trim() ? new Date().toISOString() : null,
      })
      .eq("id", input.questionId)

    if (error) throw error

    revalidatePath(`/lists/${question.list_id}/settings`)
    return { success: true, data: { id: input.questionId } }
  } catch (err) {
    console.error("[updateContextAnswer] Failed:", err)
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update" } }
  }
}

/**
 * Delete a context question entirely.
 */
export async function deleteContextQuestion(
  input: { questionId: string }
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const supabase = await createClient()

  try {
    const { data: question, error: fetchErr } = await supabase
      .from("context_questions")
      .select("list_id")
      .eq("id", input.questionId)
      .single()

    if (fetchErr || !question) {
      return { success: false, error: { code: "NOT_FOUND", message: "Question not found" } }
    }

    const { error } = await supabase
      .from("context_questions")
      .delete()
      .eq("id", input.questionId)

    if (error) throw error

    revalidatePath(`/lists/${question.list_id}/settings`)
    return { success: true, data: { id: input.questionId } }
  } catch (err) {
    console.error("[deleteContextQuestion] Failed:", err)
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete" } }
  }
}

/**
 * Un-dismiss a question (move it back to pending so it shows in the popup).
 */
export async function undismissContextQuestion(
  input: { questionId: string }
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const supabase = await createClient()

  try {
    const { data: question, error: fetchErr } = await supabase
      .from("context_questions")
      .select("list_id, status")
      .eq("id", input.questionId)
      .single()

    if (fetchErr || !question) {
      return { success: false, error: { code: "NOT_FOUND", message: "Question not found" } }
    }

    if (question.status !== "dismissed") {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Only dismissed questions can be restored" },
      }
    }

    const { error } = await supabase
      .from("context_questions")
      .update({ status: "pending" })
      .eq("id", input.questionId)

    if (error) throw error

    revalidatePath(`/lists/${question.list_id}`)
    revalidatePath(`/lists/${question.list_id}/settings`)
    return { success: true, data: { id: input.questionId } }
  } catch (err) {
    console.error("[undismissContextQuestion] Failed:", err)
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to restore" } }
  }
}
