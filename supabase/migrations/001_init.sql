-- Iggy Journal: initial schema
-- entries, rules, Row Level Security, storage bucket "photos"

-- Supabase projects ship with pgcrypto enabled, but this makes the
-- migration idempotent if run against a fresh/plain Postgres instance.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. entries
-- ---------------------------------------------------------------------
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  category text not null check (category in ('Fell', 'Futter', 'Gewicht', 'Training', 'Medizin')),
  subtype text not null,
  note text,
  value numeric,
  photo_url text,
  created_at timestamptz not null default now()
);

create index if not exists entries_user_id_idx on public.entries (user_id);
create index if not exists entries_date_idx on public.entries (date);

-- ---------------------------------------------------------------------
-- 2. rules (Pflege-Intervalle)
-- ---------------------------------------------------------------------
create table if not exists public.rules (
  id serial primary key,
  category text not null,
  subtype text not null,
  interval_days integer not null,
  label text not null
);

insert into public.rules (category, subtype, interval_days, label) values
  ('Fell', 'Vollschur', 77, 'Vollschur'),
  ('Fell', 'Baden', 42, 'Baden'),
  ('Fell', 'Krallen', 28, 'Krallen'),
  ('Fell', 'Intimschur', 18, 'Intimschur'),
  ('Fell', 'Augen', 10, 'Augen'),
  ('Fell', 'Bart', 10, 'Bart'),
  ('Medizin', 'Entwurmung', 90, 'Entwurmung');

-- ---------------------------------------------------------------------
-- 3. Row Level Security: entries
-- Nur der eigene user_id sieht/schreibt seine Einträge.
-- ---------------------------------------------------------------------
alter table public.entries enable row level security;

create policy "Users can view own entries"
  on public.entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own entries"
  on public.entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own entries"
  on public.entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own entries"
  on public.entries for delete
  using (auth.uid() = user_id);

-- rules is shared reference data (care intervals), not per-user.
-- RLS is enabled so it isn't left world-writable via the anon/authenticated
-- API keys; logged-in users may read it, writes stay restricted to the
-- SQL editor / service role.
alter table public.rules enable row level security;

create policy "Authenticated users can view rules"
  on public.rules for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------
-- 4. Storage bucket "photos" (private)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

-- Storage RLS is on by default with no policies (= no access at all).
-- These policies let a user read/write only files stored under a folder
-- named after their own user id, e.g. photos/<user_id>/vaccination.jpg.
create policy "Users can view own photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can upload own photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);
