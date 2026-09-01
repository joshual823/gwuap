-- ============================================================
-- SESSION 9d — Profile pictures
-- Run this once in the Supabase SQL editor (safe to re-run).
--
-- Uploads, not a URL field. A pasted URL can have its contents swapped
-- after anyone has looked at it; an uploaded file can't.
--
-- Moderation note: an avatar is MORE visible than the bet slip uploads
-- we removed — it appears beside every post and comment its owner makes.
-- What makes it tolerable is that it's one image per user rather than
-- one per post, so clearing avatar_url (or banning the account, which
-- already hides their posts) fully resolves it.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read: avatars render for logged-out visitors too.
drop policy if exists "avatars are publicly readable" on storage.objects;
create policy "avatars are publicly readable" on storage.objects
  for select using (bucket_id = 'avatars');

-- Write only inside a folder named after your own user id, so nobody can
-- overwrite someone else's picture.
drop policy if exists "users upload own avatar" on storage.objects;
create policy "users upload own avatar" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users replace own avatar" on storage.objects;
create policy "users replace own avatar" on storage.objects
  for update to authenticated using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users delete own avatar" on storage.objects;
create policy "users delete own avatar" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );
