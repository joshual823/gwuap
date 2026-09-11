-- ============================================================
-- SESSION 16 — Marking which notifications have been pushed
-- Run this once in the Supabase SQL editor. Safe to re-run.
--
-- Notification rows are written by database triggers (008), so the app
-- never sees them appear and can't push at the moment they're created.
-- A job has to come along and find the unsent ones — which is exactly
-- what the email digest already does, using notifications.emailed_at.
--
-- This is the same stamp for push. Two columns rather than one shared
-- flag because the two channels are independent: somebody can have push
-- on and email off, a push can fail while an email succeeds, and a
-- shared column would make either of those silently skip the other.
--
-- Claimed before sending, never after. A crash between claiming and
-- sending loses one notification; doing it the other way round risks
-- pushing the same thing repeatedly, and a phone buzzing four times for
-- one reply is worse than a phone not buzzing once.
-- ============================================================

alter table notifications add column if not exists pushed_at timestamptz;

comment on column public.notifications.pushed_at is
  'Stamped when a web push was attempted for this row. Mirrors emailed_at; the two channels are independent on purpose.';

-- The send job scans for unsent rows, so that is the index it wants.
create index if not exists notifications_unpushed_idx
  on notifications (created_at)
  where pushed_at is null;
