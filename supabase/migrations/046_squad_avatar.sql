-- ============================================================
-- SESSION 14 — A picture on a squad
-- Run this once in the Supabase SQL editor. Safe to re-run.
--
-- Only the column. The file itself goes in the existing `avatars`
-- bucket, written by the server with the service role — the same
-- arrangement /api/avatar already uses for people, and for the same
-- reason: ownership is decided somewhere it can be read, rather than
-- inside a storage policy that can only say no.
--
-- 042 already grants UPDATE on squads to the owner alone, so no new
-- policy is needed. What is needed is that the grant covers the column,
-- because 042's policy is row-level and the columns were never scoped.
-- ============================================================

alter table squads add column if not exists avatar_url text;

comment on column public.squads.avatar_url is
  'Set by the owner through /api/avatar, which writes to the avatars bucket with the service role.';

-- Column-scoped, like profiles. Without this an owner could rewrite
-- their squad's slug — the thing every link already sent points at.
revoke update on public.squads from authenticated, anon;
grant update (name, description, avatar_url) on public.squads to authenticated;

-- ---------------------------------------------------------------
-- Check it:
--
--   select column_name from information_schema.column_privileges
--    where table_name = 'squads' and grantee = 'authenticated'
--      and privilege_type = 'UPDATE' order by column_name;
--   -- expect exactly: avatar_url, description, name
--   -- and NOT slug, owner_id or is_private
-- ---------------------------------------------------------------
