# Server Actions — Test Inventory

Server Actions are the core business logic layer. Every action follows the same pattern:
1. Auth check (`getAuthenticatedUser`)
2. Input validation (Zod schema)
3. Permission check (role verification via Supabase query)
4. Database operation
5. Side effects (revalidatePath, non-blocking AI regeneration, suggestion triggers)

**Mocking strategy:** Mock `getAuthenticatedUser`, `createClient` (returns chainable query builder), `revalidatePath`, and `callGemini`. Test the _logic_ of the action, not the Supabase driver.

---

## `lib/actions/lists.ts` (~18 tests)

### createList
```
Auth
  - returns UNAUTHORIZED when user is not signed in

Validation
  - returns VALIDATION_ERROR when name is empty
  - returns VALIDATION_ERROR when budget_min > budget_max

Success
  - inserts list row with correct fields
  - inserts owner as list_member with role "owner"
  - calls revalidatePath("/")
  - returns { success: true, data: { id, name } }

DB Error
  - returns INTERNAL_ERROR when list insert fails
  - returns INTERNAL_ERROR when member insert fails
```

### updateList
```
Auth
  - returns UNAUTHORIZED when not signed in

Validation
  - returns VALIDATION_ERROR when listId missing

Permission
  - returns FORBIDDEN when user is a viewer
  - returns FORBIDDEN when user is not a member

Success
  - updates only the provided fields
  - calls revalidatePath for "/" and "/lists/[id]"
  - returns { success: true, data: { id } }

DB Error
  - returns INTERNAL_ERROR when update fails
```

### archiveList
```
Auth
  - returns UNAUTHORIZED when not signed in

Permission
  - returns FORBIDDEN when user is editor (not owner)
  - returns FORBIDDEN when user is not a member

Success
  - sets archived_at and status = "archived"
  - returns { success: true, data: { id } }
```

---

## `lib/actions/products.ts` (~30 tests)

### addProduct
```
Auth
  - returns UNAUTHORIZED when not signed in

Validation
  - returns VALIDATION_ERROR for invalid URL
  - returns VALIDATION_ERROR when listId missing

Permission
  - returns FORBIDDEN when user is viewer
  - returns FORBIDDEN when user is not a member

Success
  - inserts product with domain extracted from URL
  - sets extraction_status to "pending"
  - sets added_via to "user"
  - calls revalidatePath("/lists/[listId]")
  - calls regenerateAiComment non-blocking
  - returns { success: true, data: { id, extraction_status: "pending" } }

Auto-trigger
  - triggers suggestions when product count is divisible by 3
  - does NOT trigger suggestions for other counts

DB Error
  - returns INTERNAL_ERROR when insert fails
```

### toggleShortlist
```
Auth
  - returns UNAUTHORIZED when not signed in

Lookup
  - returns NOT_FOUND when product doesn't exist

Permission
  - returns FORBIDDEN when user is viewer

Success
  - updates is_shortlisted field
  - calls regenerateAiComment
  - returns { success: true, data: { id, isShortlisted } }
```

### markPurchased
```
Auth / Lookup / Permission — same pattern as toggleShortlist (3 tests)

Success — mark as purchased
  - sets is_purchased: true, purchased_at, purchased_price, purchase_url

Success — unmark as purchased
  - sets is_purchased: false, clears purchased_at/price/url to null
```

### archiveProduct
```
Auth / Lookup / Permission — same pattern (3 tests)

Success
  - sets archived_at timestamp
  - calls regenerateAiComment
```

### retryExtraction
```
Auth
  - returns UNAUTHORIZED when not signed in

Lookup
  - returns NOT_FOUND when product doesn't exist

State check
  - returns VALIDATION_ERROR when extraction_status is not "failed"
  - returns VALIDATION_ERROR when extraction_status is "completed"

Permission
  - returns FORBIDDEN when user is viewer

Success
  - resets extraction_status to "pending" and clears extraction_error
```

---

## `lib/actions/comments.ts` (~22 tests)

### addComment
```
Auth
  - returns UNAUTHORIZED when not signed in

Validation
  - returns VALIDATION_ERROR when content is empty
  - returns VALIDATION_ERROR when productId is not UUID

Permission
  - returns FORBIDDEN when user is viewer
  - returns FORBIDDEN when user is not a member of the product's list

Threading
  - inserts with parent_id = null when no parentId given
  - inserts with parent_id = parentComment.id for top-level parent
  - flattens deeply nested replies: if parent has a parent, resolvedParentId = grandparent
  - returns NOT_FOUND when parentId points to non-existent comment

Success
  - returns { id, content, createdAt }
```

### updateComment
```
Auth
  - returns UNAUTHORIZED when not signed in

Lookup
  - returns NOT_FOUND when comment doesn't exist

Authorship
  - returns FORBIDDEN when user is not the comment author

Success
  - updates the content field
  - returns { id }
```

### deleteComment
```
Auth
  - returns UNAUTHORIZED when not signed in

Lookup
  - returns NOT_FOUND when comment doesn't exist

Authorization
  - allows deletion by comment author
  - allows deletion by list owner (even if not the author)
  - returns FORBIDDEN when user is neither author nor owner
  - returns NOT_FOUND when product lookup fails (for non-author path)

Success
  - deletes the comment row
```

---

## `lib/actions/members.ts` (~28 tests)

### inviteMember
```
Auth
  - returns UNAUTHORIZED when not signed in

Validation
  - returns VALIDATION_ERROR for invalid email
  - returns VALIDATION_ERROR when trying to invite yourself

Permission
  - returns FORBIDDEN when caller is not the owner

Conflict
  - returns CONFLICT when email is already a member
  - returns CONFLICT when email has a pending invite

Profile lookup
  - sets user_id to profile.id when the email is a registered user
  - sets user_id to null when the email is not a registered user

Success
  - inserts list_member row with joined_at = null (pending)
  - returns { id, status: "invited" }
```

### removeMember
```
Auth
  - returns UNAUTHORIZED when not signed in

Permission
  - returns FORBIDDEN when caller is not owner

Lookup
  - returns NOT_FOUND when memberId doesn't exist in this list

Self-removal
  - returns VALIDATION_ERROR when trying to remove yourself

Success
  - deletes the member row
```

### updateRole
```
Auth
  - returns UNAUTHORIZED when not signed in

Permission
  - returns FORBIDDEN when caller is not owner

Lookup
  - returns NOT_FOUND when memberId doesn't exist

Success
  - updates the role field
  - returns { id, role }
```

### acceptInvite
```
Auth
  - returns UNAUTHORIZED when not signed in

Lookup
  - returns NOT_FOUND when no pending invite exists for the user's email

Success
  - sets joined_at timestamp
  - sets user_id to current user
  - calls revalidatePath for both "/" and "/lists/[id]"
  - returns { id, role }
```

### resendInvite
```
Auth
  - returns UNAUTHORIZED when not signed in

Lookup
  - returns NOT_FOUND when memberId doesn't exist

Permission
  - returns FORBIDDEN when caller is not owner

State check
  - returns VALIDATION_ERROR when member has already joined (joined_at is not null)

Success
  - returns { id } (email stub — no actual send yet)
```

---

## `lib/actions/ai.ts` (~10 tests)

### generateHypeTitle
```
Auth
  - returns UNAUTHORIZED when not signed in

Validation
  - returns VALIDATION_ERROR when category is empty

AI call
  - calls callGemini with buildHypeTitlePrompt output
  - returns parsed title and emoji from JSON response
  - uses category as fallback title when JSON parse fails
  - uses "📦" as fallback emoji when not in response
  - returns AI_ERROR when callGemini throws
```

### regenerateAiComment
```
Success path
  - fetches list + product stats
  - calls callGemini with buildAiCommentPrompt output
  - strips surrounding quotes from response
  - updates list.ai_comment with cleaned response

Fallback path
  - uses a static fallback from FALLBACK_AI_COMMENTS when callGemini throws
  - silently catches if fallback update also fails
  - does nothing if list is not found
```

---

## `lib/actions/chat.ts` (~6 tests)

### callChatAction
```
Auth
  - returns UNAUTHORIZED when not signed in

Context assembly
  - fetches list, products, opinion, and context answers
  - builds prompt with conversation history

Success
  - returns { response: trimmedString }

Error
  - returns AI_ERROR when callGemini throws
```

---

## `lib/actions/suggestions.ts` (~18 tests)

### triggerSuggestions
```
  - calls invokeSuggestEdgeFunction
  - logs error but does not throw when edge function fails
```

### requestSuggestions
```
Auth
  - returns UNAUTHORIZED when not signed in

Validation
  - returns VALIDATION_ERROR when listId is not UUID

Permission
  - returns FORBIDDEN when user is viewer

Success
  - invokes suggest-products edge function
  - returns { triggered: true }

Error
  - returns AI_ERROR when edge function fails
```

### acceptSuggestion
```
Auth
  - returns UNAUTHORIZED when not signed in

Lookup
  - returns NOT_FOUND when suggestion doesn't exist

State check
  - returns CONFLICT when suggestion is not "pending"

Permission
  - returns FORBIDDEN when user is viewer

Success
  - inserts a new product from suggestion data
  - sets added_via to "ai"
  - sets extraction_status to "pending"
  - updates suggestion status to "accepted" with accepted_product_id
  - calls regenerateAiComment
```

### dismissSuggestion
```
Auth
  - returns UNAUTHORIZED when not signed in

Lookup
  - returns NOT_FOUND when suggestion doesn't exist

State check
  - returns CONFLICT when suggestion is not "pending"

Permission
  - returns FORBIDDEN when user is viewer

Success
  - updates suggestion status to "dismissed"
```

---

## `lib/actions/context-questions.ts` (~22 tests)

### generateContextQuestions
```
  - does nothing when no completed products exist
  - does nothing when 3+ pending questions already exist
  - calls callGemini with buildContextQuestionsPrompt
  - inserts new question rows with status "pending"
  - handles empty questions array gracefully
  - logs error but does not throw on failure
```

### answerContextQuestion
```
Auth
  - returns UNAUTHORIZED when not signed in

Validation
  - returns VALIDATION_ERROR when answer is empty/whitespace

Lookup
  - returns NOT_FOUND when question doesn't exist

Success
  - updates answer, status to "answered", answered_at
  - calls revalidatePath for list and settings

Auto-trigger
  - triggers suggestions when answered count is divisible by 5
  - does NOT trigger for other counts
```

### dismissContextQuestion
```
Auth / Lookup — standard (2 tests)

Success
  - sets status to "dismissed"
```

### updateContextAnswer
```
Auth / Lookup — standard (2 tests)

Success — with content
  - updates answer, sets status to "answered"

Success — with empty string
  - clears answer to null, resets status to "pending"
```

### deleteContextQuestion
```
Auth / Lookup — standard (2 tests)

Success
  - deletes the question row
```

### undismissContextQuestion
```
Auth / Lookup — standard (2 tests)

State check
  - returns VALIDATION_ERROR when question is not "dismissed"

Success
  - sets status back to "pending"
```

---

## Summary

| Action File | Tests | Priority |
|-------------|-------|----------|
| `lists.ts` | ~18 | High — CRUD + RBAC |
| `products.ts` | ~30 | High — core feature + side effects |
| `comments.ts` | ~22 | High — threading logic, multi-path authz |
| `members.ts` | ~28 | High — invite flow, self-removal guard |
| `ai.ts` | ~10 | Medium — AI integration, fallbacks |
| `chat.ts` | ~6 | Medium — context assembly |
| `suggestions.ts` | ~18 | Medium — state machine (pending/accepted/dismissed) |
| `context-questions.ts` | ~22 | Medium — auto-trigger thresholds, status transitions |
| **Total** | **~154** | |
