-- ============================================================
-- SESSION 13 — Feed preferences
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Which sports a person actually follows, chosen at signup. Drives the
-- scoreboard rail and the news carousel on their feed.
--
-- Null and empty both mean "no preference", which is the default mix
-- everyone gets today. Nothing changes for existing accounts, and a
-- logged-out visitor never has preferences to read.
-- ============================================================

alter table profiles add column if not exists preferred_leagues text[];

comment on column profiles.preferred_leagues is
  'Up to 3 leagues chosen at signup. Null/empty = the default mix.';

-- Three, because the point is a preference rather than a filter, and an
-- unbounded array is a free-text column that happens to have brackets.
-- The subset check keeps it to leagues that actually have a feed behind
-- them, so a typo can''t produce a rail that silently returns nothing.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_preferred_leagues_check'
  ) then
    alter table profiles add constraint profiles_preferred_leagues_check check (
      preferred_leagues is null
      or (
        coalesce(array_length(preferred_leagues, 1), 0) <= 3
        and preferred_leagues <@ array[
          'NFL', 'NBA', 'MLB', 'NHL', 'College Football', 'College Basketball',
          'Soccer', 'Tennis', 'UFC', 'Boxing', 'Golf'
        ]::text[]
      )
    );
  end if;
end $$;

-- Migration 009 revoked update on profiles and granted back a specific
-- list of columns, because RLS scopes rows and not columns. A new column
-- is therefore unwritable until it is named here — without this the
-- picker would save nothing and fail silently.
grant update (username, display_name, bio, avatar_url, preferred_leagues)
  on profiles to authenticated;
