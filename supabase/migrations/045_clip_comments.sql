-- ============================================================
-- SESSION 14 — Comments under a highlight
-- Run this once in the Supabase SQL editor. Safe to re-run.
--
-- There is no clips table and there won't be. The videos live on
-- YouTube, the same way games live in ESPN's data, so a comment thread
-- is keyed by the video id and exists the moment somebody speaks in it —
-- exactly what `game_messages` does with `LEAGUE:espn_event_id` and
-- migration 018 explains at length. Nothing to seed, nothing to sync,
-- and no row that can go stale when a league deletes a video.
--
-- Publicly readable, unlike the Vent room and game chat. Those are
-- conversations; this is a comment under a public video on a public
-- page, which is the same shape as `comments` on a post — and a
-- logged-out visitor arriving from an ad should be able to see that
-- somebody is here.
-- ============================================================

create table if not exists clip_comments (
  id uuid primary key default gen_random_uuid(),
  -- A YouTube id: eleven characters of URL-safe base64. Checked here as
  -- well as in the page, because this column is the only thing tying a
  -- comment to a video and a malformed one is a thread nobody can reach.
  video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz default now()
);

create index if not exists clip_comments_video_idx on clip_comments (video_id, created_at);

alter table clip_comments enable row level security;

drop policy if exists "clip comments are publicly readable" on clip_comments;
create policy "clip comments are publicly readable" on clip_comments
  for select using (true);

drop policy if exists "signed-in users comment on a clip" on clip_comments;
create policy "signed-in users comment on a clip" on clip_comments
  for insert to authenticated with check (auth.uid() = author_id);

drop policy if exists "delete your own clip comment" on clip_comments;
create policy "delete your own clip comment" on clip_comments
  for delete to authenticated using (auth.uid() = author_id);

-- The same hourly throttle every other room and comment box carries.
drop trigger if exists clip_comments_rate_limit on clip_comments;
create trigger clip_comments_rate_limit before insert on clip_comments
for each row execute function rate_limit_guard('author_id', '60', '1 hour');

-- Reportable, like everything else people can write in public. Its own
-- column rather than squeezed into reported_post_id: the moderation
-- queue has to be able to show what was said and where.
alter table reports add column if not exists reported_clip_comment_id uuid
  references clip_comments(id) on delete cascade;

comment on table clip_comments is
  'Keyed by YouTube video id — there is no clips table, the same way game_messages has no games table.';

-- ---------------------------------------------------------------
-- Check it worked:
--
--   select count(*) from clip_comments;   -- 0, and no error
--
--   -- a malformed video id must be refused:
--   insert into clip_comments (video_id, author_id, body)
--   values ('nope', '00000000-0000-0000-0000-000000000000', 'x');
--   -- expect: violates check constraint "clip_comments_video_id_check"
--
-- Then comment on a clip while signed out — you should be able to read
-- it and not write one.
-- ---------------------------------------------------------------
