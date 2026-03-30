import { describe, it, expect } from "vitest"
import { specAnalysisResponseSchema, specComparisonRowSchema, dimensionSchema } from "./spec-analysis"

describe("specComparisonRowSchema", () => {
  const validRow = {
    key: "panel_type",
    label: "Panel Type",
    explanation: "OLED = perfect blacks. QLED = brighter in daylight.",
    best_product_ids: ["550e8400-e29b-41d4-a716-446655440000"],
    best_reason: "OLED delivers infinite contrast ratio",
    product_spec_keys: {
      "550e8400-e29b-41d4-a716-446655440000": "panel_type",
      "660e8400-e29b-41d4-a716-446655440001": "display_technology",
    },
  }

  it("accepts a valid spec comparison row", () => {
    expect(specComparisonRowSchema.safeParse(validRow).success).toBe(true)
  })

  it("rejects empty best_product_ids", () => {
    const result = specComparisonRowSchema.safeParse({
      ...validRow,
      best_product_ids: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-UUID in best_product_ids", () => {
    const result = specComparisonRowSchema.safeParse({
      ...validRow,
      best_product_ids: ["not-a-uuid"],
    })
    expect(result.success).toBe(false)
  })

  it("accepts empty product_spec_keys (product lacks this spec)", () => {
    const result = specComparisonRowSchema.safeParse({
      ...validRow,
      product_spec_keys: {},
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing explanation", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { explanation, ...withoutExplanation } = validRow
    expect(specComparisonRowSchema.safeParse(withoutExplanation).success).toBe(false)
  })

  it("rejects missing best_reason", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { best_reason, ...withoutBestReason } = validRow
    expect(specComparisonRowSchema.safeParse(withoutBestReason).success).toBe(false)
  })
})

describe("dimensionSchema", () => {
  const validDimension = {
    name: "Picture Quality",
    description: "Color accuracy, contrast, HDR performance",
    ratings: [
      {
        product_id: "550e8400-e29b-41d4-a716-446655440000",
        score: 5,
        reasoning: "Reference-grade color accuracy",
        uses_external_knowledge: false,
      },
    ],
  }

  it("accepts a valid dimension", () => {
    expect(dimensionSchema.safeParse(validDimension).success).toBe(true)
  })

  it("rejects score below 1", () => {
    const result = dimensionSchema.safeParse({
      ...validDimension,
      ratings: [{ ...validDimension.ratings[0], score: 0 }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects score above 5", () => {
    const result = dimensionSchema.safeParse({
      ...validDimension,
      ratings: [{ ...validDimension.ratings[0], score: 6 }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects fractional scores", () => {
    const result = dimensionSchema.safeParse({
      ...validDimension,
      ratings: [{ ...validDimension.ratings[0], score: 3.5 }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty ratings array", () => {
    const result = dimensionSchema.safeParse({
      ...validDimension,
      ratings: [],
    })
    expect(result.success).toBe(false)
  })
})

describe("specAnalysisResponseSchema", () => {
  const validResponse = {
    spec_comparison: [
      {
        key: "panel_type",
        label: "Panel Type",
        explanation: "OLED = perfect blacks",
        best_product_ids: ["550e8400-e29b-41d4-a716-446655440000"],
        best_reason: "Infinite contrast ratio",
        product_spec_keys: { "550e8400-e29b-41d4-a716-446655440000": "panel_type" },
      },
    ],
    dimensions: [
      {
        name: "Picture Quality",
        description: "Color accuracy and contrast",
        ratings: [
          {
            product_id: "550e8400-e29b-41d4-a716-446655440000",
            score: 5,
            reasoning: "Best in class",
            uses_external_knowledge: false,
          },
        ],
      },
    ],
  }

  it("accepts a valid full response", () => {
    expect(specAnalysisResponseSchema.safeParse(validResponse).success).toBe(true)
  })

  it("rejects empty spec_comparison", () => {
    const result = specAnalysisResponseSchema.safeParse({
      ...validResponse,
      spec_comparison: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty dimensions", () => {
    const result = specAnalysisResponseSchema.safeParse({
      ...validResponse,
      dimensions: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects more than 15 spec rows", () => {
    const tooMany = Array.from({ length: 16 }, (_, i) => ({
      ...validResponse.spec_comparison[0],
      key: `spec_${i}`,
    }))
    const result = specAnalysisResponseSchema.safeParse({
      ...validResponse,
      spec_comparison: tooMany,
    })
    expect(result.success).toBe(false)
  })

  it("rejects more than 10 dimensions", () => {
    const tooMany = Array.from({ length: 11 }, (_, i) => ({
      ...validResponse.dimensions[0],
      name: `Dim ${i}`,
    }))
    const result = specAnalysisResponseSchema.safeParse({
      ...validResponse,
      dimensions: tooMany,
    })
    expect(result.success).toBe(false)
  })
})
