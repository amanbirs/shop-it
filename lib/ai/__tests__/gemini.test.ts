import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock fetch globally before importing the module
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

// Set the env var before importing
vi.stubEnv("GEMINI_API_KEY", "test-api-key")

// Import after mocking
const { callGemini } = await import("../gemini")

function geminiResponse(text: string) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        candidates: [{ content: { parts: [{ text }] } }],
      }),
  }
}

function geminiError(status: number, body: string) {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(body),
  }
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe("callGemini", () => {
  it("sends POST to correct URL with API key", async () => {
    mockFetch.mockResolvedValue(geminiResponse("hello"))

    await callGemini("test prompt")

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("key=test-api-key"),
      expect.objectContaining({ method: "POST" })
    )
  })

  it("defaults to gemini-3.1-flash-lite-preview model", async () => {
    mockFetch.mockResolvedValue(geminiResponse("hello"))

    await callGemini("test prompt")

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("gemini-3.1-flash-lite-preview"),
      expect.any(Object)
    )
  })

  it("uses custom model when provided", async () => {
    mockFetch.mockResolvedValue(geminiResponse("hello"))

    await callGemini("test prompt", { model: "gemini-pro" })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("gemini-pro"),
      expect.any(Object)
    )
  })

  it("returns the text content from response", async () => {
    mockFetch.mockResolvedValue(geminiResponse("AI response text"))

    const result = await callGemini("test prompt")
    expect(result).toBe("AI response text")
  })

  it("sets responseMimeType when jsonMode is true", async () => {
    mockFetch.mockResolvedValue(geminiResponse('{"key": "value"}'))

    await callGemini("test prompt", { jsonMode: true })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.generationConfig.responseMimeType).toBe("application/json")
  })

  it("does not set responseMimeType when jsonMode is false", async () => {
    mockFetch.mockResolvedValue(geminiResponse("text"))

    await callGemini("test prompt")

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.generationConfig.responseMimeType).toBeUndefined()
  })

  it("uses custom maxTokens when provided", async () => {
    mockFetch.mockResolvedValue(geminiResponse("text"))

    await callGemini("test prompt", { maxTokens: 8192 })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.generationConfig.maxOutputTokens).toBe(8192)
  })

  it("defaults maxOutputTokens to 4096", async () => {
    mockFetch.mockResolvedValue(geminiResponse("text"))

    await callGemini("test prompt")

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.generationConfig.maxOutputTokens).toBe(4096)
  })

  it("retries once on transient error then succeeds", async () => {
    mockFetch
      .mockResolvedValueOnce(geminiError(503, "Service Unavailable"))
      .mockResolvedValueOnce(geminiResponse("retry worked"))

    // Use real timers — the 1s delay is acceptable in tests
    const result = await callGemini("test prompt")
    expect(result).toBe("retry worked")
    expect(mockFetch).toHaveBeenCalledTimes(2)
  }, 5000)

  it("throws if both attempts fail", async () => {
    mockFetch.mockResolvedValue(geminiError(500, "Internal Server Error"))

    await expect(callGemini("test prompt")).rejects.toThrow("Gemini API error")
    expect(mockFetch).toHaveBeenCalledTimes(2)
  }, 5000)

  it("throws on empty response (retries then fails)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ candidates: [] }),
    })

    await expect(callGemini("test prompt")).rejects.toThrow("empty response")
  }, 5000)

  it("sends prompt in correct body structure", async () => {
    mockFetch.mockResolvedValue(geminiResponse("text"))

    await callGemini("my test prompt")

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.contents).toEqual([
      { parts: [{ text: "my test prompt" }] },
    ])
  })
})

describe("callGemini — missing API key", () => {
  it("throws when GEMINI_API_KEY is not set", async () => {
    const originalKey = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY

    try {
      await expect(callGemini("test")).rejects.toThrow("GEMINI_API_KEY")
    } finally {
      process.env.GEMINI_API_KEY = originalKey
    }
  })
})
