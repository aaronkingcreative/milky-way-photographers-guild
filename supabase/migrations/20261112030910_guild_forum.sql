-- Guild Forum: members-only discussion board.
-- Threads hold an opening post plus flat, chronological replies. No nesting.
-- Every write goes through SECURITY DEFINER functions that check membership, ownership,
-- length and a short cooldown. Members only ever SELECT the tables directly.

create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('gear','techniques','locations','trips','critique','general')),
  title text not null check (char_length(btrim(title)) between 4 and 120),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_post_at timestamptz not null default now(),
  last_post_user_id uuid references auth.users(id) on delete set null,
  reply_count integer not null default 0,
  pinned boolean not null default false,
  locked boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 8000),
  is_opening boolean not null default false,
  quote_post_id uuid references public.forum_posts(id) on delete set null,
  image_id uuid references public.guild_images(id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

create table if not exists public.forum_flags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text check (reason is null or char_length(reason) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  unique (post_id, reporter_id)
);

create index if not exists forum_threads_category_activity on public.forum_threads (category, pinned desc, last_post_at desc) where deleted_at is null;
create index if not exists forum_threads_activity on public.forum_threads (last_post_at desc) where deleted_at is null;
create index if not exists forum_posts_thread_created on public.forum_posts (thread_id, created_at);
create index if not exists forum_posts_user_created on public.forum_posts (user_id, created_at desc);
create unique index if not exists forum_posts_one_opening on public.forum_posts (thread_id) where is_opening;
create index if not exists forum_flags_open on public.forum_flags (created_at desc) where resolved_at is null;

alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_flags enable row level security;

revoke all on public.forum_threads, public.forum_posts, public.forum_flags from anon, authenticated;
grant select on public.forum_threads, public.forum_posts to authenticated;
grant select on public.forum_flags to authenticated;

drop policy if exists "Members read forum threads" on public.forum_threads;
create policy "Members read forum threads" on public.forum_threads for select to authenticated
  using ((select public.is_admin()) or ((select public.can_view_guild()) and deleted_at is null));

drop policy if exists "Members read forum posts" on public.forum_posts;
create policy "Members read forum posts" on public.forum_posts for select to authenticated
  using ((select public.is_admin()) or ((select public.can_view_guild()) and deleted_at is null));

drop policy if exists "Reporters and admins read flags" on public.forum_flags;
create policy "Reporters and admins read flags" on public.forum_flags for select to authenticated
  using ((select public.is_admin()) or reporter_id = (select auth.uid()));

-- Shared checks ---------------------------------------------------------------

create or replace function public.forum_assert_member()
returns uuid language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in to use the Forum.' using errcode = '28000'; end if;
  if not public.can_view_guild() then raise exception 'The Forum is for Guild members.' using errcode = '42501'; end if;
  return uid;
end $$;

create or replace function public.forum_assert_cooldown(uid uuid)
returns void language plpgsql stable security definer set search_path = public as $$
declare last_at timestamptz;
begin
  if public.is_admin() then return; end if;
  select max(created_at) into last_at from public.forum_posts where user_id = uid;
  if last_at is not null and last_at > now() - interval '20 seconds' then
    raise exception 'Give it a few seconds before posting again.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.forum_posts where user_id = uid and created_at > now() - interval '1 hour') >= 40 then
    raise exception 'You have posted a lot this hour. Take a short break and try again.' using errcode = 'P0001';
  end if;
end $$;

create or replace function public.forum_clean_image(uid uuid, p_image_id uuid)
returns uuid language plpgsql stable security definer set search_path = public as $$
begin
  if p_image_id is null then return null; end if;
  if not exists (
    select 1 from public.guild_images g
    where g.id = p_image_id and g.user_id = uid and g.hidden_at is null and g.deleted_at is null
      and coalesce(g.moderation_status, '') not in ('hidden','deleted')
  ) then
    raise exception 'You can only attach one of your own Guild photos.' using errcode = 'P0001';
  end if;
  return p_image_id;
end $$;

-- Writes ------------------------------------------------------------------------

create or replace function public.forum_create_thread(p_category text, p_title text, p_body text, p_image_id uuid default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := public.forum_assert_member(); tid uuid; title_clean text := btrim(coalesce(p_title, '')); body_clean text := btrim(coalesce(p_body, ''));
begin
  perform public.forum_assert_cooldown(uid);
  if char_length(title_clean) < 4 or char_length(title_clean) > 120 then raise exception 'Titles run 4 to 120 characters.' using errcode = 'P0001'; end if;
  if char_length(body_clean) < 1 or char_length(body_clean) > 8000 then raise exception 'Posts run 1 to 8,000 characters.' using errcode = 'P0001'; end if;
  if not public.is_admin() and (select count(*) from public.forum_threads where user_id = uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You can start up to 10 discussions a day.' using errcode = 'P0001';
  end if;
  insert into public.forum_threads (category, title, user_id, last_post_user_id) values (p_category, title_clean, uid, uid) returning id into tid;
  insert into public.forum_posts (thread_id, user_id, body, is_opening, image_id) values (tid, uid, body_clean, true, public.forum_clean_image(uid, p_image_id));
  return tid;
end $$;

create or replace function public.forum_reply(p_thread_id uuid, p_body text, p_quote_post_id uuid default null, p_image_id uuid default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := public.forum_assert_member(); t record; pid uuid; body_clean text := btrim(coalesce(p_body, '')); q uuid := null;
begin
  select * into t from public.forum_threads where id = p_thread_id and deleted_at is null;
  if not found then raise exception 'That discussion is gone.' using errcode = 'P0002'; end if;
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
  if char_length(body_clean) < 1 or char_length(body_clean) > 8000 then raise exception 'Posts run 1 to 8,000 characters.' using errcode = 'P0001'; end if;
  update public.forum_posts set body = body_clean, image_id = public.forum_clean_image(uid, p_image_id),
    edited_at = case when body is distinct from body_clean or image_id is distinct from p_image_id then now() else edited_at end
  where id = p_post_id;
  if p.is_opening and p_title is not null then
    if char_length(title_clean) < 4 or char_length(title_clean) > 120 then raise exception 'Titles run 4 to 120 characters.' using errcode = 'P0001'; end if;
    update public.forum_threads set title = title_clean where id = p.thread_id;
  end if;
end $$;

-- Authors delete their own posts; admins remove any. Removing an opening post removes the whole discussion
-- only when nobody else has replied, otherwise the replies stay and the opening shows as removed.
create or replace function public.forum_delete_post(p_post_id uuid)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := public.forum_assert_member(); p record; admin boolean := public.is_admin(); others integer;
begin
  select * into p from public.forum_posts where id = p_post_id and deleted_at is null;
  if not found then raise exception 'That post is gone.' using errcode = 'P0002'; end if;
  if p.user_id <> uid and not admin then raise exception 'You can only delete your own posts.' using errcode = '42501'; end if;
  update public.forum_posts set deleted_at = now(), deleted_by = uid where id = p_post_id;
  if p.is_opening then
    select count(*) into others from public.forum_posts where thread_id = p.thread_id and not is_opening and deleted_at is null and user_id <> p.user_id;
    if others = 0 then
      update public.forum_threads set deleted_at = now(), deleted_by = uid where id = p.thread_id;
      return null;
    end if;
  else
    update public.forum_threads t set reply_count = greatest(0, t.reply_count - 1) where t.id = p.thread_id;
  end if;
  return p.thread_id;
end $$;

create or replace function public.forum_moderate_thread(p_thread_id uuid, p_action text)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only Guild admins can do that.' using errcode = '42501'; end if;
  if p_action = 'pin' then update public.forum_threads set pinned = true where id = p_thread_id;
  elsif p_action = 'unpin' then update public.forum_threads set pinned = false where id = p_thread_id;
  elsif p_action = 'lock' then update public.forum_threads set locked = true where id = p_thread_id;
  elsif p_action = 'unlock' then update public.forum_threads set locked = false where id = p_thread_id;
  elsif p_action = 'remove' then update public.forum_threads set deleted_at = now(), deleted_by = auth.uid() where id = p_thread_id;
  elsif p_action = 'restore' then update public.forum_threads set deleted_at = null, deleted_by = null where id = p_thread_id;
  else raise exception 'Unknown action.' using errcode = 'P0001'; end if;
end $$;

create or replace function public.forum_flag_post(p_post_id uuid, p_reason text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := public.forum_assert_member();
begin
  if not exists (select 1 from public.forum_posts where id = p_post_id and deleted_at is null) then raise exception 'That post is gone.' using errcode = 'P0002'; end if;
  insert into public.forum_flags (post_id, reporter_id, reason) values (p_post_id, uid, nullif(left(btrim(coalesce(p_reason, '')), 500), ''))
  on conflict (post_id, reporter_id) do nothing;
end $$;

create or replace function public.forum_resolve_flag(p_flag_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only Guild admins can do that.' using errcode = '42501'; end if;
  update public.forum_flags set resolved_at = now(), resolved_by = auth.uid() where id = p_flag_id and resolved_at is null;
end $$;

revoke all on function public.forum_assert_member(), public.forum_assert_cooldown(uuid), public.forum_clean_image(uuid, uuid) from public, anon, authenticated;
revoke all on function public.forum_create_thread(text, text, text, uuid), public.forum_reply(uuid, text, uuid, uuid), public.forum_edit_post(uuid, text, uuid, text),
  public.forum_delete_post(uuid), public.forum_moderate_thread(uuid, text), public.forum_flag_post(uuid, text), public.forum_resolve_flag(uuid) from public, anon;
grant execute on function public.forum_create_thread(text, text, text, uuid), public.forum_reply(uuid, text, uuid, uuid), public.forum_edit_post(uuid, text, uuid, text),
  public.forum_delete_post(uuid), public.forum_moderate_thread(uuid, text), public.forum_flag_post(uuid, text), public.forum_resolve_flag(uuid) to authenticated;
