import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_SCRAPED_CONTENT_CHARS = 100_000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    url: string;
    domain: string | null;
    list_id: string;
    added_by: string | null;
    extraction_status: string;
    raw_scraped_data: unknown | null;
  };
}

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
  };
  error?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
}

interface ExtractionResult {
  title?: string | null;
  brand?: string | null;
  model?: string | null;
  image_url?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  currency?: string | null;
  price_note?: string | null;
  specs?: Record<string, unknown> | null;
  pros?: string[] | null;
  cons?: string[] | null;
  rating?: number | null;
  review_count?: number | null;
  scraped_reviews?: Array<{
    snippet: string;
    rating: number | null;
    source: string;
  }> | null;
  ai_summary?: string | null;
  ai_review_summary?: string | null;
  ai_verdict?: string | null;
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

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "\n\n[Content truncated]";
}

async function updateProductStatus(
  supabase: ReturnType<typeof createClient>,
  productId: string,
  status: "processing" | "failed",
  error?: string,
) {
  const update: Record<string, unknown> = {
    extraction_status: status,
    updated_at: new Date().toISOString(),
  };

  if (status === "failed" && error) {
    update.extraction_error = error;
  }

  const { error: dbError } = await supabase
    .from("products")
    .update(update)
    .eq("id", productId);

  if (dbError) {
    console.error(
      `Failed to update product ${productId} to ${status}:`,
      dbError.message,
    );
  }
}

// ---------------------------------------------------------------------------
// Firecrawl scraping
// ---------------------------------------------------------------------------

async function scrapeUrl(url: string): Promise<FirecrawlResponse> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) {
    throw new Error("Missing FIRECRAWL_API_KEY");
  }

  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ url, formats: ["markdown"] }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Firecrawl returned ${res.status}: ${body.slice(0, 200)}`,
    );
  }

  const data: FirecrawlResponse = await res.json();

  if (!data.success) {
    throw new Error(`Firecrawl scrape failed: ${data.error ?? "unknown"}`);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Gemini extraction
// ---------------------------------------------------------------------------

function buildExtractionPrompt(
  scrapedContent: string,
  productUrl: string,
  listCategory: string | null,
  listPriorities: string[] | null,
  userContext: Record<string, unknown> | null,
): string {
  const categoryHint = listCategory
    ? `\nProduct category: ${listCategory}`
    : "";

  const prioritiesHint =
    listPriorities && listPriorities.length > 0
      ? `\nUser priorities (ordered by importance): ${listPriorities.join(", ")}`
      : "";

  const contextHint =
    userContext && Object.keys(userContext).length > 0
      ? `\nUser context: ${JSON.stringify(userContext)}`
      : "";

  return `You are a product data extraction assistant. Extract structured product information from the following scraped web page content.

Source URL: ${productUrl}${categoryHint}${prioritiesHint}${contextHint}

Instructions:
- Extract as much information as possible from the page content.
- If a field is not present on the page, use null for that field.
- For prices, extract numeric values without currency symbols. Use the currency code (e.g., "INR", "USD").
- price_min is the lowest or only price. price_max is the highest price if a range exists, otherwise null.
- For specs, extract key-value pairs relevant to the product. Use snake_case keys with readable values.
- For pros and cons, extract or infer the main advantages and disadvantages.
- For scraped_reviews, extract up to 5 notable review snippets found on the page. Each should have a snippet (1-2 sentences), a rating (numeric, null if not available), and source (site name).
- rating should be on a 5-point scale. Convert if the page uses a different scale (e.g., 8.5/10 becomes 4.25).
- ai_summary: Write a concise one-paragraph overview of the product covering what it is, who it is for, and its market positioning.
- ai_review_summary: Synthesize the review sentiment into a readable paragraph. What do reviewers consistently praise or criticize?
- ai_verdict: A short punchy take — e.g., "Best value under 30K", "Premium pick", "Avoid — too many complaints".${prioritiesHint ? `\n- Weight your pros, cons, ai_summary, and ai_verdict toward the user's priorities: ${listPriorities!.join(", ")}.` : ""}${contextHint ? `\n- Ground your ai_summary and ai_verdict in the user's context when relevant.` : ""}
- If the page contains multiple products, extract the one most relevant to the URL.
- If the page is not a product page (e.g., a review article), still extract whatever product data is available.

Return ONLY valid JSON matching this exact schema:
{
  "title": "string or null",
  "brand": "string or null",
  "model": "string or null",
  "image_url": "string (URL) or null",
  "price_min": "number or null",
  "price_max": "number or null",
  "currency": "string (ISO 4217 code) or null",
  "price_note": "string or null",
  "specs": "object with string keys and string values, or null",
  "pros": "array of strings, or null",
  "cons": "array of strings, or null",
  "rating": "number (1-5 scale) or null",
  "review_count": "number or null",
  "scraped_reviews": "array of {snippet: string, rating: number|null, source: string}, or null",
  "ai_summary": "string or null",
  "ai_review_summary": "string or null",
  "ai_verdict": "string or null"
}

--- PAGE CONTENT ---
${scrapedContent}
--- END PAGE CONTENT ---`;
}

async function extractWithGemini(prompt: string): Promise<ExtractionResult> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini returned ${res.status}: ${body.slice(0, 200)}`);
  }

  const data: GeminiResponse = await res.json();

  if (data.error) {
    throw new Error(`Gemini error: ${data.error.message ?? "unknown"}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  // Parse the JSON response. Gemini structured output mode returns clean JSON,
  // but guard against extra whitespace or markdown fences just in case.
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "");

  const parsed: ExtractionResult = JSON.parse(cleaned);
  return parsed;
}

// ---------------------------------------------------------------------------
// Main ingestion pipeline
// ---------------------------------------------------------------------------

async function ingestProduct(payload: WebhookPayload): Promise<void> {
  const productId = payload.record.id;
  const supabase = createSupabaseAdmin();

  // -----------------------------------------------------------------------
  // 1. Fetch the product row (fresh read — webhook payload may be stale)
  // -----------------------------------------------------------------------
  const { data: product, error: productError } = await supabase
    .from("products")
    .select(
      "id, url, domain, list_id, added_by, raw_scraped_data, extraction_status",
    )
    .eq("id", productId)
    .single();

  if (productError || !product) {
    console.error(`Product ${productId} not found:`, productError?.message);
    return;
  }

  // Guard: only process pending products (idempotency)
  if (product.extraction_status !== "pending") {
    console.log(
      `Product ${productId} is ${product.extraction_status}, skipping.`,
    );
    return;
  }

  // -----------------------------------------------------------------------
  // 2. Fetch list metadata for prompt context
  // -----------------------------------------------------------------------
  const { data: list, error: listError } = await supabase
    .from("lists")
    .select("category, priorities")
    .eq("id", product.list_id)
    .single();

  if (listError) {
    console.error(
      `Failed to fetch list ${product.list_id}:`,
      listError.message,
    );
    // Non-fatal — proceed without list context
  }

  // -----------------------------------------------------------------------
  // 3. Fetch adding user's profile context
  // -----------------------------------------------------------------------
  let userContext: Record<string, unknown> | null = null;

  if (product.added_by) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("context")
      .eq("id", product.added_by)
      .single();

    if (profileError) {
      console.error(
        `Failed to fetch profile for ${product.added_by}:`,
        profileError.message,
      );
      // Non-fatal — proceed without user context
    } else {
      userContext = (profile?.context as Record<string, unknown>) ?? null;
    }
  }

  // -----------------------------------------------------------------------
  // 4. Mark as processing
  // -----------------------------------------------------------------------
  await updateProductStatus(supabase, productId, "processing");

  try {
    // -------------------------------------------------------------------
    // 5. Scrape URL (or reuse existing raw_scraped_data on retry)
    // -------------------------------------------------------------------
    let rawScrapedData = product.raw_scraped_data as FirecrawlResponse | null;

    if (!rawScrapedData) {
      rawScrapedData = await scrapeUrl(product.url);

      // Persist raw scraped data immediately so retries skip scraping
      const { error: scrapeUpdateError } = await supabase
        .from("products")
        .update({
          raw_scraped_data: rawScrapedData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);

      if (scrapeUpdateError) {
        console.error(
          `Failed to save raw_scraped_data for ${productId}:`,
          scrapeUpdateError.message,
        );
        // Non-fatal — continue with extraction even if persist fails
      }
    }

    // -------------------------------------------------------------------
    // 6. Extract scraped content and truncate for Gemini context limits
    // -------------------------------------------------------------------
    const markdown = rawScrapedData?.data?.markdown ?? "";
    if (!markdown) {
      throw new Error(
        "Scraped data contains no markdown content — page may be empty or blocked",
      );
    }

    const truncatedContent = truncate(markdown, MAX_SCRAPED_CONTENT_CHARS);

    // -------------------------------------------------------------------
    // 7. Build prompt and call Gemini
    // -------------------------------------------------------------------
    const prompt = buildExtractionPrompt(
      truncatedContent,
      product.url,
      list?.category ?? null,
      list?.priorities ?? null,
      userContext,
    );

    const extraction = await extractWithGemini(prompt);

    // -------------------------------------------------------------------
    // 8. Update product row with all extracted fields
    // -------------------------------------------------------------------
    const { error: updateError } = await supabase
      .from("products")
      .update({
        title: extraction.title ?? null,
        brand: extraction.brand ?? null,
        model: extraction.model ?? null,
        image_url: extraction.image_url ?? null,
        price_min: extraction.price_min ?? null,
        price_max: extraction.price_max ?? null,
        currency: extraction.currency ?? "INR",
        price_note: extraction.price_note ?? null,
        specs: extraction.specs ?? {},
        pros: extraction.pros ?? [],
        cons: extraction.cons ?? [],
        rating: extraction.rating ?? null,
        review_count: extraction.review_count ?? null,
        scraped_reviews: extraction.scraped_reviews ?? [],
        ai_summary: extraction.ai_summary ?? null,
        ai_review_summary: extraction.ai_review_summary ?? null,
        ai_verdict: extraction.ai_verdict ?? null,
        ai_extracted_at: new Date().toISOString(),
        extraction_status: "completed",
        extraction_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (updateError) {
      throw new Error(
        `Failed to save extraction results: ${updateError.message}`,
      );
    }

    console.log(`Product ${productId} extraction completed successfully.`);
  } catch (error: unknown) {
    // -------------------------------------------------------------------
    // 9. On ANY error: mark failed with error message
    // -------------------------------------------------------------------
    const message =
      error instanceof Error ? error.message : "Unknown extraction error";
    console.error(`Product ${productId} extraction failed:`, message);

    await updateProductStatus(supabase, productId, "failed", message);
  }
}

// ---------------------------------------------------------------------------
// Deno Edge Function handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // Only accept POST (webhook invocations)
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const payload: WebhookPayload = await req.json();

    // Validate payload structure
    if (!payload?.record?.id || !payload?.record?.url) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook payload" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // Await ingestion so errors are caught and logged properly
    await ingestProduct(payload);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    // Never expose internal details in the response
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
