-- Schedule fields for the week taking entries and the week being voted on.
-- Signed-out pages (and the design preview) read these through a SECURITY DEFINER
-- function because iotw_ballots row policy requires can_view_guild().
-- Returns only timing and status. No notes, no winner ids, no photographer data.

create or replace function public.iotw_schedule_ballots()
returns table (
  id uuid,
  contest_week smallint,
  contest_year smallint,
  status text,
  period_start timestamptz,
  period_end timestamptz,
  submission_cutoff timestamptz,
  voting_opens_at timestamptz,
  voting_closes_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    b.contest_week,
    b.contest_year,
    b.status,
    b.period_start,
    b.period_end,
    b.submission_cutoff,
    b.voting_opens_at,
    b.voting_closes_at
  from public.iotw_ballots b
  where b.status in ('upcoming', 'voting_open');
$$;

comment on function public.iotw_schedule_ballots() is
  'Timing and status for the open voting week and the week taking entries. Safe for signed-out readers.';

revoke all on function public.iotw_schedule_ballots() from public;
grant execute on function public.iotw_schedule_ballots() to anon, authenticated, service_role;
