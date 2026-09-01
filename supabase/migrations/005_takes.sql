-- ============================================================
-- SESSION 8b — Takes: posts with no bet attached
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- A "take" is a StockTwits-style post: a cashtag, a direction, and
-- something to say. No odds, no stake, no money. A "pick" is what the
-- site already had. Existing posts all become picks.
-- ============================================================

alter table posts add column if not exists post_kind text not null default 'pick';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'posts_post_kind_check') then
    alter table posts add constraint posts_post_kind_check
      check (post_kind in ('take','pick'));
  end if;

  -- A take must never be gradeable. Hiding the buttons in the UI isn't
  -- enough — the anon key ships in every browser, and if a take could be
  -- marked a win it would enter the leaderboard as a free victory and
  -- make every record meaningless.
  if not exists (select 1 from pg_constraint where conname = 'posts_take_not_graded_check') then
    alter table posts add constraint posts_take_not_graded_check
      check (post_kind = 'pick' or status = 'pending');
  end if;

  -- And a take carries no money, for the same reason.
  if not exists (select 1 from pg_constraint where conname = 'posts_take_no_money_check') then
    alter table posts add constraint posts_take_no_money_check
      check (
        post_kind = 'pick'
        or (odds is null and stake is null and profit is null and potential_payout is null)
      );
  end if;
end $$;

comment on column posts.post_kind is
  'take = cashtag + sentiment + text, no bet. pick = a real wager with odds and stake.';

-- Belt and braces: takes are always pending so they already fall outside
-- the win/loss counts, but say it explicitly so the leaderboard can never
-- drift.
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
  and posts.post_kind = 'pick'
group by p.id, p.username, p.avatar_url
having count(*) filter (where posts.status in ('win','loss')) >= 5
order by win_pct desc, graded_picks desc;
