-- Members see each other's public profile fields only. Email and exact
-- location stay private to the member themself and to admins.
--
-- profiles: own row (existing "Users can read their own profile") and admins
-- (existing "Admins can read all profiles") only.
-- member_profiles: a column-limited view of every profile, visible only to
-- signed-in members who can view the Guild.
-- Idempotent. No data changes. Signup (handle_new_user) is security definer
-- and unaffected.

drop policy if exists "Signed in users read profiles" on public.profiles;
drop policy if exists "Profiles are publicly readable" on public.profiles;

create or replace view public.member_profiles
with (security_barrier = true)
as
select p.id, p.display_name, p.full_name, p.avatar_url, p.avatar_path,
       p.country, p.region, p.state_or_province, p.created_at
from public.profiles p
where (select public.can_view_guild());

comment on view public.member_profiles is
  'Public member fields (no email, no exact location) for signed-in Guild members.';

revoke all on public.member_profiles from public, anon;
grant select on public.member_profiles to authenticated;
