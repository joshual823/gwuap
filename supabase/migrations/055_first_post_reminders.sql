-- ============================================================
-- SESSION 21 — Reminding somebody who never posted
-- Run this once in the Supabase SQL editor. Safe to re-run.
--
-- There are two different silences and the site only knew about one.
--
-- 047 added `nudge_count`, which counts come-back emails and is driven
-- by `last_seen_at` — it answers "you haven't been here in a while".
-- That is the wrong question for somebody who signs up, reads the feed
-- every day, and never posts: they are not away, so they are never
-- nudged, and the one thing the account is missing is the one thing
-- nothing asks for.
--
-- So: a second counter, for a second campaign. Driven by `created_at`
-- and by whether the account has ever posted, not by absence.
--
-- Two counters rather than one on purpose. Sharing `nudge_count` would
-- mean a come-back email silently consuming a first-post slot, and no
-- way afterwards to tell which campaign a number came from.
-- ============================================================

alter table profiles add column if not exists first_post_nudge_count int not null default 0;
alter table profiles add column if not exists first_post_nudged_at timestamptz;

comment on column public.profiles.first_post_nudge_count is
  'How many "you have not posted yet" emails have been sent. Written by the notifier with the service role — never by the account. Separate from nudge_count, which counts come-back emails (047).';
comment on column public.profiles.first_post_nudged_at is
  'When the last first-post reminder went out. Bookkeeping only.';

-- The notifier scans for accounts still under the cap, oldest first.
create index if not exists profiles_first_post_nudge_idx
  on profiles (first_post_nudge_count, created_at);

-- ---- who may write what ----------------------------------------
-- **No change to the UPDATE grant, deliberately.**
--
-- Both columns above are the notifier's bookkeeping and it writes them
-- with the service role, which bypasses column privileges entirely. An
-- account that could reset its own counter could ask for the same email
-- as often as it liked, which is the same reasoning 047 gave for
-- keeping nudged_at and nudge_count out of the grant.
--
-- The current grant is therefore unchanged and stays, as of 054:
--
--   username, display_name, bio, avatar_url  -- 009
--   preferred_leagues                        -- 023
--   email_notifications                      -- 039
--   last_seen_at                             -- 047
--   watchlist_autoclean                      -- 054
--
-- Nothing is revoked or restated here. Restating it from a stale copy is
-- how 039 took the whole edit form down, and the safest edit to a grant
-- you are not changing is no edit at all.

-- When a name was last here is nobody else's business, and neither is
-- how many reminders they have ignored. Same call as 047.
revoke select (first_post_nudge_count, first_post_nudged_at)
  on public.profiles from anon;

-- ---------------------------------------------------------------
-- Check it:
--
--   select column_name from information_schema.columns
--    where table_name = 'profiles' and column_name like 'first_post%';
--   -- expect two rows.
--
--   select column_name from information_schema.column_privileges
--    where table_name = 'profiles' and grantee = 'authenticated'
--      and privilege_type = 'UPDATE' order by column_name;
--   -- expect exactly eight, unchanged by this migration: avatar_url,
--   -- bio, display_name, email_notifications, last_seen_at,
--   -- preferred_leagues, username, watchlist_autoclean
--   -- and NOT first_post_nudge_count or first_post_nudged_at.
--
-- Then edit a bio on the site. If that breaks, the grant is wrong.
-- ---------------------------------------------------------------
