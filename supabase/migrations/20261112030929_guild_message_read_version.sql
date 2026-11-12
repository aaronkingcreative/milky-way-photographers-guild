-- Key "Got it" to a message version (id + updated_at) so an edit reopens the
-- card for every member. Existing marks are backfilled with created_at, which
-- does not match a later updated_at, so a message already edited after a
-- dismissal opens again until the member acknowledges this version.
-- The updated_at trigger is restated so an edit always bumps the version,
-- including an UPDATE that does not change the body.

alter table public.guild_message_reads
  add column if not exists message_updated_at timestamptz;

update public.guild_message_reads r
set message_updated_at = m.created_at
from public.guild_messages m
where r.message_id = m.id
  and r.message_updated_at is null;

alter table public.guild_message_reads
  alter column message_updated_at set default now();

alter table public.guild_message_reads
  alter column message_updated_at set not null;

comment on column public.guild_message_reads.message_updated_at is
  'The guild_messages.updated_at value that this member acknowledged. A later edit is a new version.';

grant update (message_updated_at, read_at) on public.guild_message_reads to authenticated;

drop policy if exists "Members update own message marks" on public.guild_message_reads;
create policy "Members update own message marks" on public.guild_message_reads
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select public.can_view_guild()));

create or replace function public.touch_guild_message()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guild_messages_touch on public.guild_messages;
create trigger guild_messages_touch
  before update on public.guild_messages
  for each row execute function public.touch_guild_message();

revoke execute on function public.touch_guild_message() from public, anon, authenticated;
