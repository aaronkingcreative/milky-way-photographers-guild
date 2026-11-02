-- Image of the Week, two-phase weeks (Aaron, Nov 1, 2026).
--
-- Every ballot is keyed by the Sunday noon (America/Denver) when its entries close.
--   Entries:  the week before, from the previous Sunday 12:00 PM MT until that Sunday 12:00 PM MT  (status 'upcoming')
--   Voting:   that Sunday 12:00 PM MT until the next Sunday 12:00 PM MT                              (status 'voting_open')
--   Closed:   tallied automatically, Aaron finalizes                                                 (status 'voting_closed' / 'finalized')
-- So at any moment one ballot is open for votes (last week's entries) and one is taking entries.
-- Column meaning: submission_cutoff = voting_opens_at = period_start, voting_closes_at = period_end.

-- The Sunday whose 12:00 PM MT is the next entry cutoff (today if it is Sunday before noon MT).
create or replace function public.iotw_entry_week_sunday()
returns date
language sql
stable
set search_path to ''
as $function$
  select case
           when (now() at time zone 'America/Denver') < (public.iotw_current_week_sunday()::timestamp + interval '12 hours')
             then public.iotw_current_week_sunday()
           else public.iotw_current_week_sunday() + 7
         end;
$function$;

-- New contenders always join the ballot whose entries close at the next Sunday noon MT.
create or replace function public.ensure_iotw_ballot()
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_start timestamptz; v_end timestamptz; v_id uuid;
begin
  if auth.uid() is null or not (public.can_submit_images() or public.is_admin()) then
    raise exception 'Not allowed to enter Image of the Week' using errcode = '42501';
  end if;
  select p.period_start, p.period_end into v_start, v_end from public.iotw_ballot_period(public.iotw_entry_week_sunday()) p;
  insert into public.iotw_ballots (period_start, period_end, submission_cutoff, voting_opens_at, voting_closes_at, status)
  values (v_start, v_end, v_start, v_start, v_end, 'upcoming')
  on conflict (period_start) do nothing;
  select b.id into v_id from public.iotw_ballots b where b.period_start = v_start and b.status = 'upcoming';
  return v_id;
end;
$function$;
revoke all on function public.ensure_iotw_ballot() from public, anon;
grant execute on function public.ensure_iotw_ballot() to authenticated;

-- The 5 minute job: keep the entry ballot ready, open voting at its Sunday noon, close and tally a week later.
create or replace function public.iotw_advance_ballots()
returns void
language plpgsql
set search_path to ''
as $function$
declare v_start timestamptz; v_end timestamptz; v_id uuid;
begin
  select p.period_start, p.period_end into v_start, v_end from public.iotw_ballot_period(public.iotw_entry_week_sunday()) p;
  insert into public.iotw_ballots (period_start, period_end, submission_cutoff, voting_opens_at, voting_closes_at, status)
  values (v_start, v_end, v_start, v_start, v_end, 'upcoming')
  on conflict (period_start) do nothing;

  -- Entries closed at Sunday noon, so that set is now the ballot members vote on all week.
  update public.iotw_ballots set status = 'voting_open'
   where status = 'upcoming' and now() >= voting_opens_at and now() < voting_closes_at;

  update public.iotw_ballots set status = 'voting_closed'
   where status in ('upcoming', 'voting_open') and now() >= voting_closes_at;

  -- Tally each newly closed ballot once. Aaron picks the Photog Phavorite and finalizes.
  for v_id in select id from public.iotw_ballots where status = 'voting_closed' and tallied_at is null loop
    perform public.iotw_tally_ballot(v_id);
  end loop;
end; $function$;
revoke all on function public.iotw_advance_ballots() from public, anon, authenticated;
revoke all on function public.iotw_entry_week_sunday() from public, anon;
grant execute on function public.iotw_entry_week_sunday() to authenticated;

-- Members enter only while a ballot is still taking entries (before its Sunday noon cutoff).
drop policy if exists "Members enter own reports" on public.iotw_ballot_entries;
create policy "Members enter own reports" on public.iotw_ballot_entries
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.can_submit_images()
    and exists (select 1 from public.field_reports fr where fr.id = iotw_ballot_entries.field_report_id and fr.user_id = auth.uid() and fr.status <> 'removed')
    and exists (
      select 1 from public.iotw_ballots b
       where b.id = iotw_ballot_entries.ballot_id
         and b.status = 'upcoming'
         and now() < b.submission_cutoff
    )
  );

-- Members may withdraw their own contender only while entries are still open.
drop policy if exists "Members withdraw own upcoming entries" on public.iotw_ballot_entries;
create policy "Members withdraw own upcoming entries" on public.iotw_ballot_entries
  for delete to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from public.iotw_ballots b where b.id = iotw_ballot_entries.ballot_id and b.status = 'upcoming' and now() < b.submission_cutoff)
  );

comment on column public.iotw_ballots.accepts_entries_until is
  'Retired Nov 1, 2026 by the two-phase weekly model. Entries always close at submission_cutoff (Sunday 12:00 PM MT). Kept for history only.';

-- First cycle under the new rule. Nothing is deleted; both existing ballots move one week later.
-- 1) The empty ballot that was waiting for Nov 8 becomes the Nov 15 entry week (entries Nov 8 to Nov 15 noon, voting to Nov 22 noon).
update public.iotw_ballots
   set period_start = timestamptz '2026-11-15 12:00:00 America/Denver',
       period_end = timestamptz '2026-11-22 12:00:00 America/Denver',
       submission_cutoff = timestamptz '2026-11-15 12:00:00 America/Denver',
       voting_opens_at = timestamptz '2026-11-15 12:00:00 America/Denver',
       voting_closes_at = timestamptz '2026-11-22 12:00:00 America/Denver',
       status = 'upcoming'
 where id = '39bea3ba-b9bc-4770-b9cb-1cbe9fec4787'
   and tallied_at is null
   and not exists (select 1 from public.iotw_ballot_entries e where e.ballot_id = '39bea3ba-b9bc-4770-b9cb-1cbe9fec4787')
   and not exists (select 1 from public.iotw_ballots x where x.period_start = timestamptz '2026-11-15 12:00:00 America/Denver');

-- 2) The current set (Tim's and Chris's contenders, plus anything entered before Sun Nov 8 noon MT) keeps taking
--    entries until Nov 8 at noon MT, then members vote on it until Sun Nov 15 at noon MT. No votes before Nov 8 noon.
update public.iotw_ballots
   set period_start = timestamptz '2026-11-08 12:00:00 America/Denver',
       period_end = timestamptz '2026-11-15 12:00:00 America/Denver',
       submission_cutoff = timestamptz '2026-11-08 12:00:00 America/Denver',
       voting_opens_at = timestamptz '2026-11-08 12:00:00 America/Denver',
       voting_closes_at = timestamptz '2026-11-15 12:00:00 America/Denver',
       status = 'upcoming',
       accepts_entries_until = null
 where id = 'ec721635-8180-48bf-b5e9-6c0688cd2de8'
   and tallied_at is null
   and status in ('upcoming', 'voting_open')
   and not exists (select 1 from public.iotw_votes v where v.ballot_id = 'ec721635-8180-48bf-b5e9-6c0688cd2de8')
   and not exists (select 1 from public.iotw_ballots x where x.period_start = timestamptz '2026-11-08 12:00:00 America/Denver');

-- 3) Contender marks follow their ballot's week key so the one-contender-per-week check stays correct.
update public.field_reports fr
   set iotw_week_start = date '2026-11-08'
  from public.iotw_ballot_entries e
 where e.field_report_id = fr.id
   and e.ballot_id = 'ec721635-8180-48bf-b5e9-6c0688cd2de8'
   and fr.iotw_week_start = date '2026-11-01';

-- Contest numbers (Aaron, Nov 1, 2026): every contest is named by the ISO week of its submission week,
-- the Monday to Sunday week whose entries close that Sunday at 12:00 PM MT. The set closing Sun Nov 8, 2026 is Week 45.
alter table public.iotw_ballots add column if not exists contest_week smallint;
alter table public.iotw_ballots add column if not exists contest_year smallint;
comment on column public.iotw_ballots.contest_week is 'ISO week number of the submission week (entries close Sunday 12:00 PM MT on period_start). Shown as "Week N".';
comment on column public.iotw_ballots.contest_year is 'ISO year that goes with contest_week.';

create or replace function public.iotw_set_contest_week()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare v_day date;
begin
  v_day := (new.submission_cutoff at time zone 'America/Denver')::date;
  new.contest_week := extract(week from v_day)::smallint;
  new.contest_year := extract(isoyear from v_day)::smallint;
  return new;
end; $function$;
revoke all on function public.iotw_set_contest_week() from public, anon, authenticated;

drop trigger if exists iotw_ballots_contest_week on public.iotw_ballots;
create trigger iotw_ballots_contest_week
  before insert or update of submission_cutoff, period_start on public.iotw_ballots
  for each row execute function public.iotw_set_contest_week();

update public.iotw_ballots
   set contest_week = extract(week from (submission_cutoff at time zone 'America/Denver')::date)::smallint,
       contest_year = extract(isoyear from (submission_cutoff at time zone 'America/Denver')::date)::smallint;
