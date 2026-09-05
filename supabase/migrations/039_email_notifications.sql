-- ============================================================
-- SESSION 22 — Tell people something happened
-- Run this once in the Supabase SQL editor, BEFORE pushing.
--
-- The site had in-app notifications and no way to know one had arrived.
-- Somebody posts a pick, closes the tab, and the grading job settles it
-- eight hours later with nobody watching — which is the one moment the
-- whole product turns on.
--
-- Three things here: a notification type for a graded pick, a record of
-- which notifications have been emailed, and a way to turn the emails
-- off.
-- ============================================================

-- ---- the graded notification ---------------------------------
-- Every type restated. 026's comment says why and 026 still nearly got
-- it wrong: rewriting this constraint from a stale list drops whatever
-- was added since, and Postgres only complains if rows already use it.
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'reaction', 'comment', 'reply', 'follow',   -- 008
    'dm_request', 'dm_message',                 -- 011
    'repost',                                   -- 026
    'graded'                                    -- this migration
  ));

-- The outcome, so the notification can read "won" or "lost" without
-- joining back to a post that may since have been deleted.
alter table notifications add column if not exists outcome text;

-- ---- what has already been sent ------------------------------
-- Null means not yet emailed. The sender claims rows by stamping this,
-- so a second run overlapping the first can't send the same thing twice.
alter table notifications add column if not exists emailed_at timestamptz;

create index if not exists notifications_unemailed_idx
  on notifications (created_at)
  where emailed_at is null;

-- ---- and the way out ------------------------------------------
alter table profiles add column if not exists email_notifications boolean not null default true;

comment on column profiles.email_notifications is
  'Send a summary email when notifications arrive. Off means in-app only.';

-- Sent once, on the first job that sees a new account.
alter table profiles add column if not exists welcomed_at timestamptz;
