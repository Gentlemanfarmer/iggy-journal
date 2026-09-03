-- Welpen bis 6 Monate: alle 2-4 Wochen statt 90 Tage
update public.user_rules
  set interval_days = 28, updated_at = now()
  where category = 'Medizin' and subtype = 'Entwurmt' and interval_days = 90;
