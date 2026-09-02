-- Add inventory tracking to feeding components
alter table public.feeding_components
  add column if not exists inventory_date date;
