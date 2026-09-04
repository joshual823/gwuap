-- ============================================================
-- SESSION 20b — A late pick posts, it just doesn't count
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- 034 refused to insert a pick once the game had started. That was the
-- wrong call: it makes a pick posted a minute after the first pitch
-- vanish with an error, when the honest version of that is somebody
-- tapping Post as the whistle goes.
--
-- So the trigger goes. A pick on a game already under way is allowed,
-- and the grading job decides what it's worth: inside five minutes it
-- grades normally, after that it voids — neither a win nor a loss, on
-- nobody's record, counted nowhere. The form says so before it's posted.
--
-- Nothing here relies on being enforced in the database, because it
-- can't be: game_starts_at is written by whoever posts the pick. The
-- grading job compares against the kick-off ESPN reports instead, which
-- is the only version of that time nobody here controls.
-- ============================================================

drop trigger if exists posts_block_late_picks on posts;
drop trigger if exists posts_block_late_pick_edits on posts;
drop function if exists block_late_picks();
