-- ============================================================
-- SESSION 15 — Knowing who has drifted off
-- Run this once in the Supabase SQL editor. Safe to re-run.
--
-- To email somebody who hasn't been back in a few days you first have to
-- know when they were last here, and nothing on this site knew.
--
-- `auth.users.last_sign_in_at` is the obvious candidate and the wrong
-- one: a session lasts weeks, so somebody who opens the site every
-- morning can have signed in once, a month ago. Emailing on that would
-- mean nudging the most active people on the site to come back.
--
-- So: last_seen_at, stamped by the app when a signed-in page renders and
-- the value is stale. At most a few writes per person per day.
-- ============================================================

alter table profiles add column if not exists last_seen_at timestamptz;
alter table profiles add column if not exists nudged_at timestamptz;
alter table profiles add column if not exists nudge_count int not null default 0;

comment on column public.profiles.last_seen_at is
  'Stamped by the app on a signed-in page render, at most every few hours. Not last_sign_in_at, which a persistent session makes meaningless.';
comment on column public.profiles.nudge_count is
  'How many come-back emails have been sent. Written by the notifier with the service role — never by the account.';

-- Backfill so nobody is treated as absent since the beginning of time on
-- the first run. Their account creation is the last moment we can honestly
-- say they were here.
update profiles set last_seen_at = created_at where last_seen_at is null;

create index if not exists profiles_last_seen_idx on profiles (last_seen_at)
  where last_seen_at is not null;

-- ---- who may write what ----------------------------------------
-- The whole list restated. 041 is the reason: this grant has been
-- rebuilt from a stale copy before, and a column dropped from it takes
-- the entire edit form down with it, because a Postgres UPDATE naming
-- one forbidden column fails whole.
--
--   username, display_name, bio, avatar_url  -- 009
--   preferred_leagues                        -- 023
--   email_notifications                      -- 039
--   last_seen_at                             -- this migration
--
-- Deliberately NOT granted: nudged_at and nudge_count. Those are the
-- notifier's bookkeeping, and an account that could reset its own would
-- be able to ask for the same email every hour.
revoke update on public.profiles from authenticated;
revoke update on public.profiles from anon;
grant update (username, display_name, bio, avatar_url, preferred_leagues,
              email_notifications, last_seen_at)
  on public.profiles to authenticated;

-- last_seen_at is nobody else's business. is_admin was revoked from anon
-- in 040 for a similar reason; this is the same call for a column that
-- says when a named person was last at their computer.
revoke select (last_seen_at, nudged_at, nudge_count) on public.profiles from anon;

-- ---- what a username may contain -------------------------------
-- There has never been a constraint on this. The shape lives in
-- lib/username.ts, is checked by the signup form and by /api/login, and
-- is enforced nowhere the data actually sits — so anything that inserts
-- a profile without going through those, which the grant above permits,
-- could store whatever it liked.
--
-- The app is safe from that: React escapes what it renders. The emails
-- are not — they build HTML by joining strings, and a username lands in
-- the middle of it. Escaping in the mailer is the other half of this fix
-- and is done; this is the half that stops the value existing.
--
-- Matches USERNAME_RE exactly. Every current username already satisfies
-- it, so this validates cleanly rather than failing on live rows.
alter table profiles drop constraint if exists profiles_username_shape;
alter table profiles add constraint profiles_username_shape
  check (username ~ '^[a-zA-Z0-9_]{3,20}$');

-- A display name is free text and stays free text — people write real
-- names in it — but it doesn't need to be unbounded.
alter table profiles drop constraint if exists profiles_display_name_length;
alter table profiles add constraint profiles_display_name_length
  check (display_name is null or char_length(display_name) <= 50);

-- ---------------------------------------------------------------
-- Check it:
--
--   select column_name from information_schema.column_privileges
--    where table_name = 'profiles' and grantee = 'authenticated'
--      and privilege_type = 'UPDATE' order by column_name;
--   -- expect exactly seven: avatar_url, bio, display_name,
--   -- email_notifications, last_seen_at, preferred_leagues, username
--   -- and NOT nudged_at or nudge_count.
--
-- Then edit a bio on the site. If that breaks, this grant is wrong.
-- ---------------------------------------------------------------
