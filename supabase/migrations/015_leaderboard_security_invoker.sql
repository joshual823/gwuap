-- ============================================================
-- SESSION 11 — Make the leaderboard view respect RLS
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Supabase's linter flags this as "Security Definer View". A view
-- created by the postgres role runs with the owner's privileges, so it
-- reads through RLS on the tables underneath it.
--
-- Today that leaks nothing: profiles and posts are both publicly
-- readable by policy, and the leaderboard is aggregates over public
-- data. The reason to fix it is latency of harm — if picks or profiles
-- are ever made private, this view would keep serving them and nothing
-- would flag it.
--
-- security_invoker makes the view run as whoever queries it. Behaviour
-- is unchanged while the underlying policies stay public.
-- ============================================================

alter view leaderboard set (security_invoker = on);
