-- ============================================================
-- SESSION 10 — Cashtag pages + the Vent room
-- Run this once in the Supabase SQL editor (safe to re-run).
-- ============================================================

-- 1. Split the ticker out of the tag ---------------------------
-- `tag` holds the whole string, "$LAL -4.5". Trending groups on it
-- exactly, so "$LAL -4.5" and "$LAL -3.5" have been counting as two
-- different things — the autocomplete fixed case fragmentation but not
-- this. A cashtag page can't exist without a stable key either.
--
-- Derived by trigger rather than sent by the client, so it can't drift
-- away from the tag it came from.
alter table posts add column if not exists ticker text;
alter table posts add column if not exists ticker2 text;

create or replace function set_post_tickers()
returns trigger language plpgsql set search_path = public as $$
begin
  new.ticker  := nullif(upper(split_part(coalesce(new.tag,  ''), ' ', 1)), '');
  new.ticker2 := nullif(upper(split_part(coalesce(new.tag2, ''), ' ', 1)), '');
  return new;
end $$;

drop trigger if exists posts_set_tickers on posts;
create trigger posts_set_tickers before insert or update of tag, tag2 on posts
for each row execute function set_post_tickers();

-- Backfill everything already posted.
update posts
   set ticker  = nullif(upper(split_part(coalesce(tag,  ''), ' ', 1)), ''),
       ticker2 = nullif(upper(split_part(coalesce(tag2, ''), ' ', 1)), '')
 where ticker is null and (tag is not null or tag2 is not null);

create index if not exists posts_ticker_idx  on posts (ticker,  created_at desc);
create index if not exists posts_ticker2_idx on posts (ticker2, created_at desc);

-- 2. The Vent room ---------------------------------------------
-- A separate table rather than a post category, so it is structurally
-- incapable of reaching picks, the leaderboard or anyone's record.
create table if not exists vent_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz default now()
);

create index if not exists vent_messages_created_idx on vent_messages (created_at desc);

alter table vent_messages enable row level security;

-- Signed-in only. People say hard things in here; it shouldn't be
-- readable by anyone who wanders past, or indexable.
drop policy if exists "vent is for signed-in users" on vent_messages;
create policy "vent is for signed-in users" on vent_messages
  for select to authenticated using (true);

drop policy if exists "post to vent" on vent_messages;
create policy "post to vent" on vent_messages
  for insert to authenticated with check (auth.uid() = author_id);

drop policy if exists "delete own vent message" on vent_messages;
create policy "delete own vent message" on vent_messages
  for delete to authenticated using (auth.uid() = author_id);

-- 3. Reports from the Vent room jump the queue -----------------
-- No priority flag the client could set on an ordinary report: a report
-- is a Vent report if and only if it points at a vent message.
alter table reports add column if not exists reported_vent_id uuid
  references vent_messages(id) on delete cascade;

-- reported_post_id was NOT NULL-able in practice because reports could
-- only name a user; make sure a vent report doesn't need a post.
alter table reports alter column reported_post_id drop not null;
