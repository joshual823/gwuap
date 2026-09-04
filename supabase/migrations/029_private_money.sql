-- ============================================================
-- SESSION 17b — Keep your own numbers, without claiming them publicly
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Migration 028 removed money from hand-priced picks entirely, which was
-- too blunt: someone tracking their own real bankroll lost the record
-- they were keeping, because we couldn't verify a price they never asked
-- us to believe.
--
-- So the money comes back, and the claim is what's controlled. A price
-- from a book is public and counts. A hand-entered one is yours, hidden
-- from everyone else by default, and shown as self-reported if you
-- choose to publish it. Either way it never touches the leaderboard.
-- ============================================================

alter table posts add column if not exists money_public boolean not null default false;

comment on column posts.money_public is
  'Custom-priced picks only. False = the odds and stake are the author''s own reference. True = shown to everyone, labelled self-reported.';

-- Picks priced by a book were always public and always countable.
update posts set money_public = true
 where post_kind = 'pick' and odds_source = 'book';

-- The leaderboard sums only money that came from a posted price.
-- Self-reported figures are a personal record, not a ranking.
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
    'first_inning', 'first_five', 'first_half'
  )
  and posts.game_id is not null
group by p.id, p.username, p.avatar_url
having count(*) filter (where posts.status in ('win','loss')) >= 5
order by win_pct desc, graded_picks desc;

alter view leaderboard set (security_invoker = on);
