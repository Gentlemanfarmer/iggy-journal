-- Iggy Journal: Subtype renames, Futter changes, Photos storage
-- Run this migration AFTER deploying v1.15.0 code.

-- =====================================================================
-- 1. Rename subtypes in journal entries
-- =====================================================================

-- Pflege
update public.entries set subtype = 'Gebürstet' where subtype = 'Bürsten' and category in ('Pflege', 'Fell');

-- Gewicht
update public.entries set subtype = 'Gewogen' where subtype = 'Wiegen' and category = 'Gewicht';

-- Training
update public.entries set subtype = 'Trainiert' where subtype = 'Session' and category = 'Training';
update public.entries set subtype = 'Neues Kommando' where subtype = 'Kommando gelernt' and category = 'Training';
update public.entries set subtype = 'Leine geübt' where subtype = 'Leinentraining' and category = 'Training';

-- Medizin
update public.entries set subtype = 'Tierarztbesuch' where subtype = 'Tierarzt' and category = 'Medizin';
update public.entries set subtype = 'Geimpft' where subtype = 'Impfung' and category = 'Medizin';
update public.entries set subtype = 'Medikament gegeben' where subtype = 'Medikament' and category = 'Medizin';
update public.entries set subtype = 'Symptom beobachtet' where subtype = 'Symptom' and category = 'Medizin';

-- Futter
update public.entries set subtype = 'Futter umgestellt' where subtype = 'Futterwechsel' and category = 'Futter';
-- Fütterung and Leckerli entries keep their old subtypes (historical data)

-- =====================================================================
-- 2. Update global seed rules (for future users)
-- =====================================================================
-- No changes needed: the 8 canonical due-rules (Pflege/Medizin) are unchanged.

-- =====================================================================
-- 3. Create storage bucket for photos
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- Drop existing policies if re-running
drop policy if exists "Users can upload own photos" on storage.objects;
drop policy if exists "Public photo read access" on storage.objects;
drop policy if exists "Users can delete own photos" on storage.objects;

-- Allow authenticated users to upload into their own folder
create policy "Users can upload own photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view photos (public bucket)
create policy "Public photo read access"
on storage.objects for select
to public
using (bucket_id = 'photos');

-- Allow users to delete their own photos
create policy "Users can delete own photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
