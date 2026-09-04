-- ============================================================
-- SESSION 18b — A game has two sides
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Nothing stopped a pick naming the same team twice. It happened for
-- real: tennis codes come from surnames, so a Fernandez playing a
-- Fernandez produced "$FERNANDEZ vs $FERNANDEZ", and a pick like that
-- can't be graded — the grader finds the side by matching the code, and
-- both sides match.
--
-- The codes are disambiguated at the source now, but the form is not
-- the only way a row can be written, so the rule belongs here too.
-- ============================================================

-- One post already has it, from before the codes were disambiguated.
-- The opponent tag is what's wrong, not the post, so it's cleared rather
-- than the row deleted — the trigger from migration 012 derives ticker2
-- from tag2, so nulling the tag nulls the ticker with it.
update posts
   set tag2 = null
 where ticker is not null and ticker = ticker2;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'posts_two_sides_check') then
    alter table posts add constraint posts_two_sides_check
      check (ticker is null or ticker2 is null or ticker <> ticker2);
  end if;
end $$;
