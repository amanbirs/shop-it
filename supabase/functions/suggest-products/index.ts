import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GEMINI_MODEL = "gemini-2.5-flash";
const MAX_SUGGESTIONS = 4;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SuggestPayload {
  list_id: string;
  trigger: "product_added" | "expert_opinion" | "context_answered" | "manual";
}

interface ProductRow {
  title: string | null;
  brand: string | null;
  url: string;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  is_shortlisted: boolean;
  ai_verdict: string | null;
}

interface ListRow {
  category: string | null;
  priorities: string[] | null;
  budget_min: number | null;
  budget_max: number | null;
  purchase_by: string | null;
  chat_insights: string | null;
  owner_id: string;
}

interface GeminiGroundedResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    groundingMetadata?: {
      webSearchQueries?: string[];
      groundingChunks?: Array<{
        web?: { uri?: string; title?: string };
      }>;
      groundingSupports?: Array<{
        confidenceScores?: number[];
      }>;
    };
  }>;
  error?: { message?: string };
}

interface SuggestionItem {
  title: string;
  url: string;
  domain: string | null;
  image_url: string | null;
  brand: string | null;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Fetch a page and extract the og:image URL from its HTML.
 * Returns { reachable, imageUrl }.
 * Uses a 5s timeout to avoid blocking on slow pages.
 */
async function fetchPageAndOgImage(
  url: string,
): Promise<{ reachable: boolean; imageUrl: string | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ShopItBot/1.0; +https://shopit.app)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return { reachable: false, imageUrl: null };
    }

    const html = await res.text();
    const ogMatch = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    ) ?? html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    );

    let imageUrl = ogMatch?.[1] ?? null;
    // Upgrade http:// to https:// — most CDNs serve both, and next/image only allows https
    if (imageUrl?.startsWith("http://")) {
      imageUrl = imageUrl.replace("http://", "https://");
    }

    return { reachable: true, imageUrl };
  } catch {
    return { reachable: false, imageUrl: null };
  }
}

/**
 * When the AI-provided URL is broken, search for the correct PRODUCT PAGE URL.
 * Uses Gemini with Google Search grounding, then also checks grounding metadata
 * for direct product page links (often more reliable than the AI's text output).
 */
async function findCorrectUrl(
  title: string,
  brand: string | null,
  domain: string | null,
): Promise<{ url: string; imageUrl: string | null } | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;

  const apiUrl =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Search for the exact product page where I can BUY this specific product:

Product: "${title}"${brand ? `\nBrand: ${brand}` : ""}

IMPORTANT:
- I need the URL of the SPECIFIC PRODUCT PAGE, not the brand homepage or a category page.
- The URL should lead to a page where I can see the price and add to cart.
- Look on major retailers like Amazon, Flipkart, or the brand's official store.
- The URL path should contain the product name or a product ID (e.g., /dp/B0xxx, /product/xxx).
${domain ? `- Prefer results from ${domain} if available.` : ""}

Return ONLY a JSON object. No explanation, no markdown fences.
{"url": "https://www.example.com/product/specific-product-page"}

If you truly cannot find a specific product page, return: {"url": null}`,
          }],
        }],
        tools: [{ google_search: {} }],
      }),
    });

    if (!res.ok) return null;

    const data: GeminiGroundedResponse = await res.json();
    const candidate = data.candidates?.[0];
    if (!candidate) return null;

    // Strategy 1: Check grounding metadata for product page URLs
    // These are the actual URLs Google Search found — often more reliable than the AI's text
    const groundingUrls = (candidate.groundingMetadata?.groundingChunks ?? [])
      .map((c) => c.web?.uri)
      .filter((u): u is string => !!u)
      .filter((u) => {
        // Filter for URLs that look like product pages, not homepages
        const path = new URL(u).pathname;
        return path.length > 10 && path !== "/";
      });

    // Strategy 2: Parse the AI's text response
    const text = candidate.content?.parts?.[0]?.text ?? "";
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
    let aiUrl: string | null = null;
    try {
      const parsed = JSON.parse(cleaned);
      aiUrl = parsed?.url ?? null;
    } catch {
      // AI didn't return valid JSON — rely on grounding URLs
    }

    // Try candidates in order: AI answer first, then grounding URLs
    const candidates = [
      aiUrl,
      ...groundingUrls,
    ].filter((u): u is string => !!u && u.startsWith("http"));

    // Validate each candidate until we find one that works
    for (const candidateUrl of candidates) {
      // Skip obvious homepage URLs
      try {
        const path = new URL(candidateUrl).pathname;
        if (path === "/" || path === "") continue;
      } catch {
        continue;
      }

      const { reachable, imageUrl } = await fetchPageAndOgImage(candidateUrl);
      if (reachable) {
        return { url: candidateUrl, imageUrl };
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Prompt builder (inline — Deno cannot import from Next.js lib/)
// ---------------------------------------------------------------------------

function buildPrompt(
  products: ProductRow[],
  list: ListRow,
  userContext: Record<string, unknown> | null,
  contextAnswers: Array<{ question: string; answer: string }>,
): string {
  const currency = products[0]?.currency ?? "INR";
  const shortlisted = products.filter((p) => p.is_shortlisted);

  const productList = products
    .map(
      (p) =>
        `- ${p.title ?? "Unknown"} (${p.brand ?? "?"}) — ${p.price_min ?? "?"}${p.price_max ? `-${p.price_max}` : ""} ${p.currency}${p.is_shortlisted ? " [SHORTLISTED]" : ""}${p.ai_verdict ? ` — "${p.ai_verdict}"` : ""}`,
    )
    .join("\n");

  const shortlistedSummary = shortlisted.length
    ? `\nUser has shortlisted these (strong preference signal):\n${shortlisted.map((p) => `- ${p.title ?? "Unknown"} (${p.brand ?? "?"})`).join("\n")}`
    : "";

  const existingUrls = products.map((p) => p.url).join("\n");

  const contextAnswerText = contextAnswers.length
    ? `\nUser preferences (from Q&A):\n${contextAnswers.map((a) => `- Q: ${a.question} → A: ${a.answer}`).join("\n")}`
    : "";

  const userContextText =
    userContext && Object.keys(userContext).length
      ? `\nUser context: ${JSON.stringify(userContext)}`
      : "";

  return `You are a product research assistant helping a user find additional products for their purchase comparison list. Use Google Search to find real, currently available products that complement their existing research.

Category: ${list.category ?? "general"}
${list.budget_min ? `Budget: ${list.budget_min}-${list.budget_max} ${currency}` : ""}
${list.purchase_by ? `Purchase deadline: ${list.purchase_by}` : ""}
${list.priorities?.length ? `Priorities (in order of importance): ${list.priorities.join(", ")}` : ""}
${userContextText}
${contextAnswerText}
${list.chat_insights ? `\nInsights from user's chat conversations (use to tailor suggestions):\n${list.chat_insights}\n` : ""}
Current products in their list:
${productList}
${shortlistedSummary}

DO NOT suggest any of these URLs (already in the list):
${existingUrls}

Instructions:
- Search for 0-${MAX_SUGGESTIONS} additional products that would meaningfully complement this list
- Focus on products that fill GAPS: different price points, different brands, features the current options lack
- If the user has shortlisted products, find alternatives in a similar class
- Each suggestion must be a REAL, currently available product with a valid purchase URL
- Weight suggestions toward the user's priorities and budget
- Each "reason" must specifically reference the user's priorities, budget, or shortlisted items
- If the list is already comprehensive (good coverage of options), return 0 suggestions
- Return at most ${MAX_SUGGESTIONS} suggestions, ranked by relevance

Return ONLY valid JSON matching this exact schema (no markdown fences, no explanation outside the JSON):
{
  "suggestions": [
    {
      "title": "Full product name",
      "url": "https://purchase-url",
      "domain": "amazon.in",
      "image_url": "https://image-url or null",
      "brand": "Brand Name",
      "price_min": 44990,
      "price_max": null,
      "currency": "${currency}",
      "reason": "Fits your budget with 144Hz refresh matching your gaming priority"
    }
  ]
}

If no suggestions are needed, return: {"suggestions": []}`;
}

// ---------------------------------------------------------------------------
// Gemini call with Google Search grounding
// ---------------------------------------------------------------------------

async function callGeminiWithGrounding(
  prompt: string,
): Promise<GeminiGroundedResponse> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      // NOTE: NOT using responseMimeType: "application/json" because
      // JSON mode conflicts with google_search grounding tool.
      // The prompt instructs the model to return raw JSON.
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini returned ${res.status}: ${body.slice(0, 300)}`);
  }

  return await res.json();
}

// ---------------------------------------------------------------------------
// Parse suggestions from Gemini response
// ---------------------------------------------------------------------------

function parseSuggestions(
  response: GeminiGroundedResponse,
): {
  suggestions: SuggestionItem[];
  sourceUrls: string[];
  searchQueries: string[];
  avgConfidence: number | null;
} {
  const candidate = response.candidates?.[0];
  if (!candidate) {
    throw new Error("Gemini returned no candidates");
  }

  // Extract text and parse JSON
  const text = candidate.content?.parts?.[0]?.text ?? "";
  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  // Strip markdown fences if present
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");

  let parsed: { suggestions?: SuggestionItem[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse Gemini response as JSON:", cleaned.slice(0, 500));
    return { suggestions: [], sourceUrls: [], searchQueries: [], avgConfidence: null };
  }

  const suggestions = (parsed.suggestions ?? []).slice(0, MAX_SUGGESTIONS);

  // Extract grounding metadata
  const metadata = candidate.groundingMetadata;
  const sourceUrls = (metadata?.groundingChunks ?? [])
    .map((c) => c.web?.uri)
    .filter((u): u is string => !!u);

  const searchQueries = metadata?.webSearchQueries ?? [];

  const allConfidences = (metadata?.groundingSupports ?? []).flatMap(
    (s) => s.confidenceScores ?? [],
  );
  const avgConfidence = allConfidences.length
    ? allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length
    : null;

  return { suggestions, sourceUrls, searchQueries, avgConfidence };
}

// ---------------------------------------------------------------------------
// Main suggestion pipeline
// ---------------------------------------------------------------------------

async function suggestProducts(payload: SuggestPayload): Promise<number> {
  const supabase = createSupabaseAdmin();
  const listId = payload.list_id;
  const trigger = payload.trigger;

  // -------------------------------------------------------------------------
  // 1. Fetch list metadata
  // -------------------------------------------------------------------------
  const { data: list, error: listError } = await supabase
    .from("lists")
    .select("category, priorities, budget_min, budget_max, purchase_by, chat_insights, owner_id")
    .eq("id", listId)
    .single();

  if (listError || !list) {
    console.error(`List ${listId} not found:`, listError?.message);
    return 0;
  }

  // -------------------------------------------------------------------------
  // 2. Fetch completed products
  // -------------------------------------------------------------------------
  const { data: products } = await supabase
    .from("products")
    .select(
      "title, brand, url, price_min, price_max, currency, is_shortlisted, ai_verdict",
    )
    .eq("list_id", listId)
    .eq("extraction_status", "completed")
    .is("archived_at", null);

  if (!products || products.length < 2) {
    console.log(
      `List ${listId}: only ${products?.length ?? 0} completed products, skipping suggestions.`,
    );
    return 0;
  }

  // -------------------------------------------------------------------------
  // 3. Fetch answered context questions
  // -------------------------------------------------------------------------
  const { data: contextQuestions } = await supabase
    .from("context_questions")
    .select("question, answer")
    .eq("list_id", listId)
    .eq("status", "answered");

  const contextAnswers = (contextQuestions ?? [])
    .filter((q): q is { question: string; answer: string } => !!q.answer)
    .map((q) => ({ question: q.question, answer: q.answer }));

  // -------------------------------------------------------------------------
  // 4. Fetch owner's profile context
  // -------------------------------------------------------------------------
  let userContext: Record<string, unknown> | null = null;
  if (list.owner_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("context")
      .eq("id", list.owner_id)
      .single();

    userContext = (profile?.context as Record<string, unknown>) ?? null;
  }

  // -------------------------------------------------------------------------
  // 5. Clear ALL existing suggestions for this list
  // -------------------------------------------------------------------------
  const { error: deleteError } = await supabase
    .from("product_suggestions")
    .delete()
    .eq("list_id", listId);

  if (deleteError) {
    console.error(`Failed to clear old suggestions for ${listId}:`, deleteError.message);
    // Non-fatal — continue with insertion (may result in duplicates, acceptable)
  }

  // -------------------------------------------------------------------------
  // 6. Build prompt and call Gemini with grounding
  // -------------------------------------------------------------------------
  const prompt = buildPrompt(
    products as ProductRow[],
    list as ListRow,
    userContext,
    contextAnswers,
  );

  const response = await callGeminiWithGrounding(prompt);

  if (response.error) {
    throw new Error(`Gemini error: ${response.error.message ?? "unknown"}`);
  }

  // -------------------------------------------------------------------------
  // 7. Parse suggestions and insert
  // -------------------------------------------------------------------------
  const { suggestions, sourceUrls, searchQueries, avgConfidence } =
    parseSuggestions(response);

  if (suggestions.length === 0) {
    console.log(`List ${listId}: Gemini returned 0 suggestions.`);
    return 0;
  }

  // Filter out suggestions whose URL is already in the product list
  const existingUrls = new Set(products.map((p) => p.url.toLowerCase()));
  const deduped = suggestions.filter(
    (s) => s.url && !existingUrls.has(s.url.toLowerCase()),
  );

  if (deduped.length === 0) {
    console.log(`List ${listId}: all suggestions were duplicates.`);
    return 0;
  }

  // -------------------------------------------------------------------------
  // 8. Validate URLs, repair broken ones, and fetch OG images — in parallel
  // -------------------------------------------------------------------------
  const enriched = await Promise.all(
    deduped.map(async (s) => {
      // Step 1: Try the AI-provided URL
      const { reachable, imageUrl } = await fetchPageAndOgImage(s.url);

      if (reachable) {
        return { suggestion: s, url: s.url, imageUrl, valid: true };
      }

      // Step 2: URL is broken — search for the correct one
      console.log(`List ${listId}: URL broken for "${s.title}", searching for correct URL...`);
      const repaired = await findCorrectUrl(
        s.title,
        s.brand,
        s.domain ?? extractDomain(s.url),
      );

      if (repaired) {
        console.log(`List ${listId}: repaired URL for "${s.title}" → ${repaired.url}`);
        return {
          suggestion: s,
          url: repaired.url,
          imageUrl: repaired.imageUrl,
          valid: true,
        };
      }

      // Step 3: Couldn't repair — drop this suggestion
      console.log(`List ${listId}: could not find valid URL for "${s.title}", dropping.`);
      return { suggestion: s, url: s.url, imageUrl: null, valid: false };
    }),
  );

  const filtered = enriched.filter((v) => v.valid);

  if (filtered.length === 0) {
    console.log(`List ${listId}: no suggestions with valid URLs after repair.`);
    return 0;
  }

  const rows = filtered.map((v) => ({
    list_id: listId,
    title: v.suggestion.title,
    url: v.url,
    domain: extractDomain(v.url) ?? v.suggestion.domain ?? null,
    image_url: v.imageUrl ?? v.suggestion.image_url ?? null,
    brand: v.suggestion.brand ?? null,
    price_min: v.suggestion.price_min ?? null,
    price_max: v.suggestion.price_max ?? null,
    currency: v.suggestion.currency ?? "INR",
    reason: v.suggestion.reason,
    confidence: avgConfidence,
    source_urls: sourceUrls,
    search_queries: searchQueries,
    trigger_type: trigger,
    status: "pending",
  }));

  const { error: insertError } = await supabase
    .from("product_suggestions")
    .insert(rows);

  if (insertError) {
    throw new Error(`Failed to insert suggestions: ${insertError.message}`);
  }

  console.log(
    `List ${listId}: generated ${rows.length} suggestions (trigger: ${trigger}).`,
  );
  return rows.length;
}

// ---------------------------------------------------------------------------
// Deno Edge Function handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const payload: SuggestPayload = await req.json();

    // Validate payload
    if (!payload?.list_id) {
      return new Response(
        JSON.stringify({ error: "Missing list_id" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const count = await suggestProducts(payload);

    return new Response(JSON.stringify({ success: true, count }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Edge function error:", error);

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
});
