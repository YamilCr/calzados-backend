-- ══════════════════════════════════════════════════════════════════════════════
-- Calzados App – Schema Supabase
-- Ejecutá este script en el SQL Editor de tu proyecto Supabase
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── Extensiones ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Enums ────────────────────────────────────────────────────────────────────
do $$ begin
  create type gender_type as enum ('men', 'women', 'unisex');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('customer', 'admin');
exception when duplicate_object then null; end $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLA: profiles
-- Extiende auth.users de Supabase
-- ══════════════════════════════════════════════════════════════════════════════
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text        not null,
  email       text        not null unique,
  avatar_url  text,
  role        user_role   not null default 'customer',
  created_at  timestamptz not null default now()
);

-- Trigger: crea el perfil automáticamente al registrarse en Supabase Auth
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLA: products
-- ══════════════════════════════════════════════════════════════════════════════
create table if not exists products (
  id             bigserial    primary key,
  name           text         not null,
  slug           text         not null unique,
  price          numeric(10,2) not null check (price > 0),
  original_price numeric(10,2) check (original_price > 0),
  image          text         not null,
  images         text[]       not null default '{}',
  rating         numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  review_count   int          not null default 0 check (review_count >= 0),
  category       text         not null,
  gender         gender_type  not null default 'unisex',
  sizes          text[]       not null default '{}',
  colors         jsonb        not null default '[]',
  description    text         not null,
  featured       boolean      not null default false,
  in_stock       boolean      not null default true,
  tags           text[]       not null default '{}',
  created_at     timestamptz  not null default now(),
  updated_at     timestamptz  not null default now()
);

-- Índices
create index if not exists products_category_idx  on products(category);
create index if not exists products_gender_idx    on products(gender);
create index if not exists products_featured_idx  on products(featured);
create index if not exists products_in_stock_idx  on products(in_stock);
create index if not exists products_slug_idx      on products(slug);
-- Búsqueda full-text
create index if not exists products_search_idx    on products using gin(to_tsvector('spanish', name || ' ' || description));

-- Trigger updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_updated_at on products;
create trigger products_updated_at
  before update on products
  for each row execute function set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLA: orders
-- ══════════════════════════════════════════════════════════════════════════════
create table if not exists orders (
  id                   uuid         primary key default uuid_generate_v4(),
  user_id              uuid         not null references profiles(id) on delete restrict,
  total                numeric(12,2) not null check (total >= 0),
  status               order_status not null default 'pending',
  -- Dirección de envío (desnormalizada para inmutabilidad histórica)
  shipping_first_name  text         not null,
  shipping_last_name   text         not null,
  shipping_email       text         not null,
  shipping_phone       text         not null,
  shipping_address     text         not null,
  shipping_city        text         not null,
  shipping_state       text         not null,
  shipping_zip_code    text         not null,
  shipping_country     text         not null,
  created_at           timestamptz  not null default now(),
  updated_at           timestamptz  not null default now()
);

create index if not exists orders_user_id_idx on orders(user_id);
create index if not exists orders_status_idx  on orders(status);

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLA: order_items
-- ══════════════════════════════════════════════════════════════════════════════
create table if not exists order_items (
  id             bigserial     primary key,
  order_id       uuid          not null references orders(id) on delete cascade,
  product_id     bigint        not null references products(id) on delete restrict,
  quantity       int           not null check (quantity > 0),
  unit_price     numeric(10,2) not null check (unit_price > 0),
  selected_size  text          not null,
  selected_color jsonb         not null  -- { name: string, hex: string }
);

create index if not exists order_items_order_idx on order_items(order_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════════════

-- profiles: cada usuario ve/edita solo su perfil
alter table profiles enable row level security;

create policy "profiles: leer propio"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles: actualizar propio"
  on profiles for update
  using (auth.uid() = id);

-- products: lectura pública; escritura solo admin
alter table products enable row level security;

create policy "products: lectura pública"
  on products for select
  using (true);

create policy "products: escritura admin"
  on products for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- orders: cada usuario ve sus órdenes; admin ve todas
alter table orders enable row level security;

create policy "orders: ver propias"
  on orders for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "orders: crear autenticado"
  on orders for insert
  with check (auth.uid() = user_id);

create policy "orders: actualizar admin"
  on orders for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- order_items: mismas reglas que orders
alter table order_items enable row level security;

create policy "order_items: ver si puede ver la orden"
  on order_items for select
  using (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
        and (
          orders.user_id = auth.uid()
          or exists (
            select 1 from profiles
            where profiles.id = auth.uid()
              and profiles.role = 'admin'
          )
        )
    )
  );

create policy "order_items: insertar autenticado"
  on order_items for insert
  with check (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- DATOS DE PRUEBA (opcional – comentar en producción)
-- ══════════════════════════════════════════════════════════════════════════════

insert into products (name, slug, price, original_price, image, images, rating, review_count, category, gender, sizes, colors, description, featured, in_stock, tags)
values
  (
    'Cloud Runner Shoes', 'cloud-runner-shoes', 480, 580,
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
    array['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop'],
    3, 48, 'shoes', 'men',
    array['7','8','9','10','11','12'],
    '[{"name":"White","hex":"#ffffff"},{"name":"Black","hex":"#1a1a1a"}]',
    'Lightweight cloud-cushioned running shoes.', true, true,
    array['shoes','sport','running']
  ),
  (
    'Summer Adidas Shoes', 'summer-adidas-shoes', 360, null,
    'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=400&h=400&fit=crop',
    array['https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600&h=600&fit=crop'],
    5, 74, 'shoes', 'women',
    array['5','6','7','8','9'],
    '[{"name":"Pink","hex":"#ec4899"},{"name":"White","hex":"#ffffff"}]',
    'Iconic summer-ready sneakers with a sleek design.', true, true,
    array['shoes','summer','women']
  ),
  (
    'Urban Leather Backpack', 'urban-leather-backpack', 195, 250,
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
    array['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop'],
    4, 32, 'accessories', 'unisex',
    array['One Size'],
    '[{"name":"Brown","hex":"#92400e"},{"name":"Black","hex":"#1a1a1a"}]',
    'Premium leather backpack with multiple compartments.', false, true,
    array['accessories','bag','leather']
  )
on conflict (slug) do nothing;
