-- Iggy Journal: Rule Dependencies
-- Track dependencies between rules (e.g., Vollschur triggers Baden, Intimschur, etc.)

-- =====================================================================
-- 1. Rule Dependencies Table
-- =====================================================================
create table if not exists public.rule_dependencies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  main_rule_id uuid not null references public.user_rules(id) on delete cascade,
  dependent_rule_id uuid not null references public.user_rules(id) on delete cascade,
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
create or replace function public.init_rule_dependencies()
returns void as $$
declare
  v_user_id uuid;
  v_vollschur_id uuid;
  v_baden_id uuid;
  v_intimschur_id uuid;
  v_augen_id uuid;
  v_bart_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Get rule IDs for this user
  select id into v_vollschur_id from public.user_rules
    where user_id = v_user_id and category = 'Fell' and subtype = 'Vollschur' limit 1;

  select id into v_baden_id from public.user_rules
    where user_id = v_user_id and category = 'Fell' and subtype = 'Baden' limit 1;

  select id into v_intimschur_id from public.user_rules
    where user_id = v_user_id and category = 'Fell' and subtype = 'Intimschur' limit 1;

  select id into v_augen_id from public.user_rules
    where user_id = v_user_id and category = 'Fell' and subtype = 'Augen' limit 1;

  select id into v_bart_id from public.user_rules
    where user_id = v_user_id and category = 'Fell' and subtype = 'Bart' limit 1;

  -- Only create dependencies if all rules exist and dependencies don't exist yet
  if v_vollschur_id is not null and v_baden_id is not null then
    insert into public.rule_dependencies (user_id, main_rule_id, dependent_rule_id)
    values (v_user_id, v_vollschur_id, v_baden_id)
    on conflict do nothing;
  end if;

  if v_vollschur_id is not null and v_intimschur_id is not null then
    insert into public.rule_dependencies (user_id, main_rule_id, dependent_rule_id)
    values (v_user_id, v_vollschur_id, v_intimschur_id)
    on conflict do nothing;
  end if;

  if v_vollschur_id is not null and v_augen_id is not null then
    insert into public.rule_dependencies (user_id, main_rule_id, dependent_rule_id)
    values (v_user_id, v_vollschur_id, v_augen_id)
    on conflict do nothing;
  end if;

  if v_vollschur_id is not null and v_bart_id is not null then
    insert into public.rule_dependencies (user_id, main_rule_id, dependent_rule_id)
    values (v_user_id, v_vollschur_id, v_bart_id)
    on conflict do nothing;
  end if;
end;
$$ language plpgsql security definer;
