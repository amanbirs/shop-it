import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProductCard } from "../products/product-card"
import type { Product } from "@/lib/types/database"

// Mock next/image to render a plain img
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}))

const baseProduct: Product = {
  id: "p-1",
  list_id: "list-1",
  added_by: "user-1",
  added_via: "user",
  url: "https://amazon.in/dp/B123",
  domain: "amazon.in",
  title: "Sony Bravia 55 inch",
  image_url: "https://img.example.com/tv.jpg",
  brand: "Sony",
  model: "X90L",
  price_min: 54990,
  price_max: 54990,
  currency: "INR",
  price_note: null,
  specs: { "Screen Size": "55 inch" },
  pros: ["Great picture"],
  cons: ["Expensive"],
  rating: 4.5,
  review_count: 120,
  scraped_reviews: [],
  ai_summary: "Solid TV",
  ai_review_summary: null,
  ai_verdict: "Best for movie lovers",
  ai_extracted_at: "2026-03-25T00:00:00Z",
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
}

describe("ProductCard", () => {
  it("renders product title for completed product", () => {
    render(<ProductCard product={baseProduct} />)
    expect(screen.getAllByText("Sony Bravia 55 inch")[0]).toBeInTheDocument()
  })

  it("renders AI verdict", () => {
    render(<ProductCard product={baseProduct} />)
    expect(screen.getAllByText("Best for movie lovers")[0]).toBeInTheDocument()
  })

  it("renders rating and review count", () => {
    render(<ProductCard product={baseProduct} />)
    expect(screen.getAllByText("4.5")[0]).toBeInTheDocument()
    expect(screen.getAllByText("(120)")[0]).toBeInTheDocument()
  })

  it("shows skeleton for pending extraction", () => {
    const pending = { ...baseProduct, extraction_status: "pending" as const }
    const { container } = render(<ProductCard product={pending} />)

    // Skeleton has animate-pulse elements, no product title
    expect(screen.queryAllByText("Sony Bravia 55 inch")).toHaveLength(0)
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)
  })

  it("shows skeleton for processing extraction", () => {
    const processing = { ...baseProduct, extraction_status: "processing" as const }
    const { container } = render(<ProductCard product={processing} />)

    expect(screen.queryAllByText("Sony Bravia 55 inch")).toHaveLength(0)
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)
  })

  it("shows failed state with URL for failed extraction", () => {
    const failed = { ...baseProduct, extraction_status: "failed" as const, extraction_error: "Timeout" }
    render(<ProductCard product={failed} />)

    expect(screen.getAllByText("https://amazon.in/dp/B123")[0]).toBeInTheDocument()
    expect(screen.queryAllByText("Sony Bravia 55 inch")).toHaveLength(0)
  })

  it("shows Shortlisted badge when product is shortlisted", () => {
    const shortlisted = { ...baseProduct, is_shortlisted: true }
    render(<ProductCard product={shortlisted} />)

    expect(screen.getAllByText("Shortlisted")[0]).toBeInTheDocument()
  })

  it("shows Purchased badge when product is purchased", () => {
    const purchased = { ...baseProduct, is_purchased: true }
    render(<ProductCard product={purchased} />)

    expect(screen.getAllByText("Purchased")[0]).toBeInTheDocument()
  })

  it("calls onClick when completed card is clicked", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<ProductCard product={baseProduct} onClick={onClick} />)

    await user.click(screen.getAllByText("Sony Bravia 55 inch")[0])
    expect(onClick).toHaveBeenCalled()
  })

  it("shows 'No image' placeholder when image_url is null", () => {
    const noImage = { ...baseProduct, image_url: null }
    render(<ProductCard product={noImage} />)

    expect(screen.getAllByText("No image")[0]).toBeInTheDocument()
  })

  it("renders domain badge", () => {
    render(<ProductCard product={baseProduct} />)
    expect(screen.getAllByText("amazon.in")[0]).toBeInTheDocument()
  })
})
