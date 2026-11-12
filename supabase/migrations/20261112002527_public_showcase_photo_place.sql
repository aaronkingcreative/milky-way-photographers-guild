-- Public pile of Guild prints can include the published field report's
-- region and country. Still no names or user identifiers. Grants stay
-- with anon and service_role only.

drop function if exists public.public_showcase_photos();

create function public.public_showcase_photos()
returns table (image_url text, avatar_url text, region text, country text)
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
  select
    gi.image_url::text,
    p.avatar_url::text,
    fr.region::text,
    fr.country::text
  from public.guild_images gi
  join public.profiles p on p.id = gi.user_id
  left join lateral (
    select report.region, report.country
    from public.field_reports report
    where report.guild_image_id = gi.id
      and report.status = 'published'
    order by report.updated_at desc
    limit 1
  ) fr on true
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
      from public.field_reports hidden
      where hidden.guild_image_id = gi.id
        and hidden.status <> 'published'
    )
  order by pg_catalog.random()
  limit take;
end;
$$;

comment on function public.public_showcase_photos() is
  'Public pile of published photos. image_url, avatar_url, and the published field report region and country only, up to 9 at random. No names or user identifiers. Members who hide theirs are left out.';

revoke all on function public.public_showcase_photos() from public, anon, authenticated;
grant execute on function public.public_showcase_photos() to anon, service_role;
