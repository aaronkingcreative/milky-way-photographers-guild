-- Members can edit the words on their own field reports (title, location,
-- story, gear and notes). Owner-only UPDATE policies already exist; this adds
-- a guard so a non-admin owner cannot change moderation, ownership, image
-- file or publishing columns through the API. Admins are unaffected.
-- Idempotent. No data changes.

create or replace function public.guard_owner_report_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  changed text[];
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if tg_table_name = 'guild_images' then
    select array_agg(k) into changed from (values
      ('user_id', new.user_id is distinct from old.user_id),
      ('image_url', new.image_url is distinct from old.image_url),
      ('image_original_path', new.image_original_path is distinct from old.image_original_path),
      ('display_image_path', new.display_image_path is distinct from old.display_image_path),
      ('detail_image_path', new.detail_image_path is distinct from old.detail_image_path),
      ('moderation_status', new.moderation_status is distinct from old.moderation_status),
      ('moderation_blur_required', new.moderation_blur_required is distinct from old.moderation_blur_required),
      ('moderation_reason', new.moderation_reason is distinct from old.moderation_reason),
      ('moderation_reviewed_by', new.moderation_reviewed_by is distinct from old.moderation_reviewed_by),
      ('hidden_at', new.hidden_at is distinct from old.hidden_at),
      ('hidden_by', new.hidden_by is distinct from old.hidden_by),
      ('deleted_at', new.deleted_at is distinct from old.deleted_at),
      ('deleted_by', new.deleted_by is distinct from old.deleted_by),
      ('status', new.status is distinct from old.status),
      ('created_at', new.created_at is distinct from old.created_at)
    ) as t(k, c) where c;
  else
    select array_agg(k) into changed from (values
      ('user_id', new.user_id is distinct from old.user_id),
      ('image_original_path', new.image_original_path is distinct from old.image_original_path),
      ('image_bucket', new.image_bucket is distinct from old.image_bucket),
      ('guild_image_id', old.guild_image_id is not null and new.guild_image_id is distinct from old.guild_image_id),
      ('status', new.status is distinct from old.status),
      ('created_at', new.created_at is distinct from old.created_at)
    ) as t(k, c) where c;
  end if;
  if changed is not null then
    raise exception 'Only Guild admins can change: %', array_to_string(changed, ', ')
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guild_images_guard_owner_update on public.guild_images;
create trigger guild_images_guard_owner_update
  before update on public.guild_images
  for each row execute function public.guard_owner_report_update();

drop trigger if exists field_reports_guard_owner_update on public.field_reports;
create trigger field_reports_guard_owner_update
  before update on public.field_reports
  for each row execute function public.guard_owner_report_update();

-- Owner policies: limit to signed-in users explicitly.
drop policy if exists "Owners update own non-admin image fields" on public.guild_images;
create policy "Owners update own non-admin image fields" on public.guild_images
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Members update own field reports" on public.field_reports;
create policy "Members update own field reports" on public.field_reports
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
