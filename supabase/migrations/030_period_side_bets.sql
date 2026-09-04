-- ============================================================
-- SESSION 17c — Ask these bets the way people say them
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- "Over/under 0.5 runs in the first inning" is what NRFI technically is
-- and not how anyone says it. And a first-five or first-half bet is
-- usually on who's ahead at the break, not on a total — which is a
-- different question and needs a third answer, because a tie at the
-- break is a real result rather than a push.
-- ============================================================

alter table posts drop constraint if exists posts_bet_type_check;
alter table posts add constraint posts_bet_type_check
  check (bet_type in (
    'moneyline','spread','total',
    'first_inning','first_five','first_five_ml',
    'first_half','first_half_ml',
    'player_prop','team_prop','parlay','future','other'
  ));

-- 'tie' joins the directions. It only means anything on a bet about who
-- leads at a break; everywhere else there is no such outcome.
alter table posts drop constraint if exists posts_sentiment_check;
alter table posts add constraint posts_sentiment_check
  check (sentiment in ('backing','fading','over','under','neutral','tie'));

-- Existing rule, restated because the constraint above replaced the one
-- that carried it: neutral is a take's stance, not a pick's.
alter table posts drop constraint if exists posts_neutral_takes_only_check;
alter table posts add constraint posts_neutral_takes_only_check
  check (sentiment <> 'neutral' or post_kind = 'take');

-- The leaderboard counts the two new types.
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
