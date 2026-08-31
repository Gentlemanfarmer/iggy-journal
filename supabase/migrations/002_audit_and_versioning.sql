-- Iggy Journal: Audit Logs & Data Versioning
-- Tracks all changes to entries and allows data recovery

-- =====================================================================
-- 1. Audit Logs Table
-- =====================================================================
create table if not exists public.audit_logs (
  id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  table_name text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  record_id uuid not null,
  old_values jsonb,
  new_values jsonb,
  timestamp timestamptz not null default now()
);

create index if not exists audit_logs_user_id_idx on public.audit_logs (user_id);
create index if not exists audit_logs_record_id_idx on public.audit_logs (record_id);
create index if not exists audit_logs_timestamp_idx on public.audit_logs (timestamp);

-- =====================================================================
-- 2. Entry Versions Table (for soft deletes / recovery)
-- =====================================================================
create table if not exists public.entry_versions (
  id serial primary key,
  entry_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  category text not null,
  subtype text not null,
  note text,
  value numeric,
  photo_url text,
  deleted_at timestamptz not null default now(),
  version_created_at timestamptz not null default now()
);

create index if not exists entry_versions_user_id_idx on public.entry_versions (user_id);
create index if not exists entry_versions_entry_id_idx on public.entry_versions (entry_id);
create index if not exists entry_versions_deleted_at_idx on public.entry_versions (deleted_at);

-- =====================================================================
-- 3. RLS Policies
-- =====================================================================
alter table public.audit_logs enable row level security;
alter table public.entry_versions enable row level security;

-- Users can view their own audit logs
create policy "Users can view own audit logs"
  on public.audit_logs for select
  using (auth.uid() = user_id);

-- Users can view their own entry versions
create policy "Users can view own entry versions"
  on public.entry_versions for select
  using (auth.uid() = user_id);

-- =====================================================================
-- 4. Trigger Functions
-- =====================================================================

-- Log UPDATE operations on entries
create or replace function public.log_entry_update()
returns trigger as $$
begin
  insert into public.audit_logs (user_id, table_name, operation, record_id, old_values, new_values)
  values (
    auth.uid(),
    'entries',
    'UPDATE',
    new.id,
    row_to_json(old.*),
    row_to_json(new.*)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Log and version DELETE operations on entries
create or replace function public.log_entry_delete()
returns trigger as $$
begin
  -- Save version before deletion
  insert into public.entry_versions (entry_id, user_id, date, category, subtype, note, value, photo_url)
  values (
    old.id,
    old.user_id,
    old.date,
    old.category,
    old.subtype,
    old.note,
    old.value,
    old.photo_url
  );

  -- Log the deletion
  insert into public.audit_logs (user_id, table_name, operation, record_id, old_values)
  values (
    auth.uid(),
    'entries',
    'DELETE',
    old.id,
    row_to_json(old.*)
  );

  return old;
end;
$$ language plpgsql security definer;

-- =====================================================================
-- 5. Attach Triggers
-- =====================================================================
drop trigger if exists entries_update_audit on public.entries;
create trigger entries_update_audit
  after update on public.entries
  for each row
  execute function public.log_entry_update();

drop trigger if exists entries_delete_audit on public.entries;
create trigger entries_delete_audit
  before delete on public.entries
  for each row
  execute function public.log_entry_delete();

-- =====================================================================
-- 6. Helper Function: Restore Deleted Entry
-- =====================================================================
create or replace function public.restore_deleted_entry(p_entry_id uuid, p_version_id int)
returns uuid as $$
declare
  v_restored_id uuid;
  v_user_id uuid;
  v_version record;
begin
  v_user_id := auth.uid();

  -- Get the version to restore
  select * into v_version
  from public.entry_versions
  where id = p_version_id and entry_id = p_entry_id and user_id = v_user_id;

  if v_version is null then
    raise exception 'Version not found or unauthorized';
  end if;

  -- Generate new UUID for the restored entry
  v_restored_id := gen_random_uuid();

  -- Restore entry
  insert into public.entries (id, user_id, date, category, subtype, note, value, photo_url)
  values (
    v_restored_id,
    v_user_id,
    v_version.date,
    v_version.category,
    v_version.subtype,
    v_version.note,
    v_version.value,
    v_version.photo_url
  );

  return v_restored_id;
end;
$$ language plpgsql security definer;
