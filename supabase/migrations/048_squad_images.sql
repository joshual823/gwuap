-- ============================================================
-- SESSION 15 — Pictures and GIFs in a squad room
-- Run this once in the Supabase SQL editor. Safe to re-run.
--
-- The build guide has said since Session 3 that chat images stay off
-- "until there's a moderation story". Squads are that story, and it's
-- worth being explicit about why rather than quietly reversing it:
--
--   * A squad room is members-only. RLS enforces it. A picture posted
--     here is seen by people who chose to be in this squad, not by the
--     public timeline and not by a stranger from an ad.
--   * The owner can already delete any message in their own room —
--     042's delete policy — so every room has somebody who can clear it
--     without waiting for the one site admin.
--   * A GIF isn't uploaded at all. It's a link to Tenor, which filters
--     its own library, so the worst case is a link to something Tenor
--     already decided was acceptable.
--
-- None of that is true of the public feed, so this stays scoped to
-- squads. Bet-slip uploads on posts remain off.
-- ============================================================

alter table squad_messages add column if not exists image_url text;

-- A message may now be a picture with nothing said, so the body can be
-- empty — but not both empty, which would be a blank line in the room.
alter table squad_messages drop constraint if exists squad_messages_body_check;
alter table squad_messages add constraint squad_messages_body_length
  check (char_length(body) <= 500);
alter table squad_messages drop constraint if exists squad_messages_says_something;
alter table squad_messages add constraint squad_messages_says_something
  check (char_length(btrim(body)) > 0 or image_url is not null);

comment on column public.squad_messages.image_url is
  'Either a file in the avatars bucket written by /api/squad-image, or a Tenor GIF url. Members-only, like the room.';

-- Reportable, like every other thing somebody can put in front of other
-- people. 042 added the message column; this needs nothing new.

-- ---------------------------------------------------------------
-- Check it:
--
--   select count(*) from squad_messages;   -- unchanged, no error
--
--   -- a message with neither text nor picture must be refused:
--   insert into squad_messages (squad_id, author_id, body)
--   values ('00000000-0000-0000-0000-000000000000',
--           '00000000-0000-0000-0000-000000000000', '   ');
--   -- expect: violates check constraint "squad_messages_says_something"
--   -- (or a foreign-key error first, which also means the row was refused)
-- ---------------------------------------------------------------
