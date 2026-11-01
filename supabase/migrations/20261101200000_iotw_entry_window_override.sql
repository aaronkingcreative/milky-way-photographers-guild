-- Per-ballot entry window override.
-- Normally new contenders go to the next upcoming ballot. When a ballot has
-- accepts_entries_until in the future, new contenders join that ballot instead,
-- even while its vote is open. Used for the one-time Nov 8, 2026 extension so
-- the week with a single contender can gather a real field before it closes.

alter table public.iotw_ballots add column if not exists accepts_entries_until timestamptz;
comment on column public.iotw_ballots.accepts_entries_until is
  'When set and in the future, new IOTW contenders join this ballot instead of the next one, and the mandatory vote gate waits until this time.';

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
  select b.id into v_id from public.iotw_ballots b
   where b.accepts_entries_until > now() and b.status in ('upcoming', 'voting_open')
   order by b.period_start limit 1;
  if v_id is not null then
    return v_id;
  end if;
  select p.period_start, p.period_end into v_start, v_end from public.iotw_ballot_period(public.iotw_current_week_sunday() + 7) p;
  insert into public.iotw_ballots (period_start, period_end, submission_cutoff, voting_opens_at, voting_closes_at, status)
  values (v_start, v_end, v_start, v_start, v_end, 'upcoming')
  on conflict (period_start) do nothing;
  select b.id into v_id from public.iotw_ballots b where b.period_start = v_start;
  return v_id;
end;
$function$;

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
         and (b.status = 'upcoming' or (b.status = 'voting_open' and b.accepts_entries_until > now()))
    )
  );

-- One-time extension. The ballot that opened Nov 1, 2026 keeps taking contenders
-- through Saturday Nov 7 (Mountain) and closes Sunday Nov 8 at noon Mountain.
update public.iotw_ballots
   set accepts_entries_until = timestamptz '2026-11-08 00:00:00 America/Denver',
       voting_closes_at = timestamptz '2026-11-08 12:00:00 America/Denver'
 where period_start = timestamptz '2026-11-01 12:00:00 America/Denver'
   and status in ('upcoming', 'voting_open')
   and tallied_at is null;
