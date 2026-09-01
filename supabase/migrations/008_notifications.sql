-- ============================================================
-- SESSION 9 — Notifications
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Rows are written by database triggers, never by the client. If the
-- app inserted them, every signed-in user would need permission to
-- write rows addressed to other people — which is a spam vector you
-- can't close with RLS. Triggers run as the table owner, so the client
-- gets read/update/delete on its own notifications and no INSERT at all.
-- ============================================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,   -- recipient
  actor_id uuid references profiles(id) on delete cascade,           -- who did it
  type text not null check (type in ('reaction','comment','reply','follow')),
  post_id uuid references posts(id) on delete cascade,
  comment_id uuid references comments(id) on delete cascade,
  emoji text,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists notifications_user_idx on notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on notifications (user_id) where read_at is null;

alter table notifications enable row level security;

-- Read, mark read, and dismiss your own. Deliberately no INSERT policy.
drop policy if exists "users read own notifications" on notifications;
create policy "users read own notifications" on notifications
  for select using (auth.uid() = user_id);

drop policy if exists "users update own notifications" on notifications;
create policy "users update own notifications" on notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users delete own notifications" on notifications;
create policy "users delete own notifications" on notifications
  for delete using (auth.uid() = user_id);

-- ---- reactions on posts -------------------------------------
create or replace function notify_on_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  select author_id into target from posts where id = new.post_id;
  -- Reacting to your own post shouldn't ping you.
  if target is null or target = new.user_id then return new; end if;
  insert into notifications (user_id, actor_id, type, post_id, emoji)
  values (target, new.user_id, 'reaction', new.post_id, new.emoji);
  return new;
end $$;

drop trigger if exists likes_notify on likes;
-- INSERT only: switching your emoji shouldn't send a second ping.
create trigger likes_notify after insert on likes
for each row execute function notify_on_like();

create or replace function unnotify_on_like_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from notifications
   where type = 'reaction' and actor_id = old.user_id and post_id = old.post_id;
  return old;
end $$;

drop trigger if exists likes_unnotify on likes;
create trigger likes_unnotify after delete on likes
for each row execute function unnotify_on_like_delete();

-- ---- reactions on comments ----------------------------------
create or replace function notify_on_comment_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare target uuid; parent_post uuid;
begin
  select author_id, post_id into target, parent_post from comments where id = new.comment_id;
  if target is null or target = new.user_id then return new; end if;
  insert into notifications (user_id, actor_id, type, post_id, comment_id, emoji)
  values (target, new.user_id, 'reaction', parent_post, new.comment_id, new.emoji);
  return new;
end $$;

drop trigger if exists comment_reactions_notify on comment_reactions;
create trigger comment_reactions_notify after insert on comment_reactions
for each row execute function notify_on_comment_reaction();

-- ---- comments and replies -----------------------------------
create or replace function notify_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare target uuid; kind text;
begin
  if new.parent_id is null then
    select author_id into target from posts where id = new.post_id;
    kind := 'comment';
  else
    select author_id into target from comments where id = new.parent_id;
    kind := 'reply';
  end if;
  if target is null or target = new.author_id then return new; end if;
  insert into notifications (user_id, actor_id, type, post_id, comment_id)
  values (target, new.author_id, kind, new.post_id, new.id);
  return new;
end $$;

drop trigger if exists comments_notify on comments;
create trigger comments_notify after insert on comments
for each row execute function notify_on_comment();

-- ---- follows -------------------------------------------------
create or replace function notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.following_id = new.follower_id then return new; end if;
  insert into notifications (user_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow');
  return new;
end $$;

drop trigger if exists follows_notify on follows;
create trigger follows_notify after insert on follows
for each row execute function notify_on_follow();
