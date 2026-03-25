import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ExpertOpinionCard } from "../ai/expert-opinion-card"
import type { ListAiOpinion, Product } from "@/lib/types/database"

// Mock next/image
import { vi } from "vitest"
vi.mock("next/image", () => ({
  default: ({ alt, ...props }: Record<string, unknown>) => <div role="img" aria-label={alt as string} {...props} />,
}))

const baseProduct = (overrides: Partial<Product> = {}): Product => ({
  id: "p-1",
  list_id: "list-1",
  added_by: "user-1",
  added_via: "user",
  url: "https://amazon.in/dp/B123",
  domain: "amazon.in",
  title: "Sony Bravia 55 inch",
  image_url: "https://img.example.com/tv.jpg",
  brand: "Sony",
  model: null,
  price_min: 54990,
  price_max: 54990,
  currency: "INR",
  price_note: null,
  specs: {},
  pros: [],
  cons: [],
  rating: 4.5,
  review_count: 120,
  scraped_reviews: [],
  ai_summary: null,
  ai_review_summary: null,
  ai_verdict: null,
  ai_extracted_at: null,
  is_shortlisted: false,
  is_purchased: false,
  purchased_at: null,
  purchased_price: null,
  purchase_url: null,
  extraction_status: "completed",
  raw_scraped_data: null,
  extraction_error: null,
  notes: null,
  position: 0,
  created_at: "2026-03-25T00:00:00Z",
  updated_at: "2026-03-25T00:00:00Z",
  archived_at: null,
  ...overrides,
})

const product1 = baseProduct({ id: "p-1", title: "Sony Bravia 55 inch", price_min: 54990, price_max: 54990 })
const product2 = baseProduct({ id: "p-2", title: "LG OLED 55 inch", price_min: 89990, price_max: 89990 })

const baseOpinion: ListAiOpinion = {
  id: "op-1",
  list_id: "list-1",
  top_pick: "p-1",
  top_pick_reason: "Best overall value with great picture quality.",
  value_pick: "p-2",
  value_pick_reason: "Premium OLED at a competitive price point.",
  summary: "Both TVs excel in different areas.",
  comparison: "The Sony offers better value while the LG has superior contrast.",
  concerns: "The LG is significantly more expensive.",
  verdict: "Go with the Sony unless OLED is a must.",
  product_count: 2,
  generated_at: new Date().toISOString(),
  model_version: "gemini-3.1-flash-lite-preview",
  created_at: "2026-03-25T00:00:00Z",
  updated_at: "2026-03-25T00:00:00Z",
}

const productNames = { "p-1": "Sony Bravia 55 inch", "p-2": "LG OLED 55 inch" }

describe("ExpertOpinionCard", () => {
  it("renders verdict text", () => {
    render(
      <ExpertOpinionCard opinion={baseOpinion} productNames={productNames} products={[product1, product2]} />
    )
    expect(screen.getAllByText(/Go with the Sony unless OLED is a must/)[0]).toBeInTheDocument()
  })

  it("renders Best overall pick card", () => {
    render(
      <ExpertOpinionCard opinion={baseOpinion} productNames={productNames} products={[product1, product2]} />
    )
    expect(screen.getAllByText("Best overall")[0]).toBeInTheDocument()
    expect(screen.getAllByText("Sony Bravia 55 inch")[0]).toBeInTheDocument()
  })

  it("renders Best value pick card", () => {
    render(
      <ExpertOpinionCard opinion={baseOpinion} productNames={productNames} products={[product1, product2]} />
    )
    expect(screen.getAllByText("Best value")[0]).toBeInTheDocument()
    expect(screen.getAllByText("LG OLED 55 inch")[0]).toBeInTheDocument()
  })

  it("renders pick reasons", () => {
    render(
      <ExpertOpinionCard opinion={baseOpinion} productNames={productNames} products={[product1, product2]} />
    )
    expect(screen.getAllByText("Best overall value with great picture quality.")[0]).toBeInTheDocument()
    expect(screen.getAllByText("Premium OLED at a competitive price point.")[0]).toBeInTheDocument()
  })

  it("renders comparison section", () => {
    render(
      <ExpertOpinionCard opinion={baseOpinion} productNames={productNames} products={[product1, product2]} />
    )
    expect(screen.getAllByText("How they compare")[0]).toBeInTheDocument()
  })

  it("renders concerns section", () => {
    render(
      <ExpertOpinionCard opinion={baseOpinion} productNames={productNames} products={[product1, product2]} />
    )
    expect(screen.getAllByText("Things to watch out for")[0]).toBeInTheDocument()
  })

  it("handles null verdict gracefully", () => {
    const noVerdict = { ...baseOpinion, verdict: null }
    render(
      <ExpertOpinionCard opinion={noVerdict} productNames={productNames} products={[product1, product2]} />
    )
    // Should not crash and should still render picks
    expect(screen.getAllByText("Best overall")[0]).toBeInTheDocument()
  })

  it("handles null comparison gracefully", () => {
    const noComparison = { ...baseOpinion, comparison: null }
    render(
      <ExpertOpinionCard opinion={noComparison} productNames={productNames} products={[product1, product2]} />
    )
    expect(screen.queryAllByText("How they compare")).toHaveLength(0)
  })

  it("handles null concerns gracefully", () => {
    const noConcerns = { ...baseOpinion, concerns: null }
    render(
      <ExpertOpinionCard opinion={noConcerns} productNames={productNames} products={[product1, product2]} />
    )
    expect(screen.queryAllByText("Things to watch out for")).toHaveLength(0)
  })
})
