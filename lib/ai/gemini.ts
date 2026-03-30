const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models"

type GeminiOptions = {
  model?: string
  maxTokens?: number
  jsonMode?: boolean
}

// ---------------------------------------------------------------------------
// Grounded search types (mirrors the Edge Function types)
// ---------------------------------------------------------------------------

export type GroundedResponse = {
  text: string
  sourceUrls: string[]
  searchQueries: string[]
  avgConfidence: number | null
}

export async function callGemini(
  prompt: string,
  options: GeminiOptions = {}
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set")

  const model = options.model ?? "gemini-3.1-flash-lite-preview"
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: options.maxTokens ?? 4096,
      ...(options.jsonMode && { responseMimeType: "application/json" }),
    },
  }

  const attemptFetch = async (): Promise<string> => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Gemini API error (${res.status}): ${text}`)
    }

    const data = await res.json()
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) throw new Error("Gemini returned empty response")
    return content
  }

  try {
    return await attemptFetch()
  } catch (err) {
    // Retry once after 1s on transient errors
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return await attemptFetch()
  }
}

/**
 * Call Gemini with Google Search grounding enabled.
 * NOTE: JSON mode (`responseMimeType`) is NOT compatible with grounding,
 * so the prompt must instruct the model to return raw JSON.
 */
export async function callGeminiWithGrounding(
  prompt: string,
  options: { model?: string; maxTokens?: number } = {}
): Promise<GroundedResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set")

  const model = options.model ?? "gemini-2.5-flash"
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: {
        maxOutputTokens: options.maxTokens ?? 4096,
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gemini API error (${res.status}): ${text}`)
  }

  const data = await res.json()
  const candidate = data?.candidates?.[0]
  if (!candidate) throw new Error("Gemini returned no candidates")

  const text = candidate.content?.parts?.[0]?.text ?? ""
  if (!text) throw new Error("Gemini returned empty response")

  const metadata = candidate.groundingMetadata
  const sourceUrls = (metadata?.groundingChunks ?? [])
    .map((c: { web?: { uri?: string } }) => c.web?.uri)
    .filter((u: unknown): u is string => !!u)

  const searchQueries: string[] = metadata?.webSearchQueries ?? []

  const allConfidences = (metadata?.groundingSupports ?? []).flatMap(
    (s: { confidenceScores?: number[] }) => s.confidenceScores ?? []
  )
  const avgConfidence = allConfidences.length
    ? allConfidences.reduce((a: number, b: number) => a + b, 0) / allConfidences.length
    : null

  return { text, sourceUrls, searchQueries, avgConfidence }
}
