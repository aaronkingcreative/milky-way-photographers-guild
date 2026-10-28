-- Security hardening and Image of the Week lifecycle.
-- Safe to re-run. Changes grants, policies, functions and constraints only. No rows are deleted.

------------------------------------------------------------------------------
-- 1. Function hardening (Supabase security advisors)
------------------------------------------------------------------------------
alter function public.set_updated_at() set search_path = '';

-- handle_new_user only runs as the auth.users trigger. Nobody calls it directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- These helpers are used inside RLS policies evaluated for signed-in members, and the app
-- calls is_admin and has_active_guild_access through rpc. Signed-out visitors never need them.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.has_active_guild_access() from public, anon;
revoke execute on function public.can_view_guild() from public, anon;
revoke execute on function public.can_submit_images() from public, anon;
grant execute on function public.is_admin(), public.has_active_guild_access(), public.can_view_guild(), public.can_submit_images() to authenticated, service_role;

------------------------------------------------------------------------------
-- 2. Profiles. Block self-promotion to admin and stop anonymous email harvesting.
------------------------------------------------------------------------------
-- A permissive "update own profile" policy plus table-wide UPDATE let any member set role = 'admin'.
-- Members may now only write their own identity columns. role, created_at and updated_at are not writable.
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, email, full_name, display_name, avatar_url, avatar_path, country, region, state_or_province, specific_location, specific_location_name) on public.profiles to authenticated;
grant update (id, email, full_name, display_name, avatar_url, avatar_path, country, region, state_or_province, specific_location, specific_location_name) on public.profiles to authenticated;

-- Profiles (including email) were readable with the public anon key. Limit to signed-in users.
do $$ begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Profiles are publicly readable') then
    alter policy "Profiles are publicly readable" on public.profiles to authenticated;
  end if;
end $$;

-- Signed-out visitors never write to app tables.
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke insert, update, delete, truncate on public.%I from anon', t.tablename);
  end loop;
end $$;

------------------------------------------------------------------------------
-- 3. Relationships to profiles so the app can embed author names (profiles(...) selects)
------------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'guild_images_user_id_profiles_fkey') then
    alter table public.guild_images add constraint guild_images_user_id_profiles_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'field_reports_user_id_profiles_fkey') then
    alter table public.field_reports add constraint field_reports_user_id_profiles_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'field_report_achievement_claims_user_id_profiles_fkey') then
    alter table public.field_report_achievement_claims add constraint field_report_achievement_claims_user_id_profiles_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

------------------------------------------------------------------------------
-- 4. Image of the Week lifecycle
-- Guild weeks run Sunday 00:00 to Saturday 23:59:59 America/Denver.
-- Field reports filed during week W are entered in the ballot for week W+7.
-- That ballot opens for voting Sunday W+7 at midnight and closes Saturday night (Sunday W+14 at midnight).
-- Mirrors getIotwTargetPeriod() in lib/iotw.ts.
------------------------------------------------------------------------------
create or replace function public.iotw_ballot_period(p_week_sunday date)
returns table (period_start timestamptz, period_end timestamptz)
language sql immutable set search_path = ''
as $$
  select (p_week_sunday::timestamp at time zone 'America/Denver'),
         ((p_week_sunday + 7)::timestamp at time zone 'America/Denver');
$$;

create or replace function public.iotw_current_week_sunday()
returns date
language sql stable set search_path = ''
as $$
  select ((now() at time zone 'America/Denver')::date - extract(dow from (now() at time zone 'America/Denver'))::int);
$$;

-- Creates (if needed) and returns the ballot that a field report filed right now is entered into.
-- Members call this through rpc. It never changes an existing ballot.
create or replace function public.ensure_iotw_ballot()
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_start timestamptz; v_end timestamptz; v_id uuid;
begin
  if auth.uid() is null or not (public.can_submit_images() or public.is_admin()) then
    raise exception 'Not allowed to enter Image of the Week' using errcode = '42501';
  end if;
  select p.period_start, p.period_end into v_start, v_end from public.iotw_ballot_period(public.iotw_current_week_sunday() + 7) p;
  insert into public.iotw_ballots (period_start, period_end, submission_cutoff, voting_opens_at, voting_closes_at, status)
  values (v_start, v_end, v_start, v_start, v_end, 'upcoming')
  on conflict (period_start) do nothing;
  select b.id into v_id from public.iotw_ballots b where b.period_start = v_start;
  return v_id;
end;
$$;
revoke execute on function public.ensure_iotw_ballot() from public, anon;
grant execute on function public.ensure_iotw_ballot() to authenticated, service_role;
revoke execute on function public.iotw_ballot_period(date), public.iotw_current_week_sunday() from public, anon;
grant execute on function public.iotw_ballot_period(date), public.iotw_current_week_sunday() to authenticated, service_role;

-- Opens and closes ballots on schedule. Run by pg_cron only.
create or replace function public.iotw_advance_ballots()
returns void
language plpgsql set search_path = ''
as $$
declare v_start timestamptz; v_end timestamptz;
begin
  -- Keep the next ballot ready so entries always have somewhere to go.
  select p.period_start, p.period_end into v_start, v_end from public.iotw_ballot_period(public.iotw_current_week_sunday() + 7) p;
  insert into public.iotw_ballots (period_start, period_end, submission_cutoff, voting_opens_at, voting_closes_at, status)
  values (v_start, v_end, v_start, v_start, v_end, 'upcoming')
  on conflict (period_start) do nothing;

  update public.iotw_ballots set status = 'voting_open'
   where status = 'upcoming' and now() >= voting_opens_at and now() < voting_closes_at;

  update public.iotw_ballots set status = 'voting_closed'
   where status in ('upcoming', 'voting_open') and now() >= voting_closes_at;
end;
$$;
revoke execute on function public.iotw_advance_ballots() from public, anon, authenticated;

-- Entries only go into a ballot that has not opened yet, by members who can submit, for their own report.
drop policy if exists "Members enter own reports" on public.iotw_ballot_entries;
create policy "Members enter own reports" on public.iotw_ballot_entries for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.can_submit_images()
    and exists (select 1 from public.field_reports fr where fr.id = field_report_id and fr.user_id = auth.uid() and fr.status <> 'removed')
    and exists (select 1 from public.iotw_ballots b where b.id = ballot_id and b.status = 'upcoming')
  );

-- Voting needs active Guild access (free accounts cannot vote).
drop policy if exists "Members insert own open IOTW votes" on public.iotw_votes;
create policy "Members insert own open IOTW votes" on public.iotw_votes for insert to authenticated
  with check (voter_user_id = auth.uid() and public.can_view_guild() and exists (select 1 from public.iotw_ballots b where b.id = ballot_id and b.status = 'voting_open' and now() >= b.voting_opens_at and now() < b.voting_closes_at));
drop policy if exists "Members update own open IOTW votes" on public.iotw_votes;
create policy "Members update own open IOTW votes" on public.iotw_votes for update to authenticated
  using (voter_user_id = auth.uid())
  with check (voter_user_id = auth.uid() and public.can_view_guild() and exists (select 1 from public.iotw_ballots b where b.id = ballot_id and b.status = 'voting_open' and now() < b.voting_closes_at));

-- Schedule. Every 5 minutes is plenty for a weekly ballot.
create extension if not exists pg_cron;
do $$ begin
  if exists (select 1 from cron.job where jobname = 'iotw-advance-ballots') then
    perform cron.unschedule('iotw-advance-ballots');
  end if;
  perform cron.schedule('iotw-advance-ballots', '*/5 * * * *', 'select public.iotw_advance_ballots()');
end $$;

select public.iotw_advance_ballots();
