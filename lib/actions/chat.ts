"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/supabase/auth"
import { callGemini, callGeminiWithGrounding } from "@/lib/ai/gemini"
import { buildChatInsightsPrompt } from "@/lib/ai/prompts"
import { extractDomain } from "@/lib/utils"
import type { ActionResult } from "@/lib/types/actions"
import type { ChatMessage } from "@/lib/types/database"
import type { SearchResult } from "@/lib/actions/search"

type ChatInput = {
  listId: string
  message: string
  history: Array<{ role: "user" | "assistant"; content: string }>
}

type ChatResponse = {
  response: string
  products?: SearchResult[]
}

// ---------------------------------------------------------------------------
// Discovery intent detection
// ---------------------------------------------------------------------------

const DISCOVERY_PATTERNS = [
  /\b(find|search|look for|suggest|recommend|discover|show me|get me)\b/i,
  /\b(what(?:'s| is| are) (?:a |the )?(?:good|best|top|great|cheap|affordable|popular))\b/i,
  /\b(alternatives? to|similar to|something like|options? for)\b/i,
  /\b(where (?:can i|to|should i) buy)\b/i,
  /\b(any (?:good|other|more) (?:options?|products?|choices?))\b/i,
]

function isDiscoveryIntent(message: string): boolean {
  return DISCOVERY_PATTERNS.some((p) => p.test(message))
}

// ---------------------------------------------------------------------------
// callChatAction
// ---------------------------------------------------------------------------

export async function callChatAction(
  input: ChatInput
): Promise<ActionResult<ChatResponse>> {
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
      .select("title, brand, url, price_min, price_max, currency, specs, pros, cons, rating, ai_verdict, ai_summary")
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

    const existingUrls = (products ?? []).map((p) => p.url)

    const userPrefs = (contextAnswers ?? [])
      .map((a) => `- ${a.question}: ${a.answer}`)
      .join("\n")

    const conversationHistory = input.history
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n")

    const discovery = isDiscoveryIntent(input.message)

    if (discovery) {
      // Discovery mode: use grounding to find real products
      const result = await handleDiscoveryChat({
        message: input.message,
        listName: list?.name ?? "Unknown",
        category: list?.category ?? "general",
        budgetMin: list?.budget_min,
        budgetMax: list?.budget_max,
        priorities: list?.priorities as string[] | null,
        productSummary,
        existingUrls,
        userPrefs,
        conversationHistory,
      })

      // Persist messages
      await supabase.from("chat_messages").insert([
        {
          list_id: input.listId,
          user_id: user.id,
          role: "user",
          content: input.message,
        },
        {
          list_id: input.listId,
          user_id: user.id,
          role: "assistant",
          content: result.response,
        },
      ])

      return { success: true, data: result }
    }

    // Standard chat mode: no grounding needed
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
    const trimmedResponse = response.trim()

    // Persist both messages to the database
    await supabase.from("chat_messages").insert([
      {
        list_id: input.listId,
        user_id: user.id,
        role: "user",
        content: input.message,
      },
      {
        list_id: input.listId,
        user_id: user.id,
        role: "assistant",
        content: trimmedResponse,
      },
    ])

    return { success: true, data: { response: trimmedResponse } }
  } catch (err) {
    console.error("[callChatAction] Failed:", err)
    return {
      success: false,
      error: { code: "AI_ERROR", message: "Failed to get a response" },
    }
  }
}

// ---------------------------------------------------------------------------
// Discovery chat handler (with Google Search grounding)
// ---------------------------------------------------------------------------

async function handleDiscoveryChat(ctx: {
  message: string
  listName: string
  category: string
  budgetMin: number | null | undefined
  budgetMax: number | null | undefined
  priorities: string[] | null
  productSummary: string
  existingUrls: string[]
  userPrefs: string
  conversationHistory: string
}): Promise<ChatResponse> {
  const currency = "INR"

  const prompt = `You are a purchase advisor for the list "${ctx.listName}". The user is asking you to help them find products. Use Google Search to find real, currently available products.

Category: ${ctx.category}
${ctx.budgetMin ? `Budget: ${ctx.budgetMin}-${ctx.budgetMax} ${currency}` : ""}
${ctx.priorities?.length ? `Priorities: ${ctx.priorities.join(", ")}` : ""}

${ctx.productSummary ? `Products already in the list:\n${ctx.productSummary}\n\nUse this context — suggest products that complement or provide alternatives to what the user already has. Reference existing products by name in your reasoning.` : "No products in the list yet."}

${ctx.userPrefs ? `User preferences:\n${ctx.userPrefs}` : ""}

${ctx.conversationHistory ? `Conversation so far:\n${ctx.conversationHistory}` : ""}

${ctx.existingUrls.length ? `DO NOT suggest these URLs (already in the list):\n${ctx.existingUrls.join("\n")}` : ""}

User: ${ctx.message}

Respond with:
1. A brief helpful conversational answer (2-4 sentences) addressing the user's question. Reference products already in their list by name when relevant.
2. Up to 4 specific product recommendations if applicable

Return ONLY valid JSON (no markdown fences):
{
  "text": "Your conversational response here...",
  "products": [
    {
      "title": "Full product name",
      "url": "https://purchase-url",
      "brand": "Brand",
      "price_min": 44990,
      "price_max": null,
      "currency": "${currency}",
      "reason": "Why this fits — relate to existing products if applicable"
    }
  ]
}

If the user's question doesn't need product recommendations (e.g. "what should I look for in an OLED TV?"), return an empty products array and a helpful text response.`

  const response = await callGeminiWithGrounding(prompt)

  const cleaned = response.text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")

  try {
    const data = JSON.parse(cleaned)
    const text: string = data.text ?? "Here are some options I found:"
    const rawProducts: Array<{
      title: string
      url: string
      brand: string | null
      price_min: number | null
      price_max: number | null
      currency: string
      reason: string
    }> = data.products ?? []

    // Deduplicate against existing products
    const existingUrlSet = new Set(ctx.existingUrls.map((u) => u.toLowerCase()))
    const deduped = rawProducts.filter(
      (r) => r.url && !existingUrlSet.has(r.url.toLowerCase())
    )

    const products: SearchResult[] = deduped.map((r) => ({
      id: crypto.randomUUID(),
      title: r.title,
      url: r.url,
      domain: extractDomain(r.url),
      image_url: null, // Skip og:image fetch in chat to keep responses fast
      brand: r.brand ?? null,
      price_min: r.price_min ?? null,
      price_max: r.price_max ?? null,
      currency: r.currency ?? "INR",
      reason: r.reason,
    }))

    return { response: text, products: products.length > 0 ? products : undefined }
  } catch {
    // If JSON parsing fails, treat the whole response as text
    console.error("[handleDiscoveryChat] Failed to parse response, using as text")
    return { response: cleaned || "I found some options but had trouble formatting them. Try searching directly with the search bar above." }
  }
}

// ---------------------------------------------------------------------------
// loadChatMessages
// ---------------------------------------------------------------------------

export async function loadChatMessages(
  listId: string
): Promise<ActionResult<{ messages: ChatMessage[] }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("list_id", listId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[loadChatMessages] Failed:", error)
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load messages" } }
  }

  return { success: true, data: { messages: data ?? [] } }
}

// ---------------------------------------------------------------------------
// updateChatInsights
// ---------------------------------------------------------------------------

export async function updateChatInsights(
  listId: string
): Promise<ActionResult<{ insights: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const supabase = await createClient()

  // Fetch recent chat messages
  const { data: messages } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("list_id", listId)
    .order("created_at", { ascending: true })
    .limit(50)

  if (!messages?.length) {
    return { success: true, data: { insights: "" } }
  }

  // Fetch list context for the prompt
  const { data: list } = await supabase
    .from("lists")
    .select("name, category, chat_insights")
    .eq("id", listId)
    .single()

  try {
    const prompt = buildChatInsightsPrompt({
      listName: list?.name ?? "Unknown",
      category: list?.category ?? "general",
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      existingInsights: list?.chat_insights ?? null,
    })

    const insights = await callGemini(prompt)
    const trimmedInsights = insights.trim()

    await supabase
      .from("lists")
      .update({ chat_insights: trimmedInsights })
      .eq("id", listId)

    return { success: true, data: { insights: trimmedInsights } }
  } catch (err) {
    console.error("[updateChatInsights] Failed:", err)
    return {
      success: false,
      error: { code: "AI_ERROR", message: "Failed to extract insights" },
    }
  }
}
