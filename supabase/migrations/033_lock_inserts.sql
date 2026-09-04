-- ============================================================
-- SESSION 19 — Close what INSERT left open
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Migration 022 took UPDATE away so nobody could grade their own picks,
-- and 031 kept badges out of the profile grant so nobody could award
-- themselves one. Both only ever restricted UPDATE. INSERT was never
-- touched, and RLS checks which ROWS you may write, never which COLUMNS
-- — so every column was still writable on the way in.
--
-- Which meant a signed-in account could insert a post that was already
-- a win: status 'win', a profit, graded_by 'auto', a real game_id. The
-- leaderboard counts exactly that shape. Ten of them tops the board, and
-- no rule was broken on the way — the pick was never graded, it was born
-- graded.
--
-- Same shape on profiles, and OAuth widened it: an account exists with
-- no profile row until a username is claimed, and in that window the
-- row could be inserted with is_admin true.
-- ============================================================

-- ---- posts ---------------------------------------------------
-- Everything a person legitimately writes when posting. Absent, and
-- therefore left to defaults and to the grading job: status, profit,
-- graded_at, graded_by, grade_note, grade_checked_at. Also absent:
-- ticker and ticker2, which migration 012's trigger derives from the
-- tags — a trigger runs regardless of what the writer may set.
revoke insert on posts from authenticated, anon;
grant insert (
  author_id, category_id, caption, slip_image_url,
  tag, tag2, sentiment, post_kind, bet_type,
  odds, stake, currency, potential_payout,
  game_id, game_league, game_starts_at, line,
  odds_source, odds_book, money_public, repost_of
) on posts to authenticated;

-- ---- profiles ------------------------------------------------
-- A new account names itself and nothing else. is_admin, is_banned and
-- badges are decided elsewhere: by an admin, by moderation, and by the
-- founding trigger, which sets badges from inside the insert and so
-- doesn't need the writer to hold the column.
revoke insert on profiles from authenticated, anon;
grant insert (id, username, display_name) on profiles to authenticated;

-- ---- login attempts ------------------------------------------
-- Signing in with an email goes browser-to-Supabase, which rate-limits
-- per client. A username can't: the address is only resolvable on the
-- server, so those attempts all arrive from one address and Supabase's
-- limit would throttle every user together while barely slowing one
-- attacker. So that route counts its own, per username.
create table if not exists login_attempts (
  id bigserial primary key,
  username_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists login_attempts_key_idx
  on login_attempts (username_key, created_at desc);

-- No policies at all, deliberately: RLS with none denies everyone, and
-- only the service role reaches this. How often an account is attacked
-- is nobody's business but the site's.
alter table login_attempts enable row level security;
revoke all on login_attempts from anon, authenticated;
revoke all on sequence login_attempts_id_seq from anon, authenticated;
