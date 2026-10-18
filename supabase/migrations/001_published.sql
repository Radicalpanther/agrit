-- Migration 001: Add published flag to farms and update RLS read policy
alter table farms add column if not exists published boolean not null default true;

-- Update the public read policy so farms are readable when published = true or when owner_id = auth.uid()
drop policy if exists "farms_select_all" on farms;
create policy "farms_select_published_or_owner" on farms for select
  using (published = true or owner_id = auth.uid());
