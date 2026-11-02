-- Milky Way year streak: a member-level per-year table.
-- (Member self-reporting from this first version was removed in
-- 20261102050000_milky_way_years_from_uploads.sql: years now come from uploaded
-- field reports, plus admin-entered records.) Idempotent. No existing data changes.

create table if not exists public.member_milky_way_years (
  user_id uuid not null references public.profiles(id) on delete cascade,
  year integer not null check (year between 1990 and 2100),
  status text not null default 'self_reported' check (status in ('self_reported', 'verified')),
  note text check (note is null or char_length(note) <= 280),
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, year)
);

comment on table public.member_milky_way_years is
  'Calendar years a member went out at least one night shooting the Milky Way with a real camera. Drives the N-yr Milky Way streak.';

drop trigger if exists member_milky_way_years_set_updated_at on public.member_milky_way_years;
create trigger member_milky_way_years_set_updated_at before update on public.member_milky_way_years
  for each row execute function public.set_updated_at();

alter table public.member_milky_way_years enable row level security;

drop policy if exists "Members read milky way years" on public.member_milky_way_years;
create policy "Members read milky way years" on public.member_milky_way_years
  for select to authenticated using ((select public.can_view_guild()) or user_id = (select auth.uid()));

drop policy if exists "Members add own self-reported years" on public.member_milky_way_years;
create policy "Members add own self-reported years" on public.member_milky_way_years
  for insert to authenticated with check (
    user_id = (select auth.uid()) and status = 'self_reported' and verified_by is null and verified_at is null
    and year <= extract(year from now())::int
  );

drop policy if exists "Members remove own self-reported years" on public.member_milky_way_years;
create policy "Members remove own self-reported years" on public.member_milky_way_years
  for delete to authenticated using (user_id = (select auth.uid()) and status = 'self_reported');

drop policy if exists "Admins manage milky way years" on public.member_milky_way_years;
create policy "Admins manage milky way years" on public.member_milky_way_years
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.member_milky_way_years from anon;
grant select, insert, update, delete on public.member_milky_way_years to authenticated;
