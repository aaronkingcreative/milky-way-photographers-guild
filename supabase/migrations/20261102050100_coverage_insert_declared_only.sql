-- Members file the capture date they declare; only admins can mark it vetted or corrected.
drop policy if exists "Members insert own coverage" on public.user_field_coverage;
create policy "Members insert own coverage" on public.user_field_coverage
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and date_status = 'declared' and date_reviewed_by is null and date_reviewed_at is null
    and exists (select 1 from public.field_reports fr where fr.id = user_field_coverage.field_report_id and fr.user_id = (select auth.uid()))
  );
