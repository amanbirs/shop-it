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
    .select("category, priorities, budget_min, budget_max, purchase_by, owner_id")
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
  const filtered = suggestions.filter(
    (s) => s.url && !existingUrls.has(s.url.toLowerCase()),
  );

  if (filtered.length === 0) {
    console.log(`List ${listId}: all suggestions were duplicates.`);
    return 0;
  }

  const rows = filtered.map((s) => ({
    list_id: listId,
    title: s.title,
    url: s.url,
    domain: s.domain ?? extractDomain(s.url),
    image_url: s.image_url ?? null,
    brand: s.brand ?? null,
    price_min: s.price_min ?? null,
    price_max: s.price_max ?? null,
    currency: s.currency ?? "INR",
    reason: s.reason,
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
