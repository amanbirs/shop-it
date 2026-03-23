-- ShopIt RLS Policies
-- Source of truth: docs/system-guide/02-data-model.md § RLS Strategy
-- Split from tables to allow iterative policy refinement.

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
alter table public.profiles enable row level security;
alter table public.lists enable row level security;
alter table public.list_members enable row level security;
alter table public.products enable row level security;
alter table public.comments enable row level security;
alter table public.list_ai_opinions enable row level security;
alter table public.invite_tokens enable row level security;

-- ============================================================
-- profiles: authenticated users can read any profile (for names/avatars)
-- Only own profile is editable. Blocks unauthenticated access.
-- ============================================================
create policy "profiles_select" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- ============================================================
-- lists: only visible to members
-- ============================================================
create policy "lists_select" on public.lists
  for select using (
    exists (
      select 1 from public.list_members
      where list_members.list_id = lists.id
        and list_members.user_id = auth.uid()
    )
  );

create policy "lists_insert" on public.lists
  for insert with check (owner_id = auth.uid());

create policy "lists_update" on public.lists
  for update using (
    exists (
      select 1 from public.list_members
      where list_members.list_id = lists.id
        and list_members.user_id = auth.uid()
        and list_members.role in ('owner', 'editor')
    )
  );

-- ============================================================
-- list_members: visible to fellow members, only owners can manage
-- ============================================================
create policy "list_members_select" on public.list_members
  for select using (
    exists (
      select 1 from public.list_members as lm
      where lm.list_id = list_members.list_id
        and lm.user_id = auth.uid()
    )
  );

-- Insert: either owner adding members, or self-creating the owner row on list creation
create policy "list_members_insert" on public.list_members
  for insert with check (
    exists (
      select 1 from public.list_members as lm
      where lm.list_id = list_members.list_id
        and lm.user_id = auth.uid()
        and lm.role = 'owner'
    )
    or (user_id = auth.uid() and role = 'owner')
  );

create policy "list_members_update" on public.list_members
  for update using (
    exists (
      select 1 from public.list_members as lm
      where lm.list_id = list_members.list_id
        and lm.user_id = auth.uid()
        and lm.role = 'owner'
    )
  );

create policy "list_members_delete" on public.list_members
  for delete using (
    exists (
      select 1 from public.list_members as lm
      where lm.list_id = list_members.list_id
        and lm.user_id = auth.uid()
        and lm.role = 'owner'
    )
  );

-- ============================================================
-- products: visible to list members, editable by editor+
-- ============================================================
create policy "products_select" on public.products
  for select using (
    exists (
      select 1 from public.list_members
      where list_members.list_id = products.list_id
        and list_members.user_id = auth.uid()
    )
  );

create policy "products_insert" on public.products
  for insert with check (
    exists (
      select 1 from public.list_members
      where list_members.list_id = products.list_id
        and list_members.user_id = auth.uid()
        and list_members.role in ('owner', 'editor')
    )
  );

create policy "products_update" on public.products
  for update using (
    exists (
      select 1 from public.list_members
      where list_members.list_id = products.list_id
        and list_members.user_id = auth.uid()
        and list_members.role in ('owner', 'editor')
    )
  );

-- ============================================================
-- comments: visible to list members, insert by editor+,
-- edit by author, delete by author or list owner
-- ============================================================
create policy "comments_select" on public.comments
  for select using (
    exists (
      select 1 from public.products
      join public.list_members on list_members.list_id = products.list_id
      where products.id = comments.product_id
        and list_members.user_id = auth.uid()
    )
  );

create policy "comments_insert" on public.comments
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.products
      join public.list_members on list_members.list_id = products.list_id
      where products.id = comments.product_id
        and list_members.user_id = auth.uid()
        and list_members.role in ('owner', 'editor')
    )
  );

create policy "comments_update" on public.comments
  for update using (user_id = auth.uid());

create policy "comments_delete" on public.comments
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from public.products
      join public.list_members on list_members.list_id = products.list_id
      where products.id = comments.product_id
        and list_members.user_id = auth.uid()
        and list_members.role = 'owner'
    )
  );

-- ============================================================
-- list_ai_opinions: readable by list members, only service_role writes
-- Explicit deny policies prevent accidental writes from session clients.
-- The service_role client bypasses RLS entirely.
-- ============================================================
create policy "list_ai_opinions_select" on public.list_ai_opinions
  for select using (
    exists (
      select 1 from public.list_members
      where list_members.list_id = list_ai_opinions.list_id
        and list_members.user_id = auth.uid()
    )
  );

create policy "list_ai_opinions_insert_deny" on public.list_ai_opinions
  for insert with check (false);

create policy "list_ai_opinions_update_deny" on public.list_ai_opinions
  for update using (false);

create policy "list_ai_opinions_delete_deny" on public.list_ai_opinions
  for delete using (false);

-- ============================================================
-- invite_tokens: only list owners can create/view
-- ============================================================
create policy "invite_tokens_select" on public.invite_tokens
  for select using (
    exists (
      select 1 from public.list_members
      where list_members.list_id = invite_tokens.list_id
        and list_members.user_id = auth.uid()
        and list_members.role = 'owner'
    )
  );

create policy "invite_tokens_insert" on public.invite_tokens
  for insert with check (created_by = auth.uid());

create policy "invite_tokens_delete" on public.invite_tokens
  for delete using (
    exists (
      select 1 from public.list_members
      where list_members.list_id = invite_tokens.list_id
        and list_members.user_id = auth.uid()
        and list_members.role = 'owner'
    )
  );
