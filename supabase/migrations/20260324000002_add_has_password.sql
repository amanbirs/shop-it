-- Track whether user has set a password (for showing set-password prompt)
alter table public.profiles add column has_password boolean default false;
