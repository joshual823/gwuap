-- ============================================================
-- SESSION 21 — Presence out of profiles
-- Run this once in the Supabase SQL editor. Safe to re-run.
--
-- 056 stopped `anon` reading `last_seen_at`. It left the other half
-- open and said so: a signed-in member could still read when any other
-- member was last at their computer. This closes it.
--
-- **Why not another column grant.** Column privileges are not row-aware.
-- `authenticated` has to read its *own* `last_seen_at` — that is how the
-- app decides whether the stamp is stale enough to rewrite — so revoking
-- the column takes the owner's access with everybody else's. There is no
-- grant that means "your row only".
--
-- Row Level Security is exactly that, and it works on tables rather than
-- columns. So the column becomes a table.
--
-- The alternative was a security-definer view over profiles filtered to
-- auth.uid(), which would also have worked and would have covered
-- is_admin and the nudge counters at the same time. It was not taken:
-- it means dropping `authenticated`'s table-level SELECT and enumerating
-- every column nine files read, with whole-query failure as the penalty
-- for missing one. This touches three files and is verifiable from the
-- outside. `is_admin` stays readable and is a deliberate accept — the
-- admin's username is public anyway, so it names somebody already named.
-- ============================================================

create table if not exists public.presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

comment on table public.presence is
  'When each member was last on the site. Split out of profiles in 057 because column grants cannot say "your row only" and RLS can.';

alter table public.presence enable row level security;

-- Your row, and nobody else's — read or write. The notifier reads this
-- with the service role, which bypasses RLS, so the come-back schedule
-- is unaffected.
drop policy if exists presence_select_own on public.presence;
create policy presence_select_own on public.presence
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists presence_insert_own on public.presence;
create policy presence_insert_own on public.presence
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists presence_update_own on public.presence;
create policy presence_update_own on public.presence
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- `anon` is granted nothing at all: a logged-out visitor has no row here
-- and no business reading anyone else's.
revoke all on public.presence from anon;
grant select, insert, update on public.presence to authenticated;

-- Carry the existing stamps over before the column goes. Account
-- creation is the honest fallback, same as 047 used for the backfill.
insert into public.presence (user_id, last_seen_at)
  select id, coalesce(last_seen_at, created_at) from public.profiles
  on conflict (user_id) do nothing;

create index if not exists presence_last_seen_idx on public.presence (last_seen_at);

-- ---- and off profiles --------------------------------------------
-- The UPDATE grant restated in full, minus last_seen_at. 047 explains
-- why this is never edited from memory: a Postgres UPDATE naming one
-- forbidden column fails whole, so a column dropped from this list by
-- accident takes the entire edit form down.
--
--   username, display_name, bio, avatar_url  -- 009
--   preferred_leagues                        -- 023
--   email_notifications                      -- 039
--   watchlist_autoclean                      -- 054
--   (last_seen_at left 047 and lives in presence now)
revoke update on public.profiles from authenticated;
revoke update on public.profiles from anon;
grant update (username, display_name, bio, avatar_url, preferred_leagues,
              email_notifications, watchlist_autoclean)
  on public.profiles to authenticated;

drop index if exists profiles_last_seen_idx;
alter table public.profiles drop column if exists last_seen_at;

-- ---------------------------------------------------------------
-- Check it, from outside, with the keys an attacker would use —
-- 040, 047 and 055 all "ran fine" and did nothing:
--
--   -- as anon: expect an empty list or a permission error, never rows
--   curl "$SUPABASE_URL/rest/v1/presence?select=*" -H "apikey: $ANON_KEY"
--
--   -- as a signed-in member, from the browser console on gwuap.co:
--   -- expect exactly one row back, your own, however many members exist
--   await (await fetch('/rest/v1/presence?select=user_id', …)).json()
--
--   -- and the column is gone
--   select column_name from information_schema.columns
--    where table_name = 'profiles' and column_name = 'last_seen_at';
--   -- expect zero rows.
--
-- Then load any signed-in page and edit a bio. The first exercises the
-- stamp, the second the restated grant.
-- ---------------------------------------------------------------
