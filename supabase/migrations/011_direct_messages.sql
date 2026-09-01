-- ============================================================
-- SESSION 9b — Direct messages, permission-based
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- StockTwits uses an open inbox: anyone can message anyone. We're
-- deliberately not copying that. On a site where people post losses and
-- get mouthy, an open inbox is a harassment vector and there's one
-- moderator. A request has to be accepted before a conversation opens.
-- ============================================================

-- 1. Conversations ---------------------------------------------
-- The pair is stored in a canonical order (user_a < user_b) with a
-- unique constraint, so A→B and B→A can't become two conversations.
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references profiles(id) on delete cascade,
  user_b uuid not null references profiles(id) on delete cascade,
  requested_by uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz default now(),
  last_message_at timestamptz default now(),
  constraint conversations_pair_order check (user_a < user_b),
  constraint conversations_pair_unique unique (user_a, user_b)
);

create index if not exists conversations_a_idx on conversations (user_a, last_message_at desc);
create index if not exists conversations_b_idx on conversations (user_b, last_message_at desc);

-- 2. Messages ---------------------------------------------------
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists messages_conversation_idx on messages (conversation_id, created_at);

alter table conversations enable row level security;
alter table messages enable row level security;

-- 3. Who can see and do what ------------------------------------
drop policy if exists "read own conversations" on conversations;
create policy "read own conversations" on conversations
  for select using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "start a conversation" on conversations;
create policy "start a conversation" on conversations
  for insert with check (
    auth.uid() = requested_by
    and (auth.uid() = user_a or auth.uid() = user_b)
    and status = 'pending'
  );

-- Only the person who received the request may act on it.
drop policy if exists "respond to a request" on conversations;
create policy "respond to a request" on conversations
  for update using (
    (auth.uid() = user_a or auth.uid() = user_b) and auth.uid() <> requested_by
  ) with check (
    (auth.uid() = user_a or auth.uid() = user_b) and auth.uid() <> requested_by
  );

-- ...and only the status column. last_message_at is maintained by a
-- trigger; without this a user could rewrite it to pin themselves to the
-- top of everyone's inbox.
revoke update on conversations from authenticated;
revoke update on conversations from anon;
grant update (status) on conversations to authenticated;

drop policy if exists "read messages in own conversations" on messages;
create policy "read messages in own conversations" on messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (auth.uid() = c.user_a or auth.uid() = c.user_b)
    )
  );

-- While a request is pending only the requester may write, so the
-- recipient can read it and decide without being talked at.
drop policy if exists "send messages" on messages;
create policy "send messages" on messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (auth.uid() = c.user_a or auth.uid() = c.user_b)
        and (c.status = 'accepted'
             or (c.status = 'pending' and auth.uid() = c.requested_by))
    )
  );

-- Marking messages read is an update on someone else's row, so it's
-- scoped to the read_at column only.
drop policy if exists "mark messages read" on messages;
create policy "mark messages read" on messages
  for update using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (auth.uid() = c.user_a or auth.uid() = c.user_b)
    )
  );
revoke update on messages from authenticated;
revoke update on messages from anon;
grant update (read_at) on messages to authenticated;

-- 4. Blocks and rate limiting -----------------------------------
-- Both have to run as the table owner. A user can't read someone else's
-- block list through RLS, so the check can't live in a policy — and a
-- rate limit in a policy would be trivially bypassed anyway.
create or replace function guard_conversation_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare other uuid; pending_today int;
begin
  other := case when new.requested_by = new.user_a then new.user_b else new.user_a end;

  if exists (select 1 from blocks
              where (blocker_id = other and blocked_id = new.requested_by)
                 or (blocker_id = new.requested_by and blocked_id = other)) then
    raise exception 'You cannot message this person.';
  end if;

  select count(*) into pending_today from conversations
   where requested_by = new.requested_by
     and status = 'pending'
     and created_at > now() - interval '1 day';
  if pending_today >= 10 then
    raise exception 'Too many message requests today. Try again tomorrow.';
  end if;

  return new;
end $$;

drop trigger if exists conversations_guard on conversations;
create trigger conversations_guard before insert on conversations
for each row execute function guard_conversation_request();

-- 5. Keep inbox ordering honest ---------------------------------
create or replace function touch_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists messages_touch_conversation on messages;
create trigger messages_touch_conversation after insert on messages
for each row execute function touch_conversation();

-- 6. Notifications ----------------------------------------------
alter table notifications add column if not exists conversation_id uuid
  references conversations(id) on delete cascade;

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('reaction','comment','reply','follow','dm_request','dm_message'));

create or replace function notify_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare convo conversations%rowtype; target uuid;
begin
  select * into convo from conversations where id = new.conversation_id;
  if convo.id is null then return new; end if;
  target := case when new.sender_id = convo.user_a then convo.user_b else convo.user_a end;
  if target = new.sender_id then return new; end if;

  insert into notifications (user_id, actor_id, type, conversation_id)
  values (target, new.sender_id,
          case when convo.status = 'pending' then 'dm_request' else 'dm_message' end,
          convo.id);
  return new;
end $$;

drop trigger if exists messages_notify on messages;
create trigger messages_notify after insert on messages
for each row execute function notify_on_message();
