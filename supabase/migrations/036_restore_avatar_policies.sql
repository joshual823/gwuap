-- ============================================================
-- SESSION 21 — Avatar uploads are being refused
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Uploading a profile picture fails with "new row violates row-level
-- security policy", which is the INSERT policy on storage.objects saying
-- no. Those policies were created in 010 and one account's picture did
-- upload successfully on 1 September, so they existed at some point and
-- something has removed or changed them since.
--
-- Rather than work out what, this restates them. Every statement is a
-- drop-then-create, so running it when they're already correct changes
-- nothing.
--
-- Note what is NOT here: the public read policy. 016 dropped it on
-- purpose — a public bucket serves files by URL without consulting RLS,
-- so a broad SELECT policy adds nothing for viewing and does add the
-- ability to LIST the bucket. Avatar paths are "<user_id>/<time>.jpg",
-- so listing hands over every user id in bulk. Pictures load fine
-- without it, which the one existing avatar proves.
-- ============================================================

-- The bucket itself, in case it's the thing that went missing.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Write only inside a folder named after your own user id, so nobody can
-- overwrite someone else's picture.
drop policy if exists "users upload own avatar" on storage.objects;
create policy "users upload own avatar" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- upsert on an existing path is an update, so this is needed for a
-- second upload to the same name even though the app timestamps them.
drop policy if exists "users replace own avatar" on storage.objects;
create policy "users replace own avatar" on storage.objects
  for update to authenticated using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users delete own avatar" on storage.objects;
create policy "users delete own avatar" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );
