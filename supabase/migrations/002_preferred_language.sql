-- Migration: Add preferred_language to profiles and locale to bookings
-- Step 3 of Multilingual Support (en, hi, mr)

alter table profiles
  add column if not exists preferred_language text default 'en' check (preferred_language in ('en', 'hi', 'mr'));

alter table bookings
  add column if not exists locale text default 'en' check (locale in ('en', 'hi', 'mr'));
