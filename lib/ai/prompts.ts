// All AI prompt builders live here — single source of truth.
// See docs/system-guide/03-backend-architecture.md for prompt design.

export function buildExtractionPrompt(params: {
  scrapedContent: string
  productUrl: string
  listCategory?: string
  listPriorities?: string[]
  userContext?: Record<string, unknown>
}): string {
  return `Extract structured product data from the following scraped page content.

URL: ${params.productUrl}
${params.listCategory ? `Category hint: ${params.listCategory}` : ""}
${params.listPriorities?.length ? `User priorities (weight these in pros/cons): ${params.listPriorities.join(", ")}` : ""}
${params.userContext ? `User context: ${JSON.stringify(params.userContext)}` : ""}

Return JSON matching this exact schema:
{
  "title": "string",
  "brand": "string or null",
  "model": "string or null",
  "image_url": "string or null",
  "price_min": number or null,
  "price_max": number or null,
  "currency": "string (ISO 4217)",
  "price_note": "string or null",
  "specs": { "key": "value" },
  "pros": ["string"],
  "cons": ["string"],
  "rating": number or null (0-5 scale),
  "review_count": number or null,
  "scraped_reviews": [{"snippet": "string", "rating": number, "source": "string"}],
  "ai_summary": "one paragraph overview",
  "ai_review_summary": "synthesis of customer reviews",
  "ai_verdict": "short verdict (max 10 words)"
}

Rules:
- If a field cannot be found, use null (not empty string)
- Price should be numeric (no currency symbols)
- Specs should focus on the most decision-relevant attributes
- Pros/cons should be 3-5 items each
- ai_summary should be factual and concise
- ai_verdict should be opinionated and memorable

Scraped content:
${params.scrapedContent}`
}

export function buildHypeTitlePrompt(category: string): string {
  return `Generate a short, fun, slightly dramatic title AND a single emoji for a purchase research list.
Category: ${category}

Return JSON:
{
  "title": "string (max 30 characters, memorable, slightly playful, no quotes)",
  "emoji": "single emoji that best represents this category"
}

Examples:
  "TV" → {"title": "The Great TV Showdown", "emoji": "📺"}
  "running shoes" → {"title": "Sole Search 2026", "emoji": "👟"}
  "coffee machine" → {"title": "Espresso Yourself", "emoji": "☕"}
  "sofa" → {"title": "Operation: Dream Couch", "emoji": "🛋️"}
  "air conditioner" → {"title": "The Big Chill", "emoji": "❄️"}
  "headphones" → {"title": "Audio Quest 2026", "emoji": "🎧"}
  "laptop" → {"title": "The Laptop Showdown", "emoji": "💻"}`
}

export function buildAiCommentPrompt(params: {
  listName: string
  category: string | null
  productCount: number
  shortlistedCount: number
  purchasedCount: number
  budgetMin: number | null
  budgetMax: number | null
  currency: string
}): string {
  return `Generate a short, positive, slightly funny one-liner comment about this purchase list.
List: ${params.listName}
Category: ${params.category || "general"}
Stats: ${params.productCount} products, ${params.shortlistedCount} shortlisted, ${params.purchasedCount} purchased
${params.budgetMin ? `Budget: ${params.budgetMin}-${params.budgetMax} ${params.currency}` : ""}
Requirements:
- Max 60 characters
- Positive and encouraging, slightly witty
- React to the current state (empty, making progress, purchased, over budget, etc.)
- One line only, no quotes, no emoji`
}

export function buildExpertOpinionPrompt(params: {
  products: Array<{
    id: string
    title: string | null
    brand: string | null
    price_min: number | null
    price_max: number | null
    currency: string
    specs: Record<string, string>
    pros: string[]
    cons: string[]
    rating: number | null
    review_count: number | null
    ai_summary: string | null
  }>
  budgetMin: number | null
  budgetMax: number | null
  purchaseBy: string | null
  category: string | null
  priorities: string[]
  userContext: Record<string, unknown>
  specAnalysis?: {
    dimensions: Array<{
      name: string
      description: string
      ratings: Array<{
        product_id: string
        score: number
        reasoning: string
      }>
    }>
  } | null
}): string {
  const productData = params.products
    .map(
      (p) => `
Product ID: ${p.id}
Title: ${p.title || "Unknown"}
Brand: ${p.brand || "Unknown"}
Price: ${p.price_min ?? "N/A"} ${p.currency}
Rating: ${p.rating ?? "N/A"}/5 (${p.review_count ?? 0} reviews)
Specs: ${JSON.stringify(p.specs)}
Pros: ${p.pros.join(", ") || "None listed"}
Cons: ${p.cons.join(", ") || "None listed"}
Summary: ${p.ai_summary || "Not available"}`
    )
    .join("\n---\n")

  // Build optional dimensions section from spec analysis
  const productTitles: Record<string, string> = {}
  for (const p of params.products) {
    productTitles[p.id] = p.title ?? "Unknown"
  }

  const dimensionsSection = params.specAnalysis?.dimensions?.length
    ? `\n## Pre-computed Dimension Ratings
The following quality dimensions have already been evaluated for this product set.
Use these as a foundation — you may adjust if you disagree, but explain why.

${params.specAnalysis.dimensions
  .map(
    (d) =>
      `${d.name}: ${d.ratings.map((r) => `${productTitles[r.product_id] ?? r.product_id} = ${r.score}/5 (${r.reasoning})`).join(", ")}`
  )
  .join("\n")}\n`
    : ""

  return `You are a purchase advisor. Analyze these products and provide expert recommendations.

${params.category ? `Category: ${params.category}` : ""}
${params.budgetMin ? `Budget: ${params.budgetMin}-${params.budgetMax} ${params.products[0]?.currency || "INR"}` : ""}
${params.purchaseBy ? `Purchase deadline: ${params.purchaseBy}` : ""}
${params.priorities.length ? `User priorities (in order of importance): ${params.priorities.join(", ")}` : ""}
${Object.keys(params.userContext).length ? `User context: ${JSON.stringify(params.userContext)}` : ""}
${dimensionsSection}
Products:
${productData}

Return JSON:
{
  "top_pick": "<product_id>",
  "top_pick_reason": "2-3 sentences explaining why",
  "value_pick": "<product_id>",
  "value_pick_reason": "2-3 sentences explaining why",
  "summary": "Opening paragraph summarizing the options",
  "comparison": "Detailed prose comparing the products",
  "concerns": "Red flags or things to watch out for",
  "verdict": "Final recommendation paragraph"
}`
}

export function buildSpecAnalysisPrompt(params: {
  products: Array<{
    id: string
    title: string | null
    brand: string | null
    price_min: number | null
    price_max: number | null
    currency: string
    specs: Record<string, string>
    pros: string[]
    cons: string[]
    rating: number | null
    review_count: number | null
    ai_summary: string | null
  }>
  budgetMin: number | null
  budgetMax: number | null
  purchaseBy: string | null
  category: string | null
  priorities: string[]
  userContext: Record<string, unknown>
  existingDimensions?: Array<{ name: string; description: string }> | null
}): string {
  const productData = params.products
    .map(
      (p) => `
Product ID: ${p.id}
Title: ${p.title || "Unknown"}
Brand: ${p.brand || "Unknown"}
Price: ${p.price_min ?? "N/A"} ${p.currency}
Rating: ${p.rating ?? "N/A"}/5 (${p.review_count ?? 0} reviews)
Specs: ${JSON.stringify(p.specs)}
Pros: ${p.pros.join(", ") || "None listed"}
Cons: ${p.cons.join(", ") || "None listed"}
Summary: ${p.ai_summary || "Not available"}`
    )
    .join("\n---\n")

  return `You are analyzing products for a purchase comparison. Your job is to:

1. SPEC COMPARISON: Select the 6-12 most important specs that differentiate these products for a buyer in the "${params.category ?? "general"}" category. For each spec:
   - Pick a clear label and a snake_case concept key
   - Write a one-sentence explanation of why this spec matters to a buyer
   - List which product_id(s) have the best value for this spec in "best_product_ids"
   - Write a one-sentence "best_reason" explaining WHY the best product(s) win on this spec
   - Provide a "product_spec_keys" mapping: for each product, the actual key name in that product's specs object that corresponds to this concept. Products may use different key names for the same concept (e.g., "panel_type" vs "display_technology"). If a product doesn't have this spec, omit it from the map.

2. QUALITY DIMENSIONS: Generate 4-7 evaluation dimensions appropriate for "${params.category ?? "general"}" products. These should cover different angles a buyer cares about (e.g., for speakers: sound quality, build quality, connectivity, value for money, design/aesthetics; for TVs: picture quality, gaming performance, smart features, build quality, value for money). For each dimension:
   - Name and briefly describe what it measures
   - IMPORTANT: You MUST rate EVERY product for EVERY dimension. The "ratings" array must contain exactly ${params.products.length} entries — one for each product. Do NOT skip any product in any dimension.
   - Rate each product 1-5 with a one-sentence justification
   - You may use general product knowledge beyond the provided data (e.g., brand reliability, known issues) — if you do, mark "uses_external_knowledge": true

${params.priorities.length ? `User priorities (weight these higher): ${params.priorities.join(", ")}` : ""}
${params.budgetMin ? `Budget: ${params.budgetMin}-${params.budgetMax} ${params.products[0]?.currency || "INR"}` : ""}
${params.purchaseBy ? `Purchase deadline: ${params.purchaseBy}` : ""}
${Object.keys(params.userContext).length ? `User context: ${JSON.stringify(params.userContext)}` : ""}

Products:
${productData}

Respond in JSON matching this exact schema:
{
  "spec_comparison": [
    {
      "key": "snake_case_concept_name",
      "label": "Human Readable Name",
      "explanation": "One sentence explaining why this matters to a buyer",
      "best_product_ids": ["product-uuid-1"],
      "best_reason": "One sentence explaining why this product wins on this spec",
      "product_spec_keys": {
        "product-uuid-1": "actual_key_in_their_specs",
        "product-uuid-2": "possibly_different_key_name"
      }
    }
  ],
  "dimensions": [
    {
      "name": "Dimension Name",
      "description": "What this dimension measures",
      "ratings": [
        {
          "product_id": "uuid",
          "score": 1-5,
          "reasoning": "One sentence justification",
          "uses_external_knowledge": true
        }
      ]
    }
  ]
}`
}

export function buildContextQuestionsPrompt(params: {
  products: Array<{
    title: string | null
    brand: string | null
    price_min: number | null
    price_max: number | null
    category?: string | null
    specs: Record<string, string>
  }>
  listCategory: string | null
  existingAnswers: Array<{ question: string; answer: string }>
  existingPendingQuestions: string[]
}): string {
  const productSummary = params.products
    .map(
      (p) =>
        `- ${p.title ?? "Unknown"} (${p.brand ?? "?"}) — ${p.price_min ?? "?"} | Specs: ${JSON.stringify(p.specs)}`
    )
    .join("\n")

  const existingContext = params.existingAnswers.length
    ? `\nAlready known about the user:\n${params.existingAnswers.map((a) => `- Q: ${a.question} → A: ${a.answer}`).join("\n")}`
    : ""

  const pendingQuestions = params.existingPendingQuestions.length
    ? `\nQuestions already asked (do NOT repeat):\n${params.existingPendingQuestions.map((q) => `- ${q}`).join("\n")}`
    : ""

  return `You are helping a user research a purchase decision. Based on the products they've added to their list, generate 1-3 short, specific questions that would help you give better recommendations.

Category: ${params.listCategory ?? "general"}

Products in the list:
${productSummary}
${existingContext}
${pendingQuestions}

Rules:
- Questions should be triggered by PATTERNS in the product data (price range variance → ask about budget sensitivity; multiple speakers → ask about audio quality importance; mixed brands → ask about brand loyalty)
- Each question should be 1 sentence, conversational, specific to THESE products
- Do NOT ask generic questions like "what are you looking for?" — be specific based on the data
- Do NOT repeat questions already asked
- If you have enough context already, return an empty array
- Return 0-3 questions

Return JSON:
{
  "questions": [
    "How important is Dolby Vision support for your TV setup?",
    "Will this be the primary speaker or part of a multi-room setup?"
  ]
}

If no questions are needed, return: {"questions": []}`
}

export function buildSmartSuggestionsPrompt(params: {
  products: Array<{
    title: string | null
    brand: string | null
    url: string
    price_min: number | null
    price_max: number | null
    currency: string
    is_shortlisted: boolean
    ai_verdict: string | null
  }>
  category: string | null
  priorities: string[]
  budgetMin: number | null
  budgetMax: number | null
  purchaseBy: string | null
  userContext: Record<string, unknown>
  contextAnswers: Array<{ question: string; answer: string }>
}): string {
  const shortlisted = params.products.filter((p) => p.is_shortlisted)
  const currency = params.products[0]?.currency ?? "INR"

  const productList = params.products
    .map(
      (p) =>
        `- ${p.title ?? "Unknown"} (${p.brand ?? "?"}) — ${p.price_min ?? "?"}${p.price_max ? `-${p.price_max}` : ""} ${p.currency}${p.is_shortlisted ? " [SHORTLISTED]" : ""}${p.ai_verdict ? ` — "${p.ai_verdict}"` : ""}`
    )
    .join("\n")

  const shortlistedSummary = shortlisted.length
    ? `\nUser has shortlisted these (strong preference signal):\n${shortlisted.map((p) => `- ${p.title ?? "Unknown"} (${p.brand ?? "?"})`).join("\n")}`
    : ""

  const existingUrls = params.products.map((p) => p.url).join("\n")

  const contextAnswerText = params.contextAnswers.length
    ? `\nUser preferences (from Q&A):\n${params.contextAnswers.map((a) => `- Q: ${a.question} → A: ${a.answer}`).join("\n")}`
    : ""

  const userContextText =
    params.userContext && Object.keys(params.userContext).length
      ? `\nUser context: ${JSON.stringify(params.userContext)}`
      : ""

  return `You are a product research assistant helping a user find additional products for their purchase comparison list. Use Google Search to find real, currently available products that complement their existing research.

Category: ${params.category ?? "general"}
${params.budgetMin ? `Budget: ${params.budgetMin}-${params.budgetMax} ${currency}` : ""}
${params.purchaseBy ? `Purchase deadline: ${params.purchaseBy}` : ""}
${params.priorities.length ? `Priorities (in order of importance): ${params.priorities.join(", ")}` : ""}
${userContextText}
${contextAnswerText}

Current products in their list:
${productList}
${shortlistedSummary}

DO NOT suggest any of these URLs (already in the list):
${existingUrls}

Instructions:
- Search for 0-4 additional products that would meaningfully complement this list
- Focus on products that fill GAPS: different price points, different brands, features the current options lack
- If the user has shortlisted products, find alternatives in a similar class
- Each suggestion must be a REAL, currently available product with a valid purchase URL
- Weight suggestions toward the user's priorities and budget
- Each "reason" must specifically reference the user's priorities, budget, or shortlisted items
- If the list is already comprehensive (good coverage of options), return 0 suggestions
- Return at most 4 suggestions, ranked by relevance

Return ONLY valid JSON matching this exact schema (no markdown, no explanation outside the JSON):
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
      "reason": "Fits your budget with 144Hz refresh matching your gaming priority — a strong alternative to the shortlisted Sony X90L"
    }
  ]
}

If no suggestions are needed, return: {"suggestions": []}`
}
