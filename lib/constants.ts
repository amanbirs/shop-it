export const MAX_PRODUCTS_PER_LIST = 100
export const MAX_COMMENT_LENGTH = 5000
export const MAX_LIST_NAME_LENGTH = 200
export const MAX_PRIORITIES = 10
export const DEFAULT_CURRENCY = "INR"
export const AI_TITLE_MAX_LENGTH = 30
export const AI_COMMENT_MAX_LENGTH = 60
export const INVITE_LINK_EXPIRY_DAYS = 7
export const RESEND_COOLDOWN_SECONDS = 60

export const EXTRACTION_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const

export const MEMBER_ROLES = ["owner", "editor", "viewer"] as const
export const LIST_STATUSES = ["active", "archived"] as const

export const FALLBACK_AI_COMMENTS = [
  "Ready when you are.",
  "The hunt begins.",
  "Decisions, decisions...",
  "Let the research commence.",
  "Your next great find awaits.",
] as const
