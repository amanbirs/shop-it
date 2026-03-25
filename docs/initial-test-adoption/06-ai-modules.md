# AI Modules — Test Inventory

## `lib/ai/gemini.ts` (~10 tests)

**File:** The Gemini API wrapper with retry logic.

**Mocking strategy:** Mock global `fetch`. Do NOT mock `callGemini` itself — we're testing this module.

### callGemini

```
Config
  - throws when GEMINI_API_KEY is not set
  - defaults to model "gemini-3.1-flash-lite-preview"
  - uses custom model when provided in options
  - defaults maxOutputTokens to 4096
  - uses custom maxTokens when provided
  - sets responseMimeType to "application/json" when jsonMode is true
  - does NOT set responseMimeType when jsonMode is false/undefined

Request
  - sends POST to correct URL with API key in query param
  - sends correct JSON body structure

Success
  - returns the text content from candidates[0].content.parts[0].text

Empty response
  - throws "Gemini returned empty response" when candidates is empty
  - throws when parts array is empty

API error
  - throws "Gemini API error (status): body" on non-OK response

Retry behavior
  - retries once after 1 second on transient error
  - succeeds on retry if second attempt works
  - throws if both attempts fail
```

**Note:** Use `vi.useFakeTimers()` for the retry delay test to avoid waiting 1s.

---

## `lib/ai/prompts.ts` (~18 tests)

**File:** 6 prompt builder functions. These are pure functions — no mocking needed.

The tests should verify the **structure and content** of the generated prompts, not exact string matching (which would be brittle). Focus on: required context is included, JSON schema instructions are present, edge cases produce valid prompts.

### buildExtractionPrompt

```
  - includes the product URL in the prompt
  - includes category hint when listCategory is provided
  - omits category hint when listCategory is undefined
  - includes user priorities when provided
  - includes the scraped content at the end
  - contains JSON schema with required fields (title, brand, price_min, etc.)
```

### buildHypeTitlePrompt

```
  - includes the category in the prompt
  - contains JSON schema with title and emoji fields
  - includes example responses
```

### buildAiCommentPrompt

```
  - includes list name and product stats
  - includes budget range when present
  - omits budget line when budgetMin is null
  - includes "60 characters" constraint
```

### buildExpertOpinionPrompt

```
  - includes all product data (title, brand, price, specs)
  - includes budget constraints when present
  - includes priorities in order of importance
  - includes user context when non-empty
  - contains JSON schema with top_pick, value_pick, summary, etc.
  - handles empty products array without crashing
```

### buildContextQuestionsPrompt

```
  - includes product summary
  - includes existing answers as "Already known"
  - includes existing pending questions as "do NOT repeat"
  - omits existing context when arrays are empty
  - contains "Return 0-3 questions" instruction
```

### buildSmartSuggestionsPrompt

```
  - includes current product list
  - highlights shortlisted products as "[SHORTLISTED]"
  - includes existing URLs as "DO NOT suggest" list
  - includes context answers when present
  - includes budget and priority constraints
  - contains JSON schema with suggestions array
```

---

## Summary

| Module | Tests | Notes |
|--------|-------|-------|
| `gemini.ts` | ~10 | Fetch mock, retry behavior, error handling |
| `prompts.ts` | ~18 | Pure functions, test structure not exact strings |
| **Total** | **~28** | |
