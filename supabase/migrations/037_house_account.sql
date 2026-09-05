-- ============================================================
-- SESSION 21b — The house account
-- Run this once in the Supabase SQL editor, BEFORE pushing.
--
-- One account, clearly marked, posting picks on upcoming games so the
-- feed isn't empty while the site is new. It is not a person and the
-- site must never suggest it is: the flag is public, the label renders
-- on every post it makes, and it is barred from the leaderboard and the
-- contest.
--
-- The point is that a record here means something. An automated account
-- competing for a cash prize against people, or padding a leaderboard
-- that claims to be verified, would cost more than a full feed is worth.
-- ============================================================

alter table profiles add column if not exists is_bot boolean not null default false;

comment on column profiles.is_bot is
  'Automated account. Labelled on every post and excluded from the leaderboard and contest.';

-- The leaderboard is the contest standings too — app/contest reads this
-- same view — so one exclusion covers both.
--
-- Identical column list to 030, in the same order: create or replace can
-- only append columns, and reordering them fails outright.
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
  ) as graded_pct
from profiles p
join posts on posts.author_id = p.id
where posts.created_at > now() - interval '30 days'
  and p.is_banned = false
  and p.is_bot = false
  and posts.post_kind = 'pick'
  and posts.bet_type in (
    'moneyline', 'spread', 'total',
    'first_inning', 'first_five', 'first_five_ml',
    'first_half', 'first_half_ml'
  )
  and posts.game_id is not null
group by p.id, p.username, p.avatar_url
having count(*) filter (where posts.status in ('win','loss')) >= 5
order by win_pct desc, graded_picks desc;

alter view leaderboard set (security_invoker = on);

-- Mark the account. Create it through the normal signup flow first so it
-- has a real auth user, then run this with its username.
--   update profiles set is_bot = true where username = 'gwuap';
