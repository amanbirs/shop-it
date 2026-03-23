// Database entity types — mirrors Postgres schema from 02-data-model.md

export type Profile = {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  context: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type List = {
  id: string
  name: string
  description: string | null
  category: string | null
  status: "active" | "archived"
  budget_min: number | null
  budget_max: number | null
  purchase_by: string | null
  priorities: string[]
  ai_comment: string | null
  ai_title_edited: boolean
  category_emoji: string
  owner_id: string
  created_at: string
  updated_at: string
  archived_at: string | null
}

export type ListMember = {
  id: string
  list_id: string
  user_id: string
  role: Role
  invited_by: string | null
  joined_at: string | null
  created_at: string
}

export type Product = {
  id: string
  list_id: string
  added_by: string | null
  added_via: "user" | "ai"
  url: string
  domain: string | null
  title: string | null
  image_url: string | null
  brand: string | null
  model: string | null
  price_min: number | null
  price_max: number | null
  currency: string
  price_note: string | null
  specs: Record<string, string>
  pros: string[]
  cons: string[]
  rating: number | null
  review_count: number | null
  scraped_reviews: ScrapedReview[]
  ai_summary: string | null
  ai_review_summary: string | null
  ai_verdict: string | null
  ai_extracted_at: string | null
  is_shortlisted: boolean
  is_purchased: boolean
  purchased_at: string | null
  purchased_price: number | null
  purchase_url: string | null
  extraction_status: ExtractionStatus
  raw_scraped_data: unknown | null
  extraction_error: string | null
  notes: string | null
  position: number
  created_at: string
  updated_at: string
  archived_at: string | null
}

export type ScrapedReview = {
  snippet: string
  rating: number | null
  source: string | null
  date: string | null
}

export type Comment = {
  id: string
  product_id: string
  user_id: string
  content: string
  parent_id: string | null
  created_at: string
  updated_at: string
}

export type ListAiOpinion = {
  id: string
  list_id: string
  top_pick: string | null
  top_pick_reason: string | null
  value_pick: string | null
  value_pick_reason: string | null
  summary: string | null
  comparison: string | null
  concerns: string | null
  verdict: string | null
  product_count: number | null
  generated_at: string
  model_version: string | null
  created_at: string
  updated_at: string
}

export type InviteToken = {
  id: string
  token: string
  list_id: string
  role: "editor" | "viewer"
  created_by: string
  expires_at: string
  used_at: string | null
  created_at: string
}

// Union types
export type Role = "owner" | "editor" | "viewer"
export type ExtractionStatus = "pending" | "processing" | "completed" | "failed"
export type ListStatus = "active" | "archived"
