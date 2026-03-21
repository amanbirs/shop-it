# ShopIt - Data Model (First Cut)

## Design Principles

1. **Supabase-native** — leverage RLS, triggers, and Postgres features rather than app-level logic
2. **JSONB for variability** — product specs differ wildly by category; don't try to normalize what changes constantly
3. **Soft delete where it matters** — lists and products use `archived_at` instead of hard delete (protect user research)
4. **v2-ready** — schema should accommodate agentic features (chat, AI research) without migrations that break things

---

## Entity Relationship Diagram

```
┌──────────┐       ┌──────────────┐       ┌──────────────┐
│ profiles │──1:N──│    lists     │──1:N──│   products   │
│          │       │              │       │              │
│          │──1:N──│ list_members │       │              │
└──────────┘       └──────────────┘       └──┬──┬──┬─────┘
                          │                   │  │  │
                       1:1│          1:N──────┘  │  └──────1:N
                          ▼          ▼           │         ▼
                   ┌──────────────┐  ┌─────────────┐  ┌──────────┐
                   │  list_ai    │  │  customer   │  │ comments │
                   │  _opinions  │  │  _reviews   │  └──────────┘
                   └──────────────┘  └─────────────┘
                                              1:N│
                                                 ▼
                                           ┌───────────┐
                                           │   votes   │
                                           └───────────┘
```

---

## Tables

### 1. `users`

Extends Supabase's `auth.users` with profile data.

```sql
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

**Why `profiles` and not `users`?**
Supabase manages `auth.users` internally. The convention is a `profiles` table in the `public` schema that mirrors auth users via a trigger. This gives us a place to store display names and avatars without touching the auth schema.

---

### 2. `lists`

A purchase research project (e.g., "New TV", "Kitchen Renovation").

```sql
create table public.lists (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  category    text,                    -- optional: "electronics", "furniture", etc.
  status      text not null default 'active'
                check (status in ('active', 'archived')),
  -- Budget context (used by AI Expert Opinion)
  budget_min  numeric(12,2),             -- e.g., 30000.00 (₹30K)
  budget_max  numeric(12,2),             -- e.g., 50000.00 (₹50K)
  purchase_by date,                      -- when do they need to decide/buy?

  owner_id    uuid not null references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz
);
```

**Considerations:**

- **`category` is optional and freeform.** I considered an enum, but categories are open-ended (TVs, laptops, strollers, espresso machines...). A freeform text field lets users type whatever they want. We can use this to tune Gemini extraction prompts per category later.
- **`status` vs `archived_at`** — we have both. `status` is the queryable flag (index-friendly), `archived_at` records when. Could drop one, but having both is cheap and useful.
- **`budget_min` / `budget_max`** — budget context for the AI Expert Opinion feature. Without this, AI recommendations are generic ("best overall") rather than personalized ("best within your ₹30K-50K budget"). Currency is inherited from the products in the list (all INR by default).
- **`purchase_by`** — a soft deadline. AI can factor in shipping times or sale end dates. The UI can show a countdown badge. A `date` (not `timestamptz`) because "by March 30" is precise enough — nobody needs hour-level purchase deadlines.
- **No `icon` or `color` field yet.** Tempted to add for UX polish, but keeping it minimal for v1. Easy to add later.

---

### 3. `list_members`

Collaboration join table. Who has access to which list.

```sql
create table public.list_members (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references public.lists(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'editor'
               check (role in ('owner', 'editor', 'viewer')),
  invited_by uuid references public.profiles(id),
  joined_at  timestamptz,              -- null = pending invitation
  created_at timestamptz not null default now(),

  unique (list_id, user_id)
);
```

**Considerations:**

- **Owner is also a member.** When a list is created, an `owner` row is inserted here. This means all access checks go through one table — no special-casing "is this person the owner?" separately.
- **`joined_at` null = pending invite.** Rather than a separate `invitations` table, a null `joined_at` means they were invited but haven't accepted. Simpler than managing two tables. The trade-off is we can't invite someone who doesn't have an account yet — but Supabase Auth handles this: we create the invite, and when they sign up via magic link, we match by email and set `joined_at`.
- **Three roles:**
  - `owner` — can delete the list, manage members
  - `editor` — can add/remove products, comment, vote (default for family)
  - `viewer` — read-only (useful for sharing a finalized list)
- **`invited_by`** — nice for UX ("Aman invited you to...") and audit trail.

---

### 4. `products`

The core table. Each row is one product URL that was ingested.

```sql
create table public.products (
  id              uuid primary key default gen_random_uuid(),
  list_id         uuid not null references public.lists(id) on delete cascade,
  added_by        uuid references public.profiles(id),  -- null when added by AI
  added_via       text not null default 'user'
                    check (added_via in ('user', 'ai')),  -- who added this product

  -- Source
  url             text not null,
  domain          text,                -- extracted: "amazon.in", "flipkart.com", etc.

  -- Extracted data (populated by AI)
  title           text,
  image_url       text,
  brand           text,
  model           text,

  -- Pricing (supports ranges for configurable products)
  price_min       numeric(12,2),       -- lowest price (or the only price if no range)
  price_max       numeric(12,2),       -- highest price (null if single price)
  currency        text default 'INR',
  price_note      text,                -- e.g., "Starting from", "Refurbished", "Sale ends Apr 1"

  -- Flexible structured data
  specs           jsonb default '{}',  -- {"screen_size": "65\"", "resolution": "4K", ...}
  pros            text[] default '{}',
  cons            text[] default '{}',

  -- Aggregate review data (from the source site)
  rating          numeric(3,2),        -- e.g., 4.50
  review_count    integer,

  -- AI-generated insights (Gemini outputs)
  ai_summary      text,                -- one-paragraph product overview written by AI
  ai_review_summary text,              -- AI synthesis of customer reviews (themes, consensus, red flags)
  ai_comparison_notes text,            -- AI notes on how this compares to others in the same list
  ai_verdict      text,                -- AI's quick take: "Best value", "Premium pick", "Risky — mixed reviews"
  ai_extracted_at timestamptz,         -- when AI last processed this product

  -- Workflow (simple booleans — not a state machine)
  is_shortlisted  boolean not null default false,
  is_purchased    boolean not null default false,
  purchased_at    timestamptz,             -- when the purchase happened
  purchased_price numeric(12,2),           -- actual price paid (may differ from listed price)
  purchase_url    text,                    -- actual buy link (could be affiliate link later)

  -- AI processing
  extraction_status text not null default 'pending'
                    check (extraction_status in ('pending', 'processing', 'completed', 'failed')),
  raw_scraped_data  jsonb,             -- full scraper response, kept for re-extraction
  extraction_error  text,              -- error message if extraction failed

  -- Metadata
  notes           text,                -- personal notes from the person who added it
  position        integer default 0,   -- for manual ordering within a list
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz
);
```

**This is the table with the most decisions. Here's my thinking:**

**Why `specs` is JSONB:**
A TV has screen size, refresh rate, panel type. A stroller has weight capacity, fold type, wheel size. These have zero overlap. JSONB lets us store whatever the AI extracts without predicting every category. The UI renders whatever keys exist. Trade-off: you can't do `WHERE specs.screen_size > 55` efficiently — but for family-scale data (10-50 products per list), this doesn't matter. If it did, we'd use GIN indexes on the JSONB.

**Why `price_min`/`price_max` instead of a single `price`:**
Many products show a range — "$499 - $699" depending on size, color, or configuration. Two fields handle this cleanly. For a single fixed price, `price_min` is the price and `price_max` is null. The UI renders: `$499` (single) or `$499 – $699` (range). `price_note` captures context like "Sale ends Apr 1" or "Refurbished price" that doesn't fit a number.

**Why dedicated AI columns instead of a single `ai_output` JSONB:**
These fields (`ai_summary`, `ai_review_summary`, `ai_comparison_notes`, `ai_verdict`) are always present and always strings. Dedicated columns mean:
- Type safety — can't accidentally store a number in `ai_summary`
- Queryable — `WHERE ai_verdict ILIKE '%best value%'` without JSON operators
- Clear contract — the UI knows exactly what to render and where
- Individually updatable — re-running comparison notes (when new products are added) doesn't touch the review summary

`ai_extracted_at` tracks when AI last processed this product. Useful for knowing if insights are stale after the product page changes.

**Why `pros`/`cons` are `text[]` not JSONB:**
They're always a flat list of strings. Postgres arrays are simpler to query (`ANY()`, `array_length()`) and lighter than JSONB for this shape. Also renders cleanly in the UI as bullet points.

**Why `domain` is stored separately:**
Useful for UX (show a favicon or "from Amazon" badge) and for filtering ("show me only Best Buy options"). Extracted from the URL at insert time — cheap and useful.

**Why `extraction_status` exists:**
Scraping + AI extraction takes a few seconds. The UI needs to show a loading state for the product card while this happens. The flow is:
1. User pastes URL → row created with `extraction_status = 'pending'`
2. Background job picks it up → `'processing'`
3. AI returns data → `'completed'` (or `'failed'` with `extraction_error`)
4. Supabase Realtime pushes the update to the UI

**Why `raw_scraped_data` is kept:**
If we improve our Gemini prompt later, we can re-extract without re-scraping. Scraping is the expensive/slow part; re-extraction from stored data is fast and nearly free.

**Why `added_by` + `added_via` instead of just one field:**
`added_by` is the user who added the product (nullable — null when AI adds it in v2). `added_via` is how it was added: `'user'` (someone pasted a URL) or `'ai'` (the agent suggested it in v2). We need both because even when AI suggests a product, we may want to attribute it to the user who triggered the AI request. For v1 it's always `'user'` with a valid `added_by`, but the schema is ready for v2 agentic additions.

**Why `is_shortlisted` + `is_purchased` booleans instead of a status enum:**
The original design had a `status` field with values like `researching → shortlisted → decided → purchased`. But purchase decisions aren't a linear pipeline:
- You might shortlist something and then buy it directly (skipping "decided")
- You might buy something that was never formally shortlisted
- You might shortlist 5 items and buy 2 of them
Booleans are simpler and more honest about how decisions actually work. The UI can derive views: "All" (everything), "Shortlisted" (`is_shortlisted = true`), "Purchased" (`is_purchased = true`). No invalid state transitions to worry about.

**Why `purchased_at`, `purchased_price`, and `purchase_url`:**
These complement `is_purchased`. Knowing *when* something was bought is useful for warranty tracking. `purchased_price` captures what was actually paid (vs the listed price) — powers "you saved ₹X" features and budget tracking. `purchase_url` separates the "buy here" link from the research `url` — useful for affiliate links later. All three are painful to backfill if added later since you'd lose the original data.

**Why `position` for ordering:**
Users will want to drag-and-drop reorder products. An integer position field is the simplest approach. For v1 with small lists, renumbering on reorder is fine.

**What I considered but left out:**
- `price_history jsonb` — tempting for price tracking, but that's v2+
- `tags text[]` — could be useful, but booleans cover the main workflow; tags add complexity without clear v1 value
- `comparison_group` — for side-by-side compare sets; but the UI can handle this as a transient selection, no need to persist

---

### 5. `customer_reviews`

Extracted customer reviews from the source site. Preserved individually so you can browse them without leaving the app.

```sql
create table public.customer_reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,

  -- Review content (scraped from source)
  author      text,                    -- reviewer name/handle if available
  rating      numeric(3,2),            -- individual review rating (e.g., 5.00, 3.00)
  title       text,                    -- review headline
  content     text not null,           -- review body
  source_date date,                    -- when the review was posted on the source site
  verified    boolean default false,   -- "verified purchase" flag if available
  helpful_count integer,               -- "X people found this helpful"

  -- AI enrichment
  sentiment   text check (sentiment in ('positive', 'negative', 'mixed', 'neutral')),
  ai_tags     text[] default '{}',     -- AI-assigned tags: ["durability", "value", "noise", ...]

  -- Metadata
  source_url  text,                    -- direct link to this review if available
  created_at  timestamptz not null default now()
);
```

**Considerations:**

- **Why a separate table?** Reviews are 1:N with products and can number in the hundreds. Stuffing them into JSONB on the product row would bloat reads when you just want the product card. A separate table lets us paginate, filter by sentiment, and sort by helpfulness.
- **`ai_tags`** — Gemini tags each review with topics it covers (e.g., "battery life", "build quality", "customer support"). This powers filtering like "show me all reviews that mention durability" and feeds into the `ai_review_summary` on the product.
- **`sentiment`** — simple 4-value classification. Not trying to be nuanced — just enough to let the UI show a red/yellow/green indicator or filter to "show me the negative reviews".
- **`helpful_count`** — many sites surface this. Good for sorting to show the most useful reviews first.
- **We don't scrape ALL reviews.** The extraction pipeline grabs the top 10-20 most helpful/recent reviews. This is enough for decision-making without ballooning storage or scraping costs.
- **No user edits.** These are read-only records from external sources. Users discuss via the `comments` table instead.

---

### 6. `comments`

Threaded discussion on a product.

```sql
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid not null references public.profiles(id),
  content     text not null,
  parent_id   uuid references public.comments(id) on delete cascade,  -- for threading
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

**Considerations:**

- **`parent_id` for threading.** Simple self-referential FK. Supports one level of replies (like Linear). We don't need deep nesting — this isn't Reddit. The UI can render flat or one-level-deep.
- **No `edited` boolean.** `updated_at > created_at` tells you if it was edited. One less field to maintain.
- **No soft delete.** Comments are lightweight. If someone deletes a comment, it's gone. This keeps the table clean. If we needed audit, we'd add it, but for family use it's unnecessary.

---

### 7. `votes`

Simple thumbs up/down on products. Helps family members signal preferences.

```sql
create table public.votes (
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  vote        smallint not null check (vote in (1, -1)),  -- 1 = up, -1 = down
  created_at  timestamptz not null default now(),

  primary key (product_id, user_id)
);
```

**Considerations:**

- **Composite PK** — one vote per user per product, enforced at the DB level. Upsert to change your vote.
- **`smallint` over `boolean` or `text`** — `SUM(vote)` gives you the net score directly. With a boolean you'd need `COUNT(CASE WHEN ...)`. Small optimization but it's cleaner.
- **No "reaction" system.** Tempted to support emoji reactions (like Notion), but a simple up/down is more decisive for purchase decisions. You're trying to narrow down, not express feelings.

---

### 8. `list_ai_opinions`

AI-generated "Expert Opinion" for a list — a holistic review of all products with recommendations.

```sql
create table public.list_ai_opinions (
  id                uuid primary key default gen_random_uuid(),
  list_id           uuid not null unique references public.lists(id) on delete cascade,

  -- Structured opinion (UI renders each as a section)
  top_pick          uuid references public.products(id) on delete set null,
  top_pick_reason   text,
  value_pick        uuid references public.products(id) on delete set null,
  value_pick_reason text,
  summary           text,           -- "Based on your 6 options, here's what stands out..."
  comparison        text,           -- prose comparing the products
  concerns          text,           -- "Watch out for..." — red flags across the set
  verdict           text,           -- final recommendation paragraph

  -- Context the AI used (so we know when it's stale)
  product_count     integer,        -- how many products were in the list when generated
  generated_at      timestamptz not null default now(),
  model_version     text,           -- which AI model produced this, for debugging

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
```

**Considerations:**

- **Why 1:1 with lists (not versioned)?** For v1, one opinion per list is enough. When the user clicks "Get Expert Opinion" or adds/removes products, we regenerate in-place. If we want history later, we add a `list_ai_opinion_history` table — no migration needed on the main table.
- **Why `top_pick` / `value_pick` are FKs?** The UI can highlight these products directly — "AI recommends this" badge on the card. `on delete set null` means if the product is removed, the opinion doesn't break, it just loses the reference.
- **Why structured columns instead of one big `content` text?** The UI can render these as distinct sections (cards, accordions). We can update `comparison` without touching `verdict` if only one product changed.
- **Why `product_count` and `generated_at`?** Staleness detection. If the list had 3 products when the opinion was generated and now has 6, the UI can prompt "Your expert opinion is outdated — regenerate?" without us tracking individual product changes.
- **Why `model_version`?** Debugging and quality tracking. If we switch from Gemini 1.5 to 2.0, we can see which model produced which opinion and compare quality.

---

## Indexes

```sql
-- Most queries filter by list
create index idx_products_list_id on products(list_id);
create index idx_products_list_shortlisted on products(list_id, is_shortlisted);
create index idx_products_list_added_via on products(list_id, added_via);

-- Member lookups
create index idx_list_members_user_id on list_members(user_id);
create index idx_list_members_list_id on list_members(list_id);

-- Customer reviews by product (with sentiment for filtering)
create index idx_customer_reviews_product_id on customer_reviews(product_id);
create index idx_customer_reviews_sentiment on customer_reviews(product_id, sentiment);

-- Comments by product
create index idx_comments_product_id on comments(product_id);

-- Votes by product (for aggregation)
create index idx_votes_product_id on votes(product_id);

-- list_ai_opinions already has a unique constraint on list_id (acts as index)
```

At family scale (< 1000 rows total), indexes barely matter. But they're free to add and good practice.

---

## Row-Level Security (RLS) Strategy

Supabase RLS policies control who sees what, enforced at the database level.

| Table | Policy |
|-------|--------|
| `profiles` | Users can read any profile (for displaying names); can only update their own |
| `lists` | Users can only see lists where they are a member (via `list_members`) |
| `list_members` | Users can see members of lists they belong to; only owners can add/remove |
| `products` | Users can see/add/edit products in lists they're a member of (editor+) |
| `customer_reviews` | Same as products (read-only for all members; only system/AI writes) |
| `comments` | Same as products; users can only edit/delete their own comments |
| `votes` | Same as products; users can only modify their own votes |
| `list_ai_opinions` | Same as lists — visible to all members of the list; only system/AI writes |

**Key insight:** Almost every policy joins through `list_members`. This is the access control backbone.

---

## v2 Considerations (Agentic Features)

The current schema is forward-compatible with v2 agentic chat. When we add it, we'd likely add:

```
conversations (list-level or product-level AI chat history)
  - id, list_id, product_id (nullable), user_id, role (user/assistant), content, created_at

ai_research_tasks (background research jobs)
  - id, list_id, query, status, result (jsonb), created_at
```

Nothing in the current schema needs to change — these are additive tables.

---

## Open Questions

1. **Do we need a `product_images` table?** Currently just `image_url` (single hero image). Multiple images would need a separate table. For v1, one image feels sufficient since users can click through to the original URL for galleries.
2. **Should votes be on lists too?** Currently only on products. List-level voting ("which project should we tackle first?") could be useful but feels like scope creep for v1.
3. **How many customer reviews to extract per product?** Leaning towards top 10-20 most helpful. More is better for AI summaries but costs more to scrape and store.
4. **Should Expert Opinion auto-regenerate?** When a product is added/removed, we could auto-regenerate the opinion. Or we could just mark it stale (via `product_count` mismatch) and let the user trigger regeneration. Leaning towards manual trigger for v1 to avoid unnecessary AI costs.
5. **Should Expert Opinion factor in votes/comments?** The AI could weigh family members' votes and discussion when making recommendations. This would make the opinion more personalized but adds prompt complexity. Worth exploring for v1 if the prompt is simple enough.
