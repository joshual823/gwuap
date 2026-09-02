-- ============================================================
-- Watch a game, not just a team
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- A watchlist row is now either a ticker (team, player, fighter) or a
-- single fixture. Games are stored with `ticker` holding "LEAGUE:id",
-- which keeps the existing primary key doing its job.
-- ============================================================

alter table watchlist add column if not exists kind text not null default 'ticker';

alter table watchlist drop constraint if exists watchlist_kind_check;
alter table watchlist add constraint watchlist_kind_check
  check (kind in ('ticker', 'game'));
