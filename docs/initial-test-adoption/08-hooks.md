# Hooks — Test Inventory

## `hooks/use-realtime-products.ts` (~10 tests)

**File:** The only custom hook. Subscribes to Supabase Realtime for product and suggestion changes, triggers router.refresh(), and auto-generates context questions on extraction completion.

**Mocking strategy:** Mock `createClient` (returns mock Supabase with channel/subscribe), mock `useRouter`, mock `generateContextQuestions`. Use `renderHook` from @testing-library/react.

### Subscription setup

```
  - subscribes to products channel for the given listId
  - subscribes to product_suggestions channel for the given listId
  - uses correct filter: list_id=eq.{listId}
  - subscribes to all events (*) on public schema
```

### Change handling

```
  - calls router.refresh() on any product change
  - calls router.refresh() on any suggestion change
```

### Extraction completion detection

```
  - calls generateContextQuestions when extraction_status changes from "pending" to "completed"
  - calls generateContextQuestions when extraction_status changes from "processing" to "completed"
  - does NOT call generateContextQuestions when status stays "completed" (no-op update)
  - does NOT call generateContextQuestions when status changes to "failed"
```

### Race condition guard

```
  - does not call generateContextQuestions while a previous call is in progress (generatingRef)
```

### Cleanup

```
  - removes both channels on unmount
```

---

## Summary

| Hook | Tests |
|------|-------|
| `useRealtimeProducts` | ~10 |
