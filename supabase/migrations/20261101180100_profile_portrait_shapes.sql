-- Guild portrait in two shapes.
--   avatar_path           circle crop (512 x 512), used everywhere a member avatar shows
--   avatar_pill_path      pill crop (700 x 400, 7:4), used in the header
--   avatar_original_path  the source photo, resized to 2048 px on the long edge, so members can re-frame later
--   avatar_crop           {"circle":{"x","y","zoom"},"pill":{"x","y","zoom"}}, crop centers as fractions of the source
alter table public.profiles add column if not exists avatar_pill_path text;
alter table public.profiles add column if not exists avatar_original_path text;
alter table public.profiles add column if not exists avatar_crop jsonb;

alter table public.profiles drop constraint if exists profiles_avatar_pill_path_own_folder;
alter table public.profiles add constraint profiles_avatar_pill_path_own_folder
  check (avatar_pill_path is null or avatar_pill_path like 'users/' || id::text || '/%');
alter table public.profiles drop constraint if exists profiles_avatar_original_path_own_folder;
alter table public.profiles add constraint profiles_avatar_original_path_own_folder
  check (avatar_original_path is null or avatar_original_path like 'users/' || id::text || '/%');
alter table public.profiles drop constraint if exists profiles_avatar_crop_object;
alter table public.profiles add constraint profiles_avatar_crop_object
  check (avatar_crop is null or jsonb_typeof(avatar_crop) = 'object');

grant insert (avatar_pill_path, avatar_original_path, avatar_crop) on public.profiles to authenticated;
grant update (avatar_pill_path, avatar_original_path, avatar_crop) on public.profiles to authenticated;
