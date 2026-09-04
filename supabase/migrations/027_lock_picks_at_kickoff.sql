-- ============================================================
-- SESSION 16 — A pick can't be withdrawn once the game starts
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Auto-grading closed the obvious cheat: you can't mark a loss as a win.
-- Deleting reopened the same outcome by another door. Post twenty picks,
-- delete the ones that lose, and a 5-0 record is manufactured without
-- ever editing a result — and with a cash prize on the board, that is
-- the first thing anyone clever will try.
--
-- So a pick is a commitment from kick-off. Before that it can be
-- withdrawn, which is fair: you changed your mind while it was still an
-- opinion about the future.
-- ============================================================

alter table posts add column if not exists game_starts_at timestamptz;

comment on column posts.game_starts_at is
  'Kick-off of the game this pick is on. After it passes the pick cannot be deleted.';

create index if not exists posts_game_starts_idx on posts (game_starts_at)
  where post_kind = 'pick';

-- Takes and reposts stay deletable — they carry no record.
-- A graded pick can never be deleted, whatever its kick-off says.
drop policy if exists "users delete own posts" on posts;
create policy "users delete own posts" on posts for delete
using (
  auth.uid() = author_id
  and (
    post_kind <> 'pick'
    or (
      status = 'pending'
      and (game_starts_at is null or now() < game_starts_at)
    )
  )
);

-- Admins delete through the service role, which bypasses RLS entirely,
-- so moderation is unaffected by any of this.
