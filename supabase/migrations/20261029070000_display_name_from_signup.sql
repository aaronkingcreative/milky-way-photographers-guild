-- Members' signup name (auth metadata full_name) was saved to profiles.full_name but never to
-- profiles.display_name, so most members had no display name.
--
-- 1. guild_plausible_name: same rules the app uses before showing a name publicly. Rejects blanks,
--    "null"/"undefined", lone letters, anything containing @, and long single-token random strings
--    left by bot signups.
-- 2. handle_new_user now also sets display_name from the member's own signup name. The founding
--    free year grant is unchanged.
-- 3. One-time backfill: display_name is filled ONLY where it is empty, and ONLY from that same
--    member's own signup metadata. No names are invented and no other column is written.

create or replace function public.guild_plausible_name(p_name text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(
    length(btrim(p_name)) between 2 and 80
    and lower(btrim(p_name)) not in ('null', 'undefined', 'none', 'n/a')
    and position('@' in p_name) = 0
    and btrim(p_name) ~ '[[:alpha:]]{2,}'
    and not (
      btrim(p_name) !~ '\s'
      and length(btrim(p_name)) >= 12
      and length(regexp_replace(substr(btrim(p_name), 2), '[^A-Z]', '', 'g')) >= 3
    ),
  false);
$$;
revoke execute on function public.guild_plausible_name(text) from public, anon;
grant execute on function public.guild_plausible_name(text) to authenticated, service_role;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = 'public' as $$
declare v_name text := nullif(btrim(new.raw_user_meta_data->>'full_name'), '');
begin
  insert into public.profiles (id, email, full_name, display_name, role)
  values (new.id, new.email, v_name, case when public.guild_plausible_name(v_name) then v_name end, 'member')
  on conflict (id) do nothing;

  if now() < public.founding_free_year_cutoff()
     and not exists (select 1 from public.membership_grants g where g.user_id = new.id and g.membership_type = 'founding_free_year') then
    insert into public.membership_grants (user_id, source, status, starts_at, expires_at, auto_renews, access_level, membership_type, notes)
    values (new.id, 'founding_free_year', 'active', now(), public.founding_free_year_expires(), false, 'trial', 'founding_free_year',
            'Free founding year for members who joined in 2026');
  end if;
  return new;
end; $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

update public.profiles p
   set display_name = btrim(u.raw_user_meta_data->>'full_name')
  from auth.users u
 where u.id = p.id
   and nullif(btrim(p.display_name), '') is null
   and public.guild_plausible_name(u.raw_user_meta_data->>'full_name');
