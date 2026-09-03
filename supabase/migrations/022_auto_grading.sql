-- ============================================================
-- SESSION 12 — Auto-graded picks
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Grading was self-reported. The obvious cheat (call a loss a win) was
-- never closed, only made expensive: migration 007 made selective
-- grading disqualifying, but nothing stopped someone marking a loss as
-- a win, and a record nobody can verify is not a record.
--
-- Picks are now graded against the final score of the actual game, by a
-- scheduled job, and no user can grade anything at all.
-- ============================================================

-- 1. A pick has to know which game it is about --------------------
-- It didn't. A pick stored a league and a cashtag ("$SF -3.5") and
-- nothing that identifies the fixture, so there was no key to look a
-- score up by. `line` matters just as much: a spread's number was
-- readable only by parsing it back out of the tag text, and a total's
-- number was never stored at all, so a total could not be settled even
-- in principle.
alter table posts add column if not exists game_id text;
alter table posts add column if not exists game_league text;
alter table posts add column if not exists line numeric;
alter table posts add column if not exists graded_at timestamptz;
alter table posts add column if not exists graded_by text
  check (graded_by is null or graded_by in ('auto', 'user'));

comment on column posts.game_id is
  'ESPN event/competition id this pick settles against. Null = ungradeable.';
comment on column posts.line is
  'Spread or total as a number. -3.5 on a spread, 47.5 on a total.';
comment on column posts.graded_by is
  'auto = graded from the final score. user = graded by hand before this migration.';

-- Everything already graded was graded by a person. Say so, rather than
-- letting old rows pass as machine-verified.
update posts set graded_by = 'user'
 where status <> 'pending' and graded_by is null;

-- The job looks up pending picks that carry a game. Without this it is a
-- sequential scan of every post on every run.
create index if not exists posts_pending_game_idx
  on posts (game_league, game_id)
  where status = 'pending' and game_id is not null;

-- 2. Nobody grades their own picks -------------------------------
-- Migration 004 granted update (status, profit) to authenticated so the
-- grade buttons could work. That grant is the self-reporting hole, so it
-- goes. The scheduled job writes with the service role, which bypasses
-- RLS and column grants entirely.
--
-- Authors keep no update rights on posts at all, which is what 004
-- already established for every other column.
revoke update (status, profit) on posts from authenticated;
revoke update on posts from authenticated;
revoke update on posts from anon;

-- 3. The leaderboard counts only what a scoreboard can settle -----
-- Moneyline, spread and total are decided by the final score. Player
-- props, team props, parlays and futures are not: no scoreline tells you
-- whether a parlay's third leg hit. Those stay postable and stay on
-- profiles, but they can't count toward a rank that claims to be
-- verified.
--
-- The 80%-graded rule from migration 007 is gone with them. It existed
-- to punish people who never graded their losses; when a machine does
-- the grading, everyone scores 100% on it and it describes nothing. The
-- 5-pick minimum stays, because a 2-1 record still isn't a record.
create or replace view leaderboard as
select
  p.id as user_id,
  p.username,
  p.avatar_url,
  count(*) filter (where posts.status = 'win') as wins,
  count(*) filter (where posts.status = 'loss') as losses,
  count(*) filter (where posts.status = 'push') as pushes,
  count(*) filter (where posts.status in ('win','loss')) as graded_picks,
  round(
    100.0 * count(*) filter (where posts.status = 'win')
    / nullif(count(*) filter (where posts.status in ('win','loss')), 0), 1
  ) as win_pct,
  round(
    coalesce(sum(posts.profit) filter (where posts.status <> 'pending'), 0), 2
  ) as total_profit,
  -- Gradeable picks the job hasn't settled a week after the game. Should
  -- be zero; if it isn't, the job is failing rather than someone cheating.
  count(*) filter (
    where posts.status = 'pending'
      and posts.created_at < now() - interval '7 days'
  ) as ungraded,
  round(
    100.0 * count(*) filter (where posts.status <> 'pending')
    / nullif(count(*) filter (
        where posts.status <> 'pending'
           or posts.created_at < now() - interval '7 days'
      ), 0), 0
  ) as graded_pct
from profiles p
join posts on posts.author_id = p.id
where posts.created_at > now() - interval '30 days'
  and p.is_banned = false
  and posts.post_kind = 'pick'
  -- Only bets a final score can settle, and only ones tied to a fixture.
  and posts.bet_type in ('moneyline', 'spread', 'total')
  and posts.game_id is not null
group by p.id, p.username, p.avatar_url
having count(*) filter (where posts.status in ('win','loss')) >= 5
order by win_pct desc, graded_picks desc;

alter view leaderboard set (security_invoker = on);
