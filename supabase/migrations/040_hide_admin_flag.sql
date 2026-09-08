-- SESSION 13 — Stop the public internet reading who the admin is
--
-- `profiles` is world-readable on purpose: usernames, avatars and bios
-- are what a public timeline is made of, and the leaderboard would need
-- a login otherwise. But "readable" was every column, and three of them
-- had no business being public.
--
-- `is_admin` is the one that matters. Anyone could ask the REST API for
-- it without signing in:
--
--   curl "$SUPABASE_URL/rest/v1/profiles?select=username,is_admin" \
--        -H "apikey: <the anon key, which ships in the page>"
--
-- and be handed the name of the single account that can ban users,
-- delete posts and clear the Vent room. That's the first half of an
-- attack: pick the target, then guess. The second half — unlimited
-- guesses via LIKE wildcards in /api/login — was closed in code the same
-- day, but naming the target for free is worth removing on its own.
-- Defence in depth: neither half should be standing.
--
-- `email_notifications` and `welcomed_at` go too. Nobody outside the
-- account needs to know whether a stranger has email switched on or when
-- they were first written to.
--
-- Only `anon` is revoked. `authenticated` keeps them, because every read
-- in the app is a signed-in user reading their own row
-- (`.eq('id', user.id)`), and taking the column from that role would
-- break /admin, the moderation routes and the Live room preview.
--
-- Safe to re-run. Nothing is dropped and no data moves.

revoke select (is_admin, email_notifications, welcomed_at)
  on public.profiles from anon;

comment on column public.profiles.is_admin is
  'Not readable by anon — it names the moderation account to anyone who asks. '
  'Readable by authenticated, which every check does against its own row.';

-- ---------------------------------------------------------------
-- Check it worked. Expect zero rows: anon should hold no SELECT on
-- any of the three.
--
--   select column_name
--   from information_schema.column_privileges
--   where table_name = 'profiles'
--     and grantee = 'anon'
--     and privilege_type = 'SELECT'
--     and column_name in ('is_admin', 'email_notifications', 'welcomed_at');
--
-- And confirm the site still works signed out — the founding counter on
-- the logged-out feed reads `profiles` as anon and is the thing most
-- likely to notice. It asks for `id` now rather than `*`, which is what
-- makes this revoke safe; a `select=*` from anon would start erroring
-- with "permission denied for column is_admin" the moment this runs.
-- ---------------------------------------------------------------
