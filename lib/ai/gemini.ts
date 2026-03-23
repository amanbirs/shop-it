const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models"

type GeminiOptions = {
  model?: string
  maxTokens?: number
  jsonMode?: boolean
}

export async function callGemini(
  prompt: string,
  options: GeminiOptions = {}
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set")

  const model = options.model ?? "gemini-2.0-flash"
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
