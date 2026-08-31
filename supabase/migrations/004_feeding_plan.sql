-- Iggy Journal: Feeding Plan Management
-- Track food components, quantities, and composition changes

-- =====================================================================
-- 1. Feeding Plan Components Table
-- =====================================================================
create table if not exists public.feeding_components (
  id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity_g integer not null,
  quantity_available_g integer not null default 0,
  unit text default 'g',
  notes text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feeding_components_user_id_idx on public.feeding_components (user_id);

-- =====================================================================
-- 2. RLS Policies
-- =====================================================================
alter table public.feeding_components enable row level security;

create policy "Users can view own components"
  on public.feeding_components for select
  using (auth.uid() = user_id);

create policy "Users can insert own components"
  on public.feeding_components for insert
  with check (auth.uid() = user_id);

create policy "Users can update own components"
  on public.feeding_components for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own components"
  on public.feeding_components for delete
  using (auth.uid() = user_id);

-- =====================================================================
-- 3. Feeding Plan History (versioning for composition changes)
-- =====================================================================
create table if not exists public.feeding_plan_history (
  id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  component_id integer not null references public.feeding_components(id) on delete cascade,
  action text not null,
  old_quantity_g integer,
  new_quantity_g integer,
  old_quantity_available_g integer,
  new_quantity_available_g integer,
  timestamp timestamptz not null default now()
);

create index if not exists feeding_plan_history_user_id_idx on public.feeding_plan_history (user_id);

-- =====================================================================
-- 4. Trigger for auto-logging component changes
-- =====================================================================
create or replace function public.log_feeding_component_change()
returns trigger as $$
begin
  if tg_op = 'UPDATE' then
    insert into public.feeding_plan_history (user_id, component_id, action, old_quantity_g, new_quantity_g, old_quantity_available_g, new_quantity_available_g)
    values (new.user_id, new.id, 'UPDATE', old.quantity_g, new.quantity_g, old.quantity_available_g, new.quantity_available_g);
  elsif tg_op = 'INSERT' then
    insert into public.feeding_plan_history (user_id, component_id, action, new_quantity_g, new_quantity_available_g)
    values (new.user_id, new.id, 'INSERT', new.quantity_g, new.quantity_available_g);
  elsif tg_op = 'DELETE' then
    insert into public.feeding_plan_history (user_id, component_id, action, old_quantity_g, old_quantity_available_g)
    values (old.user_id, old.id, 'DELETE', old.quantity_g, old.quantity_available_g);
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists feeding_component_log_trigger on public.feeding_components;
create trigger feeding_component_log_trigger
  after insert or update or delete on public.feeding_components
  for each row execute function public.log_feeding_component_change();
