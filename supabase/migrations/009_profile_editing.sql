-- ============================================================
-- SESSION 9c — Editable profiles, safely
-- Run this once in the Supabase SQL editor (safe to re-run).
-- ============================================================

-- 1. Usernames are case-insensitively unique -------------------
-- `username text unique` is case-SENSITIVE, and the existing index on
-- lower(username) was not unique — so "Josh" and "josh" could both
-- exist. That's an impersonation vector on a site where your handle is
-- your reputation.
--
-- If this errors with a duplicate key, two accounts already differ only
-- by case; rename one in the Table Editor and re-run.
drop index if exists profiles_username_idx;
create unique index if not exists profiles_username_lower_idx
  on profiles (lower(username));

-- 2. Lock down which profile columns a user may change ---------
-- The policy "users can update own profile" allows updating ANY column,
-- including is_admin and is_banned. The anon key ships in every browser,
-- so a signed-in user could PATCH their own row and make themselves an
-- admin — then delete posts and ban people.
--
-- RLS can't scope columns; grants can. Moderation flags are now
-- settable only through the service_role key, which is what the admin
-- panel already uses.
revoke update on profiles from authenticated;
revoke update on profiles from anon;
grant update (username, display_name, bio, avatar_url) on profiles to authenticated;
