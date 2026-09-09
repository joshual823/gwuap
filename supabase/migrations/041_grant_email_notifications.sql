-- SESSION 13 — Let people save their profile again
--
-- Editing a profile has been failing with "permission denied for table
-- profiles" since 039 ran on 5 Sep. Not just the email setting — the
-- bio, the display name, the username, the avatar and the league
-- choices, all of it, for everybody.
--
-- 039 added `email_notifications` and the edit form started sending it.
-- The column-level UPDATE grant was never widened to include it, and a
-- Postgres UPDATE naming one column the role can't write fails whole.
-- The form sends every field on every save, so every save failed.
--
-- Nobody noticed for three days because the failure is a red line under
-- the form rather than anything the server logs, and there are six
-- accounts.
--
-- The whole list is restated rather than added to. 031's comment says
-- why and it is the same trap as the notifications type constraint:
-- these lists are rewritten from memory and quietly lose whatever was
-- added since. This one is the complete set as of today.
--
--   username, display_name, bio, avatar_url  -- 009
--   preferred_leagues                        -- 023
--   email_notifications                      -- 039, missing until now
--
-- Deliberately NOT here, and they must never be:
--   is_admin, is_banned  -- privilege; that's the whole reason the grant
--                           is column-level instead of table-level
--   badges               -- earned, set by trigger or by hand
--   welcomed_at          -- written by the mailer, not by the account
--   id, created_at       -- identity
--
-- Safe to re-run.

revoke update on public.profiles from authenticated;
revoke update on public.profiles from anon;

grant update (username, display_name, bio, avatar_url, preferred_leagues, email_notifications)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------
-- Check it. Expect exactly the six columns above, and nothing else —
-- if is_admin or badges appears here, stop and fix it.
--
--   select column_name
--   from information_schema.column_privileges
--   where table_name = 'profiles'
--     and grantee = 'authenticated'
--     and privilege_type = 'UPDATE'
--   order by column_name;
--
-- Then edit a bio on the site and save it. That is the actual test.
-- ---------------------------------------------------------------
