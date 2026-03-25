import { describe, it, expect } from "vitest"
import {
  buildExtractionPrompt,
  buildHypeTitlePrompt,
  buildAiCommentPrompt,
  buildExpertOpinionPrompt,
  buildContextQuestionsPrompt,
  buildSmartSuggestionsPrompt,
} from "../prompts"

describe("buildExtractionPrompt", () => {
  it("includes the product URL", () => {
    const prompt = buildExtractionPrompt({
      scrapedContent: "<html>product page</html>",
      productUrl: "https://amazon.in/dp/B123",
    })
    expect(prompt).toContain("https://amazon.in/dp/B123")
  })

  it("includes category hint when provided", () => {
    const prompt = buildExtractionPrompt({
      scrapedContent: "content",
      productUrl: "https://example.com",
      listCategory: "electronics",
    })
    expect(prompt).toContain("Category hint: electronics")
  })

  it("omits category hint when not provided", () => {
    const prompt = buildExtractionPrompt({
      scrapedContent: "content",
      productUrl: "https://example.com",
    })
    expect(prompt).not.toContain("Category hint:")
  })

  it("includes user priorities when provided", () => {
    const prompt = buildExtractionPrompt({
      scrapedContent: "content",
      productUrl: "https://example.com",
      listPriorities: ["picture quality", "price"],
    })
    expect(prompt).toContain("picture quality, price")
  })

  it("includes the scraped content", () => {
    const prompt = buildExtractionPrompt({
      scrapedContent: "<html>some page content</html>",
      productUrl: "https://example.com",
    })
    expect(prompt).toContain("<html>some page content</html>")
  })

  it("contains JSON schema with required fields", () => {
    const prompt = buildExtractionPrompt({
      scrapedContent: "content",
      productUrl: "https://example.com",
    })
    expect(prompt).toContain('"title"')
    expect(prompt).toContain('"brand"')
    expect(prompt).toContain('"price_min"')
    expect(prompt).toContain('"specs"')
    expect(prompt).toContain('"pros"')
    expect(prompt).toContain('"cons"')
    expect(prompt).toContain('"ai_summary"')
    expect(prompt).toContain('"ai_verdict"')
  })
})

describe("buildHypeTitlePrompt", () => {
  it("includes the category", () => {
    const prompt = buildHypeTitlePrompt("television")
    expect(prompt).toContain("television")
  })

  it("contains JSON schema with title and emoji", () => {
    const prompt = buildHypeTitlePrompt("TV")
    expect(prompt).toContain('"title"')
    expect(prompt).toContain('"emoji"')
  })

  it("includes example responses", () => {
    const prompt = buildHypeTitlePrompt("TV")
    expect(prompt).toContain("The Great TV Showdown")
  })
})

describe("buildAiCommentPrompt", () => {
  const baseParams = {
    listName: "TV Shopping",
    category: "electronics",
    productCount: 3,
    shortlistedCount: 1,
    purchasedCount: 0,
    budgetMin: 30000,
    budgetMax: 60000,
    currency: "INR",
  }

  it("includes list name and stats", () => {
    const prompt = buildAiCommentPrompt(baseParams)
    expect(prompt).toContain("TV Shopping")
    expect(prompt).toContain("3 products")
    expect(prompt).toContain("1 shortlisted")
  })

  it("includes budget when present", () => {
    const prompt = buildAiCommentPrompt(baseParams)
    expect(prompt).toContain("30000")
    expect(prompt).toContain("60000")
  })

  it("omits budget when budgetMin is null", () => {
    const prompt = buildAiCommentPrompt({
      ...baseParams,
      budgetMin: null,
      budgetMax: null,
    })
    expect(prompt).not.toContain("Budget:")
  })

  it("includes 60 character constraint", () => {
    const prompt = buildAiCommentPrompt(baseParams)
    expect(prompt).toContain("60 characters")
  })
})

describe("buildExpertOpinionPrompt", () => {
  const baseParams = {
    products: [
      {
        id: "p1",
        title: "Sony TV",
        brand: "Sony",
        price_min: 54990,
        price_max: 54990,
        currency: "INR",
        specs: { "Screen Size": "55 inch" },
        pros: ["Great picture"],
        cons: ["Expensive"],
        rating: 4.5,
        review_count: 120,
        ai_summary: "Solid TV",
      },
    ],
    budgetMin: 30000,
    budgetMax: 60000,
    purchaseBy: "2026-04-01",
    category: "electronics",
    priorities: ["picture quality"],
    userContext: {},
  }

  it("includes product data", () => {
    const prompt = buildExpertOpinionPrompt(baseParams)
    expect(prompt).toContain("Sony TV")
    expect(prompt).toContain("54990")
  })

  it("includes budget constraints", () => {
    const prompt = buildExpertOpinionPrompt(baseParams)
    expect(prompt).toContain("30000")
    expect(prompt).toContain("60000")
  })

  it("includes priorities", () => {
    const prompt = buildExpertOpinionPrompt(baseParams)
    expect(prompt).toContain("picture quality")
  })

  it("contains JSON schema with required fields", () => {
    const prompt = buildExpertOpinionPrompt(baseParams)
    expect(prompt).toContain('"top_pick"')
    expect(prompt).toContain('"value_pick"')
    expect(prompt).toContain('"summary"')
    expect(prompt).toContain('"verdict"')
  })

  it("handles empty products without crashing", () => {
    const prompt = buildExpertOpinionPrompt({
      ...baseParams,
      products: [],
    })
    expect(typeof prompt).toBe("string")
  })
})

describe("buildContextQuestionsPrompt", () => {
  const baseParams = {
    products: [
      {
        title: "Sony TV",
        brand: "Sony",
        price_min: 54990,
        price_max: 54990,
        specs: { "Screen Size": "55 inch" },
      },
    ],
    listCategory: "electronics",
    existingAnswers: [] as Array<{ question: string; answer: string }>,
    existingPendingQuestions: [] as string[],
  }

  it("includes product summary", () => {
    const prompt = buildContextQuestionsPrompt(baseParams)
    expect(prompt).toContain("Sony TV")
  })

  it("includes existing answers when present", () => {
    const prompt = buildContextQuestionsPrompt({
      ...baseParams,
      existingAnswers: [
        { question: "How big is your room?", answer: "Medium, about 15x12 ft" },
      ],
    })
    expect(prompt).toContain("How big is your room?")
    expect(prompt).toContain("Medium, about 15x12 ft")
  })

  it("includes existing pending questions as do-not-repeat", () => {
    const prompt = buildContextQuestionsPrompt({
      ...baseParams,
      existingPendingQuestions: ["Do you prefer OLED?"],
    })
    expect(prompt).toContain("Do you prefer OLED?")
    expect(prompt).toContain("do NOT repeat")
  })

  it("omits existing context sections when arrays are empty", () => {
    const prompt = buildContextQuestionsPrompt(baseParams)
    expect(prompt).not.toContain("Already known")
    expect(prompt).not.toContain("Questions already asked")
  })

  it("contains return format instruction", () => {
    const prompt = buildContextQuestionsPrompt(baseParams)
    expect(prompt).toContain('"questions"')
  })
})

describe("buildSmartSuggestionsPrompt", () => {
  const baseParams = {
    products: [
      {
        title: "Sony TV",
        brand: "Sony",
        url: "https://amazon.in/sony",
        price_min: 54990,
        price_max: 54990,
        currency: "INR",
        is_shortlisted: true,
        ai_verdict: "Best for movies",
      },
    ],
    category: "electronics",
    priorities: ["picture quality"],
    budgetMin: 30000,
    budgetMax: 60000,
    purchaseBy: null,
    userContext: {},
    contextAnswers: [] as Array<{ question: string; answer: string }>,
  }

  it("includes current product list", () => {
    const prompt = buildSmartSuggestionsPrompt(baseParams)
    expect(prompt).toContain("Sony TV")
  })

  it("highlights shortlisted products", () => {
    const prompt = buildSmartSuggestionsPrompt(baseParams)
    expect(prompt).toContain("[SHORTLISTED]")
  })

  it("includes existing URLs as do-not-suggest", () => {
    const prompt = buildSmartSuggestionsPrompt(baseParams)
    expect(prompt).toContain("https://amazon.in/sony")
    expect(prompt).toContain("DO NOT suggest")
  })

  it("includes context answers when present", () => {
    const prompt = buildSmartSuggestionsPrompt({
      ...baseParams,
      contextAnswers: [
        { question: "Room size?", answer: "15x12 ft" },
      ],
    })
    expect(prompt).toContain("Room size?")
    expect(prompt).toContain("15x12 ft")
  })

  it("contains JSON schema with suggestions array", () => {
    const prompt = buildSmartSuggestionsPrompt(baseParams)
    expect(prompt).toContain('"suggestions"')
    expect(prompt).toContain('"title"')
    expect(prompt).toContain('"url"')
    expect(prompt).toContain('"reason"')
  })
})
