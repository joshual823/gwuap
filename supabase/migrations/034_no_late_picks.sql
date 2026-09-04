-- ============================================================
-- SESSION 20 — A pick has to be in before the game starts
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- 027 stopped a losing pick being deleted after kick-off. It never
-- stopped one being *created* after kick-off, which is the same cheat
-- from the other end and a cheaper one: wait until the result is
-- obvious, post the winner, collect a perfect record. Ten seconds before
-- the final whistle is enough.
--
-- This trigger is the front door. It is NOT the real defence, because
-- game_starts_at is written by whoever posts the pick — a forged one
-- sails straight through. The real check is in the grading job, which
-- compares the row's created_at against the kick-off ESPN reports and
-- refuses to settle anything posted after it. That one can't be lied to.
--
-- Both exist because they fail differently: this one gives an honest
-- person an error at the moment they'd be confused, and the grader
-- catches everyone who went around it.
-- ============================================================

create or replace function block_late_picks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.post_kind = 'pick'
     and new.game_starts_at is not null
     and now() >= new.game_starts_at then
    raise exception 'This game has already started. Picks have to be in before it does.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists posts_block_late_picks on posts;
create trigger posts_block_late_picks
before insert on posts
for each row execute function block_late_picks();

-- Editing a pick onto a different game after kick-off would be the same
-- hole wearing a hat.
drop trigger if exists posts_block_late_pick_edits on posts;
create trigger posts_block_late_pick_edits
before update of game_id, game_starts_at, bet_type, sentiment, line, tag, tag2 on posts
for each row execute function block_late_picks();
