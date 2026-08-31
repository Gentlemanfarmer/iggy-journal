-- Iggy Journal: User-customizable Rules
-- Allows each user to edit their own care intervals

-- =====================================================================
-- 1. User Rules Table (personalized for each user)
-- =====================================================================
create table if not exists public.user_rules (
  id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  subtype text not null,
  interval_days integer not null,
  label text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, category, subtype)
);

create index if not exists user_rules_user_id_idx on public.user_rules (user_id);

-- =====================================================================
-- 2. RLS Policies
-- =====================================================================
alter table public.user_rules enable row level security;

create policy "Users can view own rules"
  on public.user_rules for select
  using (auth.uid() = user_id);

create policy "Users can insert own rules"
  on public.user_rules for insert
  with check (auth.uid() = user_id);

create policy "Users can update own rules"
  on public.user_rules for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own rules"
  on public.user_rules for delete
  using (auth.uid() = user_id);

-- =====================================================================
-- 3. Helper Function: Initialize User Rules from Global Rules
-- =====================================================================
create or replace function public.init_user_rules()
returns void as $$
declare
  v_user_id uuid := auth.uid();
  v_rule record;
begin
  -- Only initialize if this user has no rules yet
  if not exists (select 1 from public.user_rules where user_id = v_user_id) then
    -- Copy all rules from global rules table
    insert into public.user_rules (user_id, category, subtype, interval_days, label, enabled)
    select v_user_id, category, subtype, interval_days, label, true
    from public.rules;
  end if;
end;
$$ language plpgsql security definer;

-- =====================================================================
-- 4. Trigger: Auto-init rules on first login
-- =====================================================================
create or replace function public.auto_init_user_rules()
returns trigger as $$
begin
  perform public.init_user_rules();
  return new;
end;
$$ language plpgsql security definer;

-- Note: This trigger would need to be created in auth.users table
-- For now, we'll call init_user_rules() manually from the app on first load
