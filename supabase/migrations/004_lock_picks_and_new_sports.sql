-- ============================================================
-- SESSION 6d — Lock posted picks + Tennis/UFC/Boxing categories
-- Run this once in the Supabase SQL editor (safe to re-run).
-- ============================================================

-- 1. Lock a pick's terms once it's posted ----------------------
-- The RLS policy "users update own posts" allows updating ANY column,
-- including odds and stake. There's no edit button in the UI, but the
-- anon key ships in every browser, so a user could change their posted
-- odds after the game via the API. That would make the whole record
-- meaningless — profit is supposed to reflect the price you called
-- BEFORE the result was known.
--
-- RLS can't restrict which columns get written, but column-level grants
-- can. Grading only ever writes status and profit, so those are the only
-- two an author may change. Everything else is immutable after posting.
--
-- (The admin panel uses the service_role key, which bypasses this.)
revoke update on posts from authenticated;
revoke update on posts from anon;
grant update (status, profit) on posts to authenticated;

-- 2. New sport categories --------------------------------------
-- UFC and Boxing were sharing one category. Split them, and add Tennis.
-- Renaming rather than deleting keeps any existing posts pointed at a
-- valid row.
update categories set name = 'UFC' where name = 'UFC/Boxing';
insert into categories (name) values ('Boxing') on conflict (name) do nothing;
insert into categories (name) values ('Tennis') on conflict (name) do nothing;
