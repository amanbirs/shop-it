# Components — Test Inventory

Skip shadcn/ui primitives (not our code) and pure presentational components. Focus on components with **interactive logic, conditional rendering, form handling, or state management**.

**Mocking strategy:** Mock Server Actions, router, and Supabase client. Use @testing-library/react `render`, `screen`, `fireEvent`/`userEvent`.

---

## High Priority — Forms & Interactive Logic

### `components/lists/create-list-dialog.tsx` (~8 tests)

```
Rendering
  - renders trigger button
  - opens dialog when trigger is clicked

Form validation (client-side)
  - shows error when submitting with empty name
  - accepts valid name + category

Submission
  - calls createList action with form data on submit
  - closes dialog on successful submission
  - shows error toast on failed submission
  - disables submit button while submitting (loading state)
```

### `components/products/add-product-form.tsx` (~7 tests)

```
Rendering
  - renders URL input and submit button

Validation
  - shows error for invalid URL format
  - accepts valid URLs

Submission
  - calls addProduct action with URL and listId
  - clears input on success
  - shows error on failure
  - shows loading state during submission
```

### `components/collaboration/invite-member-dialog.tsx` (~6 tests)

```
  - renders email input and role selector
  - defaults role to "editor"
  - calls inviteMember action with email + role
  - shows error when inviting own email
  - shows CONFLICT error when email already a member
  - closes dialog on success
```

### `components/collaboration/comment-input.tsx` (~5 tests)

```
  - renders textarea
  - calls addComment on submit
  - clears textarea on success
  - disables submit when content is empty
  - supports submitting a reply (parentId)
```

### `components/lists/list-settings-form.tsx` (~5 tests)

```
  - renders with existing list data pre-filled
  - calls updateList with changed fields
  - validates budget min <= max on client side
  - shows success feedback on save
  - handles partial updates (only changed fields sent)
```

---

## Medium Priority — Display Logic & State

### `components/products/product-card.tsx` (~6 tests)

```
  - renders product title and price
  - shows extraction progress skeleton when status is "pending"
  - shows "Failed" state with retry button when status is "failed"
  - shows shortlist indicator when is_shortlisted is true
  - shows purchased badge when is_purchased is true
  - calls onClick when card is clicked (opens detail panel)
```

### `components/products/product-actions.tsx` (~5 tests)

```
  - calls toggleShortlist when shortlist button clicked
  - calls markPurchased when purchase button clicked
  - calls archiveProduct when archive button clicked
  - disables actions for viewer role
  - shows confirmation dialog for archive
```

### `components/products/product-detail-panel.tsx` (~4 tests)

```
  - renders product details (title, brand, price, specs)
  - renders pros and cons lists
  - shows "Retry" button when extraction failed
  - shows comment thread section
```

### `components/ai/expert-opinion-card.tsx` (~4 tests)

```
  - renders top pick and value pick
  - renders summary and verdict
  - renders comparison section
  - handles null/missing opinion data gracefully
```

### `components/ai/suggestion-card.tsx` (~4 tests)

```
  - renders suggestion title, brand, price, reason
  - calls acceptSuggestion when "Add" is clicked
  - calls dismissSuggestion when "Dismiss" is clicked
  - shows loading state during accept/dismiss
```

### `components/ai/context-question-popup.tsx` (~5 tests)

```
  - renders when pending questions exist
  - shows question text
  - calls answerContextQuestion with answer text
  - calls dismissContextQuestion when dismissed
  - hides when no pending questions
```

### `components/ai/chat-panel.tsx` (~5 tests)

```
  - renders message history
  - sends message on submit
  - clears input after sending
  - shows loading indicator while waiting for response
  - appends assistant response to history
```

### `components/collaboration/member-list.tsx` (~5 tests)

```
  - renders list of members with roles
  - shows "Pending" badge for uninvited members (joined_at null)
  - shows role dropdown for owners
  - calls removeMember when remove is clicked
  - hides management controls for non-owner users
```

### `components/collaboration/comment-thread.tsx` (~4 tests)

```
  - renders top-level comments
  - renders nested replies indented
  - shows delete button for own comments
  - shows reply button for editor+ roles
```

### `components/lists/list-card.tsx` (~4 tests)

```
  - renders list name and category emoji
  - shows product count
  - shows AI comment
  - navigates to list detail on click
```

### `components/lists/list-filters.tsx` (~3 tests)

```
  - renders filter options (all, shortlisted, purchased)
  - updates URL query params when filter changes
  - highlights active filter
```

### `components/common/price-display.tsx` (~3 tests)

```
  - renders formatted price range
  - renders "Price not available" for null prices
  - renders single price when min = max
```

### `components/common/empty-state.tsx` (~2 tests)

```
  - renders title and description
  - renders action button when provided
```

---

## Low Priority — Layout Components

These have minimal logic and are mostly structural. Test only if time permits.

### `components/layout/sidebar.tsx` (~3 tests)

```
  - renders list of user's lists
  - highlights active list
  - shows create list button
```

### `components/layout/header.tsx` (~2 tests)

```
  - renders user avatar
  - renders command palette trigger
```

### `components/common/command-menu.tsx` (~3 tests)

```
  - opens on Cmd+K
  - filters lists by search query
  - navigates to selected list
```

---

## Summary

| Priority | Components | Tests |
|----------|-----------|-------|
| High (forms/interactions) | 5 | ~31 |
| Medium (display/state) | 11 | ~47 |
| Low (layout) | 3 | ~8 |
| **Total** | **19** | **~86** |
