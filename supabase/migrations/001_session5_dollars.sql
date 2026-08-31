-- ============================================================
-- SESSION 5 — Dollar amounts on picks
-- Run this once in the Supabase SQL editor (it is safe to re-run).
--
-- Adds:
--   posts.bet_type  — moneyline / spread / total
--   posts.profit    — dollars won (+) or lost (-), set when a pick is graded
--   leaderboard.total_profit — 30-day $ profit, alongside win %
--
-- Currency: as of Session 5 every pick is US dollars. The `currency`
-- column is left in place (defaulting to '$') rather than dropped, so
-- no existing data is destroyed. Once you're confident nothing depends
-- on it, the commented-out DROP at the bottom retires it for good.
-- ============================================================

-- 1. Bet type ------------------------------------------------
alter table posts add column if not exists bet_type text default 'moneyline';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'posts_bet_type_check'
  ) then
    alter table posts add constraint posts_bet_type_check
      check (bet_type in ('moneyline','spread','total'));
  end if;
end $$;

-- 2. Realized profit in dollars ------------------------------
-- NULL while a pick is pending. Set at grading time from odds x stake.
alter table posts add column if not exists profit numeric;

comment on column posts.profit is
  'Dollars won (+) or lost (-) once graded. NULL while pending. Computed from odds x stake.';

-- 3. Normalize currency to USD -------------------------------
update posts set currency = '$' where currency is distinct from '$';
alter table posts alter column currency set default '$';

-- 4. Backfill profit for picks that were already graded -------
-- American odds: +150 wins $1.50 per $1; -110 wins $1 per $1.10.
update posts
set profit = case
  when status = 'win' and odds ~ '^\+[1-9][0-9]*$'
    then round(stake * (substring(odds from 2)::numeric / 100), 2)
  when status = 'win' and odds ~ '^-[1-9][0-9]*$'
    then round(stake * (100 / nullif(substring(odds from 2)::numeric, 0)), 2)
  when status = 'loss' then round(-stake, 2)
  when status in ('push','void') then 0
end
where profit is null
  and stake is not null
  and status <> 'pending';

-- 5. Leaderboard: win % AND total $ profit --------------------
-- Columns are appended to the end of the existing view so that
-- `create or replace` is accepted (Postgres allows adding trailing
-- columns to a view, but not renaming or reordering existing ones).
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
  ) as total_profit
from profiles p
join posts on posts.author_id = p.id
where posts.created_at > now() - interval '30 days'
  and p.is_banned = false
group by p.id, p.username, p.avatar_url
having count(*) filter (where posts.status in ('win','loss')) >= 5
order by win_pct desc, graded_picks desc;

-- 6. Optional, later: retire the unused currency column.
--    Only run this once you're sure nothing reads it.
-- alter table posts drop column currency;
