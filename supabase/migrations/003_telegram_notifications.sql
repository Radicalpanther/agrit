-- AgriTrails Additive Migration 003: Telegram Notifications & Booking Approval
-- Safe to run multiple times

-- 1. Profiles: telegram_chat_id and telegram_linked_at
alter table if exists public.profiles
  add column if not exists telegram_chat_id bigint,
  add column if not exists telegram_linked_at timestamptz;

-- Make phone optional on profiles if not already
alter table if exists public.profiles
  alter column phone drop not null;

-- 2. telegram_link_tokens table for one-time deep link association
create table if not exists public.telegram_link_tokens (
  token text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  used boolean not null default false
);

-- Enable RLS with no public policies (accessible only by service role)
alter table public.telegram_link_tokens enable row level security;
drop policy if exists "Service role only" on public.telegram_link_tokens;
drop policy if exists "No public access" on public.telegram_link_tokens;

-- 3. Bookings: store Telegram message id and chat id for interactive approval edits
alter table if exists public.bookings
  add column if not exists telegram_message_id bigint,
  add column if not exists telegram_chat_id bigint;

-- Index for fast token lookups
create index if not exists idx_telegram_link_tokens_token on public.telegram_link_tokens(token) where not used;
create index if not exists idx_profiles_telegram_chat_id on public.profiles(telegram_chat_id) where telegram_chat_id is not null;
