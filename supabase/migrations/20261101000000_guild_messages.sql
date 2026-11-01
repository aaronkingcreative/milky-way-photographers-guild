-- Message from Aaron on the Guild Hall, plus a per-member "I've read it" mark.
-- Members (and admins) read the current message. Only admins write messages.
-- Each member can only see, add or remove their own read marks.
-- A new message gets a new id, so it re-opens for everyone. Idempotent.

create table if not exists public.guild_messages (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(btrim(body)) between 1 and 1200),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists guild_messages_current_idx on public.guild_messages (created_at desc) where archived_at is null;

create table if not exists public.guild_message_reads (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  message_id uuid not null references public.guild_messages(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, message_id)
);
create index if not exists guild_message_reads_message_idx on public.guild_message_reads (message_id);

alter table public.guild_messages enable row level security;
alter table public.guild_message_reads enable row level security;

revoke all on public.guild_messages from anon, public;
revoke all on public.guild_message_reads from anon, public;
grant select, insert, update, delete on public.guild_messages to authenticated;
grant select, insert, delete on public.guild_message_reads to authenticated;

drop policy if exists "Members read guild messages" on public.guild_messages;
create policy "Members read guild messages" on public.guild_messages
  for select to authenticated using ((select public.can_view_guild()));
drop policy if exists "Admins insert guild messages" on public.guild_messages;
create policy "Admins insert guild messages" on public.guild_messages
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "Admins update guild messages" on public.guild_messages;
create policy "Admins update guild messages" on public.guild_messages
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "Admins delete guild messages" on public.guild_messages;
create policy "Admins delete guild messages" on public.guild_messages
  for delete to authenticated using ((select public.is_admin()));

drop policy if exists "Members read own message marks" on public.guild_message_reads;
create policy "Members read own message marks" on public.guild_message_reads
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Members add own message marks" on public.guild_message_reads;
create policy "Members add own message marks" on public.guild_message_reads
  for insert to authenticated with check (user_id = (select auth.uid()) and (select public.can_view_guild()));
drop policy if exists "Members remove own message marks" on public.guild_message_reads;
create policy "Members remove own message marks" on public.guild_message_reads
  for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.touch_guild_message()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists guild_messages_touch on public.guild_messages;
create trigger guild_messages_touch before update on public.guild_messages
  for each row execute function public.touch_guild_message();
revoke execute on function public.touch_guild_message() from public, anon, authenticated;

-- Starter message so the card is not empty on day one. Aaron replaces it from /admin/message.
insert into public.guild_messages (body, created_by)
select 'Welcome to the Guild Hall. Share your field reports, cheer each other on, and leave feedback that helps someone grow. Image of the Week voting closes Sunday at noon Mountain.',
       (select id from public.profiles where role = 'admin' order by created_at limit 1)
where not exists (select 1 from public.guild_messages);
