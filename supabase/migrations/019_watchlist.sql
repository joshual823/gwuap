-- ============================================================
-- Watchlist
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Keyed on the ticker rather than a team id, because tickers already
-- cover players and fighters too — anything with a cashtag can be
-- watched, not just teams.
-- ============================================================

create table if not exists watchlist (
  user_id uuid not null references profiles(id) on delete cascade,
  ticker text not null,
  league text,
  created_at timestamptz default now(),
  primary key (user_id, ticker)
);

create index if not exists watchlist_user_idx on watchlist (user_id, created_at desc);

alter table watchlist enable row level security;

-- Yours alone: what you follow isn't public.
drop policy if exists "read own watchlist" on watchlist;
create policy "read own watchlist" on watchlist
  for select using (auth.uid() = user_id);

drop policy if exists "add to own watchlist" on watchlist;
create policy "add to own watchlist" on watchlist
  for insert with check (auth.uid() = user_id);

drop policy if exists "remove from own watchlist" on watchlist;
create policy "remove from own watchlist" on watchlist
  for delete using (auth.uid() = user_id);
