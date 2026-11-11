-- Public pile of Guild prints can use up to nine published, visible photos.
-- The function still returns only image_url and avatar_url. Members who hide
-- theirs stay out. Grants stay with anon and service_role only.

create or replace function public.public_showcase_photos()
returns table (image_url text, avatar_url text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  available int;
  take int;
begin
  select count(*)::int into available
  from public.guild_images gi
  join public.profiles p on p.id = gi.user_id
  where not p.hide_from_public_showcase
    and gi.deleted_at is null
    and gi.hidden_at is null
    and gi.status = 'published'
    and gi.moderation_status = 'visible'
    and gi.moderation_blur_required = false
    and gi.image_url ~ '^https://'
    and p.avatar_url ~ '^https://'
    and not exists (
      select 1
      from public.field_reports fr
      where fr.guild_image_id = gi.id
        and fr.status <> 'published'
    );

  if available < 1 then
    return;
  end if;

  take := least(available, 9);

  return query
  select gi.image_url::text, p.avatar_url::text
  from public.guild_images gi
  join public.profiles p on p.id = gi.user_id
  where not p.hide_from_public_showcase
    and gi.deleted_at is null
    and gi.hidden_at is null
    and gi.status = 'published'
    and gi.moderation_status = 'visible'
    and gi.moderation_blur_required = false
    and gi.image_url ~ '^https://'
    and p.avatar_url ~ '^https://'
    and not exists (
      select 1
      from public.field_reports fr
      where fr.guild_image_id = gi.id
        and fr.status <> 'published'
    )
  order by pg_catalog.random()
  limit take;
end;
$$;

comment on function public.public_showcase_photos() is
  'Public pile of published photos. image_url and avatar_url only, up to 9 at random, or every qualifying photo when fewer than 9. Members who hide theirs are left out.';

revoke all on function public.public_showcase_photos() from public, anon, authenticated;
grant execute on function public.public_showcase_photos() to anon, service_role;
