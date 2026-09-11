-- ============================================================
-- SESSION 16 — Late entries become a category, not a void
-- Run this once in the Supabase SQL editor. Safe to re-run.
--
-- A pick posted after the game got going used to be voided: settled as
-- neither win nor loss, touching nobody's record. That was the cautious
-- choice and it throws away a real result. Somebody who posts at 20
-- minutes still called something, and the scoreboard still settles it —
-- it just isn't the same claim as a pick made before the whistle, and
-- mixing the two would quietly inflate a record.
--
-- So late picks are graded like any other and kept apart: counted, shown
-- on their own tab, and excluded from the record and the leaderboard.
-- The main record keeps meaning exactly what it meant before.
--
-- The grace also moves from 5 minutes to 15. Five was tight enough to
-- catch somebody who opened the form before kick-off and typed slowly.
-- ============================================================

alter table posts add column if not exists late_entry boolean not null default false;

comment on column public.posts.late_entry is
  'Posted after the grace window following kick-off. Graded normally but excluded from the record and the leaderboard, and shown on its own tab.';

-- The record query filters on this, so it wants an index for the common
-- case: somebody''s picks that DO count.
create index if not exists posts_author_not_late_idx
  on posts (author_id, created_at desc)
  where late_entry = false;

-- Picks already voided as late entries stay voided. Regrading them would
-- rewrite settled history from a rule that didn''t exist when they were
-- posted, and this site''s whole claim is that a posted record doesn''t
-- move under you. New picks get the new rule.

-- ------------------------------------------------------------
-- The leaderboard view has to learn the same rule.
--
-- Everything below is migration **038**'s definition verbatim, with ONE
-- line added: `and posts.late_entry = false`.
--
-- The first attempt at this rebuilt from 037 and Postgres refused it —
-- "cannot drop columns from view". 038 had since appended `p.is_bot`,
-- dropped the `p.is_bot = false` filter so the house model appears on
-- the board, and 015 had set security_invoker. Rebuilding from 037 would
-- have silently undone all three; the error was the only thing that
-- caught it.
--
-- So: CREATE OR REPLACE VIEW may only append columns, never drop or
-- reorder them. **Before touching this view, find the newest migration
-- that defines it** — list every file mentioning `leaderboard` rather
-- than grepping for the CREATE line, which is how 038 got missed.
-- ------------------------------------------------------------

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
  -- The contest page reads this to leave the house out.
  p.is_bot
from profiles p
join posts on posts.author_id = p.id
where posts.created_at > now() - interval '30 days'
  and p.is_banned = false
  and posts.post_kind = 'pick'
  -- The one new line. A late entry is graded, but it is not a claim made
  -- before the whistle and doesn't belong in a ranking against ones that
  -- were.
  and posts.late_entry = false
  and posts.bet_type in (
    'moneyline', 'spread', 'total',
    'first_inning', 'first_five', 'first_five_ml',
    'first_half', 'first_half_ml'
  )
  and posts.game_id is not null
group by p.id, p.username, p.avatar_url, p.badges, p.is_bot
having count(*) filter (where posts.status in ('win','loss')) >= 5
order by win_pct desc, graded_picks desc;

-- Set by 015 and easy to lose in a rebuild: the view runs with the
-- caller's permissions, not the definer's.
alter view leaderboard set (security_invoker = on);
