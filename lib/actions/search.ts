"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/supabase/auth"
import { callGemini } from "@/lib/ai/gemini"
import { findProductUrl } from "@/lib/search/serper"
import { searchProductsSchema, addFromSearchSchema } from "@/lib/validators/search"
import { extractDomain } from "@/lib/utils"
import { regenerateAiComment } from "@/lib/actions/ai"
import type { ActionResult } from "@/lib/types/actions"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SearchResult = {
  id: string
  title: string
  url: string
  domain: string | null
  image_url: string | null
  brand: string | null
  price_min: number | null
  price_max: number | null
  currency: string
  reason: string
}

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

/**
 * Fetch og:image from a URL. Non-blocking — returns null on failure.
 */
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ShopItBot/1.0; +https://shopit.app)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: controller.signal,
    })

    clearTimeout(timeout)
    if (!res.ok) return null

    const html = await res.text()
    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)

    let imageUrl = ogMatch?.[1] ?? null
    if (imageUrl?.startsWith("http://")) {
      imageUrl = imageUrl.replace("http://", "https://")
    }
    return imageUrl
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Phase 1 prompt: Gemini recommends products (NO URLs)
// ---------------------------------------------------------------------------

type ProductSummary = {
  title: string | null
  brand: string | null
  price_min: number | null
  price_max: number | null
  currency: string
  is_shortlisted: boolean
  ai_verdict: string | null
}

function buildRecommendationPrompt(
  query: string,
  context: {
    category: string | null
    budgetMin: number | null
    budgetMax: number | null
    priorities: string[] | null
    existingProducts: ProductSummary[]
    userContext: Record<string, unknown> | null
    contextAnswers: Array<{ question: string; answer: string }>
    chatInsights: string | null
  }
): string {
  const currency = context.existingProducts[0]?.currency ?? "INR"

  const productList = context.existingProducts
    .map(
      (p) =>
        `- ${p.title ?? "Unknown"} (${p.brand ?? "?"}) — ${p.price_min ?? "?"}${p.price_max ? `-${p.price_max}` : ""} ${p.currency}${p.is_shortlisted ? " [SHORTLISTED]" : ""}${p.ai_verdict ? ` — "${p.ai_verdict}"` : ""}`
    )
    .join("\n")

  const shortlisted = context.existingProducts.filter((p) => p.is_shortlisted)
  const shortlistedSummary = shortlisted.length
    ? `\nUser has shortlisted these (strong preference signal):\n${shortlisted.map((p) => `- ${p.title ?? "Unknown"} (${p.brand ?? "?"})`).join("\n")}`
    : ""

  return `You are a product research assistant. Recommend 4-6 specific, real products matching the user's query. You are recommending products that exist and can be purchased in India.

USER SEARCH QUERY: "${query}"

${context.category ? `List category: ${context.category}` : ""}
${context.budgetMin ? `Budget: ${context.budgetMin}-${context.budgetMax} ${currency}` : ""}
${context.priorities?.length ? `Priorities (in order): ${context.priorities.join(", ")}` : ""}
${context.userContext && Object.keys(context.userContext).length ? `User context: ${JSON.stringify(context.userContext)}` : ""}
${context.contextAnswers.length ? `User preferences:\n${context.contextAnswers.map((a) => `- Q: ${a.question} → A: ${a.answer}`).join("\n")}` : ""}
${context.chatInsights ? `Conversation insights: ${context.chatInsights}` : ""}

${productList ? `Products already in the list:\n${productList}${shortlistedSummary}\n\nSuggest products that complement or provide alternatives to what the user already has. Reference existing products by name in the "reason" field. Do NOT recommend products already in the list.` : ""}

IMPORTANT:
- Recommend REAL products that currently exist and are sold in India
- Use the EXACT official product name (e.g., "Sony WH-1000XM5" not "Sony noise cancelling headphones")
- Include the brand name separately
- Estimate the price range in ${currency} as accurately as you can
- Each "reason" should explain relevance to the query AND how it relates to existing products
- Do NOT include URLs — we will find those separately

Return ONLY valid JSON (no markdown fences):
{
  "products": [
    {
      "title": "Exact Product Name with Model Number",
      "brand": "Brand Name",
      "price_min": 44990,
      "price_max": 49990,
      "currency": "${currency}",
      "reason": "Why this matches the query..."
    }
  ]
}

If you cannot recommend any matching products, return: {"products": []}`
}

// ---------------------------------------------------------------------------
// searchProducts — two-phase: Gemini recommends, Serper finds URLs
// ---------------------------------------------------------------------------

export async function searchProducts(
  input: unknown
): Promise<ActionResult<{ results: SearchResult[] }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = searchProductsSchema.safeParse(input)
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
    // Fetch list context in parallel
    const [listResult, productsResult, contextResult, profileResult] = await Promise.all([
      supabase
        .from("lists")
        .select("category, budget_min, budget_max, priorities, chat_insights, owner_id")
        .eq("id", parsed.data.listId)
        .single(),
      supabase
        .from("products")
        .select("url, title, brand, price_min, price_max, currency, is_shortlisted, ai_verdict")
        .eq("list_id", parsed.data.listId)
        .eq("extraction_status", "completed")
        .is("archived_at", null),
      supabase
        .from("context_questions")
        .select("question, answer")
        .eq("list_id", parsed.data.listId)
        .eq("status", "answered"),
      supabase
        .from("profiles")
        .select("context")
        .eq("id", user.id)
        .single(),
    ])

    const list = listResult.data
    const existingProducts = (productsResult.data ?? []) as ProductSummary[]
    const existingUrls = (productsResult.data ?? []).map((p) => p.url)
    const contextAnswers = (contextResult.data ?? [])
      .filter((q): q is { question: string; answer: string } => !!q.answer)
      .map((q) => ({ question: q.question, answer: q.answer }))
    const userContext = (profileResult.data?.context as Record<string, unknown>) ?? null

    // -------------------------------------------------------------------
    // Phase 1: Gemini recommends products (names only, no URLs)
    // -------------------------------------------------------------------
    const prompt = buildRecommendationPrompt(parsed.data.query, {
      category: list?.category ?? null,
      budgetMin: list?.budget_min ?? null,
      budgetMax: list?.budget_max ?? null,
      priorities: (list?.priorities as string[]) ?? null,
      existingProducts,
      userContext,
      contextAnswers,
      chatInsights: list?.chat_insights ?? null,
    })

    const geminiResponse = await callGemini(prompt, { jsonMode: true })

    let recommendations: Array<{
      title: string
      brand: string | null
      price_min: number | null
      price_max: number | null
      currency: string
      reason: string
    }> = []

    try {
      const data = JSON.parse(geminiResponse)
      recommendations = data.products ?? []
      console.log(`[searchProducts] Phase 1: Gemini recommended ${recommendations.length} products`)
    } catch {
      console.error("[searchProducts] Failed to parse Gemini response:", geminiResponse.slice(0, 500))
      return {
        success: false,
        error: { code: "AI_ERROR", message: "Couldn't parse recommendations. Try rephrasing your query." },
      }
    }

    if (recommendations.length === 0) {
      return { success: true, data: { results: [] } }
    }

    // -------------------------------------------------------------------
    // Phase 2: Serper finds real URLs for each product (in parallel)
    // -------------------------------------------------------------------
    const results = await Promise.all(
      recommendations.map(async (rec): Promise<SearchResult | null> => {
        // Find the real product page URL via Google search
        const found = await findProductUrl(rec.title, rec.brand)

        if (!found) {
          console.log(`[searchProducts] Phase 2: No URL found for "${rec.title}", skipping`)
          return null
        }

        // Deduplicate against existing products
        const existingUrlSet = new Set(existingUrls.map((u) => u.toLowerCase()))
        if (existingUrlSet.has(found.url.toLowerCase())) {
          console.log(`[searchProducts] Phase 2: URL for "${rec.title}" already in list, skipping`)
          return null
        }

        // Fetch og:image (non-blocking, best-effort)
        const imageUrl = await fetchOgImage(found.url)

        return {
          id: crypto.randomUUID(),
          title: rec.title,
          url: found.url,
          domain: found.domain,
          image_url: imageUrl,
          brand: rec.brand ?? null,
          price_min: rec.price_min ?? null,
          price_max: rec.price_max ?? null,
          currency: rec.currency ?? "INR",
          reason: rec.reason,
        }
      })
    )

    const filtered = results.filter((r): r is SearchResult => r !== null)
    console.log(`[searchProducts] Returning ${filtered.length} results (${recommendations.length} recommended, ${recommendations.length - filtered.length} dropped)`)

    return { success: true, data: { results: filtered } }
  } catch (err) {
    console.error("[searchProducts] Failed:", err)
    return {
      success: false,
      error: { code: "AI_ERROR", message: "Search failed. Try again." },
    }
  }
}

// ---------------------------------------------------------------------------
// addProductFromSearch — add a search result to the list
// ---------------------------------------------------------------------------

export async function addProductFromSearch(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } }
  }

  const parsed = addFromSearchSchema.safeParse(input)
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
    const { data: product, error: insertErr } = await supabase
      .from("products")
      .insert({
        list_id: parsed.data.listId,
        url: parsed.data.url,
        domain: parsed.data.domain ?? extractDomain(parsed.data.url),
        title: parsed.data.title,
        brand: parsed.data.brand,
        image_url: parsed.data.image_url,
        price_min: parsed.data.price_min,
        price_max: parsed.data.price_max,
        currency: parsed.data.currency,
        added_by: user.id,
        added_via: "ai",
        extraction_status: "pending",
      })
      .select("id")
      .single()

    if (insertErr) throw insertErr

    revalidatePath(`/lists/${parsed.data.listId}`)
    regenerateAiComment(parsed.data.listId).catch(() => {})

    return { success: true, data: { id: product.id } }
  } catch (err) {
    console.error("[addProductFromSearch] Failed:", err)
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to add product" },
    }
  }
}
