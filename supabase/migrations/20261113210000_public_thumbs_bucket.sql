-- Stored thumbnails for the public pile, made once with sharp by the app server.
-- Public read through the object URL. Only the service role writes, so no insert policy is added.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('thumbs', 'thumbs', true, 5242880, array['image/webp'])
on conflict (id) do nothing;
