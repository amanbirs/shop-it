-- Spec Explainer: AI-generated spec comparison and dimension ratings per list
-- See docs/system-guide/06f-spec-explainer-view.md for full design spec

create table public.list_spec_analyses (
  id              uuid primary key default gen_random_uuid(),
  list_id         uuid not null unique references public.lists(id) on delete cascade,

  -- AI-curated spec comparison (metadata only — values read from product.specs at render time)
  -- Array of { key, label, explanation, best_product_ids, product_spec_keys }
  spec_comparison jsonb not null default '[]',

  -- AI-generated quality dimensions
  -- Array of { name, description, ratings: { product_id, score, reasoning, uses_external_knowledge } }
  dimensions      jsonb not null default '[]',

  -- Staleness tracking
  product_count   integer,
  product_ids     uuid[] default '{}',

  -- Generation metadata
  generated_at    timestamptz not null default now(),
  model_version   text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Enable RLS
alter table public.list_spec_analyses enable row level security;

-- Read: list members only
create policy "Members can view spec analysis"
  on list_spec_analyses for select
  using (
    list_id in (
      select list_id from list_members where user_id = auth.uid()
    )
  );

-- No insert/update/delete policies for authenticated users
-- Writes happen via service_role (admin client) in the API route
