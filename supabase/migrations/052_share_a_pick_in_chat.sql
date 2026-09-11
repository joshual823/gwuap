-- ============================================================
-- SESSION 17 — Share a pick into a room
-- Run this once in the Supabase SQL editor. Safe to re-run.
--
-- A member could always paste a link to their pick. Nobody does, and a
-- bare /post/<uuid> in a group chat tells you nothing about what was
-- bet — you have to leave the room to find out, which is exactly the
-- thing a group chat is supposed to save you from.
--
-- So a message can now point at a post. The room renders the pick
-- inline: cashtag, side, price, and how it settled, with the post one
-- tap away for anyone who wants the thread.
--
-- Why a column and not a url in the body:
--   * The card stays live. A pick shared while pending shows "win" or
--     "loss" in the room the moment grading settles it, because the room
--     reads the post rather than a snapshot of it.
--   * on delete set null, not cascade. Deleting a pick shouldn't reach
--     into three rooms and silently remove what people said about it.
--     The message survives; the card goes.
--   * Nothing leaks. Posts are public, so a member's shared pick was
--     already readable by anyone — the squad room adds no exposure.
-- ============================================================

alter table squad_messages add column if not exists post_id uuid
  references posts(id) on delete set null;
alter table game_messages add column if not exists post_id uuid
  references posts(id) on delete set null;

-- Sharing a pick with nothing to add is the common case, so a message
-- may now be a card with no words. Never all three empty, which would be
-- a blank line in the room.
alter table squad_messages drop constraint if exists squad_messages_says_something;
alter table squad_messages add constraint squad_messages_says_something
  check (char_length(btrim(body)) > 0 or image_url is not null or post_id is not null);

-- 018 wrote game_messages.body as "between 1 and 500", which is both the
-- length cap and the not-empty rule in one check. Split them so the cap
-- survives and the emptiness rule can account for a card.
alter table game_messages drop constraint if exists game_messages_body_check;
alter table game_messages drop constraint if exists game_messages_body_length;
alter table game_messages add constraint game_messages_body_length
  check (char_length(body) <= 500);
alter table game_messages drop constraint if exists game_messages_says_something;
alter table game_messages add constraint game_messages_says_something
  check (char_length(btrim(body)) > 0 or post_id is not null);

comment on column public.squad_messages.post_id is
  'A pick or take shared into the room. Read live, so the card settles when the pick does.';
comment on column public.game_messages.post_id is
  'A pick or take shared into the room. Read live, so the card settles when the pick does.';

-- ---------------------------------------------------------------
-- Check it:
--
--   select count(*) from squad_messages;   -- unchanged, no error
--   select count(*) from game_messages;    -- unchanged, no error
--
--   -- a message with nothing in it at all must still be refused:
--   insert into game_messages (game_key, author_id, body)
--   values ('nfl:0', '00000000-0000-0000-0000-000000000000', '   ');
--   -- expect: violates check constraint "game_messages_says_something"
--   -- (or a foreign-key error first, which also means the row was refused)
-- ---------------------------------------------------------------
