-- ============================================================
-- SESSION 17 — Bets on part of a game, and money that has to be real
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Two changes that belong together, because both are about a number on
-- a record meaning something.
-- ============================================================

-- 1. Bets on part of a game -------------------------------------
-- The scoreboard already carries innings for baseball and quarters for
-- football, so these settle from the same feed as everything else. No
-- new data source, no self-reporting.
--
-- Home runs and other player props are deliberately absent: they need a
-- box score rather than a scoreline, and a bet type that can never be
-- graded is worse than one that doesn't exist.
alter table posts drop constraint if exists posts_bet_type_check;
alter table posts add constraint posts_bet_type_check
  check (bet_type in (
    'moneyline','spread','total',
    'first_inning','first_five','first_half',
    'player_prop','team_prop','parlay','future','other'
  ));

-- 2. A price nobody posted buys nothing -------------------------
-- Odds were free text, so "$5 to win $1,000,000" was a legal pick and
-- the profit on that record followed from it. Picks taken from a real
-- market keep their money; hand-entered ones keep their result and lose
-- the payout, because there is no way to check the price.
--
-- Existing custom picks are cleared rather than left standing: they were
-- entered under the old rule, and leaving them would mean the profit
-- column meant one thing before today and another after.
update posts
   set odds = null, stake = null, potential_payout = null, profit = null
 where post_kind = 'pick'
   and odds_source = 'custom';

-- 3. The leaderboard counts the new types -----------------------
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
  -- Only picks made at a posted price carry money, so this is a sum of
  -- payouts that could be checked against a book.
  round(
    coalesce(sum(posts.profit) filter (where posts.status <> 'pending'), 0), 2
  ) as total_profit,
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
  and posts.bet_type in (
    'moneyline', 'spread', 'total',
    'first_inning', 'first_five', 'first_half'
  )
  and posts.game_id is not null
group by p.id, p.username, p.avatar_url
having count(*) filter (where posts.status in ('win','loss')) >= 5
order by win_pct desc, graded_picks desc;

alter view leaderboard set (security_invoker = on);
