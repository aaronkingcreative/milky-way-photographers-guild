-- Lets an admin count how many members have read the current message.
-- One SELECT policy (own marks, or any mark for an admin) to avoid stacked permissive policies.
drop policy if exists "Admins read message marks" on public.guild_message_reads;
drop policy if exists "Members read own message marks" on public.guild_message_reads;
create policy "Members read own message marks" on public.guild_message_reads
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
