-- Product Suggestions: AI-discovered products via Gemini Google Search grounding.
-- Suggestions are proposals — not in the user's list until explicitly accepted.
-- Each trigger round clears all previous suggestions for the list.

create table public.product_suggestions (
  id                  uuid primary key default gen_random_uuid(),
  list_id             uuid not null references public.lists(id) on delete cascade,

  -- Product data (from Gemini + Google Search grounding)
  title               text not null,
  url                 text not null,
  domain              text,
  image_url           text,
  brand               text,
  price_min           numeric(12,2),
  price_max           numeric(12,2),
  currency            text default 'INR',

  -- AI reasoning
  reason              text not null,                   -- "Why this?" explanation
  confidence          numeric(3,2),                    -- from groundingSupports confidenceScores

  -- Grounding metadata
  source_urls         text[] default '{}',             -- from groundingChunks[].web.uri
  search_queries      text[] default '{}',             -- from groundingMetadata.webSearchQueries

  -- Trigger tracking
  trigger_type        text not null
                        check (trigger_type in ('product_added', 'expert_opinion', 'context_answered', 'manual')),

  -- Lifecycle
  status              text not null default 'pending'
                        check (status in ('pending', 'accepted', 'dismissed')),
  accepted_product_id uuid references public.products(id) on delete set null,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Only query pending suggestions for display
create index idx_suggestions_list_pending on product_suggestions(list_id)
  where status = 'pending';

-- RLS: visible to list members, editable by editors, insert/delete via service_role only
alter table public.product_suggestions enable row level security;

-- Select: visible to list members
create policy "product_suggestions_select" on public.product_suggestions
  for select using (
    exists (
      select 1 from public.list_members
      where list_members.list_id = product_suggestions.list_id
        and list_members.user_id = auth.uid()
    )
  );

-- Insert: only service_role (Edge Function bypasses RLS)
create policy "product_suggestions_insert_deny" on public.product_suggestions
  for insert with check (false);

-- Update: editors can accept/dismiss
create policy "product_suggestions_update" on public.product_suggestions
  for update using (
    exists (
      select 1 from public.list_members
      where list_members.list_id = product_suggestions.list_id
        and list_members.user_id = auth.uid()
        and list_members.role in ('owner', 'editor')
    )
  );

-- Delete: only service_role (round clearing bypasses RLS)
create policy "product_suggestions_delete_deny" on public.product_suggestions
  for delete using (false);
