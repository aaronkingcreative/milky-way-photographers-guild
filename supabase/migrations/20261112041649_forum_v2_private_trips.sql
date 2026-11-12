-- Guild Forum v2.
-- 1. Critique is retired. Any Critique threads move to General, nothing is deleted, and no new ones can start.
-- 2. Trips and Meetups threads are private. Members see the title, the teaser and the starter. The posts are readable
--    only by the starter, members who entered the access code or were approved, and Guild admins. RLS enforces it,
--    so the posts never leave the database for anyone else, wherever they are read from.
-- 3. Access codes are stored only as bcrypt hashes (pgcrypto crypt) in a table nobody can select.
-- 4. Code attempts are limited to 5 wrong tries per 10 minutes per member per thread.

-- Categories ------------------------------------------------------------------------
update public.forum_threads set category = 'general' where category = 'critique';
alter table public.forum_threads drop constraint if exists forum_threads_category_check;
alter table public.forum_threads add constraint forum_threads_category_check check (category in ('general','locations','techniques','gear','trips'));

-- Private trip threads ----------------------------------------------------------------
alter table public.forum_threads add column if not exists is_private boolean not null default false;
alter table public.forum_threads add column if not exists teaser text;
alter table public.forum_threads drop constraint if exists forum_threads_teaser_check;
alter table public.forum_threads add constraint forum_threads_teaser_check check (teaser is null or char_length(btrim(teaser)) between 20 and 600);
alter table public.forum_threads drop constraint if exists forum_threads_private_trip_check;
alter table public.forum_threads add constraint forum_threads_private_trip_check check (not is_private or (category = 'trips' and teaser is not null));

create table if not exists public.forum_trip_codes (
  thread_id uuid primary key references public.forum_threads(id) on delete cascade,
  code_hash text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.forum_trip_members (
  thread_id uuid not null references public.forum_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  via text not null check (via in ('starter','code','approved')),
  added_at timestamptz not null default now(),
  added_by uuid references auth.users(id) on delete set null,
  primary key (thread_id, user_id)
);

create table if not exists public.forum_trip_requests (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 10 and 600),
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  requester_seen_at timestamptz,
  unique (thread_id, user_id)
);

create table if not exists public.forum_trip_attempts (
  id bigint generated always as identity primary key,
  thread_id uuid not null references public.forum_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ok boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists forum_trip_members_user on public.forum_trip_members (user_id);
create index if not exists forum_trip_members_added_by on public.forum_trip_members (added_by);
create index if not exists forum_trip_codes_updated_by on public.forum_trip_codes (updated_by);
create index if not exists forum_trip_requests_thread_status on public.forum_trip_requests (thread_id, status);
create index if not exists forum_trip_requests_user on public.forum_trip_requests (user_id);
create index if not exists forum_trip_requests_decided_by on public.forum_trip_requests (decided_by);
create index if not exists forum_trip_attempts_recent on public.forum_trip_attempts (thread_id, user_id, created_at desc);
create index if not exists forum_trip_attempts_user on public.forum_trip_attempts (user_id);

alter table public.forum_trip_codes enable row level security;
alter table public.forum_trip_members enable row level security;
alter table public.forum_trip_requests enable row level security;
alter table public.forum_trip_attempts enable row level security;

revoke all on public.forum_trip_codes, public.forum_trip_members, public.forum_trip_requests, public.forum_trip_attempts from anon, authenticated;
grant select on public.forum_trip_members, public.forum_trip_requests to authenticated;
-- forum_trip_codes and forum_trip_attempts have no grants and no policies. Only the functions below touch them.

-- Who can read a thread's posts. Security definer so the policy can look at membership without exposing it.
create or replace function public.forum_can_read_thread(p_thread_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or (
    public.can_view_guild() and exists (
      select 1 from public.forum_threads t
      where t.id = p_thread_id and t.deleted_at is null
        and (not t.is_private or t.user_id = auth.uid()
             or exists (select 1 from public.forum_trip_members m where m.thread_id = t.id and m.user_id = auth.uid()))
    )
  );
$$;

create or replace function public.forum_is_thread_starter(p_thread_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.forum_threads t where t.id = p_thread_id and t.user_id = auth.uid());
$$;

revoke all on function public.forum_can_read_thread(uuid), public.forum_is_thread_starter(uuid) from public, anon;
grant execute on function public.forum_can_read_thread(uuid), public.forum_is_thread_starter(uuid) to authenticated;

drop policy if exists "Members read forum posts" on public.forum_posts;
create policy "Members read forum posts" on public.forum_posts for select to authenticated
  using ((select public.is_admin()) or (deleted_at is null and public.forum_can_read_thread(thread_id)));

drop policy if exists "Trip members are visible to themselves, the starter and admins" on public.forum_trip_members;
create policy "Trip members are visible to themselves, the starter and admins" on public.forum_trip_members for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()) or public.forum_is_thread_starter(thread_id));

drop policy if exists "Trip requests are visible to the requester, the starter and admins" on public.forum_trip_requests;
create policy "Trip requests are visible to the requester, the starter and admins" on public.forum_trip_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()) or public.forum_is_thread_starter(thread_id));

-- Shared checks -------------------------------------------------------------------------

create or replace function public.forum_assert_can_read(p_thread_id uuid)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.forum_can_read_thread(p_thread_id) then
    raise exception 'This trip is private. Enter the access code or ask the organizer to let you in.' using errcode = '42501';
  end if;
end $$;

create or replace function public.forum_clean_code(p_code text)
returns text language plpgsql immutable set search_path = public as $$
declare c text := btrim(coalesce(p_code, ''));
begin
  if char_length(c) < 4 or char_length(c) > 40 then raise exception 'Access codes run 4 to 40 characters.' using errcode = 'P0001'; end if;
  return c;
end $$;

create or replace function public.forum_trip_thread(p_thread_id uuid)
returns public.forum_threads language plpgsql stable security definer set search_path = public as $$
declare t public.forum_threads;
begin
  select * into t from public.forum_threads where id = p_thread_id and deleted_at is null;
  if not found or not t.is_private then raise exception 'That trip is gone.' using errcode = 'P0002'; end if;
  return t;
end $$;

create or replace function public.forum_assert_trip_manager(p_thread_id uuid)
returns public.forum_threads language plpgsql stable security definer set search_path = public as $$
declare t public.forum_threads := public.forum_trip_thread(p_thread_id);
begin
  if t.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'Only the trip organizer can do that.' using errcode = '42501';
  end if;
  return t;
end $$;

revoke all on function public.forum_assert_can_read(uuid), public.forum_clean_code(text), public.forum_trip_thread(uuid), public.forum_assert_trip_manager(uuid) from public, anon, authenticated;

-- Writes ----------------------------------------------------------------------------------

drop function if exists public.forum_create_thread(text, text, text, uuid);
create or replace function public.forum_create_thread(p_category text, p_title text, p_body text, p_image_id uuid default null, p_teaser text default null, p_code text default null)
returns uuid language plpgsql volatile security definer set search_path = public, extensions as $$
declare uid uuid := public.forum_assert_member(); tid uuid; title_clean text := btrim(coalesce(p_title, '')); body_clean text := btrim(coalesce(p_body, ''));
  teaser_clean text := btrim(coalesce(p_teaser, '')); private boolean := p_category = 'trips'; code_clean text;
begin
  if p_category is null or p_category not in ('general','locations','techniques','gear','trips') then raise exception 'Pick a category.' using errcode = 'P0001'; end if;
  perform public.forum_assert_cooldown(uid);
  if char_length(title_clean) < 4 or char_length(title_clean) > 120 then raise exception 'Titles run 4 to 120 characters.' using errcode = 'P0001'; end if;
  if char_length(body_clean) < 1 or char_length(body_clean) > 8000 then raise exception 'Posts run 1 to 8,000 characters.' using errcode = 'P0001'; end if;
  if private then
    if char_length(teaser_clean) < 20 or char_length(teaser_clean) > 600 then raise exception 'The public teaser runs 20 to 600 characters.' using errcode = 'P0001'; end if;
    code_clean := public.forum_clean_code(p_code);
  end if;
  if not public.is_admin() and (select count(*) from public.forum_threads where user_id = uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You can start up to 10 discussions a day.' using errcode = 'P0001';
  end if;
  insert into public.forum_threads (category, title, user_id, last_post_user_id, is_private, teaser)
    values (p_category, title_clean, uid, uid, private, case when private then teaser_clean end) returning id into tid;
  insert into public.forum_posts (thread_id, user_id, body, is_opening, image_id) values (tid, uid, body_clean, true, public.forum_clean_image(uid, p_image_id));
  if private then
    insert into public.forum_trip_codes (thread_id, code_hash, updated_by) values (tid, crypt(code_clean, gen_salt('bf', 8)), uid);
    insert into public.forum_trip_members (thread_id, user_id, via, added_by) values (tid, uid, 'starter', uid);
  end if;
  return tid;
end $$;

create or replace function public.forum_reply(p_thread_id uuid, p_body text, p_quote_post_id uuid default null, p_image_id uuid default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := public.forum_assert_member(); t record; pid uuid; body_clean text := btrim(coalesce(p_body, '')); q uuid := null;
begin
  select * into t from public.forum_threads where id = p_thread_id and deleted_at is null;
  if not found then raise exception 'That discussion is gone.' using errcode = 'P0002'; end if;
  perform public.forum_assert_can_read(p_thread_id);
  if t.locked and not public.is_admin() then raise exception 'This discussion is locked.' using errcode = 'P0001'; end if;
  perform public.forum_assert_cooldown(uid);
  if char_length(body_clean) < 1 or char_length(body_clean) > 8000 then raise exception 'Posts run 1 to 8,000 characters.' using errcode = 'P0001'; end if;
  if p_quote_post_id is not null then
    select id into q from public.forum_posts where id = p_quote_post_id and thread_id = p_thread_id and deleted_at is null;
  end if;
  insert into public.forum_posts (thread_id, user_id, body, quote_post_id, image_id) values (p_thread_id, uid, body_clean, q, public.forum_clean_image(uid, p_image_id)) returning id into pid;
  update public.forum_threads set reply_count = reply_count + 1, last_post_at = now(), last_post_user_id = uid where id = p_thread_id;
  return pid;
end $$;

create or replace function public.forum_edit_post(p_post_id uuid, p_body text, p_image_id uuid default null, p_title text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := public.forum_assert_member(); p record; body_clean text := btrim(coalesce(p_body, '')); title_clean text := btrim(coalesce(p_title, ''));
begin
  select * into p from public.forum_posts where id = p_post_id and deleted_at is null;
  if not found then raise exception 'That post is gone.' using errcode = 'P0002'; end if;
  if p.user_id <> uid then raise exception 'You can only edit your own posts.' using errcode = '42501'; end if;
  perform public.forum_assert_can_read(p.thread_id);
  if char_length(body_clean) < 1 or char_length(body_clean) > 8000 then raise exception 'Posts run 1 to 8,000 characters.' using errcode = 'P0001'; end if;
  update public.forum_posts set body = body_clean, image_id = public.forum_clean_image(uid, p_image_id),
    edited_at = case when body is distinct from body_clean or image_id is distinct from p_image_id then now() else edited_at end
  where id = p_post_id;
  if p.is_opening and p_title is not null then
    if char_length(title_clean) < 4 or char_length(title_clean) > 120 then raise exception 'Titles run 4 to 120 characters.' using errcode = 'P0001'; end if;
    update public.forum_threads set title = title_clean where id = p.thread_id;
  end if;
end $$;

create or replace function public.forum_flag_post(p_post_id uuid, p_reason text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := public.forum_assert_member(); tid uuid;
begin
  select thread_id into tid from public.forum_posts where id = p_post_id and deleted_at is null;
  if tid is null then raise exception 'That post is gone.' using errcode = 'P0002'; end if;
  perform public.forum_assert_can_read(tid);
  insert into public.forum_flags (post_id, reporter_id, reason) values (p_post_id, uid, nullif(left(btrim(coalesce(p_reason, '')), 500), ''))
  on conflict (post_id, reporter_id) do nothing;
end $$;

-- Trip access -----------------------------------------------------------------------------

-- Enter the access code. Right code gives lasting access. Five wrong tries in ten minutes pauses further tries.
create or replace function public.forum_trip_enter_code(p_thread_id uuid, p_code text)
returns boolean language plpgsql volatile security definer set search_path = public, extensions as $$
declare uid uuid := public.forum_assert_member(); t public.forum_threads := public.forum_trip_thread(p_thread_id); h text; good boolean;
begin
  if public.forum_can_read_thread(p_thread_id) then return true; end if;
  if (select count(*) from public.forum_trip_attempts a where a.thread_id = p_thread_id and a.user_id = uid and not a.ok and a.created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'Too many tries. Wait ten minutes, or ask the organizer to let you in.' using errcode = 'P0001';
  end if;
  select code_hash into h from public.forum_trip_codes where thread_id = p_thread_id;
  good := h is not null and crypt(btrim(coalesce(p_code, '')), h) = h;
  insert into public.forum_trip_attempts (thread_id, user_id, ok) values (p_thread_id, uid, good);
  if good then
    insert into public.forum_trip_members (thread_id, user_id, via, added_by) values (p_thread_id, uid, 'code', uid) on conflict (thread_id, user_id) do nothing;
    update public.forum_trip_requests set status = 'approved', decided_at = now(), decided_by = uid, requester_seen_at = now() where thread_id = p_thread_id and user_id = uid and status = 'pending';
  end if;
  return good;
end $$;

create or replace function public.forum_trip_request_access(p_thread_id uuid, p_message text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := public.forum_assert_member(); t public.forum_threads := public.forum_trip_thread(p_thread_id); msg text := btrim(coalesce(p_message, '')); prior record;
begin
  if public.forum_can_read_thread(p_thread_id) then raise exception 'You are already in this trip.' using errcode = 'P0001'; end if;
  if char_length(msg) < 10 or char_length(msg) > 600 then raise exception 'Tell the organizer a little more, 10 to 600 characters.' using errcode = 'P0001'; end if;
  select * into prior from public.forum_trip_requests where thread_id = p_thread_id and user_id = uid;
  if found and prior.status = 'pending' then raise exception 'Your request is already with the organizer.' using errcode = 'P0001'; end if;
  if found and prior.status = 'declined' and prior.decided_at > now() - interval '1 day' then
    raise exception 'The organizer declined this request today. You can ask again tomorrow.' using errcode = 'P0001';
  end if;
  insert into public.forum_trip_requests (thread_id, user_id, message) values (p_thread_id, uid, msg)
  on conflict (thread_id, user_id) do update set message = excluded.message, status = 'pending', created_at = now(), decided_at = null, decided_by = null, requester_seen_at = null;
end $$;

create or replace function public.forum_trip_decide(p_request_id uuid, p_approve boolean)
returns void language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := public.forum_assert_member(); r record; t public.forum_threads;
begin
  select * into r from public.forum_trip_requests where id = p_request_id;
  if not found then raise exception 'That request is gone.' using errcode = 'P0002'; end if;
  t := public.forum_assert_trip_manager(r.thread_id);
  if r.status <> 'pending' then raise exception 'That request was already answered.' using errcode = 'P0001'; end if;
  update public.forum_trip_requests set status = case when p_approve then 'approved' else 'declined' end, decided_at = now(), decided_by = uid, requester_seen_at = null where id = p_request_id;
  if p_approve then
    insert into public.forum_trip_members (thread_id, user_id, via, added_by) values (r.thread_id, r.user_id, 'approved', uid) on conflict (thread_id, user_id) do nothing;
  end if;
end $$;

create or replace function public.forum_trip_remove_member(p_thread_id uuid, p_user_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := public.forum_assert_member(); t public.forum_threads := public.forum_assert_trip_manager(p_thread_id);
begin
  if p_user_id = t.user_id then raise exception 'The organizer stays in the trip.' using errcode = 'P0001'; end if;
  delete from public.forum_trip_members where thread_id = p_thread_id and user_id = p_user_id;
  update public.forum_trip_requests set status = 'declined', decided_at = now(), decided_by = uid where thread_id = p_thread_id and user_id = p_user_id;
end $$;

create or replace function public.forum_trip_set_code(p_thread_id uuid, p_code text)
returns void language plpgsql volatile security definer set search_path = public, extensions as $$
declare uid uuid := public.forum_assert_member(); t public.forum_threads := public.forum_assert_trip_manager(p_thread_id); c text := public.forum_clean_code(p_code);
begin
  insert into public.forum_trip_codes (thread_id, code_hash, updated_by) values (p_thread_id, crypt(c, gen_salt('bf', 8)), uid)
  on conflict (thread_id) do update set code_hash = excluded.code_hash, updated_at = now(), updated_by = uid;
end $$;

create or replace function public.forum_trip_set_teaser(p_thread_id uuid, p_teaser text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := public.forum_assert_member(); t public.forum_threads := public.forum_assert_trip_manager(p_thread_id); c text := btrim(coalesce(p_teaser, ''));
begin
  if char_length(c) < 20 or char_length(c) > 600 then raise exception 'The public teaser runs 20 to 600 characters.' using errcode = 'P0001'; end if;
  update public.forum_threads set teaser = c where id = p_thread_id;
end $$;

-- The requester has seen the answer, so the header notice goes away.
create or replace function public.forum_trip_mark_seen(p_thread_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  update public.forum_trip_requests set requester_seen_at = now() where thread_id = p_thread_id and user_id = auth.uid() and status in ('approved','declined') and requester_seen_at is null;
end $$;

revoke all on function public.forum_create_thread(text, text, text, uuid, text, text), public.forum_trip_enter_code(uuid, text), public.forum_trip_request_access(uuid, text),
  public.forum_trip_decide(uuid, boolean), public.forum_trip_remove_member(uuid, uuid), public.forum_trip_set_code(uuid, text), public.forum_trip_set_teaser(uuid, text),
  public.forum_trip_mark_seen(uuid) from public, anon;
grant execute on function public.forum_create_thread(text, text, text, uuid, text, text), public.forum_trip_enter_code(uuid, text), public.forum_trip_request_access(uuid, text),
  public.forum_trip_decide(uuid, boolean), public.forum_trip_remove_member(uuid, uuid), public.forum_trip_set_code(uuid, text), public.forum_trip_set_teaser(uuid, text),
  public.forum_trip_mark_seen(uuid) to authenticated;
