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

  return `You are a purchase advisor. Analyze these products and provide expert recommendations.

${params.category ? `Category: ${params.category}` : ""}
${params.budgetMin ? `Budget: ${params.budgetMin}-${params.budgetMax} ${params.products[0]?.currency || "INR"}` : ""}
${params.purchaseBy ? `Purchase deadline: ${params.purchaseBy}` : ""}
${params.priorities.length ? `User priorities (in order of importance): ${params.priorities.join(", ")}` : ""}
${Object.keys(params.userContext).length ? `User context: ${JSON.stringify(params.userContext)}` : ""}

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
