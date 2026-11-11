-- Public photo strip fill. Opted-in member photos come first, up to 7 at random.
-- Aaron King's published, visible photos fill any remaining slots, identified by
-- user id. His profiles.public_showcase flag is left unchanged and stays off
-- by default for every member. The function still returns only image_url and
-- avatar_url, and nothing when fewer than five photos qualify in total.

create or replace function public.public_showcase_photos()
returns table (image_url text, avatar_url text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  owner_id constant uuid := 'cf99ddfd-5e79-4a01-b1f6-2ec9200db881';
  opted_count int;
  fill_count int;
  available int;
  take int;
  from_opted int;
begin
  select count(*)::int into opted_count
  from public.guild_images gi
  join public.profiles p on p.id = gi.user_id
  where p.public_showcase
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

  select count(*)::int into fill_count
  from public.guild_images gi
  join public.profiles p on p.id = gi.user_id
  where gi.user_id = owner_id
    and not p.public_showcase
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

  available := opted_count + fill_count;
  if available < 5 then
    return;
  end if;

  take := least(available, 5 + pg_catalog.floor(pg_catalog.random() * 3)::int);
  from_opted := least(opted_count, take);

  return query
  with picked_opted as (
    select gi.image_url, p.avatar_url
    from public.guild_images gi
    join public.profiles p on p.id = gi.user_id
    where p.public_showcase
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
    limit from_opted
  ),
  picked_fill as (
    select gi.image_url, p.avatar_url
    from public.guild_images gi
    join public.profiles p on p.id = gi.user_id
    where gi.user_id = owner_id
      and not p.public_showcase
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
    limit (take - from_opted)
  )
  select x.image_url::text, x.avatar_url::text
  from (
    select * from picked_opted
    union all
    select * from picked_fill
  ) x
  order by pg_catalog.random();
end;
$$;

comment on function public.public_showcase_photos() is
  'Public strip of 5 to 7 photos. Opted-in member photos first, then the owner account fills remaining slots. image_url and avatar_url only, empty when fewer than 5 qualify.';

revoke all on function public.public_showcase_photos() from public, anon, authenticated;
grant execute on function public.public_showcase_photos() to anon, service_role;
