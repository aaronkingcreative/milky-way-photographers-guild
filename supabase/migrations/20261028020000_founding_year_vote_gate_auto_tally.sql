-- Founding free year, mandatory-vote rules, and automatic IOTW tally.
-- Safe to re-run. No rows are deleted.

-------------------------------------------------------------------------------
-- 1. Membership type on grants (hook for future month to month billing)
-------------------------------------------------------------------------------
alter table public.membership_grants add column if not exists membership_type text not null default 'manual';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'membership_grants_membership_type_check') then
    alter table public.membership_grants add constraint membership_grants_membership_type_check
      check (membership_type in ('manual', 'admin', 'comp', 'workshop', 'founding_free_year', 'monthly'));
  end if;
end $$;
create index if not exists membership_grants_user_active_idx on public.membership_grants (user_id) where status = 'active';

-- Founding year window. Joins before 2027-01-01 00:00 MT get access until 2028-01-01 00:00 MT.
create or replace function public.founding_free_year_cutoff() returns timestamptz
language sql immutable set search_path = '' as $$ select timestamptz '2027-01-01 00:00:00 America/Denver' $$;
create or replace function public.founding_free_year_expires() returns timestamptz
language sql immutable set search_path = '' as $$ select timestamptz '2028-01-01 00:00:00 America/Denver' $$;

-- Free trial grants can post images too.
create or replace function public.can_submit_images() returns boolean
language sql stable security definer set search_path = 'public' as $$
  select public.is_admin() or exists (
    select 1 from public.membership_grants
     where user_id = auth.uid() and status = 'active' and starts_at <= now()
       and (expires_at is null or expires_at > now())
       and coalesce(access_level, 'manual') in ('paid', 'workshop', 'comp', 'admin', 'manual', 'trial'));
$$;
revoke execute on function public.can_submit_images() from public, anon;
grant execute on function public.can_submit_images() to authenticated, service_role;

-- Signup creates the profile and, during the founding window, the free year grant.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = 'public' as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'member')
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

-- Backfill existing members who have no grant at all. Existing grants (Aaron's admin rows) are untouched.
insert into public.membership_grants (user_id, source, status, starts_at, expires_at, auto_renews, access_level, membership_type, notes)
select u.id, 'founding_free_year', 'active', now(), public.founding_free_year_expires(), false, 'trial', 'founding_free_year',
       'Free founding year backfill for members who joined in 2026'
  from auth.users u
  join public.profiles p on p.id = u.id
 where now() < public.founding_free_year_cutoff()
   and not exists (select 1 from public.membership_grants g where g.user_id = u.id);

-------------------------------------------------------------------------------
-- 2. Votes must pick images on that ballot, never the voter's own
-------------------------------------------------------------------------------
create or replace function public.iotw_validate_vote() returns trigger
language plpgsql set search_path = '' as $$
declare v_id uuid;
begin
  foreach v_id in array array[new.first_place_field_report_id, new.second_place_field_report_id, new.third_place_field_report_id] loop
    continue when v_id is null;
    if not exists (select 1 from public.iotw_ballot_entries e where e.ballot_id = new.ballot_id and e.field_report_id = v_id) then
      raise exception 'Choose images from this ballot' using errcode = '23514';
    end if;
    if exists (select 1 from public.iotw_ballot_entries e where e.ballot_id = new.ballot_id and e.field_report_id = v_id and e.user_id = new.voter_user_id) then
      raise exception 'You cannot vote for your own image' using errcode = '23514';
    end if;
  end loop;
  return new;
end; $$;
revoke execute on function public.iotw_validate_vote() from public, anon, authenticated;
drop trigger if exists iotw_votes_validate on public.iotw_votes;
create trigger iotw_votes_validate before insert or update on public.iotw_votes
  for each row execute function public.iotw_validate_vote();

-------------------------------------------------------------------------------
-- 3. Automatic tally when a ballot closes
-------------------------------------------------------------------------------
alter table public.iotw_ballots add column if not exists tallied_at timestamptz;

create table if not exists public.iotw_ballot_results (
  ballot_id uuid not null references public.iotw_ballots(id) on delete cascade,
  field_report_id uuid not null references public.field_reports(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  rank integer not null,
  total_points integer not null default 0,
  first_place_count integer not null default 0,
  second_place_count integer not null default 0,
  third_place_count integer not null default 0,
  total_ballots integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (ballot_id, field_report_id)
);
alter table public.iotw_ballot_results enable row level security;
revoke insert, update, delete, truncate on public.iotw_ballot_results from anon, authenticated;
revoke select on public.iotw_ballot_results from anon;
drop policy if exists "Members read IOTW results" on public.iotw_ballot_results;
create policy "Members read IOTW results" on public.iotw_ballot_results for select to authenticated using (public.can_view_guild());

-- Scoring per the Guild design. #1 = 3 points, #2 = 2, #3 = 1.
-- Images with no votes are not placed. Ties break on how many ballots the image appears on, then #1 votes, then #2 votes, then earliest entry.
create or replace function public.iotw_tally_ballot(p_ballot_id uuid) returns void
language plpgsql set search_path = '' as $$
declare r record;
begin
  delete from public.iotw_ballot_results where ballot_id = p_ballot_id;
  insert into public.iotw_ballot_results (ballot_id, field_report_id, user_id, rank, total_points, first_place_count, second_place_count, third_place_count, total_ballots)
  select p_ballot_id, s.field_report_id, s.user_id,
         row_number() over (order by s.pts desc, s.ballots desc, s.c1 desc, s.c2 desc, s.submitted_at asc),
         s.pts, s.c1, s.c2, s.c3, s.ballots
    from (
      select e.field_report_id, e.user_id, e.submitted_at,
             coalesce(sum(case when v.first_place_field_report_id = e.field_report_id then 3
                               when v.second_place_field_report_id = e.field_report_id then 2
                               when v.third_place_field_report_id = e.field_report_id then 1 else 0 end), 0)::int pts,
             count(v.id) filter (where v.first_place_field_report_id = e.field_report_id)::int c1,
             count(v.id) filter (where v.second_place_field_report_id = e.field_report_id)::int c2,
             count(v.id) filter (where v.third_place_field_report_id = e.field_report_id)::int c3,
             count(v.id) filter (where e.field_report_id in (v.first_place_field_report_id, v.second_place_field_report_id, v.third_place_field_report_id))::int ballots
        from public.iotw_ballot_entries e
        left join public.iotw_votes v on v.ballot_id = e.ballot_id
       where e.ballot_id = p_ballot_id
       group by e.field_report_id, e.user_id, e.submitted_at
    ) s;

  update public.iotw_ballots b set
    winner_field_report_id = (select field_report_id from public.iotw_ballot_results where ballot_id = p_ballot_id and rank = 1 and total_points > 0),
    second_place_field_report_id = (select field_report_id from public.iotw_ballot_results where ballot_id = p_ballot_id and rank = 2 and total_points > 0),
    third_place_field_report_id = (select field_report_id from public.iotw_ballot_results where ballot_id = p_ballot_id and rank = 3 and total_points > 0),
    tallied_at = now()
   where b.id = p_ballot_id and b.status = 'voting_closed';
end; $$;
revoke execute on function public.iotw_tally_ballot(uuid) from public, anon, authenticated;

create or replace function public.iotw_advance_ballots() returns void
language plpgsql set search_path = '' as $$
declare v_start timestamptz; v_end timestamptz; v_id uuid;
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

  -- Tally each newly closed ballot once. Aaron picks the Photog Phavorite and finalizes.
  for v_id in select id from public.iotw_ballots where status = 'voting_closed' and tallied_at is null loop
    perform public.iotw_tally_ballot(v_id);
  end loop;
end; $$;
revoke execute on function public.iotw_advance_ballots() from public, anon, authenticated;

select public.iotw_advance_ballots();
