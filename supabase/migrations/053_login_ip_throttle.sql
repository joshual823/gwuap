-- ============================================================
-- SESSION 18 — Throttle login by source as well as by username
-- Run this once in the Supabase SQL editor. Safe to re-run.
--
-- The audit on 13 Sep found the one real hole in /api/login: the
-- throttle counts attempts per *username*, ten per fifteen minutes. That
-- stops somebody hammering one account and does nothing at all about the
-- attack that works at scale — one likely password tried against a
-- thousand usernames, where every username gets its own fresh bucket.
--
-- Harmless today with eight accounts. It gets worse in exact proportion
-- to how well the advertising works, which is the wrong thing for a
-- weakness to be indexed to.
--
-- So a second counter, on where the attempt came from.
--
-- The address is stored as a SHA-256 hash, never in the clear. Counting
-- needs only that two attempts match, which a hash gives; keeping the
-- addresses themselves would mean holding a log of who tried to sign in
-- from where, and this site has no use for that. Rows are deleted within
-- the hour regardless.
-- ============================================================

alter table login_attempts add column if not exists ip_key text;

create index if not exists login_attempts_ip_idx
  on login_attempts (ip_key, created_at desc);

comment on column public.login_attempts.ip_key is
  'SHA-256 of the request address. Hashed because counting only needs equality, and the raw addresses are not ours to keep.';

-- ---------------------------------------------------------------
-- Check it:
--
--   select count(*) from login_attempts;   -- unchanged, no error
--
--   -- the column exists and is nullable, so rows written by the old
--   -- code path (before this deploys) are still valid:
--   insert into login_attempts (username_key) values ('migration-check');
--   delete from login_attempts where username_key = 'migration-check';
-- ---------------------------------------------------------------
