-- Food Products Library
-- Persistent catalog of all known food products with photos.
-- feeding_components references products via product_id.

create table if not exists public.food_products (
  id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand text,
  photo_front_url text,
  photo_back_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists food_products_user_id_idx on public.food_products(user_id);

alter table public.food_products enable row level security;

create policy "Users can view own products"
  on public.food_products for select
  using (auth.uid() = user_id);

create policy "Users can insert own products"
  on public.food_products for insert
  with check (auth.uid() = user_id);

create policy "Users can update own products"
  on public.food_products for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own products"
  on public.food_products for delete
  using (auth.uid() = user_id);

-- Link feeding components to library products
alter table public.feeding_components
  add column if not exists product_id integer references public.food_products(id) on delete set null;
