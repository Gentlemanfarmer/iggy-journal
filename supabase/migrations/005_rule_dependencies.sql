-- Iggy Journal: Rule Dependencies
-- Track dependencies between rules (e.g., Vollschur triggers Baden, Intimschur, etc.)

-- =====================================================================
-- 1. Rule Dependencies Table
-- =====================================================================
create table if not exists public.rule_dependencies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  main_rule_id integer not null references public.user_rules(id) on delete cascade,
  dependent_rule_id integer not null references public.user_rules(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, main_rule_id, dependent_rule_id)
);

create index if not exists rule_dependencies_user_id_idx on public.rule_dependencies (user_id);
create index if not exists rule_dependencies_main_rule_idx on public.rule_dependencies (main_rule_id);
create index if not exists rule_dependencies_dependent_rule_idx on public.rule_dependencies (dependent_rule_id);

-- =====================================================================
-- 2. RLS Policies
-- =====================================================================
alter table public.rule_dependencies enable row level security;

create policy "Users can view own dependencies"
  on public.rule_dependencies for select
  using (auth.uid() = user_id);

create policy "Users can insert own dependencies"
  on public.rule_dependencies for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own dependencies"
  on public.rule_dependencies for delete
  using (auth.uid() = user_id);

-- =====================================================================
-- 3. Initialize default dependencies for new users
-- =====================================================================
insert into public.rule_dependencies (user_id, main_rule_id, dependent_rule_id)
select
  ur1.user_id,
  ur1.id as main_rule_id,
  ur2.id as dependent_rule_id
from public.user_rules ur1
cross join public.user_rules ur2
where
  ur1.category = 'Fell' and ur1.subtype = 'Vollschur'
  and ur2.category = 'Fell' and ur2.subtype in ('Baden', 'Intimschur', 'Augen', 'Bart', 'Krallen')
  and ur1.user_id = ur2.user_id
on conflict do nothing;
