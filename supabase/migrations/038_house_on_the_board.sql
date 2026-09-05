-- ============================================================
-- SESSION 21c — The house account joins the leaderboard
-- Run this once in the Supabase SQL editor, BEFORE pushing.
--
-- 037 kept it off the board entirely, because the board and the contest
-- standings are the same view and an automated account must not compete
-- for a cash prize. Josh wants its record visible, which is a different
-- question and a better answer: a model whose picks are graded in public
-- alongside everyone else's is the clearest possible demonstration that
-- nobody here edits their own record.
--
-- So the view carries everyone and exposes is_bot as a column. The
-- leaderboard shows it, labelled. The contest page filters it out, which
-- is the only place the exclusion actually matters.
--
-- is_bot goes LAST, after badges. CREATE OR REPLACE VIEW may only
-- append — 037 learned that the hard way by rebuilding from a stale
-- definition and dropping p.badges.
-- ============================================================

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
    coalesce(sum(posts.profit) filter (
      where posts.status <> 'pending' and posts.odds_source = 'book'
    ), 0), 2
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
  ) as graded_pct,
  p.badges,
  -- New, and last. The contest page reads this to leave the house out.
  p.is_bot
from profiles p
join posts on posts.author_id = p.id
where posts.created_at > now() - interval '30 days'
  and p.is_banned = false
  and posts.post_kind = 'pick'
  and posts.bet_type in (
    'moneyline', 'spread', 'total',
    'first_inning', 'first_five', 'first_five_ml',
    'first_half', 'first_half_ml'
  )
  and posts.game_id is not null
group by p.id, p.username, p.avatar_url, p.badges, p.is_bot
having count(*) filter (where posts.status in ('win','loss')) >= 5
order by win_pct desc, graded_picks desc;

alter view leaderboard set (security_invoker = on);
