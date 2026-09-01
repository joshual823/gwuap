-- ============================================================
-- SESSION 11 — Pre-launch security hardening
-- Run this once in the Supabase SQL editor (safe to re-run).
-- ============================================================

-- 1. categories had no RLS at all -------------------------------
-- Every other table enables row level security. This one never did, and
-- Supabase grants anon and authenticated full table privileges by
-- default — so with RLS off, the anon key that ships in every browser
-- could rename or delete every league on the site.
--
-- Categories are reference data: everyone reads, nobody writes. Adding
-- a SELECT policy and no others denies writes by default; the revokes
-- are belt and braces. Admin edits go through service_role.
alter table categories enable row level security;

drop policy if exists "categories are publicly readable" on categories;
create policy "categories are publicly readable" on categories
  for select using (true);

revoke insert, update, delete on categories from anon;
revoke insert, update, delete on categories from authenticated;

-- 2. Per-user write throttles -----------------------------------
-- Nothing but DM requests had one, so a script with a signed-in session
-- could fill the feed, the Vent room, or the moderation queue — and
-- every reaction and follow also fires a notification, so spam there
-- lands in someone's inbox.
--
-- One generic guard, parameterised per table: the actor column, a
-- ceiling, and a window. Limits are set well above human use.
create or replace function rate_limit_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid;
  used int;
  ceiling int := (TG_ARGV[1])::int;
  window_size interval := (TG_ARGV[2])::interval;
begin
  actor := (to_jsonb(new) ->> TG_ARGV[0])::uuid;
  if actor is null then return new; end if;

  execute format(
    'select count(*) from %I where %I = $1 and created_at > now() - $2',
    TG_TABLE_NAME, TG_ARGV[0]
  ) into used using actor, window_size;

  if used >= ceiling then
    raise exception 'You are doing that too often. Try again in a bit.';
  end if;
  return new;
end $$;

drop trigger if exists posts_rate_limit on posts;
create trigger posts_rate_limit before insert on posts
for each row execute function rate_limit_guard('author_id', '30', '1 hour');

drop trigger if exists comments_rate_limit on comments;
create trigger comments_rate_limit before insert on comments
for each row execute function rate_limit_guard('author_id', '60', '1 hour');

drop trigger if exists vent_rate_limit on vent_messages;
create trigger vent_rate_limit before insert on vent_messages
for each row execute function rate_limit_guard('author_id', '30', '1 hour');

drop trigger if exists likes_rate_limit on likes;
create trigger likes_rate_limit before insert on likes
for each row execute function rate_limit_guard('user_id', '200', '1 hour');

drop trigger if exists comment_reactions_rate_limit on comment_reactions;
create trigger comment_reactions_rate_limit before insert on comment_reactions
for each row execute function rate_limit_guard('user_id', '200', '1 hour');

drop trigger if exists follows_rate_limit on follows;
create trigger follows_rate_limit before insert on follows
for each row execute function rate_limit_guard('follower_id', '100', '1 hour');

-- The moderation queue is the one an attacker most wants to drown.
drop trigger if exists reports_rate_limit on reports;
create trigger reports_rate_limit before insert on reports
for each row execute function rate_limit_guard('reporter_id', '20', '1 day');

drop trigger if exists messages_rate_limit on messages;
create trigger messages_rate_limit before insert on messages
for each row execute function rate_limit_guard('sender_id', '120', '1 hour');
