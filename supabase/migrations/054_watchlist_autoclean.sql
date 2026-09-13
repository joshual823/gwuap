-- ============================================================
-- SESSION 18 — Let the watchlist tidy itself
-- Run this once in the Supabase SQL editor. Safe to re-run.
--
-- A starred game stays starred forever. Pin a few over a weekend and the
-- watchlist is mostly last week by Wednesday — the page still works, it
-- just stops being worth opening, which is the quiet way a feature dies.
--
-- So: an opt-in setting that drops finished games a day after they end.
--
-- Two deliberate limits:
--
--   * **Only games.** `kind = 'game'` rows point at one fixture and have
--     a natural end. A watched *team* has none, and silently unfollowing
--     somebody's team because it hasn't played this week would be a bug
--     wearing a feature's clothes. Tickers are never touched.
--
--   * **Off by default.** Deleting somebody's rows is not a sensible
--     default, and the toggle only appears once there's something in the
--     list to tidy — a switch for a problem you don't have yet is noise.
-- ============================================================

-- When the fixture starts. Needed because a game that finished two days
-- ago has usually rolled off ESPN's scoreboard entirely, so "is it over?"
-- can't be asked of the API after the fact — but it can be worked out
-- from the kickoff we knew at the time.
alter table watchlist add column if not exists starts_at timestamptz;

comment on column public.watchlist.starts_at is
  'Kickoff of a kind=game row, captured when it is starred. Null for tickers, and for game rows pinned before this migration.';

-- The setting itself.
alter table profiles add column if not exists watchlist_autoclean boolean not null default false;

comment on column public.profiles.watchlist_autoclean is
  'Opt-in: drop starred games about a day after they finish. Never touches watched teams.';

-- Writable by its owner, like the other preferences. The full list is
-- restated rather than added to, because `grant update (a, b)` replaces
-- nothing — it accumulates — and restating it is the only way to read
-- this file and know what the grant actually is.
revoke update on public.profiles from authenticated;
revoke update on public.profiles from anon;
grant update (username, display_name, bio, avatar_url, preferred_leagues,
              email_notifications, last_seen_at, watchlist_autoclean)
  on public.profiles to authenticated;

-- Starring a game now records its kickoff, so the insert grant needs it.
-- Same restatement rule as above.
revoke insert on public.watchlist from authenticated, anon;
grant insert (user_id, ticker, league, kind, starts_at)
  on public.watchlist to authenticated;

-- ---------------------------------------------------------------
-- Check it:
--
--   select count(*) from watchlist;   -- unchanged, no error
--   select username, watchlist_autoclean from profiles limit 3;  -- all false
--
--   -- a ticker row still writes with no starts_at:
--   -- (run as a signed-in user, not the service role)
--   insert into watchlist (user_id, ticker, league, kind)
--   values (auth.uid(), 'MIGCHK', 'NFL', 'ticker');
--   delete from watchlist where ticker = 'MIGCHK';
-- ---------------------------------------------------------------
