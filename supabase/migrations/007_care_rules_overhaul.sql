-- Iggy Journal: Care rules overhaul
-- Canonical set of 8 due-rules with new category "Pflege" and explicit labels.
-- Renames are done in place on user_rules so ids (and rule_dependencies) survive.

-- =====================================================================
-- 1. Allow the new "Pflege" category on entries (keep legacy values too)
-- =====================================================================
alter table public.entries drop constraint if exists entries_category_check;
alter table public.entries add constraint entries_category_check
  check (category in ('Pflege', 'Fell', 'Futter', 'Gewicht', 'Training', 'Medizin'));

-- =====================================================================
-- 2. Global seed rules (for future users) -> exactly the 8 canonical rules
-- =====================================================================
delete from public.rules;
insert into public.rules (category, subtype, interval_days, label) values
  ('Pflege',  'Schur komplett',        77, 'Schur komplett'),
  ('Pflege',  'Baden',                 42, 'Baden'),
  ('Pflege',  'Krallen geschnitten',   28, 'Krallen geschnitten'),
  ('Pflege',  'Hygieneschur',          18, 'Hygieneschur'),
  ('Pflege',  'Augen freigeschnitten', 10, 'Augen freigeschnitten'),
  ('Pflege',  'Bart getrimmt',         10, 'Bart getrimmt'),
  ('Medizin', 'Entwurmt',              90, 'Entwurmt'),
  ('Medizin', 'Zeckenschutz gegeben',  30, 'Zeckenschutz gegeben');

-- =====================================================================
-- 3. Migrate existing per-user rules IN PLACE (keeps ids + dependencies)
-- =====================================================================
update public.user_rules set category='Pflege', subtype='Schur komplett',        label='Schur komplett',        interval_days=77, updated_at=now()
  where category='Fell' and subtype='Vollschur';
update public.user_rules set category='Pflege', subtype='Baden',                 label='Baden',                 interval_days=42, updated_at=now()
  where category='Fell' and subtype in ('Baden (Shampoo)', 'Baden');
update public.user_rules set category='Pflege', subtype='Krallen geschnitten',   label='Krallen geschnitten',   interval_days=28, updated_at=now()
  where category='Fell' and subtype='Krallen';
update public.user_rules set category='Pflege', subtype='Hygieneschur',          label='Hygieneschur',          interval_days=18, updated_at=now()
  where category='Fell' and subtype='Intimschur';
update public.user_rules set category='Pflege', subtype='Augen freigeschnitten', label='Augen freigeschnitten', interval_days=10, updated_at=now()
  where category='Fell' and subtype='Augen';
update public.user_rules set category='Pflege', subtype='Bart getrimmt',         label='Bart getrimmt',         interval_days=10, updated_at=now()
  where category='Fell' and subtype='Bart';
update public.user_rules set subtype='Entwurmt', label='Entwurmt', interval_days=90, updated_at=now()
  where category='Medizin' and subtype='Entwurmung';

-- 3b. Add "Zeckenschutz gegeben" for every user that already has rules
insert into public.user_rules (user_id, category, subtype, interval_days, label, enabled)
select distinct user_id, 'Medizin', 'Zeckenschutz gegeben', 30, 'Zeckenschutz gegeben', true
from public.user_rules
on conflict (user_id, category, subtype) do nothing;

-- 3c. Remove any user_rules that are NOT one of the 8 canonical (category, subtype) pairs
delete from public.user_rules ur
where not exists (
  select 1 from (values
    ('Pflege','Schur komplett'),
    ('Pflege','Baden'),
    ('Pflege','Krallen geschnitten'),
    ('Pflege','Hygieneschur'),
    ('Pflege','Augen freigeschnitten'),
    ('Pflege','Bart getrimmt'),
    ('Medizin','Entwurmt'),
    ('Medizin','Zeckenschutz gegeben')
  ) as canon(category, subtype)
  where canon.category = ur.category and canon.subtype = ur.subtype
);

-- =====================================================================
-- 4. Migrate existing journal entries to the new category/subtype labels
-- =====================================================================
update public.entries set category='Pflege', subtype='Schur komplett'        where category='Fell' and subtype='Vollschur';
update public.entries set category='Pflege', subtype='Baden'                 where category='Fell' and subtype in ('Baden (Shampoo)', 'Baden');
update public.entries set category='Pflege', subtype='Krallen geschnitten'   where category='Fell' and subtype='Krallen';
update public.entries set category='Pflege', subtype='Hygieneschur'          where category='Fell' and subtype='Intimschur';
update public.entries set category='Pflege', subtype='Augen freigeschnitten' where category='Fell' and subtype='Augen';
update public.entries set category='Pflege', subtype='Bart getrimmt'         where category='Fell' and subtype='Bart';
-- Non-tracked care activities (Bürsten, Abspülen, Ohren, ...): keep subtype, move category
update public.entries set category='Pflege' where category='Fell';
-- Medizin relabels
update public.entries set subtype='Entwurmt'             where category='Medizin' and subtype='Entwurmung';
update public.entries set subtype='Zeckenschutz gegeben' where category='Medizin' and subtype='Zeckenschutz';
