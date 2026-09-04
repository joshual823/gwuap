-- ============================================================
-- SESSION 18 — Badges
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Standing that can't be bought or backdated. "Founding member" is
-- awarded to the first 200 accounts and then never again — the scarcity
-- is real, which is the only reason it's worth anything. "Week 1
-- champion" is awarded once, to whoever tops the board when the contest
-- closes.
--
-- Deliberately NOT writable by the account it belongs to: a badge you
-- can give yourself is a decoration, not a record.
-- ============================================================

alter table profiles add column if not exists badges text[] not null default '{}';

comment on column profiles.badges is
  'Earned, permanent. Never granted to authenticated — set by trigger or by an admin.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_badges_check') then
    alter table profiles add constraint profiles_badges_check
      check (badges <@ array['founding', 'week1_champion']::text[]);
  end if;
end $$;

create index if not exists profiles_badges_idx on profiles using gin (badges);

-- ---- Founding member, awarded automatically ------------------
-- A trigger rather than application code, because the cap has to hold
-- however an account is created. Two simultaneous signups at the
-- boundary could both slip through; at 200 that errs generous by one,
-- which is the right direction to be wrong in.
create or replace function grant_founding_badge()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from profiles) < 200 then
    new.badges := array_append(coalesce(new.badges, '{}'), 'founding');
  end if;
  return new;
end $$;

drop trigger if exists profiles_founding_badge on profiles;
create trigger profiles_founding_badge before insert on profiles
for each row execute function grant_founding_badge();

-- Everyone who signed up before this existed is, by definition, early.
update profiles p
   set badges = array_append(p.badges, 'founding')
 where not ('founding' = any(p.badges))
   and p.id in (select id from profiles order by created_at limit 200);

-- ---- Week 1 champion -----------------------------------------
-- Awarded by hand once the contest closes, because who won is a judgement
-- about a leaderboard at a moment rather than something to infer live.
-- After 15 September, read the top row of /leaderboard and run:
--
--   update profiles
--      set badges = array_append(badges, 'week1_champion')
--    where username = 'THE_WINNER'
--      and not ('week1_champion' = any(badges));
--
-- Nothing else grants it. The column is not in the authenticated update
-- grant below, so nobody can award themselves one.

-- Restated in full: migration 009 revoked update on profiles and grants
-- back a named list, and any column missing from it is unwritable.
-- badges is deliberately absent.
grant update (username, display_name, bio, avatar_url, preferred_leagues)
  on profiles to authenticated;

-- ---- The board carries them too ------------------------------
-- Same view as migration 030, plus badges appended at the end. Restated
-- in full because a view can't be altered a column at a time, and the
-- new column has to go last: CREATE OR REPLACE VIEW only appends.
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
  -- Last on purpose. CREATE OR REPLACE VIEW may only append columns —
  -- inserting one anywhere else renames every column after it, and
  -- Postgres refuses with "cannot change name of view column".
  p.badges
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
group by p.id, p.username, p.avatar_url, p.badges
having count(*) filter (where posts.status in ('win','loss')) >= 5
order by win_pct desc, graded_picks desc;

alter view leaderboard set (security_invoker = on);
