-- ============================================================
-- SESSION 10b — Realtime for the Vent room
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Only this table. Realtime on an empty room is an empty room that
-- updates instantly, so it isn't worth it anywhere else yet — but Vent
-- is the one place where a reply arriving a minute late matters.
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'vent_messages'
  ) then
    alter publication supabase_realtime add table vent_messages;
  end if;
end $$;
