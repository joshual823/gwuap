-- ============================================================
-- Live chat under a game
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Rooms are keyed by "LEAGUE:espn_event_id" rather than a foreign key,
-- because games live in ESPN's data, not ours. That means a room exists
-- the moment someone talks in it and needs no seeding.
-- ============================================================

create table if not exists game_messages (
  id uuid primary key default gen_random_uuid(),
  game_key text not null,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz default now()
);

create index if not exists game_messages_room_idx on game_messages (game_key, created_at);

alter table game_messages enable row level security;

-- Signed-in only, same as the Vent room: a game chat is a conversation,
-- not published content.
drop policy if exists "game chat is for signed-in users" on game_messages;
create policy "game chat is for signed-in users" on game_messages
  for select to authenticated using (true);

drop policy if exists "post to game chat" on game_messages;
create policy "post to game chat" on game_messages
  for insert to authenticated with check (auth.uid() = author_id);

drop policy if exists "delete own game message" on game_messages;
create policy "delete own game message" on game_messages
  for delete to authenticated using (auth.uid() = author_id);

-- Same throttle as everything else that accepts writes.
drop trigger if exists game_messages_rate_limit on game_messages;
create trigger game_messages_rate_limit before insert on game_messages
for each row execute function rate_limit_guard('author_id', '60', '1 hour');

-- Reports can point at a chat message.
alter table reports add column if not exists reported_game_message_id uuid
  references game_messages(id) on delete cascade;

-- Live updates for this table.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_messages'
  ) then
    alter publication supabase_realtime add table game_messages;
  end if;
end $$;
