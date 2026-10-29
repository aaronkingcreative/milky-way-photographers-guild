-- Members can see each other's earned honors, honor claims and capture coverage
-- so image honors, ranks, streaks and member profiles show correctly.
-- Profiles are no longer readable by signed-out visitors (they include email).
-- Idempotent. No data changes.

drop policy if exists "Members read earned achievements" on public.user_achievements;
create policy "Members read earned achievements" on public.user_achievements
  for select to authenticated
  using (public.can_view_guild() and status in ('auto_awarded_pending_review', 'verified'));

drop policy if exists "Members read honor claims" on public.field_report_achievement_claims;
create policy "Members read honor claims" on public.field_report_achievement_claims
  for select to authenticated
  using (public.can_view_guild());

drop policy if exists "Members read coverage" on public.user_field_coverage;
create policy "Members read coverage" on public.user_field_coverage
  for select to authenticated
  using (public.can_view_guild());

drop policy if exists "Profiles are publicly readable" on public.profiles;
drop policy if exists "Signed in users read profiles" on public.profiles;
create policy "Signed in users read profiles" on public.profiles
  for select to authenticated
  using (true);
