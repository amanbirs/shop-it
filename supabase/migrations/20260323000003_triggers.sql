-- ShopIt Triggers
-- Source of truth: docs/system-guide/03-backend-architecture.md

-- ============================================================
-- Profile auto-creation on auth.users insert
-- ============================================================
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

-- ============================================================
-- Auto-update updated_at timestamp
-- ============================================================
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
