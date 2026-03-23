import { describe, it, expect } from "vitest"
import { formatPrice, formatPriceRange, extractDomain, relativeTime } from "./utils"

describe("formatPrice", () => {
  it("formats INR correctly", () => {
    expect(formatPrice(29999)).toBe("₹29,999")
  })

  it("handles zero", () => {
    expect(formatPrice(0)).toBe("₹0")
  })
})

describe("formatPriceRange", () => {
  it("returns single price when min equals max", () => {
    expect(formatPriceRange(29999, 29999)).toBe("₹29,999")
  })

  it("returns range when min differs from max", () => {
    expect(formatPriceRange(29999, 34999)).toBe("₹29,999 – ₹34,999")
  })

  it("returns 'Price not available' for null values", () => {
    expect(formatPriceRange(null, null)).toBe("Price not available")
  })

  it("returns single price when only min is set", () => {
    expect(formatPriceRange(29999, null)).toBe("₹29,999")
  })
})

describe("extractDomain", () => {
  it("extracts domain from full URL", () => {
    expect(extractDomain("https://www.amazon.in/dp/B0EXAMPLE")).toBe(
      "amazon.in"
    )
  })

  it("strips www prefix", () => {
    expect(extractDomain("https://www.flipkart.com/product")).toBe(
      "flipkart.com"
    )
  })

  it("handles URLs without www", () => {
    expect(extractDomain("https://bestbuy.com/product")).toBe("bestbuy.com")
  })

  it("returns input on invalid URL", () => {
    expect(extractDomain("not-a-url")).toBe("not-a-url")
  })
})

describe("relativeTime", () => {
  it("returns 'just now' for recent dates", () => {
    expect(relativeTime(new Date())).toBe("just now")
  })

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    expect(relativeTime(fiveMinAgo)).toBe("5m ago")
  })

  it("returns hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    expect(relativeTime(twoHoursAgo)).toBe("2h ago")
  })

  it("returns days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    expect(relativeTime(threeDaysAgo)).toBe("3d ago")
  })
})
