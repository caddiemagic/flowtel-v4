-- Additive private mentorship replay storage.
-- This bucket remains private; only server-side signed URLs will permit playback.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('flowtel-mentorship-replays','flowtel-mentorship-replays',false,524288000,array['video/mp4','video/webm','audio/mpeg','audio/mp4','audio/webm'])
on conflict (id) do nothing;
