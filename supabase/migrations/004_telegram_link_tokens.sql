-- AgriTrails Migration 004: Restrict Telegram to Farmers, Secure Link Tokens & Guest Fields
-- Safe to run multiple times (idempotent)

-- 1. Bookings: store guest name and phone directly on booking record
alter table if exists public.bookings
  add column if not exists guest_name text,
  add column if not exists guest_phone text;

-- 2. Profiles: store connected Telegram account handle/name
alter table if exists public.profiles
  add column if not exists telegram_account_name text;

-- 3. telegram_link_tokens: secure single-use token table with 10-minute expiry
create table if not exists public.telegram_link_tokens (
  token text primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  used boolean not null default false
);

-- Ensure expires_at column exists if table was created previously
alter table if exists public.telegram_link_tokens
  add column if not exists expires_at timestamptz not null default (now() + interval '10 minutes');

-- RLS: Strict server-only access (service role bypasses RLS)
alter table public.telegram_link_tokens enable row level security;
drop policy if exists "Allow token operations" on public.telegram_link_tokens;
drop policy if exists "Service role only" on public.telegram_link_tokens;
create policy "Service role only" on public.telegram_link_tokens for all using (false);

-- Fast lookup indexes
create index if not exists idx_telegram_link_tokens_token on public.telegram_link_tokens(token) where not used;
create index if not exists idx_bookings_guest_name on public.bookings(guest_name) where guest_name is not null;

-- 4. Fix demo farms ownership: ensure all farms belong to the demo farmer profile if owner_id is missing
update public.farms
set owner_id = '93db1b1a-046c-40a3-a078-829e11b2a42d'
where owner_id is null;
