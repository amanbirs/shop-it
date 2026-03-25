# Validators & Utils — Test Inventory

These are pure functions with zero dependencies. No mocking needed, fast to write, high value.

## Existing Tests (keep as-is)

| File | Tests | Status |
|------|-------|--------|
| `lib/validators/lists.test.ts` | 6 tests | Done |
| `lib/validators/products.test.ts` | 4 tests | Done |
| `lib/validators/members.test.ts` | 3 tests | Done |
| `lib/utils.test.ts` | 10 tests | Done |

## Missing Validator Tests

### `lib/validators/comments.test.ts` (NEW — ~12 tests)

```
createCommentSchema
  - passes with valid productId + content
  - passes with optional parentId
  - fails when productId is not a UUID
  - fails when content is empty
  - fails when content exceeds 5000 chars
  - fails when parentId is not a UUID

updateCommentSchema
  - passes with valid commentId + content
  - fails when commentId missing
  - fails when content is empty
  - fails when content exceeds 5000 chars

deleteCommentSchema
  - passes with valid UUID
  - fails with non-UUID string
```

### `lib/validators/suggestions.test.ts` (NEW — ~6 tests)

```
acceptSuggestionSchema
  - passes with valid UUID
  - fails with non-UUID string

dismissSuggestionSchema
  - passes with valid UUID
  - fails with non-UUID string

requestSuggestionsSchema
  - passes with valid UUID
  - fails with non-UUID string
```

### `lib/validators/ai.test.ts` (NEW — ~5 tests)

```
generateHypeTitleSchema
  - passes with valid category string
  - fails when category is empty
  - fails when category exceeds 200 chars

hypeTitleResponseSchema
  - passes with title + emoji
  - fails when title missing
```

### Expand Existing Validator Tests

#### `lib/validators/products.test.ts` — add ~8 tests

```
markPurchasedSchema
  - passes with productId + isPurchased: true
  - passes with optional purchasedPrice and purchaseUrl
  - fails when productId missing
  - fails when purchasedPrice is negative

archiveProductSchema
  - passes with valid UUID
  - fails with non-UUID

retryExtractionSchema
  - passes with valid UUID
  - fails with non-UUID
```

#### `lib/validators/lists.test.ts` — add ~4 tests

```
archiveListSchema
  - passes with valid UUID
  - fails with non-UUID

updateListSchema
  - passes with priorities array
  - fails when priorities exceeds 10 items (if enforced in schema)
```

#### `lib/validators/members.test.ts` — add ~8 tests

```
removeMemberSchema
  - passes with listId + memberId UUIDs
  - fails when listId missing
  - fails when memberId missing

updateRoleSchema
  - passes with listId + memberId + valid role
  - fails with invalid role value

acceptInviteSchema
  - passes with valid listId UUID
  - fails with non-UUID

resendInviteSchema
  - passes with valid memberId UUID
  - fails with non-UUID
```

## Missing Utils Tests

### `lib/utils.test.ts` — add ~8 tests

```
getCategoryEmoji
  - returns correct emoji for known categories ("tv" → "📺")
  - returns correct emoji for partial match ("running shoes" contains "running" → "👟")
  - returns "📦" for unknown category
  - returns "📋" for null category
  - is case insensitive ("TV" → "📺")

cn (class name merge utility)
  - merges class names
  - resolves Tailwind conflicts (last wins)
  - handles falsy values
```

## Summary

| Category | New Tests | Files |
|----------|-----------|-------|
| Missing validator files | ~23 | 3 new files |
| Expand existing validators | ~20 | 3 existing files |
| Expand utils | ~8 | 1 existing file |
| **Total** | **~51** | **7 files** |
