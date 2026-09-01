-- ============================================================
-- SESSION 6 — More bet types + emoji reactions
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Adds:
--   posts.bet_type   — widened from 3 options to 8
--   likes.emoji      — which reaction, defaulting to a heart
--   an UPDATE policy on likes, required for changing a reaction
-- ============================================================

-- 1. Widen bet types ------------------------------------------
-- A "total" IS the over/under, so there's no separate O/U value.
-- Player and team props are broken out because lumping them into
-- "other" would tell us nothing when we look back at what people bet.
alter table posts drop constraint if exists posts_bet_type_check;
alter table posts add constraint posts_bet_type_check
  check (bet_type in (
    'moneyline','spread','total',
    'player_prop','team_prop','parlay','future','other'
  ));

-- 2. Reactions -------------------------------------------------
-- The likes table stays keyed on (user_id, post_id), so one reaction
-- per person per post: picking a new emoji replaces the old one rather
-- than stacking. Existing likes backfill to a heart.
alter table likes add column if not exists emoji text not null default '♥';

-- Length guard: RLS lets any signed-in user write this column, and it
-- renders on the post card. Capping it keeps someone from using a
-- "reaction" as a free advertising slot.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'likes_emoji_len_check') then
    alter table likes add constraint likes_emoji_len_check
      check (char_length(emoji) between 1 and 8);
  end if;
end $$;

comment on column likes.emoji is
  'Reaction emoji. Defaults to a heart, which is what a plain tap sends.';

-- 3. Changing a reaction is an UPDATE ---------------------------
-- The original schema only had INSERT and DELETE policies on likes, so
-- the upsert used to switch reactions would be rejected by RLS without
-- this.
drop policy if exists "users update own likes" on likes;
create policy "users update own likes" on likes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
