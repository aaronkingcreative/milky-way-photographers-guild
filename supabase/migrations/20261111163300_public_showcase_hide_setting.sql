-- Public photo strip uses published, visible Guild photos unless a member hides theirs.
-- hide_from_public_showcase defaults to false, so current members stay visible.
-- public_showcase is left in place and is not inverted, so no one is hidden by accident.

alter table public.profiles
  add column if not exists hide_from_public_showcase boolean not null default false;

comment on column public.profiles.hide_from_public_showcase is
  'When true, the member photos and profile picture stay off the public Guild page. Off means they may appear without the member name.';

create index if not exists profiles_hide_from_public_showcase_idx
  on public.profiles (id)
  where hide_from_public_showcase;

grant update (hide_from_public_showcase) on public.profiles to authenticated;
grant insert (hide_from_public_showcase) on public.profiles to authenticated;

create or replace view public.member_profiles with (security_barrier = true) as
select p.id, p.display_name, p.full_name, p.avatar_url, p.avatar_path, p.country, p.region, p.state_or_province, p.created_at,
       p.avatar_pill_path, p.avatar_original_path, p.public_showcase, p.hide_from_public_showcase
from public.profiles p
where (select public.can_view_guild() as can_view_guild);

comment on view public.member_profiles is
  'Public member fields (no email, no exact location) for signed-in Guild members.';

revoke all on public.member_profiles from public, anon;
grant select on public.member_profiles to authenticated;

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

  if available < 5 then
    take := available;
  else
    take := least(available, 5 + pg_catalog.floor(pg_catalog.random() * 3)::int);
  end if;

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
  'Public strip of published photos. image_url and avatar_url only, a random 5 to 7 when enough exist, or every qualifying photo when fewer than 5. Members who hide theirs are left out.';

revoke all on function public.public_showcase_photos() from public, anon, authenticated;
grant execute on function public.public_showcase_photos() to anon, service_role;
