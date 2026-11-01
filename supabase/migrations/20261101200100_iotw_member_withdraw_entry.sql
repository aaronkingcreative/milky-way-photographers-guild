-- Members may withdraw their own contender while its ballot has not opened for voting yet.
drop policy if exists "Members withdraw own upcoming entries" on public.iotw_ballot_entries;
create policy "Members withdraw own upcoming entries" on public.iotw_ballot_entries
  for delete to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from public.iotw_ballots b where b.id = iotw_ballot_entries.ballot_id and b.status = 'upcoming')
  );
grant delete on public.iotw_ballot_entries to authenticated;
