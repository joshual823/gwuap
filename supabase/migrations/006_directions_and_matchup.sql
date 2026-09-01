-- ============================================================
-- SESSION 8c — Over/Under directions + matchup cashtags
-- Run this once in the Supabase SQL editor (safe to re-run).
-- ============================================================

-- 1. Over / Under -----------------------------------------------
-- Backing and Fading map onto a team. They don't map onto a total —
-- you're not backing the Giants, you're taking the Over on a game.
-- Same for player and team props. Rather than relabel Backing as "Over"
-- in the UI and store a lie, the column now holds the real value, so
-- Trending can say "68% Over on $SF" and mean it.
alter table posts drop constraint if exists posts_sentiment_check;
alter table posts add constraint posts_sentiment_check
  check (sentiment in ('backing','fading','over','under'));

-- 2. Matchup cashtag ---------------------------------------------
-- A total belongs to a game, not a team, so one cashtag is lossy.
-- The optional second tag lets a Giants/Padres total surface under
-- both teams.
alter table posts add column if not exists tag2 text;

comment on column posts.tag2 is
  'Optional opponent cashtag. Used for totals, where the bet is on the game rather than either team.';
