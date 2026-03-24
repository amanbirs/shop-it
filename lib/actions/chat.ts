"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/supabase/auth"
import { callGemini } from "@/lib/ai/gemini"
import type { ActionResult } from "@/lib/types/actions"

type ChatInput = {
  listId: string
  message: string
  history: Array<{ role: "user" | "assistant"; content: string }>
}

export async function callChatAction(
  input: ChatInput
): Promise<ActionResult<{ response: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const supabase = await createClient()

  try {
    // Fetch list context
    const { data: list } = await supabase
      .from("lists")
      .select("name, category, budget_min, budget_max, priorities")
      .eq("id", input.listId)
      .single()

    // Fetch products
    const { data: products } = await supabase
      .from("products")
      .select("title, brand, price_min, price_max, currency, specs, pros, cons, rating, ai_verdict, ai_summary")
      .eq("list_id", input.listId)
      .eq("extraction_status", "completed")
      .is("archived_at", null)

    // Fetch existing opinion
    const { data: opinion } = await supabase
      .from("list_ai_opinions")
      .select("verdict, top_pick_reason, value_pick_reason, comparison, concerns")
      .eq("list_id", input.listId)
      .single()

    // Fetch context answers
    const { data: contextAnswers } = await supabase
      .from("context_questions")
      .select("question, answer")
      .eq("list_id", input.listId)
      .eq("status", "answered")

    // Build context for the LLM
    const productSummary = (products ?? [])
      .map(
        (p) =>
          `- ${p.title} (${p.brand}) — ${p.price_min} ${p.currency} | Rating: ${p.rating} | Verdict: ${p.ai_verdict}`
      )
      .join("\n")

    const userPrefs = (contextAnswers ?? [])
      .map((a) => `- ${a.question}: ${a.answer}`)
      .join("\n")

    const conversationHistory = input.history
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n")

    const prompt = `You are a helpful purchase advisor for the list "${list?.name ?? "Unknown"}".

Category: ${list?.category ?? "general"}
Budget: ${list?.budget_min ?? "not set"} - ${list?.budget_max ?? "not set"}
Priorities: ${(list?.priorities as string[])?.join(", ") ?? "none set"}

Products in the list:
${productSummary || "No products yet."}

${userPrefs ? `User preferences:\n${userPrefs}` : ""}

${opinion ? `Current analysis:\nVerdict: ${opinion.verdict}\nComparison: ${opinion.comparison}\nConcerns: ${opinion.concerns}` : ""}

${conversationHistory ? `Conversation so far:\n${conversationHistory}` : ""}

User: ${input.message}

Respond concisely and helpfully. Reference specific products by name. If you don't know something, say so. Keep responses under 150 words unless the user asks for detail.`

    const response = await callGemini(prompt)
    return { success: true, data: { response: response.trim() } }
  } catch (err) {
    console.error("[callChatAction] Failed:", err)
    return {
      success: false,
      error: { code: "AI_ERROR", message: "Failed to get a response" },
    }
  }
}
