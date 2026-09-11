-- ============================================================
-- SESSION 16 — Push notifications
-- Run this once in the Supabase SQL editor. Safe to re-run.
--
-- Two people signed up from a Polymarket group on 11 Sep and went
-- straight back to the group chat, saying they'd rather use an app with
-- push notifications. That's the first specific reason anybody has given
-- for leaving, so this is the table behind fixing it.
--
-- One row per browser, not per person. A push subscription belongs to a
-- browser install: the same account on a phone and a laptop is two
-- endpoints, and pushing to one is not pushing to the other. The
-- endpoint URL is the identity the push service gave us, so it's the
-- primary key — re-subscribing in the same browser must update the row
-- rather than pile up duplicates that all deliver the same notification.
--
-- The keys are not secrets of ours. p256dh and auth are handed over by
-- the browser so a push service can encrypt to it; they're useless
-- without the server's VAPID private key, which lives in the
-- environment and never in this table.
-- ============================================================

create table if not exists push_subscriptions (
  endpoint    text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  -- Stamped when a send fails permanently (404/410 from the push
  -- service, i.e. the browser threw the subscription away). Kept rather
  -- than deleted on the spot so a bad send run can't silently empty the
  -- table, and so it's visible how many installs have gone stale.
  failed_at   timestamptz
);

create index if not exists push_subscriptions_user_idx
  on push_subscriptions (user_id)
  where failed_at is null;

comment on table public.push_subscriptions is
  'One row per browser install, keyed by the push service endpoint. Not one per user: a phone and a laptop are two endpoints.';
comment on column public.push_subscriptions.failed_at is
  'Set when the push service reports the endpoint is gone. Rows are kept, not deleted, so a broken send run cannot empty the table.';

alter table push_subscriptions enable row level security;

-- Somebody may only ever see, create or remove their own subscriptions.
-- Sending is done by the notifier with the service role, which bypasses
-- RLS — the same shape the email digest already uses.
drop policy if exists "read own push subscriptions" on push_subscriptions;
create policy "read own push subscriptions" on push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "create own push subscriptions" on push_subscriptions;
create policy "create own push subscriptions" on push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own push subscriptions" on push_subscriptions;
create policy "update own push subscriptions" on push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own push subscriptions" on push_subscriptions;
create policy "delete own push subscriptions" on push_subscriptions
  for delete using (auth.uid() = user_id);

-- Per-account switch, alongside the existing email preference. Somebody
-- who turns notifications off in Edit profile should stop getting them
-- on every device at once, without having to revoke each browser.
alter table profiles add column if not exists push_enabled boolean not null default true;

comment on column public.profiles.push_enabled is
  'Per-account push switch, mirroring the email digest preference. Off means no device receives push, whatever subscriptions exist.';
