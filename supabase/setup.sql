-- AgriTrails Unified Supabase Setup Script
-- Safe to run multiple times in Supabase SQL Editor.
-- Drops existing project tables/triggers, recreates all tables, functions, RLS policies, and seeds initial data.

-- ────────────────────────────────────────────────────────────────────────────────
-- 1. CLEANUP PREVIOUS INSTALLATION
-- ────────────────────────────────────────────────────────────────────────────────

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists trg_on_auth_user_created on auth.users;
drop function if exists handle_new_user() cascade;
drop function if exists update_farm_rating() cascade;

drop table if exists notifications cascade;
drop table if exists review_photos cascade;
drop table if exists reviews cascade;
drop table if exists product_reservations cascade;
drop table if exists products cascade;
drop table if exists bookings cascade;
drop table if exists activities cascade;
drop table if exists farm_crops cascade;
drop table if exists crops cascade;
drop table if exists farms cascade;
drop table if exists profiles cascade;
drop table if exists produce_orders cascade;
drop table if exists produce_items cascade;

drop type if exists user_role cascade;
drop type if exists booking_status cascade;
drop type if exists visit_type cascade;
drop type if exists crop_kind cascade;
drop type if exists notification_status cascade;
drop type if exists activity_kind cascade;
drop type if exists sort_hint cascade;
drop type if exists reservation_status cascade;

-- ────────────────────────────────────────────────────────────────────────────────
-- 2. EXTENSIONS & TYPES
-- ────────────────────────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";

create type user_role as enum ('tourist', 'farmer');
create type booking_status as enum ('pending', 'confirmed', 'declined', 'cancelled');
create type visit_type as enum ('day', 'overnight');
create type crop_kind as enum ('harvest', 'sowing');
create type notification_status as enum ('sent', 'failed', 'mock');
create type activity_kind as enum ('farming', 'culinary', 'relaxation');
create type sort_hint as enum ('morning', 'midday', 'afternoon', 'evening');
create type reservation_status as enum ('reserved', 'ready', 'collected', 'cancelled');

-- ────────────────────────────────────────────────────────────────────────────────
-- 3. TABLES
-- ────────────────────────────────────────────────────────────────────────────────

-- Profiles linked to auth.users
create table profiles (
  id              uuid primary key references auth.users on delete cascade,
  role            user_role not null default 'tourist',
  full_name       text,
  phone           text,
  whatsapp_opt_in boolean not null default false,
  updated_at      timestamptz not null default now()
);

-- Farm stays & rural estates
create table farms (
  id                    uuid primary key default uuid_generate_v4(),
  owner_id              uuid references profiles(id) on delete set null,
  slug                  text not null unique,
  name                  text not null,
  place                 text not null,
  region                text not null,
  lat                   numeric(9,6),
  lng                   numeric(9,6),
  description           text,
  type                  text,
  tags                  text[] not null default '{}',
  price_paise           integer not null check (price_paise > 0),
  max_guests            integer not null default 4,
  image_url             text,
  verified              boolean not null default false,
  organic_pct           integer check (organic_pct between 0 and 100),
  host_name             text,
  host_phone            text,
  directions_steps      text[] not null default '{}',
  landmark_note         text,
  allows_day_visit      boolean not null default false,
  day_visit_price_paise integer check (day_visit_price_paise > 0),
  day_visit_start       time,
  day_visit_end         time,
  rating_avg            numeric(3,2) not null default 0,
  review_count          integer not null default 0,
  created_at            timestamptz not null default now()
);

-- Seasonal crops
create table crops (
  id     uuid primary key default uuid_generate_v4(),
  name   text not null,
  place  text not null,
  region text not null,
  kind   crop_kind not null default 'harvest',
  months integer[] not null default '{}',
  check (months <@ array[0,1,2,3,4,5,6,7,8,9,10,11])
);

-- Junction table linking farms to crops
create table farm_crops (
  farm_id uuid references farms(id) on delete cascade,
  crop_id uuid references crops(id) on delete cascade,
  primary key (farm_id, crop_id)
);

-- On-farm experiences & activities
create table activities (
  id           uuid primary key default uuid_generate_v4(),
  farm_id      uuid not null references farms(id) on delete cascade,
  name         text not null,
  kind         activity_kind not null,
  duration_min integer not null check (duration_min > 0),
  best_months  integer[] not null default '{}',
  sort_hint    sort_hint not null default 'morning',
  check (best_months <@ array[0,1,2,3,4,5,6,7,8,9,10,11])
);

-- Farm-fresh produce & processed artisanal products
create table products (
  id               uuid primary key default uuid_generate_v4(),
  farm_id          uuid not null references farms(id) on delete cascade,
  name             text not null,
  detail           text,
  unit             text not null,
  price_paise      integer not null check (price_paise > 0),
  stock            integer not null default 0,
  in_season_months integer[] not null default '{}',
  check (in_season_months <@ array[0,1,2,3,4,5,6,7,8,9,10,11])
);

-- Guest reservations (day visit or overnight)
create table bookings (
  id           uuid primary key default uuid_generate_v4(),
  farm_id      uuid not null references farms(id),
  tourist_id   uuid not null references profiles(id),
  visit_type   visit_type not null default 'overnight',
  check_in     date not null,
  nights       integer not null default 1 check (nights >= 1),
  guests       integer not null default 1 check (guests >= 1),
  base_paise   integer not null check (base_paise > 0),
  discount_pct numeric(5,2) not null default 0,
  total_paise  integer not null check (total_paise > 0),
  status       booking_status not null default 'pending',
  created_at   timestamptz not null default now()
);

-- Produce reservations for farm pickup
create table product_reservations (
  id             uuid primary key default uuid_generate_v4(),
  booking_id     uuid references bookings(id) on delete set null,
  product_id     uuid not null references products(id),
  tourist_id     uuid not null references profiles(id),
  qty            integer not null check (qty >= 1),
  pickup_farm_id uuid references farms(id),
  status         reservation_status not null default 'reserved',
  created_at     timestamptz not null default now()
);

-- Verified guest reviews
create table reviews (
  id                 uuid primary key default uuid_generate_v4(),
  farm_id            uuid not null references farms(id) on delete cascade,
  user_id            uuid not null references profiles(id),
  booking_id         uuid references bookings(id) on delete set null,
  rating_food        integer not null check (rating_food between 1 and 5),
  rating_cleanliness integer not null check (rating_cleanliness between 1 and 5),
  rating_hospitality integer not null check (rating_hospitality between 1 and 5),
  rating_location    integer not null check (rating_location between 1 and 5),
  comment            text,
  created_at         timestamptz not null default now()
);

-- Review photos
create table review_photos (
  id        uuid primary key default uuid_generate_v4(),
  review_id uuid not null references reviews(id) on delete cascade,
  url       text not null
);

-- Booking notifications log
create table notifications (
  id         uuid primary key default uuid_generate_v4(),
  booking_id uuid references bookings(id) on delete set null,
  to_phone   text,
  template   text not null,
  payload    jsonb not null default '{}',
  status     notification_status not null default 'mock',
  error      text,
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────────
-- 4. TRIGGERS & FUNCTIONS
-- ────────────────────────────────────────────────────────────────────────────────

-- Auto-create profile on auth.users insert, reading metadata
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_role user_role := 'tourist';
  raw_role text;
begin
  raw_role := new.raw_user_meta_data ->> 'role';
  if raw_role = 'farmer' then
    v_role := 'farmer';
  else
    v_role := 'tourist';
  end if;

  insert into public.profiles (id, role, full_name, phone, whatsapp_opt_in)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'whatsapp_opt_in')::boolean, false)
  )
  on conflict (id) do update set
    role = excluded.role,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    phone = coalesce(excluded.phone, profiles.phone),
    updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Auto-update farm rating average and count
create or replace function update_farm_rating()
returns trigger language plpgsql as $$
declare
  v_avg     numeric(3,2);
  v_cnt     integer;
  v_farm_id uuid;
begin
  if tg_op = 'DELETE' then
    v_farm_id := old.farm_id;
  else
    v_farm_id := new.farm_id;
  end if;

  select
    round(avg((rating_food + rating_cleanliness + rating_hospitality + rating_location)::numeric / 4), 2),
    count(*)
  into v_avg, v_cnt
  from reviews
  where farm_id = v_farm_id;

  update farms
  set rating_avg   = coalesce(v_avg, 0),
      review_count = coalesce(v_cnt, 0)
  where id = v_farm_id;

  return null;
end;
$$;

create trigger trg_update_farm_rating
  after insert or update or delete on reviews
  for each row execute function update_farm_rating();

-- ────────────────────────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────────────────────────

alter table profiles             enable row level security;
alter table farms                enable row level security;
alter table crops                enable row level security;
alter table farm_crops           enable row level security;
alter table activities           enable row level security;
alter table products             enable row level security;
alter table bookings             enable row level security;
alter table product_reservations enable row level security;
alter table reviews              enable row level security;
alter table review_photos        enable row level security;
alter table notifications        enable row level security;

-- Profiles: users read and edit only their own
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

-- Farms: public read; farmers manage their own
create policy "farms_select_all"    on farms for select using (true);
create policy "farms_insert_owner"  on farms for insert with check (auth.uid() = owner_id);
create policy "farms_update_owner"  on farms for update using (auth.uid() = owner_id);
create policy "farms_delete_owner"  on farms for delete using (auth.uid() = owner_id);

-- Crops: public read
create policy "crops_select_all" on crops for select using (true);

-- Farm_crops: public read; farmers link crops to their farm
create policy "farm_crops_select_all" on farm_crops for select using (true);
create policy "farm_crops_insert_owner" on farm_crops for insert
  with check (exists (select 1 from farms where farms.id = farm_crops.farm_id and farms.owner_id = auth.uid()));
create policy "farm_crops_delete_owner" on farm_crops for delete
  using (exists (select 1 from farms where farms.id = farm_crops.farm_id and farms.owner_id = auth.uid()));

-- Activities: public read; farmers manage activities for their farm
create policy "activities_select_all"   on activities for select using (true);
create policy "activities_insert_owner" on activities for insert
  with check (exists (select 1 from farms where farms.id = activities.farm_id and farms.owner_id = auth.uid()));
create policy "activities_update_owner" on activities for update
  using (exists (select 1 from farms where farms.id = activities.farm_id and farms.owner_id = auth.uid()));
create policy "activities_delete_owner" on activities for delete
  using (exists (select 1 from farms where farms.id = activities.farm_id and farms.owner_id = auth.uid()));

-- Products: public read; farmers manage products for their farm
create policy "products_select_all"   on products for select using (true);
create policy "products_insert_owner" on products for insert
  with check (exists (select 1 from farms where farms.id = products.farm_id and farms.owner_id = auth.uid()));
create policy "products_update_owner" on products for update
  using (exists (select 1 from farms where farms.id = products.farm_id and farms.owner_id = auth.uid()));
create policy "products_delete_owner" on products for delete
  using (exists (select 1 from farms where farms.id = products.farm_id and farms.owner_id = auth.uid()));

-- Bookings: tourists create and read their own; farmers read and update for their farm
create policy "bookings_select_tourist" on bookings for select using (auth.uid() = tourist_id);
create policy "bookings_insert_tourist" on bookings for insert with check (auth.uid() = tourist_id);
create policy "bookings_select_farmer"  on bookings for select
  using (exists (select 1 from farms where farms.id = bookings.farm_id and farms.owner_id = auth.uid()));
create policy "bookings_update_farmer"  on bookings for update
  using (exists (select 1 from farms where farms.id = bookings.farm_id and farms.owner_id = auth.uid()));

-- Product Reservations: tourists create and read own; farmers manage for their farm
create policy "product_reservations_select_tourist" on product_reservations for select
  using (auth.uid() = tourist_id);
create policy "product_reservations_insert_tourist" on product_reservations for insert
  with check (auth.uid() = tourist_id);
create policy "product_reservations_select_farmer" on product_reservations for select
  using (exists (
    select 1 from products p
    join farms f on f.id = p.farm_id
    where p.id = product_reservations.product_id and f.owner_id = auth.uid()
  ));
create policy "product_reservations_update_farmer" on product_reservations for update
  using (exists (
    select 1 from products p
    join farms f on f.id = p.farm_id
    where p.id = product_reservations.product_id and f.owner_id = auth.uid()
  ));

-- Reviews: public read; write only from users with a confirmed booking
create policy "reviews_select_all" on reviews for select using (true);
create policy "reviews_insert_confirmed" on reviews for insert
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from bookings
      where bookings.id = reviews.booking_id
        and bookings.tourist_id = auth.uid()
        and bookings.status = 'confirmed'
    )
  );

-- Review photos: public read; review author writes
create policy "review_photos_select_all" on review_photos for select using (true);
create policy "review_photos_insert" on review_photos for insert
  with check (exists (select 1 from reviews where reviews.id = review_photos.review_id and reviews.user_id = auth.uid()));

-- Notifications: farmers read notifications for their farm
create policy "notifications_select_farmer" on notifications for select
  using (exists (
    select 1 from bookings b
    join farms f on f.id = b.farm_id
    where b.id = notifications.booking_id and f.owner_id = auth.uid()
  ));

-- Storage bucket for review photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-photos',
  'review-photos',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];

-- ────────────────────────────────────────────────────────────────────────────────
-- 6. SEED DATA
-- ────────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_farmer_id  uuid;
  v_tourist_id uuid;

  -- 7 farm UUIDs
  f1 uuid := uuid_generate_v4();
  f2 uuid := uuid_generate_v4();
  f3 uuid := uuid_generate_v4();
  f4 uuid := uuid_generate_v4();
  f5 uuid := uuid_generate_v4();
  f6 uuid := uuid_generate_v4();
  f7 uuid := uuid_generate_v4();

  -- 12 crop UUIDs
  c1  uuid := uuid_generate_v4();
  c2  uuid := uuid_generate_v4();
  c3  uuid := uuid_generate_v4();
  c4  uuid := uuid_generate_v4();
  c5  uuid := uuid_generate_v4();
  c6  uuid := uuid_generate_v4();
  c7  uuid := uuid_generate_v4();
  c8  uuid := uuid_generate_v4();
  c9  uuid := uuid_generate_v4();
  c10 uuid := uuid_generate_v4();
  c11 uuid := uuid_generate_v4();
  c12 uuid := uuid_generate_v4();

  -- sample booking UUIDs
  b1 uuid := uuid_generate_v4();
  b2 uuid := uuid_generate_v4();
  b3 uuid := uuid_generate_v4();
  b4 uuid := uuid_generate_v4();
  b5 uuid := uuid_generate_v4();
  b6 uuid := uuid_generate_v4();
  b7 uuid := uuid_generate_v4();

  -- sample product UUIDs
  p1 uuid := uuid_generate_v4();
  p2 uuid := uuid_generate_v4();
  p3 uuid := uuid_generate_v4();

begin
  -- Resolve user IDs from auth.users by email
  select id into v_farmer_id  from auth.users where email = 'farmer@agritrails.dev'  limit 1;
  select id into v_tourist_id from auth.users where email = 'tourist@agritrails.dev' limit 1;

  -- Upsert profiles for farmer and tourist
  if v_farmer_id is not null then
    insert into profiles (id, role, full_name, phone, whatsapp_opt_in)
    values (v_farmer_id, 'farmer', 'Rajesh Patil', '+919800000002', true)
    on conflict (id) do update set
      role = 'farmer',
      full_name = 'Rajesh Patil',
      phone = '+919800000002';
  end if;

  if v_tourist_id is not null then
    insert into profiles (id, role, full_name, phone, whatsapp_opt_in)
    values (v_tourist_id, 'tourist', 'Meera Kulkarni', '+919800000001', true)
    on conflict (id) do update set
      role = 'tourist',
      full_name = 'Meera Kulkarni',
      phone = '+919800000001';
  end if;

  -- 7 Farms owned by farmer user
  insert into farms (
    id, owner_id, slug, name, place, region, lat, lng,
    description, type, tags, price_paise, max_guests, image_url, verified,
    organic_pct, host_name, host_phone,
    directions_steps, landmark_note,
    allows_day_visit, day_visit_price_paise, day_visit_start, day_visit_end
  ) values
  (
    f1, v_farmer_id, 'kokan-roots-farmstay', 'Kokan Roots Farmstay',
    'Ratnagiri', 'Maharashtra', 17.0016, 73.3120,
    'Wake up to birdsong, share a meal made from the morning harvest, and spend an unhurried day learning the rhythms of a real working farm in Ratnagiri.',
    'Farm stay · Hurda party', array['organic','family','hurda-party'],
    285000, 4,
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=85',
    true, 90, 'Rajesh Patil', '+919800000002',
    array['Take NH66 towards Ratnagiri', 'Turn at Mirya phata', 'Follow the board at the mango grove'],
    'Near the old banyan tree at Mirya village',
    true, 95000, '09:00'::time, '17:00'::time
  ),
  (
    f2, v_farmer_id, 'aamrai-orchard-escape', 'Aamrai Orchard Escape',
    'Ratnagiri', 'Maharashtra', 16.9900, 73.3000,
    'Set inside mature Alphonso mango orchards. Spend mornings picking fruit and evenings tasting stone-ground Konkani dinners with host families.',
    'Fruit picking · Orchard', array['orchard','mango','coastal'],
    190000, 8,
    'https://images.unsplash.com/photo-1523742810464-7d7f6f9b7a9b?auto=format&fit=crop&w=900&q=85',
    true, 100, 'Rajesh Patil', '+919800000002',
    array['From Ratnagiri city, head south on SH4', 'Turn right after Pawas village', 'Enter the orchard gate after 2 km'],
    'Orchard gate has a hand-painted Aamrai signboard',
    true, 75000, '08:30'::time, '16:30'::time
  ),
  (
    f3, v_farmer_id, 'sahyadri-soil-and-soul', 'Sahyadri Soil and Soul',
    'Panchgani', 'Maharashtra', 17.9238, 73.8077,
    'A hillside working farm in the Sahyadri ranges. Learn cattle tending, churn fresh butter, and share a warm village lunch with the family.',
    'Cattle tending · Village lunch', array['hills','village','dairy'],
    165000, 4,
    'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=900&q=85',
    true, 75, 'Rajesh Patil', '+919800000002',
    array['Take Mahabaleshwar road from Wai', 'Turn left at Dandeghar phata', 'Climb 3 km on mud track'],
    'Stone wall with hand-painted farm name at the entrance',
    true, 65000, '09:00'::time, '17:00'::time
  ),
  (
    f4, v_farmer_id, 'gur-ghar-kolhapur', 'Gur Ghar Kolhapur',
    'Kolhapur', 'Maharashtra', 16.7050, 74.2433,
    'Watch traditional jaggery-making from fresh sugarcane crush, learn the kolhu press, and taste warm gur straight from the pan.',
    'Jaggery making · Sugarcane', array['jaggery','sugarcane','traditional'],
    120000, 6,
    'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=900&q=85',
    true, 80, 'Rajesh Patil', '+919800000002',
    array['Take NH48 towards Kolhapur', 'Exit at Jaysingpur', 'Follow sugarcane field road for 5 km'],
    'Large kolhu (bullock press) visible from the road',
    true, 50000, '10:00'::time, '16:00'::time
  ),
  (
    f5, v_farmer_id, 'draksha-valley-stay', 'Draksha Valley Stay',
    'Nashik', 'Maharashtra', 20.0059, 73.7798,
    'Stay in the grape belt of Maharashtra. Join guided vineyard walks, press your own grapes, and enjoy farm-to-table meals in the valley.',
    'Vineyard stay · Grape picking', array['grapes','vineyard','nashik'],
    220000, 5,
    'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=85',
    true, 85, 'Rajesh Patil', '+919800000002',
    array['From Nashik city, take the Gangapur road', 'Continue past Gangapur dam', 'Turn at the Draksha Valley signboard'],
    'Stone arch entrance with grape motif on NH60',
    true, 85000, '09:30'::time, '17:30'::time
  ),
  (
    f6, v_farmer_id, 'spice-hills-homestay', 'Spice Hills Homestay',
    'Wayanad', 'Kerala', 11.6010, 76.0820,
    'A working spice plantation in the Western Ghats. Walk through cardamom, pepper, and vanilla groves and cook a traditional Kerala meal with fresh pickings.',
    'Spice plantation · Forest stay', array['spices','kerala','western-ghats'],
    175000, 4,
    'https://images.unsplash.com/photo-1466096115517-bceecbfb6fde?auto=format&fit=crop&w=900&q=85',
    true, 95, 'Rajesh Patil', '+919800000002',
    array['Fly into Kozhikode', 'Drive NH766 to Kalpetta (90 km)', 'Follow Spice Hills board at Sulthan Bathery junction'],
    'Green gate next to the pepper vine arch at Ambalavayal',
    true, 70000, '09:00'::time, '16:00'::time
  ),
  (
    f7, v_farmer_id, 'sarson-da-khet', 'Sarson da Khet',
    'Amritsar', 'Punjab', 31.6340, 74.8723,
    'Golden mustard fields stretch to the horizon. Help with the Baisakhi harvest, learn traditional bhatti cooking, and ride a tractor at dawn.',
    'Mustard harvest · Tractor rides', array['mustard','punjab','baisakhi'],
    135000, 8,
    'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=900&q=85',
    true, 70, 'Rajesh Patil', '+919800000002',
    array['From Amritsar, take GT road east', 'Turn north at Attari crossroads', 'Farm is 8 km on the village track'],
    'Large Punjabi mural on the outer wall of the farmhouse',
    false, null, null, null
  );

  -- 12 Crops (months 0-indexed: 0=Jan ... 11=Dec)
  insert into crops (id, name, place, region, kind, months) values
    (c1,  'Hurda (Winter Jowar)',    'Sangamner',    'Maharashtra',      'harvest', array[11,0,1]),
    (c2,  'Kerala Spices',          'Wayanad',      'Kerala',           'harvest', array[1,2,3]),
    (c3,  'Kinnow Oranges',         'Abohar',       'Punjab',           'harvest', array[11,0,1,2]),
    (c4,  'Assam Tea',              'Tezpur',       'Assam',            'harvest', array[2,3,4,5]),
    (c5,  'Strawberry',             'Mahabaleshwar', 'Maharashtra',     'harvest', array[11,0,1,2]),
    (c6,  'Mustard (Sarson)',       'Amritsar',     'Punjab',           'harvest', array[1,2,3]),
    (c7,  'Alphonso Mango',        'Ratnagiri',    'Maharashtra',      'harvest', array[3,4,5]),
    (c8,  'Coorg Coffee',          'Coorg',        'Karnataka',        'harvest', array[10,11,0]),
    (c9,  'Nashik Grapes',         'Nashik',       'Maharashtra',      'harvest', array[1,2,3]),
    (c10, 'Wheat',                 'Ludhiana',     'Punjab',           'harvest', array[3,4]),
    (c11, 'Apple',                 'Shimla',       'Himachal Pradesh', 'harvest', array[7,8,9]),
    (c12, 'Saffron (Kesar)',       'Pampore',      'Kashmir',          'harvest', array[9,10]);

  -- Farm-Crop links
  insert into farm_crops (farm_id, crop_id) values
    (f1, c1), (f1, c5),
    (f2, c7),
    (f3, c1), (f3, c9),
    (f4, c6),
    (f5, c9),
    (f6, c2), (f6, c8),
    (f7, c6), (f7, c10), (f7, c3);

  -- 4 to 6 activities per farm
  insert into activities (farm_id, name, kind, duration_min, best_months, sort_hint) values
    -- Farm 1: Kokan Roots (5 activities)
    (f1, 'Hurda roasting on open hearth', 'culinary',    90,  array[11,0,1],   'evening'),
    (f1, 'Morning rice paddy walk',        'farming',     60,  array[6,7,8,9],  'morning'),
    (f1, 'Cow milking and shed tending',   'farming',     45,  '{}',            'morning'),
    (f1, 'Chutney grinding on sil-batta',  'culinary',    60,  '{}',            'midday'),
    (f1, 'Hammock reading under teakwood', 'relaxation',  120, '{}',            'afternoon'),

    -- Farm 2: Aamrai Orchard Escape (5 activities)
    (f2, 'Alphonso harvest and plucking',  'farming',     90,  array[3,4,5],    'morning'),
    (f2, 'Raw mango pickle workshop',      'culinary',    75,  array[2,3,4],    'midday'),
    (f2, 'Orchard trail and birdwatching', 'relaxation',  60,  '{}',            'morning'),
    (f2, 'Konkani wood-fired fish curry',  'culinary',    90,  '{}',            'evening'),
    (f2, 'Sunset tea atop the laterite ridge','relaxation',60, '{}',            'afternoon'),

    -- Farm 3: Sahyadri Soil and Soul (5 activities)
    (f3, 'Desi cow butter churning',       'culinary',    45,  '{}',            'morning'),
    (f3, 'Terraced vegetable weeding',     'farming',     75,  array[5,6,7,8],  'morning'),
    (f3, 'Compost making and soil prep',   'farming',     60,  '{}',            'afternoon'),
    (f3, 'Valley breeze meditation sit',   'relaxation',  45,  '{}',            'morning'),
    (f3, 'Chulha flatbread dinner circle', 'culinary',    90,  '{}',            'evening'),

    -- Farm 4: Gur Ghar Kolhapur (4 activities)
    (f4, 'Sugarcane harvesting and cutting','farming',    90,  array[10,11,0,1],'morning'),
    (f4, 'Kolhu bullock press demonstration','farming',   60,  array[10,11,0,1],'morning'),
    (f4, 'Warm gur tasting and ladle work','culinary',    45,  array[10,11,0,1],'midday'),
    (f4, 'Village tree shade resting',     'relaxation',  90,  '{}',            'afternoon'),

    -- Farm 5: Draksha Valley Stay (5 activities)
    (f5, 'Table grape plucking and packing','farming',    90,  array[1,2,3],    'morning'),
    (f5, 'Vineyard canopy pruning session','farming',     60,  array[8,9,10],   'morning'),
    (f5, 'Sun-dried raisin sorting',       'culinary',    60,  array[2,3,4],    'midday'),
    (f5, 'Fresh juice pressing workshop',  'culinary',    45,  array[1,2,3],    'afternoon'),
    (f5, 'Vine row twilight stroll',       'relaxation',  60,  '{}',            'evening'),

    -- Farm 6: Spice Hills Homestay (5 activities)
    (f6, 'Cardamom pod harvest at dawn',   'farming',     90,  array[1,2,3],    'morning'),
    (f6, 'Black pepper vine hand-picking', 'farming',     75,  array[0,1,2],    'morning'),
    (f6, 'Kerala spice blend roasting',    'culinary',    60,  '{}',            'midday'),
    (f6, 'Bamboo grove sound walk',        'relaxation',  60,  '{}',            'afternoon'),
    (f6, 'Ayurvedic herbal foot soak',     'relaxation',  45,  '{}',            'evening'),

    -- Farm 7: Sarson da Khet (5 activities)
    (f7, 'Dawn tractor ride across fields','farming',     60,  '{}',            'morning'),
    (f7, 'Mustard cutting and bundling',   'farming',     90,  array[1,2,3],    'morning'),
    (f7, 'Saag making in earthenware handi','culinary',   120, array[11,0,1,2], 'afternoon'),
    (f7, 'Bhatti tandoor baking',          'culinary',    60,  '{}',            'evening'),
    (f7, 'Charpai resting under neem tree','relaxation',  90,  '{}',            'midday');

  -- 3 to 5 products per farm
  insert into products (id, farm_id, name, detail, unit, price_paise, stock, in_season_months) values
    -- Farm 1
    (p1, f1, 'Organic jaggery block',   'Chemical-free slow boiled', '500 g',   18000, 40, array[11,0,1,2]),
    (uuid_generate_v4(), f1, 'Kokan red rice',           'Traditional indrayani unpolished', '1 kg', 35000, 25, '{}'),
    (uuid_generate_v4(), f1, 'Moringa leaf powder',      'Sun-dried and hand-milled', '100 g',   14000, 30, '{}'),
    (uuid_generate_v4(), f1, 'Roasted jowar flour',      'Hurda season ground sorghum', '1 kg',  22000, 20, array[11,0,1]),

    -- Farm 2
    (p2, f2, 'Ratnagiri Alphonso mango','Hand-plucked GI-tagged box', '1 dozen', 95000, 30, array[3,4,5]),
    (uuid_generate_v4(), f2, 'Raw mango salt pickle',    'Old family stone-crock recipe', '300 g', 24000, 35, '{}'),
    (uuid_generate_v4(), f2, 'Mango wood-smoked pulp',   'Canned without preservatives', '500 g', 32000, 18, array[3,4,5]),
    (uuid_generate_v4(), f2, 'Kokum butter skin balm',   'Cold-pressed native fruit butter', '50 g', 18000, 40, '{}'),

    -- Farm 3
    (p3, f3, 'Village masala chai',     'Crushed spices and CTC blend', '250 g', 22000, 50, '{}'),
    (uuid_generate_v4(), f3, 'A2 Gir cow cultured ghee', 'Bilona method small batch', '500 ml', 65000, 15, '{}'),
    (uuid_generate_v4(), f3, 'Wild forest honey',        'Extracted without heating', '350 g',   42000, 20, array[2,3,4]),
    (uuid_generate_v4(), f3, 'Hillside turmeric powder', 'Curcumin rich heirloom seed', '200 g', 19000, 35, '{}'),

    -- Farm 4
    (uuid_generate_v4(), f4, 'Sugarcane solid jaggery',  'Kolhu-pressed golden grade', '1 kg',   28000, 60, array[10,11,0,1]),
    (uuid_generate_v4(), f4, 'Kolhapuri red chili masala','Wood-pounded sharp blend', '150 g',   16000, 40, '{}'),
    (uuid_generate_v4(), f4, 'Liquid kakvi syrup',       'Early cane boil syrup', '500 ml',      24000, 25, array[10,11,0,1]),

    -- Farm 5
    (uuid_generate_v4(), f5, 'Nashik golden raisins',    'Shade-dried Thompson seedless', '250 g', 32000, 45, array[1,2,3,4]),
    (uuid_generate_v4(), f5, 'Cold-pressed grape juice', 'Pasteurized with no sugar', '500 ml',   28000, 20, array[1,2,3]),
    (uuid_generate_v4(), f5, 'Grape seed culinary oil',  'High smoke point unrefined', '250 ml',  38000, 15, '{}'),
    (uuid_generate_v4(), f5, 'Vine-leaf tea infusion',   'Dried leaves with spearmint', '75 g',   18000, 30, '{}'),

    -- Farm 6
    (uuid_generate_v4(), f6, 'Wayanad green cardamom',   'Bold grade fragrant pods', '50 g',     38000, 30, array[0,1,2,3]),
    (uuid_generate_v4(), f6, 'Tellicherry black pepper', 'Sun-cured estate grade', '100 g',     26000, 40, array[0,1,2]),
    (uuid_generate_v4(), f6, 'Bourbon vanilla beans',    'Hand-pollinated cured pods', '3 pods', 48000, 12, array[1,2,3]),
    (uuid_generate_v4(), f6, 'Pure clove whole buds',    'Organically grown under canopy', '75 g', 29000, 25, '{}'),

    -- Farm 7
    (uuid_generate_v4(), f7, 'Kachi ghani mustard oil',  'Cold-milled pungent oil', '1 litre',   26000, 35, array[1,2,3,4]),
    (uuid_generate_v4(), f7, 'Kinnow marmalade',         'Peel preserve cooked on bhatti', '300 g', 21000, 25, array[0,1,2]),
    (uuid_generate_v4(), f7, 'Stoneground wheat atta',   'Heirloom Sharbati grain', '5 kg',      38000, 20, array[3,4,5]);

  -- Seed bookings and reviews if tourist user exists
  if v_tourist_id is not null then
    insert into bookings (id, farm_id, tourist_id, visit_type, check_in, nights, guests, base_paise, discount_pct, total_paise, status) values
      (b1, f1, v_tourist_id, 'overnight', '2025-02-10', 2, 4, 570000, 0,  570000, 'confirmed'),
      (b2, f2, v_tourist_id, 'overnight', '2025-04-15', 3, 4, 570000, 5,  541500, 'confirmed'),
      (b3, f3, v_tourist_id, 'overnight', '2025-01-20', 1, 2, 165000, 0,  165000, 'confirmed'),
      (b4, f4, v_tourist_id, 'day',       '2025-03-05', 1, 6, 240000, 10, 216000, 'confirmed'),
      (b5, f5, v_tourist_id, 'overnight', '2025-02-28', 2, 4, 440000, 0,  440000, 'confirmed'),
      (b6, f6, v_tourist_id, 'overnight', '2025-03-10', 3, 3, 525000, 0,  525000, 'confirmed'),
      (b7, f7, v_tourist_id, 'overnight', '2025-04-08', 2, 6, 270000, 0,  270000, 'confirmed');

    -- Product reservations
    insert into product_reservations (booking_id, product_id, tourist_id, qty, pickup_farm_id, status) values
      (b1, p1, v_tourist_id, 2, f1, 'reserved'),
      (b2, p2, v_tourist_id, 1, f2, 'reserved'),
      (b3, p3, v_tourist_id, 3, f3, 'ready');

    -- 3 to 6 reviews per farm (triggers update rating_avg and review_count automatically)
    insert into reviews (farm_id, user_id, booking_id, rating_food, rating_cleanliness, rating_hospitality, rating_location, comment) values
      -- Farm 1 (Kokan Roots)
      (f1, v_tourist_id, b1, 5, 5, 5, 5, 'The hurda roasting on the open hearth was unforgettable. Fresh jowar straight from the field, garlic chutney, and peaceful silence.'),
      (f1, v_tourist_id, b1, 5, 4, 5, 5, 'Birdsong at dawn, thick coconut groves, and fresh red rice cooked over wood fire. Total calm.'),
      (f1, v_tourist_id, b1, 4, 5, 5, 4, 'Rajesh and family were wonderful hosts. The kids loved the cow shed visit. We will return next season.'),

      -- Farm 2 (Aamrai Orchard Escape)
      (f2, v_tourist_id, b2, 5, 5, 5, 5, 'Picking Alphonso mangoes directly from the tree in warm sunlight is a memory we will hold onto for years.'),
      (f2, v_tourist_id, b2, 4, 4, 5, 5, 'Clean, unpretentious cottages right in the mango orchard. The Konkani dinner was outstanding.'),
      (f2, v_tourist_id, b2, 5, 5, 4, 5, 'Walking through the orchard at first light with the sea breeze coming in is something everyone should experience.'),

      -- Farm 3 (Sahyadri Soil and Soul)
      (f3, v_tourist_id, b3, 4, 5, 5, 5, 'Churning cultured butter by hand and sharing warm bhakri on the veranda was deeply grounding.'),
      (f3, v_tourist_id, b3, 5, 4, 4, 5, 'Hillside breeze and unobstructed views of the valley. Home cooked meals that felt honest and nourishing.'),
      (f3, v_tourist_id, b3, 4, 4, 5, 4, 'Very quiet weekend retreat. The hosts made us feel part of their family from the moment we arrived.'),

      -- Farm 4 (Gur Ghar Kolhapur)
      (f4, v_tourist_id, b4, 5, 4, 5, 4, 'Watching sugarcane crush and fresh jaggery boil in giant iron pans was truly fascinating for our family.'),
      (f4, v_tourist_id, b4, 4, 5, 4, 4, 'Warm gur eaten with fresh ghee is the finest sweet in Maharashtra. Very well maintained farm.'),
      (f4, v_tourist_id, b4, 5, 4, 5, 4, 'Patient and generous host. Explained every traditional step of jaggery making clearly to the children.'),
      (f4, v_tourist_id, b4, 4, 3, 5, 3, 'Authentic village experience. The bullock press demonstration was rare and educational.'),

      -- Farm 5 (Draksha Valley Stay)
      (f5, v_tourist_id, b5, 5, 5, 5, 5, 'Waking up right next to grape vines with misty mornings in Nashik. The guided vineyard trail was excellent.'),
      (f5, v_tourist_id, b5, 4, 5, 5, 5, 'Hand-picked table grapes and tasted fresh juice on day two. Honest, peaceful stay.'),
      (f5, v_tourist_id, b5, 5, 4, 5, 4, 'Very hospitable hosts, serene atmosphere, and generous farm meals.'),

      -- Farm 6 (Spice Hills Homestay)
      (f6, v_tourist_id, b6, 5, 5, 5, 5, 'The cardamom plantation at dawn was breathtaking. Every meal featured spices harvested on the property that day.'),
      (f6, v_tourist_id, b6, 5, 4, 5, 5, 'Warm hospitality, honest home food, and beautiful trails through pepper and coffee trees.'),
      (f6, v_tourist_id, b6, 4, 5, 5, 4, 'Learnt traditional Kerala cooking with freshly harvested spices. Clean rooms and attentive care.'),
      (f6, v_tourist_id, b6, 5, 5, 4, 5, 'No shortcuts or commercial gloss. A real working plantation surrounded by mountain mist.'),

      -- Farm 7 (Sarson da Khet)
      (f7, v_tourist_id, b7, 5, 4, 5, 4, 'Standing in yellow mustard fields at sunrise is an experience that stays with you.'),
      (f7, v_tourist_id, b7, 5, 5, 5, 5, 'Wood-fired saag and makki di roti cooked the authentic way on the bhatti. Unbeatable warmth.'),
      (f7, v_tourist_id, b7, 4, 4, 5, 4, 'Tractor ride through the fields at dawn followed by sweet milky chai. Genuine Punjabi village hospitality.');
  else
    raise notice 'Note: tourist@agritrails.dev not found in auth.users. Bookings and reviews were skipped. Register users via /login or dashboard and re-run setup.sql to link.';
  end if;

end;
$$;
