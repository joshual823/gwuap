-- ============================================================
-- SESSION 14 — Inviting people to a squad
-- Run this once in the Supabase SQL editor. Safe to re-run.
--
-- Two ways in: by username, for somebody already here, and by link, for
-- somebody who isn't.
--
-- An invite does not add anybody to anything. It's an offer, and the
-- person offered accepts it themselves by pressing Join. Being dropped
-- into a group chat you never agreed to is how group chats become a
-- thing people mute, and the membership policy from 042 already says a
-- row can only be inserted for yourself — this migration doesn't weaken
-- that, it works with it.
--
-- Notifications have no INSERT policy by design (008): they're written
-- by triggers so nobody can spam anybody directly. So an invite is a row
-- in its own table with its own rules, and a trigger turns it into the
-- notification.
-- ============================================================

create table if not exists squad_invites (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references squads(id) on delete cascade,
  inviter_id uuid not null references profiles(id) on delete cascade,
  invitee_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  -- Once per person per squad. Re-inviting somebody who ignored you the
  -- first time is the behaviour this is here to prevent.
  unique (squad_id, invitee_id),
  constraint no_inviting_yourself check (inviter_id <> invitee_id)
);

create index if not exists squad_invites_invitee_idx on squad_invites (invitee_id, created_at desc);

alter table squad_invites enable row level security;

-- You can see invites you sent and invites you were sent. Nobody else's.
drop policy if exists "see your own invites" on squad_invites;
create policy "see your own invites" on squad_invites
  for select to authenticated
  using (auth.uid() = invitee_id or auth.uid() = inviter_id);

-- Only a member can invite, and only into a squad they're actually in.
drop policy if exists "members invite into their own squad" on squad_invites;
create policy "members invite into their own squad" on squad_invites
  for insert to authenticated with check (
    auth.uid() = inviter_id
    and exists (
      select 1 from squad_members m
      where m.squad_id = squad_invites.squad_id and m.user_id = auth.uid()
    )
  );

-- Turn one down, or take back one you sent.
drop policy if exists "dismiss or withdraw an invite" on squad_invites;
create policy "dismiss or withdraw an invite" on squad_invites
  for delete to authenticated
  using (auth.uid() = invitee_id or auth.uid() = inviter_id);

-- Twenty a day. Enough to bring a group over; not enough to work through
-- the user list.
drop trigger if exists squad_invites_rate_limit on squad_invites;
create trigger squad_invites_rate_limit before insert on squad_invites
for each row execute function rate_limit_guard('inviter_id', '20', '24 hours');

-- ---- the notification -----------------------------------------
-- Every type restated. 026 and 039 both say why, and both nearly got it
-- wrong: rewriting this list from a stale copy silently drops whatever
-- was added since, and Postgres only complains if rows already use it.
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'reaction', 'comment', 'reply', 'follow',   -- 008
    'dm_request', 'dm_message',                 -- 011
    'repost',                                   -- 026
    'graded',                                   -- 039
    'squad_invite'                              -- this migration
  ));

-- Which squad, so the notification can link somewhere useful without
-- joining back through a table the reader may not be able to see.
alter table notifications add column if not exists squad_id uuid
  references squads(id) on delete cascade;

create or replace function notify_on_squad_invite()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, actor_id, type, squad_id)
  values (new.invitee_id, new.inviter_id, 'squad_invite', new.squad_id);
  return new;
end $$;

drop trigger if exists squad_invites_notify on squad_invites;
create trigger squad_invites_notify after insert on squad_invites
for each row execute function notify_on_squad_invite();

-- ---- a squad can be previewed by a stranger --------------------
-- 042 made squads readable only once signed in, which is wrong for a
-- link somebody sends to WhatsApp: the recipient hit a login wall before
-- being told what they were being asked to join. The name, the blurb and
-- the member count are now public — the room is not, and neither is the
-- member list. Same call as the challenge page, and for the same reason:
-- nobody should have to sign up to find out what they'd be signing up to.
drop policy if exists "squads are visible to signed-in users" on squads;
drop policy if exists "a squad can be previewed by anyone" on squads;
create policy "a squad can be previewed by anyone" on squads
  for select using (true);

comment on table squad_invites is
  'An offer, not an enrolment. The invitee joins themselves; 042 still only lets a row be inserted for yourself.';

-- ---------------------------------------------------------------
-- Check it worked:
--
--   select count(*) from squad_invites;   -- 0, and no error
--
--   -- the type list must still contain everything, not just the new one:
--   select pg_get_constraintdef(oid) from pg_constraint
--    where conname = 'notifications_type_check';
--
-- Then invite somebody from a second account and confirm they get a
-- notification and are NOT already in the squad until they press Join.
-- ---------------------------------------------------------------
