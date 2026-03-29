-- Chat persistence: messages table + insights column on lists
-- Source of truth: docs/system-guide/02-data-model.md

-- ============================================================
-- 1. chat_messages — per-list conversation history
-- ============================================================
create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid not null references public.lists(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);

create index idx_chat_messages_list_id on chat_messages(list_id, created_at);

-- ============================================================
-- 2. chat_insights column on lists
-- ============================================================
alter table public.lists
  add column chat_insights text;

-- ============================================================
-- 3. RLS policies for chat_messages
-- ============================================================
alter table public.chat_messages enable row level security;

-- Members can read chat messages for lists they belong to
create policy "chat_messages_select" on public.chat_messages
  for select using (
    exists (
      select 1 from public.list_members
      where list_members.list_id = chat_messages.list_id
        and list_members.user_id = auth.uid()
    )
  );

-- Members (editor+) can insert chat messages
create policy "chat_messages_insert" on public.chat_messages
  for insert with check (
    exists (
      select 1 from public.list_members
      where list_members.list_id = chat_messages.list_id
        and list_members.user_id = auth.uid()
        and list_members.role in ('owner', 'editor')
    )
  );
