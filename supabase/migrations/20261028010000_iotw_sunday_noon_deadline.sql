-- Image of the Week deadline is Sunday 12:00 PM America/Denver (winners crowned Monday).
-- Field reports filed during week W (Sunday to Saturday) enter the ballot that opens Sunday W+7 at noon
-- and closes Sunday W+14 at noon. Mirrors lib/iotw.ts.
create or replace function public.iotw_ballot_period(p_week_sunday date)
returns table (period_start timestamptz, period_end timestamptz)
language sql immutable set search_path = ''
as $$
  select ((p_week_sunday::timestamp + interval '12 hours') at time zone 'America/Denver'),
         (((p_week_sunday + 7)::timestamp + interval '12 hours') at time zone 'America/Denver');
$$;

-- Move ballots created on the earlier midnight schedule to noon, only while they are still upcoming and empty.
-- Recomputed from the Denver date (not a fixed +12h) so DST weeks such as Nov 1 stay at noon.
with fix as (
  select b.id, p.period_start, p.period_end
    from public.iotw_ballots b
   cross join lateral public.iotw_ballot_period((b.period_start at time zone 'America/Denver')::date) p
   where b.status = 'upcoming'
     and extract(hour from (b.period_start at time zone 'America/Denver')) = 0
     and not exists (select 1 from public.iotw_ballot_entries e where e.ballot_id = b.id)
     and not exists (select 1 from public.iotw_ballots o where o.period_start = p.period_start)
)
update public.iotw_ballots t
   set period_start = fix.period_start, period_end = fix.period_end, submission_cutoff = fix.period_start,
       voting_opens_at = fix.period_start, voting_closes_at = fix.period_end
  from fix
 where t.id = fix.id;

select public.iotw_advance_ballots();
