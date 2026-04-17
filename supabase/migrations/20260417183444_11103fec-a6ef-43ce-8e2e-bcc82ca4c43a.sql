-- ============ Helper: updated_at trigger function ============
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============ Order status enum ============
do $$ begin
  create type public.order_status as enum (
    'ordered','packed','shipped','out_for_delivery','delivered','cancelled'
  );
exception when duplicate_object then null; end $$;

-- ============ profiles ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles viewable by authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ addresses ============
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'India',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.addresses enable row level security;

create policy "Users view own addresses"
  on public.addresses for select to authenticated
  using (auth.uid() = user_id);
create policy "Users insert own addresses"
  on public.addresses for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users update own addresses"
  on public.addresses for update to authenticated
  using (auth.uid() = user_id);
create policy "Users delete own addresses"
  on public.addresses for delete to authenticated
  using (auth.uid() = user_id);

create trigger addresses_updated_at
  before update on public.addresses
  for each row execute function public.update_updated_at_column();

-- ============ products ============
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  brand text not null,
  category text not null,
  price numeric(10,2) not null,
  original_price numeric(10,2),
  stock integer not null default 0,
  rating numeric(2,1) not null default 4.5,
  rating_count integer not null default 0,
  image_url text not null,
  gallery jsonb not null default '[]'::jsonb,
  is_deal_of_day boolean not null default false,
  deal_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;

create policy "Products are public"
  on public.products for select
  to anon, authenticated
  using (true);

create trigger products_updated_at
  before update on public.products
  for each row execute function public.update_updated_at_column();

create index idx_products_category on public.products(category);
create index idx_products_is_deal on public.products(is_deal_of_day);

-- ============ reviews ============
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.reviews enable row level security;

create policy "Reviews are public"
  on public.reviews for select
  to anon, authenticated
  using (true);
create policy "Users insert own reviews"
  on public.reviews for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users update own reviews"
  on public.reviews for update to authenticated
  using (auth.uid() = user_id);
create policy "Users delete own reviews"
  on public.reviews for delete to authenticated
  using (auth.uid() = user_id);

create trigger reviews_updated_at
  before update on public.reviews
  for each row execute function public.update_updated_at_column();

create index idx_reviews_product on public.reviews(product_id);

-- ============ orders ============
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.order_status not null default 'ordered',
  subtotal numeric(10,2) not null,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_method text not null,
  shipping_address jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;

create policy "Users view own orders"
  on public.orders for select to authenticated
  using (auth.uid() = user_id);
create policy "Users insert own orders"
  on public.orders for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users update own orders"
  on public.orders for update to authenticated
  using (auth.uid() = user_id);

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.update_updated_at_column();

create index idx_orders_user on public.orders(user_id);

-- ============ order_items ============
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  title text not null,
  price numeric(10,2) not null,
  quantity integer not null check (quantity > 0),
  image_url text not null,
  created_at timestamptz not null default now()
);
alter table public.order_items enable row level security;

create policy "Users view own order items"
  on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "Users insert own order items"
  on public.order_items for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

create index idx_order_items_order on public.order_items(order_id);