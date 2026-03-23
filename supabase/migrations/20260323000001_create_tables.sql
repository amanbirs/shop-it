-- ShopIt Schema: Tables & Indexes
-- Source of truth: docs/system-guide/02-data-model.md

-- ============================================================
-- 1. profiles
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text,
  avatar_url  text,
  context     jsonb default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- 2. lists
-- ============================================================
create table public.lists (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  category    text,
  status      text not null default 'active'
                check (status in ('active', 'archived')),
  budget_min  numeric(12,2),
  budget_max  numeric(12,2),
  purchase_by date,
  priorities  text[] default '{}',
  ai_comment      text,
  ai_title_edited boolean default false,
  owner_id    uuid not null references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz
);

-- ============================================================
-- 3. list_members
-- ============================================================
create table public.list_members (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references public.lists(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'editor'
               check (role in ('owner', 'editor', 'viewer')),
  invited_by uuid references public.profiles(id),
  joined_at  timestamptz,
  created_at timestamptz not null default now(),

  unique (list_id, user_id)
);

-- ============================================================
-- 4. products
-- ============================================================
create table public.products (
  id              uuid primary key default gen_random_uuid(),
  list_id         uuid not null references public.lists(id) on delete cascade,
  added_by        uuid references public.profiles(id),
  added_via       text not null default 'user'
                    check (added_via in ('user', 'ai')),

  url             text not null,
  domain          text,

  title           text,
  image_url       text,
  brand           text,
  model           text,

  price_min       numeric(12,2),
  price_max       numeric(12,2),
  currency        text default 'INR',
  price_note      text,

  specs           jsonb default '{}',
  pros            text[] default '{}',
  cons            text[] default '{}',

  rating          numeric(3,2),
  review_count    integer,
  scraped_reviews jsonb default '[]',

  ai_summary        text,
  ai_review_summary text,
  ai_verdict        text,
  ai_extracted_at   timestamptz,

  is_shortlisted  boolean not null default false,
  is_purchased    boolean not null default false,
  purchased_at    timestamptz,
  purchased_price numeric(12,2),
  purchase_url    text,

  extraction_status text not null default 'pending'
                    check (extraction_status in ('pending', 'processing', 'completed', 'failed')),
  raw_scraped_data  jsonb,
  extraction_error  text,

  notes           text,
  position        integer default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz
);

-- ============================================================
-- 5. comments
-- ============================================================
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid not null references public.profiles(id),
  content     text not null,
  parent_id   uuid references public.comments(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- 6. list_ai_opinions
-- ============================================================
create table public.list_ai_opinions (
  id                uuid primary key default gen_random_uuid(),
  list_id           uuid not null unique references public.lists(id) on delete cascade,

  top_pick          uuid references public.products(id) on delete set null,
  top_pick_reason   text,
  value_pick        uuid references public.products(id) on delete set null,
  value_pick_reason text,
  summary           text,
  comparison        text,
  concerns          text,
  verdict           text,

  product_count     integer,
  generated_at      timestamptz not null default now(),
  model_version     text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- 7. invite_tokens (for link-based sharing)
-- ============================================================
create table public.invite_tokens (
  id         uuid primary key default gen_random_uuid(),
  token      text not null unique default encode(gen_random_bytes(32), 'hex'),
  list_id    uuid not null references public.lists(id) on delete cascade,
  role       text not null default 'editor'
               check (role in ('editor', 'viewer')),
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index idx_products_list_id on products(list_id);
create index idx_products_list_shortlisted on products(list_id, is_shortlisted);
create index idx_products_list_added_via on products(list_id, added_via);
create index idx_products_extraction_status on products(extraction_status)
  where extraction_status in ('pending', 'processing');

create index idx_list_members_user_id on list_members(user_id);
create index idx_list_members_list_id on list_members(list_id);

create index idx_comments_product_id on comments(product_id);

create index idx_invite_tokens_token on invite_tokens(token);
