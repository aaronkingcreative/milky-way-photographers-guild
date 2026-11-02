-- Milky Way year streak, derived from uploads.
-- member_milky_way_years becomes the per-year record that uploads feed into:
--   source 'upload'       : one row per member per year with at least one live field
--                           report whose declared capture date falls in that year
--                           (kept in sync by triggers on user_field_coverage,
--                           field_reports and guild_images; never written by members).
--   source 'admin_record' : a year an admin recorded by hand (library backfill).
-- Members cannot write this table; there is no member-set starting year.
-- Admins can vet or correct the declared capture date on a field report
-- (user_field_coverage.date_status), which flows through to the year rows.
-- Idempotent. Existing rows are kept: verified -> vetted, self_reported -> declared.

-- 1. Members no longer write their own years.
drop policy if exists "Members add own self-reported years" on public.member_milky_way_years;
drop policy if exists "Members remove own self-reported years" on public.member_milky_way_years;

-- 2. Source + status vocabulary.
alter table public.member_milky_way_years add column if not exists source text not null default 'admin_record';
alter table public.member_milky_way_years add column if not exists report_count integer not null default 0;
alter table public.member_milky_way_years drop constraint if exists member_milky_way_years_status_check;
update public.member_milky_way_years set status = case when status in ('verified','vetted') then 'vetted' else 'declared' end;
alter table public.member_milky_way_years alter column status set default 'declared';
alter table public.member_milky_way_years add constraint member_milky_way_years_status_check check (status in ('declared','vetted'));
alter table public.member_milky_way_years drop constraint if exists member_milky_way_years_source_check;
alter table public.member_milky_way_years add constraint member_milky_way_years_source_check check (source in ('upload','admin_record'));
alter table public.member_milky_way_years drop constraint if exists member_milky_way_years_pkey;
alter table public.member_milky_way_years add constraint member_milky_way_years_pkey primary key (user_id, year, source);

comment on table public.member_milky_way_years is
  'Calendar years a member has a Milky Way image for. source=upload rows are derived from field report capture dates by trigger; source=admin_record rows are admin-entered. Drives the N-yr Milky Way streak.';

-- 3. Admin vetting of the declared capture date on each field report.
alter table public.user_field_coverage add column if not exists date_status text not null default 'declared';
alter table public.user_field_coverage drop constraint if exists user_field_coverage_date_status_check;
alter table public.user_field_coverage add constraint user_field_coverage_date_status_check check (date_status in ('declared','vetted','corrected'));
alter table public.user_field_coverage add column if not exists declared_capture_date date;
alter table public.user_field_coverage add column if not exists date_reviewed_by uuid references public.profiles(id) on delete set null;
alter table public.user_field_coverage add column if not exists date_reviewed_at timestamptz;

-- 4. Sync one member-year from their live field reports.
create or replace function public.sync_member_milky_way_year(p_user uuid, p_year integer)
returns void language plpgsql security definer set search_path = public as $$
declare n integer; all_reviewed boolean;
begin
  if p_user is null or p_year is null then return; end if;
  select count(*), coalesce(bool_and(c.date_status <> 'declared'), false) into n, all_reviewed
  from public.user_field_coverage c
  join public.field_reports fr on fr.id = c.field_report_id
  left join public.guild_images gi on gi.id = fr.guild_image_id
  where c.user_id = p_user and c.capture_year = p_year
    and fr.status <> 'removed'
    and (gi.id is null or (gi.deleted_at is null and gi.status <> 'removed'));
  if n > 0 and p_year between 1990 and 2100 and exists (select 1 from public.profiles where id = p_user) then
    insert into public.member_milky_way_years (user_id, year, source, status, report_count, metadata)
    values (p_user, p_year, 'upload', case when all_reviewed then 'vetted' else 'declared' end, n, jsonb_build_object('source','field_reports'))
    on conflict (user_id, year, source) do update set report_count = excluded.report_count, status = excluded.status;
  else
    delete from public.member_milky_way_years where user_id = p_user and year = p_year and source = 'upload';
  end if;
end $$;

create or replace function public.trg_coverage_sync_milky_way_years()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE','DELETE') then perform public.sync_member_milky_way_year(old.user_id, old.capture_year); end if;
  if tg_op in ('INSERT','UPDATE') then perform public.sync_member_milky_way_year(new.user_id, new.capture_year); end if;
  return null;
end $$;

create or replace function public.trg_report_sync_milky_way_years()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select distinct c.user_id, c.capture_year from public.user_field_coverage c where c.field_report_id = new.id loop
    perform public.sync_member_milky_way_year(r.user_id, r.capture_year);
  end loop;
  return null;
end $$;

create or replace function public.trg_image_sync_milky_way_years()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select distinct c.user_id, c.capture_year from public.user_field_coverage c
           join public.field_reports fr on fr.id = c.field_report_id where fr.guild_image_id = new.id loop
    perform public.sync_member_milky_way_year(r.user_id, r.capture_year);
  end loop;
  return null;
end $$;

revoke all on function public.sync_member_milky_way_year(uuid, integer) from public, anon, authenticated;
revoke all on function public.trg_coverage_sync_milky_way_years() from public, anon, authenticated;
revoke all on function public.trg_report_sync_milky_way_years() from public, anon, authenticated;
revoke all on function public.trg_image_sync_milky_way_years() from public, anon, authenticated;

drop trigger if exists user_field_coverage_sync_milky_way_years on public.user_field_coverage;
create trigger user_field_coverage_sync_milky_way_years after insert or update or delete on public.user_field_coverage
  for each row execute function public.trg_coverage_sync_milky_way_years();
drop trigger if exists field_reports_sync_milky_way_years on public.field_reports;
create trigger field_reports_sync_milky_way_years after update of status, guild_image_id on public.field_reports
  for each row execute function public.trg_report_sync_milky_way_years();
drop trigger if exists guild_images_sync_milky_way_years on public.guild_images;
create trigger guild_images_sync_milky_way_years after update of deleted_at, status on public.guild_images
  for each row execute function public.trg_image_sync_milky_way_years();

-- 5. Backfill upload rows from every existing field report.
do $$ declare r record; begin
  for r in select distinct user_id, capture_year from public.user_field_coverage loop
    perform public.sync_member_milky_way_year(r.user_id, r.capture_year);
  end loop;
end $$;
