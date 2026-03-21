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
│  users   │──1:N──│    lists     │──1:N──│   products   │
│          │       │              │       │              │
│          │──1:N──│ list_members │       │              │
└──────────┘       └──────────────┘       └──┬───────┬───┘
                                              │       │
                                           1:N│    1:N│
                                              ▼       ▼
                                        ┌────────┐ ┌───────┐
                                        │comments│ │ votes │
                                        └────────┘ └───────┘
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
  owner_id    uuid not null references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz
);
```

**Considerations:**

- **`category` is optional and freeform.** I considered an enum, but categories are open-ended (TVs, laptops, strollers, espresso machines...). A freeform text field lets users type whatever they want. We can use this to tune Gemini extraction prompts per category later.
- **`status` vs `archived_at`** — we have both. `status` is the queryable flag (index-friendly), `archived_at` records when. Could drop one, but having both is cheap and useful.
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
  added_by        uuid not null references public.profiles(id),

  -- Source
  url             text not null,
  domain          text,                -- extracted: "amazon.ca", "bestbuy.ca", etc.

  -- Extracted data (populated by AI)
  title           text,
  price           numeric(12,2),
  currency        text default 'CAD',
  image_url       text,
  brand           text,
  model           text,

  -- Flexible structured data
  specs           jsonb default '{}',  -- {"screen_size": "65\"", "resolution": "4K", ...}
  pros            text[] default '{}',
  cons            text[] default '{}',
  rating          numeric(3,2),        -- e.g., 4.50
  review_count    integer,
  review_summary  text,                -- AI-generated summary of reviews

  -- Workflow
  status          text not null default 'researching'
                    check (status in ('researching', 'shortlisted', 'decided', 'purchased')),

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

**Why `position` for ordering:**
Users will want to drag-and-drop reorder products. An integer position field is the simplest approach. For v1 with small lists, renumbering on reorder is fine.

**What I considered but left out:**
- `price_history jsonb` — tempting for price tracking, but that's v2+
- `tags text[]` — could be useful, but `status` covers the main workflow; tags add complexity without clear v1 value
- `comparison_group` — for side-by-side compare sets; but the UI can handle this as a transient selection, no need to persist

---

### 5. `comments`

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

### 6. `votes`

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

## Indexes

```sql
-- Most queries filter by list
create index idx_products_list_id on products(list_id);
create index idx_products_list_status on products(list_id, status);

-- Member lookups
create index idx_list_members_user_id on list_members(user_id);
create index idx_list_members_list_id on list_members(list_id);

-- Comments by product
create index idx_comments_product_id on comments(product_id);

-- Votes by product (for aggregation)
create index idx_votes_product_id on votes(product_id);
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
| `comments` | Same as products; users can only edit/delete their own comments |
| `votes` | Same as products; users can only modify their own votes |

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

1. **Should `price` support ranges?** Some products show "$499 - $699" depending on config. Could use `price_min`/`price_max` instead of a single `price`. Added complexity for an edge case — leaning towards single `price` for v1 and a `price_note` text field if needed.
2. **Do we need a `product_images` table?** Currently just `image_url` (single image). Multiple images would need a separate table. For v1, one hero image feels sufficient since users can click through to the original URL.
3. **Should votes be on lists too?** Currently only on products. List-level voting ("which project should we tackle first?") could be useful but feels like scope creep.
