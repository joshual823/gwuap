-- ============================================================
-- SESSION 14 — Head-to-head challenges
-- Run this once in the Supabase SQL editor. Safe to re-run.
--
-- "I'll take the over, you take the under, the scoreboard settles it."
-- One person picks a side and gets a link; whoever opens it takes the
-- other side. It's the only thing on this site aimed at somebody who
-- isn't on it yet.
--
-- The important design decision is what a challenge *isn't*: it has no
-- grading of its own. Accepting one creates a normal pick for each side,
-- and the existing hourly job settles those the way it settles
-- everything else. So a challenge counts toward both people's records,
-- can't be graded by either of them, and needs no second code path that
-- could disagree with the first.
--
-- That's why both post ids live here. The result is derived by reading
-- the two posts, never stored — a stored winner is a number that can
-- drift from the picks it claims to summarise.
-- ============================================================

create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  -- Short, for a link somebody types into a group chat.
  code text not null unique check (code ~ '^[a-z0-9]{6,12}$'),

  challenger_id uuid not null references profiles(id) on delete cascade,
  challenger_post_id uuid not null references posts(id) on delete cascade,

  -- Null until somebody takes it.
  opponent_id uuid references profiles(id) on delete set null,
  opponent_post_id uuid references posts(id) on delete set null,

  -- Everything needed to build the opponent's pick when they accept, so
  -- the accept step doesn't have to re-derive a market from a game feed
  -- that may have moved on since.
  game_id text not null,
  game_league text not null,
  game_starts_at timestamptz,
  bet_type text not null,
  line numeric,
  opponent_tag text not null,
  opponent_tag2 text,
  opponent_sentiment text not null,
  opponent_odds text,
  odds_book text,
  category_id bigint references categories(id),

  created_at timestamptz default now(),
  accepted_at timestamptz,

  -- Nobody plays themselves.
  constraint challenge_needs_two_people check (opponent_id is null or opponent_id <> challenger_id)
);

create index if not exists challenges_challenger_idx on challenges (challenger_id, created_at desc);
create index if not exists challenges_opponent_idx on challenges (opponent_id, created_at desc);
create index if not exists challenges_open_idx on challenges (created_at desc) where opponent_id is null;

alter table challenges enable row level security;

-- ---- who can see one ------------------------------------------
-- Anyone, signed in or not. This is the one table that has to be
-- readable by a stranger: the entire point is that somebody who has
-- never heard of this site opens a link and sees what they're being
-- asked to take. Gating it behind signup would mean signing up to find
-- out what you were signing up for.
--
-- What it exposes is two usernames, a fixture and a side — the same
-- things a public post already shows.
drop policy if exists "a challenge is readable by anyone" on challenges;
create policy "a challenge is readable by anyone" on challenges
  for select using (true);

drop policy if exists "start a challenge as yourself" on challenges;
create policy "start a challenge as yourself" on challenges
  for insert to authenticated with check (auth.uid() = challenger_id);

-- Accepting is the only update anyone can make, and only to a challenge
-- nobody has taken. `using` tests the row as it stands — open, and not
-- your own — and `with check` tests it afterwards, so the accepter can
-- only write themselves in.
drop policy if exists "take an open challenge" on challenges;
create policy "take an open challenge" on challenges
  for update to authenticated
  using (opponent_id is null and challenger_id <> auth.uid())
  with check (opponent_id = auth.uid());

-- Which columns, specifically. Without this an accepter could rewrite
-- the market they were asked to take before taking it.
revoke update on challenges from authenticated, anon;
grant update (opponent_id, opponent_post_id, accepted_at) on challenges to authenticated;

-- Calling it off, while it's still yours to call off.
drop policy if exists "cancel your own open challenge" on challenges;
create policy "cancel your own open challenge" on challenges
  for delete to authenticated
  using (auth.uid() = challenger_id and opponent_id is null);

-- Same shape of throttle as everything else that accepts writes. Ten a
-- day is more than anyone will send and few enough that the table can't
-- be used to spray links.
drop trigger if exists challenges_rate_limit on challenges;
create trigger challenges_rate_limit before insert on challenges
for each row execute function rate_limit_guard('challenger_id', '10', '24 hours');

comment on table challenges is
  'Head-to-head on one market. Both sides are ordinary picks graded by the usual job; '
  'the result is derived from those two posts and never stored here.';

-- ---------------------------------------------------------------
-- Check it worked:
--
--   select count(*) from challenges;   -- 0, and no error
--
--   -- the accepter can only write these three columns:
--   select column_name from information_schema.column_privileges
--    where table_name = 'challenges' and grantee = 'authenticated'
--      and privilege_type = 'UPDATE' order by column_name;
--   -- expect exactly: accepted_at, opponent_id, opponent_post_id
--
-- Then make one on the site and open its link in a private window: it
-- should be readable while signed out, and only takeable once signed in.
-- ---------------------------------------------------------------
