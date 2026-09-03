-- ============================================================
-- SESSION 15 — Reposts
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Sharing a pick out of the site is one thing; passing one along inside
-- it is another, and it's the move that makes a feed feel alive when
-- there aren't many people yet. One good pick can be carried by five
-- people instead of sitting on one profile.
-- ============================================================

alter table posts add column if not exists repost_of uuid references posts(id) on delete cascade;

comment on column posts.repost_of is
  'The post being passed along. Always points at an original, never at another repost.';

create index if not exists posts_repost_of_idx on posts (repost_of);

-- A repost carries no money of its own: it's a pointer, plus whatever
-- the reposter wanted to say. The take constraints already forbid odds
-- and stake, so a repost is a take with a target.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'posts_repost_is_take_check') then
    alter table posts add constraint posts_repost_is_take_check
      check (repost_of is null or post_kind = 'take');
  end if;
  -- Reposting yourself into a loop is the one shape that breaks rendering.
  if not exists (select 1 from pg_constraint where conname = 'posts_repost_not_self_check') then
    alter table posts add constraint posts_repost_not_self_check
      check (repost_of is null or repost_of <> id);
  end if;
end $$;

-- ---- notify the original author ------------------------------
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('reaction','comment','reply','follow','repost'));

create or replace function notify_on_repost()
returns trigger language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  if new.repost_of is null then return new; end if;
  select author_id into target from posts where id = new.repost_of;
  -- Passing your own pick along shouldn't ping you.
  if target is null or target = new.author_id then return new; end if;
  insert into notifications (user_id, actor_id, type, post_id)
  values (target, new.author_id, 'repost', new.repost_of);
  return new;
end $$;

drop trigger if exists posts_repost_notify on posts;
create trigger posts_repost_notify after insert on posts
for each row execute function notify_on_repost();
