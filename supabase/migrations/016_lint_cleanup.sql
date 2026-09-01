-- ============================================================
-- SESSION 11 — Clear the security advisor warnings
-- Run this once in the Supabase SQL editor (safe to re-run).
-- ============================================================

-- 1. The avatars bucket was listable ---------------------------
-- Public buckets serve files by URL without consulting RLS, so a broad
-- SELECT policy on storage.objects adds nothing for viewing — what it
-- adds is the ability to LIST the bucket.
--
-- Avatar paths are "<user_id>/<timestamp>.jpg", so listing let anyone
-- harvest every user's id in bulk. Dropping the policy: pictures still
-- load from their public URLs, the bucket stops being enumerable.
drop policy if exists "avatars are publicly readable" on storage.objects;

-- 2. Trigger functions shouldn't be EXECUTE-able by clients -----
-- Postgres doesn't check EXECUTE when firing a trigger, so revoking
-- this does not affect the triggers themselves. It also isn't
-- exploitable as it stands — every one of these returns `trigger`, and
-- Postgres refuses to call those directly ("trigger functions can only
-- be called as triggers"). It's unnecessary privilege either way, and
-- it's 18 of the 20 advisor warnings.
do $$
declare fn text;
begin
  foreach fn in array array[
    'notify_on_like()',
    'unnotify_on_like_delete()',
    'notify_on_comment_reaction()',
    'notify_on_comment()',
    'notify_on_follow()',
    'notify_on_message()',
    'guard_conversation_request()',
    'touch_conversation()',
    'rate_limit_guard()'
  ] loop
    execute format('revoke execute on function public.%s from anon', fn);
    execute format('revoke execute on function public.%s from authenticated', fn);
    execute format('revoke execute on function public.%s from public', fn);
  end loop;
end $$;
