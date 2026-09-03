-- ============================================================
-- SESSION 12 — Table Tennis category
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- ESPN publishes no table tennis at all — every path tried returns 400
-- or 404 — so this category has cashtags and picks but no scoreboard,
-- exactly like Boxing. It won't appear under Sports, and that's correct
-- rather than broken: LEAGUES_WITH_SCORES is derived from the leagues
-- that actually have a feed.
-- ============================================================

insert into categories (name) values ('Table Tennis') on conflict (name) do nothing;
