-- Context Questions: AI-generated questions to collect user preferences
-- Triggered after product extraction, answers feed into Expert Opinion prompts.

create table public.context_questions (
  id            uuid primary key default gen_random_uuid(),
  list_id       uuid not null references public.lists(id) on delete cascade,
  question      text not null,
  answer        text,                           -- null until answered
  status        text not null default 'pending'
                  check (status in ('pending', 'answered', 'dismissed')),
  triggered_by  uuid references public.products(id) on delete set null,  -- which product triggered this question
  created_at    timestamptz not null default now(),
  answered_at   timestamptz
);

create index idx_context_questions_list_id on context_questions(list_id);
create index idx_context_questions_list_pending on context_questions(list_id, status)
  where status = 'pending';

-- RLS: visible to list members, editable by editor+
alter table public.context_questions enable row level security;

create policy "context_questions_select" on public.context_questions
  for select using (
    exists (
      select 1 from public.list_members
      where list_members.list_id = context_questions.list_id
        and list_members.user_id = auth.uid()
    )
  );

create policy "context_questions_insert" on public.context_questions
  for insert with check (
    exists (
      select 1 from public.list_members
      where list_members.list_id = context_questions.list_id
        and list_members.user_id = auth.uid()
        and list_members.role in ('owner', 'editor')
    )
  );

create policy "context_questions_update" on public.context_questions
  for update using (
    exists (
      select 1 from public.list_members
      where list_members.list_id = context_questions.list_id
        and list_members.user_id = auth.uid()
        and list_members.role in ('owner', 'editor')
    )
  );

create policy "context_questions_delete" on public.context_questions
  for delete using (
    exists (
      select 1 from public.list_members
      where list_members.list_id = context_questions.list_id
        and list_members.user_id = auth.uid()
        and list_members.role in ('owner', 'editor')
    )
  );
