-- ============================================================
-- SESSION 6c — Comment replies + comment reactions
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Adds:
--   comments.parent_id      — threading, one level deep
--   comment_reactions       — emoji reactions on comments
-- ============================================================

-- 1. Threading -------------------------------------------------
-- One level deep, like Instagram and Facebook rather than Twitter's
-- unlimited nesting: replying to a reply attaches to the same top-level
-- parent and @-mentions the person instead. Deep nesting is unreadable
-- on a 460px column.
alter table comments add column if not exists parent_id uuid
  references comments(id) on delete cascade;

create index if not exists comments_parent_idx on comments (parent_id, created_at);

comment on column comments.parent_id is
  'Top-level comment this is a reply to. NULL means it is top-level. Deleting a parent cascades to its replies.';

-- 2. Reactions on comments -------------------------------------
-- Mirrors the shape of `likes` on posts: one reaction per person per
-- comment, so a new emoji replaces the old one.
create table if not exists comment_reactions (
  user_id uuid references profiles(id) on delete cascade,
  comment_id uuid references comments(id) on delete cascade,
  emoji text not null default '♥' check (char_length(emoji) between 1 and 8),
  created_at timestamptz default now(),
  primary key (user_id, comment_id)
);

alter table comment_reactions enable row level security;

drop policy if exists "comment reactions are publicly readable" on comment_reactions;
create policy "comment reactions are publicly readable" on comment_reactions
  for select using (true);

drop policy if exists "users insert own comment reactions" on comment_reactions;
create policy "users insert own comment reactions" on comment_reactions
  for insert with check (auth.uid() = user_id);

-- Switching a reaction is an UPDATE, not an INSERT — without this the
-- upsert is silently rejected by RLS. Same trap as migration 002.
drop policy if exists "users update own comment reactions" on comment_reactions;
create policy "users update own comment reactions" on comment_reactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users remove own comment reactions" on comment_reactions;
create policy "users remove own comment reactions" on comment_reactions
  for delete using (auth.uid() = user_id);
