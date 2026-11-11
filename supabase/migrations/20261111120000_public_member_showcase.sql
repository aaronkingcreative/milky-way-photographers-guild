-- Public Guild page totals and the opt-in photo strip.
-- Not applied by the app. Run this in the database before the setting can save.
--
-- Counts (public_guild_counts returns only these numbers):
--   comments  image_comments rows that are not deleted
--   pics      field_reports with status published (one shared picture each)
--   honors    user_achievements in an earned status, excluding rank milestones
-- Conversations / threads have no table. guild_messages is the hall notice, not a member thread.
-- Feedback has no table. Written feedback is stored in image_comments, so it is not counted twice.
--
-- Photos (public_showcase_photos returns only image_url and avatar_url):
--   published, visible guild_images whose owner set profiles.public_showcase.
-- Storage buckets stay as they are. This migration does not make any bucket public.

alter table public.profiles
  add column if not exists public_showcase boolean not null default false;

comment on column public.profiles.public_showcase is
  'When true, published photos and the profile picture may appear on the public Guild page without the member name. Off unless the member turns it on.';

create index if not exists profiles_public_showcase_idx
  on public.profiles (id)
  where public_showcase;

-- Members may turn the flag on or off on their own profile. No other new column is writable.
grant update (public_showcase) on public.profiles to authenticated;
grant insert (public_showcase) on public.profiles to authenticated;

-- member_profiles stays a member-only view. anon is not granted, and signed-out visitors never select it.
create or replace view public.member_profiles with (security_barrier = true) as
select p.id, p.display_name, p.full_name, p.avatar_url, p.avatar_path, p.country, p.region, p.state_or_province, p.created_at,
       p.avatar_pill_path, p.avatar_original_path, p.public_showcase
from public.profiles p
where (select public.can_view_guild() as can_view_guild);

comment on view public.member_profiles is
  'Public member fields (no email, no exact location) for signed-in Guild members.';

revoke all on public.member_profiles from public, anon;
grant select on public.member_profiles to authenticated;

-- Intentionally executable by anon. The body returns counts only, never member rows.
create or replace function public.public_guild_counts()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'comments', (
      select count(*)::int
      from public.image_comments
      where deleted_at is null
    ),
    'pics', (
      select count(*)::int
      from public.field_reports
      where status = 'published'
    ),
    'honors', (
      select count(*)::int
      from public.user_achievements ua
      join public.achievement_definitions ad on ad.id = ua.achievement_id
      where ua.status in ('auto_awarded_pending_review', 'verified')
        and ad.category <> 'rank'
        and pg_catalog.coalesce(ad.counts_toward_rank, true)
        and pg_catalog.strpos(ua.achievement_id, 'rank_') <> 1
    )
  );
$$;

comment on function public.public_guild_counts() is
  'Public totals only. comments from image_comments, pics from published field_reports, honors from earned user_achievements excluding ranks.';

revoke all on function public.public_guild_counts() from public, anon, authenticated;
grant execute on function public.public_guild_counts() to anon, service_role;

-- Intentionally executable by anon. Returns at most seven https URLs, and nothing when fewer than five qualify.
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

  if available < 5 then
    return;
  end if;

  take := pg_catalog.least(available, 5 + pg_catalog.floor(pg_catalog.random() * 3)::int);

  return query
  select gi.image_url::text, p.avatar_url::text
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
  limit take;
end;
$$;

comment on function public.public_showcase_photos() is
  'Opted-in public strip. image_url and avatar_url only, 5 to 7 rows, empty when fewer than 5 qualify.';

revoke all on function public.public_showcase_photos() from public, anon, authenticated;
grant execute on function public.public_showcase_photos() to anon, service_role;
