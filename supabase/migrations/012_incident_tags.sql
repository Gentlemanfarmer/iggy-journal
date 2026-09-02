-- Incident tags: group entries across categories by event
alter table public.entries add column if not exists incident_tag text;

create index if not exists idx_entries_incident
  on public.entries(user_id, incident_tag)
  where incident_tag is not null;
