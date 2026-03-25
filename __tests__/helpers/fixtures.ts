/**
 * Shared test data factories.
 * Use these in Server Action and component tests for consistent mock data.
 */

export const TEST_USER = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  email: "test@example.com",
} as const

export const TEST_USER_2 = {
  id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  email: "other@example.com",
} as const

export const TEST_LIST = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "TV Shopping",
  category: "electronics",
  category_emoji: "📺",
  description: "Looking for a 55 inch TV",
  budget_min: 30000,
  budget_max: 60000,
  purchase_by: "2026-04-01",
  owner_id: TEST_USER.id,
  priorities: ["picture quality", "smart features"],
  status: "active",
  archived_at: null,
  ai_comment: "The hunt begins.",
} as const

export const TEST_PRODUCT = {
  id: "660e8400-e29b-41d4-a716-446655440000",
  list_id: TEST_LIST.id,
  url: "https://www.amazon.in/dp/B0EXAMPLE",
  domain: "amazon.in",
  extraction_status: "completed" as const,
  title: "Sony Bravia 55 inch",
  brand: "Sony",
  price_min: 54990,
  price_max: 54990,
  currency: "INR",
  specs: { "Screen Size": "55 inch", Resolution: "4K" },
  pros: ["Great picture", "Good sound"],
  cons: ["Expensive"],
  rating: 4.5,
  review_count: 120,
  ai_summary: "A solid mid-range TV.",
  ai_verdict: "Best for movie lovers",
  is_shortlisted: false,
  is_purchased: false,
  added_by: TEST_USER.id,
  added_via: "user" as const,
  notes: null,
  archived_at: null,
} as const

export const TEST_PRODUCT_2 = {
  ...TEST_PRODUCT,
  id: "770e8400-e29b-41d4-a716-446655440000",
  url: "https://www.flipkart.com/dp/B0EXAMPLE2",
  domain: "flipkart.com",
  title: "LG OLED 55 inch",
  brand: "LG",
  price_min: 89990,
  price_max: 89990,
} as const

export const TEST_PRODUCT_PENDING = {
  ...TEST_PRODUCT,
  id: "880e8400-e29b-41d4-a716-446655440000",
  extraction_status: "pending" as const,
  title: null,
  brand: null,
  price_min: null,
  price_max: null,
  specs: null,
  pros: null,
  cons: null,
  rating: null,
  review_count: null,
  ai_summary: null,
  ai_verdict: null,
} as const

export const TEST_PRODUCT_FAILED = {
  ...TEST_PRODUCT_PENDING,
  id: "990e8400-e29b-41d4-a716-446655440000",
  extraction_status: "failed" as const,
} as const

export const TEST_MEMBER_OWNER = {
  id: "aa0e8400-e29b-41d4-a716-446655440001",
  list_id: TEST_LIST.id,
  user_id: TEST_USER.id,
  role: "owner" as const,
  joined_at: "2026-03-01T00:00:00Z",
  invited_by: null,
} as const

export const TEST_MEMBER_EDITOR = {
  id: "bb0e8400-e29b-41d4-a716-446655440002",
  list_id: TEST_LIST.id,
  user_id: TEST_USER_2.id,
  role: "editor" as const,
  joined_at: "2026-03-02T00:00:00Z",
  invited_by: TEST_USER.id,
} as const

export const TEST_MEMBER_VIEWER = {
  id: "cc0e8400-e29b-41d4-a716-446655440003",
  list_id: TEST_LIST.id,
  user_id: "viewer-user-id",
  role: "viewer" as const,
  joined_at: "2026-03-03T00:00:00Z",
  invited_by: TEST_USER.id,
} as const

export const TEST_COMMENT = {
  id: "dd0e8400-e29b-41d4-a716-446655440004",
  product_id: TEST_PRODUCT.id,
  user_id: TEST_USER.id,
  content: "Great TV!",
  parent_id: null,
  created_at: "2026-03-10T12:00:00Z",
} as const

export const TEST_SUGGESTION = {
  id: "ee0e8400-e29b-41d4-a716-446655440005",
  list_id: TEST_LIST.id,
  title: "Samsung QLED 55 inch",
  url: "https://www.amazon.in/dp/B0SAMSUNG",
  domain: "amazon.in",
  brand: "Samsung",
  image_url: null,
  price_min: 64990,
  price_max: 64990,
  currency: "INR",
  reason: "Fills a mid-range gap between your current options",
  status: "pending" as const,
  accepted_product_id: null,
} as const

export const TEST_CONTEXT_QUESTION = {
  id: "ff0e8400-e29b-41d4-a716-446655440006",
  list_id: TEST_LIST.id,
  question: "How important is Dolby Vision support?",
  answer: null,
  status: "pending" as const,
  triggered_by: TEST_PRODUCT.id,
  answered_at: null,
} as const

export const TEST_EXPERT_OPINION = {
  list_id: TEST_LIST.id,
  top_pick: TEST_PRODUCT.id,
  top_pick_reason: "Best overall value with great picture quality.",
  value_pick: TEST_PRODUCT_2.id,
  value_pick_reason: "Premium OLED at a competitive price point.",
  summary: "Both TVs excel in different areas.",
  comparison: "The Sony offers better value while the LG has superior contrast.",
  concerns: "The LG is significantly more expensive.",
  verdict: "Go with the Sony unless OLED is a must.",
  product_count: 2,
  generated_at: "2026-03-15T00:00:00Z",
  model_version: "gemini-3.1-flash-lite-preview",
} as const
