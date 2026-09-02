-- ============================================================
-- Neutral takes
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Someone should be able to post an opinion about a game without being
-- forced onto a side. Picks are excluded: money is on a side by
-- definition, so a neutral pick is a contradiction rather than a
-- preference.
-- ============================================================

alter table posts drop constraint if exists posts_sentiment_check;
alter table posts add constraint posts_sentiment_check
  check (sentiment in ('backing','fading','over','under','neutral'));

-- Neutral belongs to takes only.
alter table posts drop constraint if exists posts_neutral_takes_only_check;
alter table posts add constraint posts_neutral_takes_only_check
  check (sentiment <> 'neutral' or post_kind = 'take');
