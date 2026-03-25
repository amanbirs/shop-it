import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SuggestionCard } from "../ai/suggestion-card"
import type { ProductSuggestion } from "@/lib/types/database"

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}))

const baseSuggestion: ProductSuggestion = {
  id: "s-1",
  list_id: "list-1",
  title: "Samsung QLED 55 inch",
  url: "https://amazon.in/dp/BSAMSUNG",
  domain: "amazon.in",
  image_url: null,
  brand: "Samsung",
  price_min: 64990,
  price_max: 64990,
  currency: "INR",
  reason: "Fills a mid-range gap between your current options",
  confidence: 0.8,
  source_urls: [],
  search_queries: [],
  trigger_type: "product_added",
  status: "pending",
  accepted_product_id: null,
  created_at: "2026-03-25T00:00:00Z",
  updated_at: "2026-03-25T00:00:00Z",
}

describe("SuggestionCard", () => {
  it("renders suggestion title", () => {
    render(
      <SuggestionCard suggestion={baseSuggestion} onAccept={vi.fn()} onDismiss={vi.fn()} />
    )
    expect(screen.getAllByText("Samsung QLED 55 inch")[0]).toBeInTheDocument()
  })

  it("renders reason text", () => {
    render(
      <SuggestionCard suggestion={baseSuggestion} onAccept={vi.fn()} onDismiss={vi.fn()} />
    )
    expect(screen.getAllByText("Fills a mid-range gap between your current options")[0]).toBeInTheDocument()
  })

  it("renders AI Suggests badge", () => {
    render(
      <SuggestionCard suggestion={baseSuggestion} onAccept={vi.fn()} onDismiss={vi.fn()} />
    )
    expect(screen.getAllByText("AI Suggests")[0]).toBeInTheDocument()
  })

  it("renders domain badge", () => {
    render(
      <SuggestionCard suggestion={baseSuggestion} onAccept={vi.fn()} onDismiss={vi.fn()} />
    )
    expect(screen.getAllByText("amazon.in")[0]).toBeInTheDocument()
  })

  it("calls onAccept when Add to List is clicked", async () => {
    const user = userEvent.setup()
    const onAccept = vi.fn()
    render(
      <SuggestionCard suggestion={baseSuggestion} onAccept={onAccept} onDismiss={vi.fn()} />
    )

    await user.click(screen.getAllByText("Add to List")[0])
    expect(onAccept).toHaveBeenCalled()
  })

  it("calls onDismiss when Dismiss button is clicked", async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(
      <SuggestionCard suggestion={baseSuggestion} onAccept={vi.fn()} onDismiss={onDismiss} />
    )

    await user.click(screen.getAllByText("Dismiss")[0])
    expect(onDismiss).toHaveBeenCalled()
  })

  it("shows 'Adding...' when isAccepting is true", () => {
    render(
      <SuggestionCard suggestion={baseSuggestion} onAccept={vi.fn()} onDismiss={vi.fn()} isAccepting />
    )
    expect(screen.getAllByText("Adding...")[0]).toBeInTheDocument()
  })

  it("disables Add button when isAccepting", () => {
    render(
      <SuggestionCard suggestion={baseSuggestion} onAccept={vi.fn()} onDismiss={vi.fn()} isAccepting />
    )
    const addBtn = screen.getAllByText("Adding...")[0].closest("button")
    expect(addBtn).toBeDisabled()
  })

  it("shows No image placeholder when image_url is null", () => {
    render(
      <SuggestionCard suggestion={baseSuggestion} onAccept={vi.fn()} onDismiss={vi.fn()} />
    )
    expect(screen.getAllByText("No image")[0]).toBeInTheDocument()
  })
})
