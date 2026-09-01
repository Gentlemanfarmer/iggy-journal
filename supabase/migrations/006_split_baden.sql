-- Iggy Journal: Split "Baden" into "Baden (Shampoo)" + "Abspülen"
-- Knowledge base: shampoo bath every 4–8 weeks; water rinse "as often as needed".
-- "Abspülen" is tracked as a journal-only activity (no due-rule), like Bürsten/Ohren.
-- Renaming keeps the existing rule id, so the Vollschur -> Baden dependency stays intact.

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
