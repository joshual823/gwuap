-- ============================================================
-- SESSION 15 — Where a pick's price came from
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Odds were free text. Nothing stopped someone entering a price that no
-- book ever offered, and the profit figure on their record followed from
-- it — a pick posted at "under 9 +100" when the real price was -112 pays
-- $50 instead of $44.64, and nothing on the page said so.
--
-- Picks made by tapping a real market now record that. Hand-entered ones
-- are labelled rather than blocked: someone may genuinely have a
-- different book, and refusing them outright would be a worse lie than
-- saying where the number came from.
-- ============================================================

alter table posts add column if not exists odds_source text
  check (odds_source is null or odds_source in ('book', 'custom'));
alter table posts add column if not exists odds_book text;

comment on column posts.odds_source is
  'book = selected from a real posted market. custom = typed by the author. null = posted before this existed.';
comment on column posts.odds_book is
  'Which book priced it, when odds_source = book.';

-- Existing picks were all typed, so say so rather than letting them pass
-- as verified. Null would read as "unknown" on a column that now means
-- something.
update posts
   set odds_source = 'custom'
 where post_kind = 'pick' and odds is not null and odds_source is null;
