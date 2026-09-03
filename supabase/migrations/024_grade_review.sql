-- ============================================================
-- SESSION 14 — Manual review for picks the machine can't settle
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Auto-grading refuses anything it isn't certain about, which was the
-- right call — but a refused pick just sat pending and told nobody. With
-- a cash prize attached, a pick that never grades and never explains
-- itself doesn't read as caution, it reads as the contest being rigged.
--
-- The job now writes down why it couldn't settle a pick, and those go to
-- a review queue in the admin panel.
-- ============================================================

alter table posts add column if not exists grade_note text;
alter table posts add column if not exists grade_checked_at timestamptz;

comment on column posts.grade_note is
  'Why auto-grading refused this pick. Null once graded, or while simply waiting on the game.';

-- 'admin' joins 'auto' and 'user'. A record settled by hand is not the
-- same claim as one settled by a scoreboard, and the leaderboard should
-- always be able to tell them apart.
alter table posts drop constraint if exists posts_graded_by_check;
alter table posts add constraint posts_graded_by_check
  check (graded_by is null or graded_by in ('auto', 'user', 'admin'));

-- The queue reads exactly this.
create index if not exists posts_grade_review_idx
  on posts (grade_checked_at desc)
  where status = 'pending' and grade_note is not null;

-- No new grants. Manual grading goes through a server route holding the
-- service role, which checks is_admin and refuses an admin's own picks.
-- Granting update back to `authenticated` here would reopen exactly the
-- self-grading hole migration 022 closed.
