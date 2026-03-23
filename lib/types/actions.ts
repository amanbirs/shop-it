// ActionResult pattern — see 07-api-contracts.md

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "AI_ERROR"
  | "SCRAPING_ERROR"
  | "INTERNAL_ERROR"

export type ActionError = {
  code: ErrorCode
  message: string
  field?: string
  details?: unknown
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ActionError }
