# Phase 2: Database & Auth

## Checklist

- [x] Write SQL migration: tables, indexes (`supabase/migrations/20260323000001_create_tables.sql`)
- [x] Write SQL migration: RLS policies (`supabase/migrations/20260323000002_add_rls_policies.sql`)
- [x] Write SQL migration: triggers (`supabase/migrations/20260323000003_triggers.sql`)
- [x] Deploy migrations to Supabase (`npx supabase db push`) — required `pgcrypto` extension fix + DB reset
- [ ] ~~Set up Database Webhook~~ (deferred to Phase 6 — Edge Function must exist first)
- [x] Create Supabase server client (`lib/supabase/server.ts`) — uses publishable key
- [x] Create Supabase browser client (`lib/supabase/client.ts`) — uses publishable key
- [x] Create Supabase admin client (`lib/supabase/admin.ts`) — uses secret key, falls back to service_role
- [x] Build auth proxy (`proxy.ts` + `lib/supabase/proxy.ts`) — Next.js 16 uses proxy.ts, not middleware.ts
- [x] Build login page (`app/(auth)/login/page.tsx`) — glassmorphic card, dot grid, stagger animation
- [x] Build auth callback route (`app/(auth)/auth/callback/route.ts`)
- [x] Enable Realtime replication via `alter publication supabase_realtime add table` for products, comments, list_members
- [x] Configure Supabase Auth redirect URLs
- [ ] Test: login via magic link end-to-end
- [x] Test: login via dev password (Supabase dashboard user + password login)
- [x] Test: profile auto-created after first login (trigger working)
- [x] Test: unauthenticated redirect to /login (proxy handles this)

---

## Step 1: Database Migration — Tables & Indexes

File: `supabase/migrations/20260323000001_create_tables.sql`

Write the full schema from `docs/system-guide/02-data-model.md`. This includes all 6 tables:

1. `profiles` — extends `auth.users` with display name, avatar, context JSONB
2. `lists` — purchase lists with budget, priorities, AI fields
3. `list_members` — collaboration join table (owner/editor/viewer roles)
4. `products` — the core product table with extraction status, AI fields, JSONB specs
5. `comments` — threaded comments on products
6. `list_ai_opinions` — AI expert opinion per list

Plus all indexes from the spec:
- `idx_products_list_id`
- `idx_products_list_shortlisted`
- `idx_products_list_added_via`
- `idx_products_extraction_status` — **added** (Edge Function queries by this column)
- `idx_list_members_user_id`
- `idx_list_members_list_id`
- `idx_comments_product_id`

```sql
-- Additional index not in original spec — needed for webhook/Edge Function queries
create index idx_products_extraction_status on products(extraction_status)
  where extraction_status in ('pending', 'processing');
```

**Source of truth:** `docs/system-guide/02-data-model.md` — copy the SQL blocks directly.

**Migration ordering note:** Tables must be created before RLS policies can reference them. Both must exist before triggers fire. The 3-file split (tables → RLS → triggers) respects this dependency chain and allows iterative RLS refinement without recreating tables.

## Step 2: Database Migration — RLS Policies

File: `supabase/migrations/20260323000002_add_rls_policies.sql`

Enable RLS on all tables and create policies per the strategy in `02-data-model.md`:

```sql
-- Enable RLS
alter table public.profiles enable row level security;
alter table public.lists enable row level security;
alter table public.list_members enable row level security;
alter table public.products enable row level security;
alter table public.comments enable row level security;
alter table public.list_ai_opinions enable row level security;

-- profiles: any authenticated user can read (for displaying names/avatars);
-- only own profile is editable. Unauthenticated reads are blocked.
create policy "profiles_select" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- lists: only visible to members
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

-- list_members: visible to fellow members, only owners can manage
create policy "list_members_select" on public.list_members
  for select using (
    exists (
      select 1 from public.list_members as lm
      where lm.list_id = list_members.list_id
        and lm.user_id = auth.uid()
    )
  );

create policy "list_members_insert" on public.list_members
  for insert with check (
    exists (
      select 1 from public.list_members as lm
      where lm.list_id = list_members.list_id
        and lm.user_id = auth.uid()
        and lm.role = 'owner'
    )
    or (user_id = auth.uid() and role = 'owner')  -- creating own ownership row
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

-- products: visible/editable by list members (editor+)
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

-- comments: visible to list members, editable by author or list owner
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

-- list_ai_opinions: visible to list members, only service_role can write
create policy "list_ai_opinions_select" on public.list_ai_opinions
  for select using (
    exists (
      select 1 from public.list_members
      where list_members.list_id = list_ai_opinions.list_id
        and list_members.user_id = auth.uid()
    )
  );

-- Explicitly deny insert/update for authenticated users.
-- The service_role client bypasses RLS entirely, so AI writes still work.
-- These policies prevent accidental writes from the app's session-based client.
create policy "list_ai_opinions_insert_deny" on public.list_ai_opinions
  for insert with check (false);

create policy "list_ai_opinions_update_deny" on public.list_ai_opinions
  for update using (false);

create policy "list_ai_opinions_delete_deny" on public.list_ai_opinions
  for delete using (false);
```

## Step 3: Database Migration — Profile Auto-Creation Trigger

File: `supabase/migrations/20260323000003_profile_trigger.sql`

From `03-backend-architecture.md`: when a user signs up via Supabase Auth, automatically create their `profiles` row.

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    -- Guard against null raw_user_meta_data (can happen in some auth flows like magic link)
    coalesce(
      new.raw_user_meta_data::jsonb ->> 'full_name',
      new.raw_user_meta_data::jsonb ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data::jsonb ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

Also add an `updated_at` auto-update trigger for tables that have it:

```sql
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at();
create trigger set_updated_at before update on public.lists
  for each row execute procedure public.update_updated_at();
create trigger set_updated_at before update on public.products
  for each row execute procedure public.update_updated_at();
create trigger set_updated_at before update on public.comments
  for each row execute procedure public.update_updated_at();
create trigger set_updated_at before update on public.list_ai_opinions
  for each row execute procedure public.update_updated_at();
```

## Step 4: Deploy Migrations

```bash
npx supabase db push
```

Verify in the Supabase dashboard:
1. Go to **Table Editor** — all 6 tables should appear
2. Go to **Authentication > Policies** — RLS policies should be listed per table
3. Go to **Database > Triggers** — `on_auth_user_created` and `set_updated_at` triggers should be visible

## Step 5: Enable Realtime (Manual)

1. In Supabase dashboard, go to **Database > Replication**
2. Under "Realtime", enable replication for these tables:
   - `products` (for extraction progress + collaborative updates)
   - `comments` (for live comment threads)
   - `list_members` (for member joins/leaves)
3. Click **"Save"**

## Step 6: Supabase Client Setup

### Server Client

File: `lib/supabase/server.ts`

Creates a Supabase client for Server Components and Server Actions that reads auth from cookies. Uses `@supabase/ssr` per the official pattern.

Key implementation:
- Uses `createServerClient` from `@supabase/ssr`
- Reads/writes cookies via `cookies()` from `next/headers`
- All queries go through RLS

### Browser Client

File: `lib/supabase/client.ts`

Creates a Supabase client for client-side Realtime subscriptions only. Uses `createBrowserClient` from `@supabase/ssr`.

Key implementation:
- Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Singleton pattern — only one client per browser tab

### Admin Client

File: `lib/supabase/admin.ts`

Creates a Supabase client with `service_role` key that bypasses RLS. Used only for:
- Expert Opinion API route (AI writes)
- Edge Function (product extraction)

Key implementation:
- Uses `SUPABASE_SERVICE_ROLE_KEY`
- **Never import this in Server Actions or Client Components**

## Step 7: Auth Middleware

File: `middleware.ts` (project root)

From `03-backend-architecture.md` and `07-api-contracts.md`:

```
Runs on every request:
1. Refreshes Supabase session (extends cookie expiry)
2. Redirects:
   - /lists/*, /profile/* → /login (if unauthenticated)
   - /api/* → 401 JSON (if unauthenticated)
   - /login → / (if already authenticated)
3. Matcher excludes _next/static, _next/image, favicon.ico
```

## Step 8: Login Page

File: `app/(auth)/login/page.tsx`

From `docs/system-guide/06-pages.md` — Page 1: Login. Build both states:

1. **Email entry state:** dot grid background, radial glow, glassmorphic card, email input, "Continue with Email" button, OAuth divider, Google button
2. **Check your email state:** confirmation message with resend button (60s cooldown)

Components needed:
- Dot grid background (`bg-[radial-gradient(...)]` technique from element breakdown)
- Glass card (backdrop-blur, semi-transparent)
- Entry animation (stagger reveal — Framer Motion)
- State transition (crossfade with AnimatePresence)

Use `supabase.auth.signInWithOtp({ email })` for magic link.

## Step 9: Auth Callback

File: `app/(auth)/auth/callback/route.ts`

Handles the redirect from the magic link email:

```typescript
// GET handler
// 1. Extract `code` from URL search params
// 2. Exchange code for session via supabase.auth.exchangeCodeForSession(code)
// 3. Redirect to '/' (dashboard)
// On error: redirect to '/login?error=auth'
```

## Test Checkpoint

1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:3000` → should redirect to `/login`
3. Enter your email → should show "Check your email"
4. Click magic link in email → should redirect to dashboard (`/`)
5. Check Supabase dashboard > Table Editor > `profiles` → your profile row should exist
6. Navigate to `/login` while logged in → should redirect to `/`
7. Open an incognito window, try `/lists/anything` → should redirect to `/login`
