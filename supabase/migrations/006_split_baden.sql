-- Iggy Journal: Split "Baden" into "Baden (Shampoo)" + "Abspülen"
-- Knowledge base: shampoo bath every 4–8 weeks; water rinse "as often as needed".
-- "Abspülen" is tracked as a journal-only activity (no due-rule), like Bürsten/Ohren.
-- Renaming keeps the existing rule id, so the Vollschur -> Baden dependency stays intact.

-- =====================================================================
-- 0. Make audit triggers robust when there is no auth session
--    (e.g. edits from the SQL editor / service role, where auth.uid() is NULL).
--    Fall back to the row's own user_id so audit_logs.user_id stays NOT NULL.
-- =====================================================================
create or replace function public.log_entry_update()
returns trigger as $$
begin
  insert into public.audit_logs (user_id, table_name, operation, record_id, old_values, new_values)
  values (
    coalesce(auth.uid(), new.user_id),
    'entries',
    'UPDATE',
    new.id,
    row_to_json(old.*),
    row_to_json(new.*)
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace function public.log_entry_delete()
returns trigger as $$
begin
  insert into public.entry_versions (entry_id, user_id, date, category, subtype, note, value, photo_url)
  values (old.id, old.user_id, old.date, old.category, old.subtype, old.note, old.value, old.photo_url);

  insert into public.audit_logs (user_id, table_name, operation, record_id, old_values)
  values (
    coalesce(auth.uid(), old.user_id),
    'entries',
    'DELETE',
    old.id,
    row_to_json(old.*)
  );

  return old;
end;
$$ language plpgsql security definer;

-- =====================================================================
-- 1. Global seed rules (for future users)
-- =====================================================================
update public.rules
  set subtype = 'Baden (Shampoo)', label = 'Baden (Shampoo)'
  where category = 'Fell' and subtype = 'Baden';

-- =====================================================================
-- 2. Existing per-user rules
-- =====================================================================
update public.user_rules
  set subtype = 'Baden (Shampoo)', label = 'Baden (Shampoo)', updated_at = now()
  where category = 'Fell' and subtype = 'Baden';

-- =====================================================================
-- 3. Existing journal entries
-- =====================================================================
update public.entries
  set subtype = 'Baden (Shampoo)'
  where category = 'Fell' and subtype = 'Baden';
