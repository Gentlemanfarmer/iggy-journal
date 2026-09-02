-- Move inventory tracking from feeding_components to food_products
alter table public.food_products add column if not exists stock_amount numeric;
alter table public.food_products add column if not exists stock_unit text not null default 'g';
alter table public.food_products add column if not exists inventory_date date;
