import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { DotRating } from "@/components/specs/dot-rating"

describe("DotRating", () => {
  it("renders correct number of filled and empty dots for score 4", () => {
    const { container } = render(<DotRating score={4} />)
    const dots = container.querySelectorAll("span > span")
    expect(dots).toHaveLength(5)

    // First 4 should be filled (bg-foreground)
    const filled = Array.from(dots).filter((d) =>
      d.className.includes("bg-foreground")
    )
    expect(filled).toHaveLength(4)
  })

  it("renders all empty dots for score 0", () => {
    const { container } = render(<DotRating score={0} />)
    const dots = container.querySelectorAll("span > span")
    const filled = Array.from(dots).filter((d) =>
      d.className.includes("bg-foreground")
    )
    expect(filled).toHaveLength(0)
  })

  it("renders all filled dots for score 5", () => {
    const { container } = render(<DotRating score={5} />)
    const dots = container.querySelectorAll("span > span")
    const filled = Array.from(dots).filter((d) =>
      d.className.includes("bg-foreground")
    )
    expect(filled).toHaveLength(5)
  })

  it("has correct aria-label", () => {
    render(<DotRating score={3} />)
    expect(screen.getByLabelText("3 out of 5")).toBeInTheDocument()
  })

  it("respects custom max", () => {
    const { container } = render(<DotRating score={2} max={3} />)
    const dots = container.querySelectorAll("span > span")
    expect(dots).toHaveLength(3)
    expect(screen.getByLabelText("2 out of 3")).toBeInTheDocument()
  })
})
