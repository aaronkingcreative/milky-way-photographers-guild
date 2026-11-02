-- Expose the public portrait paths (header pill + original) on member_profiles so the profile page can open the full portrait.
-- Paths point at the public profile-avatars bucket. The view keeps its member-only gate.
create or replace view public.member_profiles with (security_barrier = true) as
select p.id, p.display_name, p.full_name, p.avatar_url, p.avatar_path, p.country, p.region, p.state_or_province, p.created_at,
       p.avatar_pill_path, p.avatar_original_path
from public.profiles p
where (select public.can_view_guild() as can_view_guild);
