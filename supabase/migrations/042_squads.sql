-- ============================================================
-- SESSION 14 — Squads
-- Run this once in the Supabase SQL editor. Safe to re-run.
--
-- A squad is a named group with a live chat room. The site already has
-- the two ends of the range: the whole-site timeline, and a DM between
-- two people. What it hasn't had is the middle, which is where sports
-- talk actually happens — a handful of people who know each other,
-- arguing in one place all season.
--
-- Public by design for now: anyone signed in can find a squad and join
-- it. Invite-only is a real feature with real moderation questions
-- attached (who can invite, what happens to their messages when they're
-- removed) and shipping a half version of it would be worse than not
-- having it. The `is_private` column exists so that step doesn't need a
-- migration, and nothing reads it yet.
-- ============================================================

create table if not exists squads (
  id uuid primary key default gen_random_uuid(),
  -- The URL. Lowercased and unique, so /squads/<slug> is stable even if
  -- the display name is edited later.
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,30}$'),
  name text not null check (char_length(name) between 2 and 40),
  description text check (char_length(description) <= 200),
  owner_id uuid not null references profiles(id) on delete cascade,
  is_private boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists squads_created_idx on squads (created_at desc);

create table if not exists squad_members (
  squad_id uuid not null references squads(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  -- 'owner' is the one who made it. Kept as a column rather than
  -- inferred from squads.owner_id so a future handover is an update
  -- here instead of a schema change.
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz default now(),
  primary key (squad_id, user_id)
);

create index if not exists squad_members_user_idx on squad_members (user_id);

create table if not exists squad_messages (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references squads(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz default now()
);

create index if not exists squad_messages_room_idx on squad_messages (squad_id, created_at);

alter table squads enable row level security;
alter table squad_members enable row level security;
alter table squad_messages enable row level security;

-- ---- who can see what -----------------------------------------
-- Squads themselves are readable by anyone signed in: you can't join a
-- room you can't find. Signed-in rather than public, same as the Vent
-- room and game chat — a group conversation isn't published content.
drop policy if exists "squads are visible to signed-in users" on squads;
create policy "squads are visible to signed-in users" on squads
  for select to authenticated using (true);

drop policy if exists "anyone signed in can start a squad" on squads;
create policy "anyone signed in can start a squad" on squads
  for insert to authenticated with check (auth.uid() = owner_id);

drop policy if exists "the owner can edit their squad" on squads;
create policy "the owner can edit their squad" on squads
  for update to authenticated using (auth.uid() = owner_id);

drop policy if exists "the owner can delete their squad" on squads;
create policy "the owner can delete their squad" on squads
  for delete to authenticated using (auth.uid() = owner_id);

-- Membership is public among signed-in users: a squad page lists who is
-- in it, which is the point of joining one.
drop policy if exists "membership is visible" on squad_members;
create policy "membership is visible" on squad_members
  for select to authenticated using (true);

drop policy if exists "join a squad as yourself" on squad_members;
create policy "join a squad as yourself" on squad_members
  for insert to authenticated with check (auth.uid() = user_id);

-- Leaving is deleting your own row. The owner can also remove somebody
-- else's, which is the only moderation lever a squad has of its own.
drop policy if exists "leave, or be removed by the owner" on squad_members;
create policy "leave, or be removed by the owner" on squad_members
  for delete to authenticated using (
    auth.uid() = user_id
    or exists (select 1 from squads s where s.id = squad_id and s.owner_id = auth.uid())
  );

-- ---- the room -------------------------------------------------
-- Members only, both ways. This is the one place on the site where
-- "signed in" isn't enough: a squad that anybody can read isn't a squad.
drop policy if exists "members read the room" on squad_messages;
create policy "members read the room" on squad_messages
  for select to authenticated using (
    exists (
      select 1 from squad_members m
      where m.squad_id = squad_messages.squad_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "members post to the room" on squad_messages;
create policy "members post to the room" on squad_messages
  for insert to authenticated with check (
    auth.uid() = author_id
    and exists (
      select 1 from squad_members m
      where m.squad_id = squad_messages.squad_id and m.user_id = auth.uid()
    )
  );

-- Your own line, or the owner clearing one from their room.
drop policy if exists "delete own message, or the owner's call" on squad_messages;
create policy "delete own message, or the owner's call" on squad_messages
  for delete to authenticated using (
    auth.uid() = author_id
    or exists (select 1 from squads s where s.id = squad_id and s.owner_id = auth.uid())
  );

-- ---- the same throttles as everything else that accepts writes ----
drop trigger if exists squad_messages_rate_limit on squad_messages;
create trigger squad_messages_rate_limit before insert on squad_messages
for each row execute function rate_limit_guard('author_id', '60', '1 hour');

-- Making squads is cheaper to abuse than posting in them: a handful of
-- accounts could fill the discover list with junk in a minute.
drop trigger if exists squads_rate_limit on squads;
create trigger squads_rate_limit before insert on squads
for each row execute function rate_limit_guard('owner_id', '5', '24 hours');

-- ---- the owner is a member, always ----------------------------
-- Done in a trigger rather than in the route, so it holds however a
-- squad is created. The insert policy above already requires the owner
-- to be the caller, so this can't enrol anyone else.
create or replace function squad_owner_joins()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into squad_members (squad_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists squads_owner_joins on squads;
create trigger squads_owner_joins after insert on squads
for each row execute function squad_owner_joins();

-- ---- realtime -------------------------------------------------
-- Same guarded add as 013 and 018: adding a table twice is an error, and
-- this file is meant to be safe to re-run.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'squad_messages'
  ) then
    alter publication supabase_realtime add table squad_messages;
  end if;
end $$;

-- ---- reporting ------------------------------------------------
-- Reports already carry a user and a post. A squad message is neither,
-- so it gets its own column rather than being squeezed into one of
-- those — the moderation queue needs to be able to show what was said.
alter table reports add column if not exists reported_squad_message_id uuid
  references squad_messages(id) on delete cascade;

comment on table squads is
  'A named group with a live chat room. Public to signed-in users for now; is_private is reserved and unread.';

-- ---------------------------------------------------------------
-- Check it worked:
--
--   select count(*) from squads;              -- 0, and no error
--   select tablename from pg_publication_tables
--    where pubname = 'supabase_realtime' and tablename = 'squad_messages';
--
-- Then make a squad on the site, and confirm from a second account that
-- the room is unreadable until that account joins.
-- ---------------------------------------------------------------
