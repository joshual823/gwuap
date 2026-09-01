-- ============================================================
-- SESSION 8f — Close the selective-grading hole
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- The obvious cheat is marking a loss as a win. The easy one is never
-- grading losses at all: the leaderboard only counted picks with a
-- win/loss status, so posting 50 picks, grading the 20 winners and
-- leaving 30 pending produced a 100% win rate without a single lie.
--
-- Two new columns make that visible, and a HAVING clause makes it
-- disqualifying.
-- ============================================================

-- A pick still pending 7 days after posting has almost certainly
-- resolved in the real world. Recent pending picks aren't counted
-- against anyone — the game may not have finished.
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
  -- Picks old enough to have resolved that were never graded.
  count(*) filter (
    where posts.status = 'pending'
      and posts.created_at < now() - interval '7 days'
  ) as ungraded,
  -- Of the picks old enough to have resolved, how many were graded.
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
group by p.id, p.username, p.avatar_url
having count(*) filter (where posts.status in ('win','loss')) >= 5
   -- Grade at least 80% of your resolved picks or you don't rank.
   -- coalesce covers someone whose picks are all still recent.
   and coalesce(
     round(
       100.0 * count(*) filter (where posts.status <> 'pending')
       / nullif(count(*) filter (
           where posts.status <> 'pending'
              or posts.created_at < now() - interval '7 days'
         ), 0), 0
     ), 100) >= 80
order by win_pct desc, graded_picks desc;
