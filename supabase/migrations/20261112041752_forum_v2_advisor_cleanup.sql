-- Forum v2 advisor cleanup.
-- The read checks used by RLS move to a schema the API does not expose, so they are not callable as RPCs.
-- The code and attempt tables get explicit deny-all policies. Forum foreign keys get covering indexes.

create schema if not exists forum_private;
revoke all on schema forum_private from public, anon;
grant usage on schema forum_private to authenticated;

create or replace function forum_private.can_read_thread(p_thread_id uuid)
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

create or replace function forum_private.is_thread_starter(p_thread_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.forum_threads t where t.id = p_thread_id and t.user_id = auth.uid());
$$;

revoke all on function forum_private.can_read_thread(uuid), forum_private.is_thread_starter(uuid) from public, anon;
grant execute on function forum_private.can_read_thread(uuid), forum_private.is_thread_starter(uuid) to authenticated;

drop policy if exists "Members read forum posts" on public.forum_posts;
create policy "Members read forum posts" on public.forum_posts for select to authenticated
  using ((select public.is_admin()) or (deleted_at is null and forum_private.can_read_thread(thread_id)));

drop policy if exists "Trip members are visible to themselves, the starter and admins" on public.forum_trip_members;
create policy "Trip members are visible to themselves, the starter and admins" on public.forum_trip_members for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()) or forum_private.is_thread_starter(thread_id));

drop policy if exists "Trip requests are visible to the requester, the starter and admins" on public.forum_trip_requests;
create policy "Trip requests are visible to the requester, the starter and admins" on public.forum_trip_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()) or forum_private.is_thread_starter(thread_id));

-- The write functions keep calling the same check through a thin public wrapper that only they can run.
create or replace function public.forum_can_read_thread(p_thread_id uuid)
returns boolean language sql stable security definer set search_path = public as $$ select forum_private.can_read_thread(p_thread_id); $$;
revoke all on function public.forum_can_read_thread(uuid) from public, anon, authenticated;
drop function if exists public.forum_is_thread_starter(uuid);

drop policy if exists "No direct access to trip codes" on public.forum_trip_codes;
create policy "No direct access to trip codes" on public.forum_trip_codes for select to authenticated using (false);
drop policy if exists "No direct access to code attempts" on public.forum_trip_attempts;
create policy "No direct access to code attempts" on public.forum_trip_attempts for select to authenticated using (false);

create index if not exists forum_flags_reporter on public.forum_flags (reporter_id);
create index if not exists forum_flags_resolved_by on public.forum_flags (resolved_by);
create index if not exists forum_posts_deleted_by on public.forum_posts (deleted_by);
create index if not exists forum_posts_image on public.forum_posts (image_id);
create index if not exists forum_posts_quote on public.forum_posts (quote_post_id);
create index if not exists forum_threads_deleted_by on public.forum_threads (deleted_by);
create index if not exists forum_threads_last_post_user on public.forum_threads (last_post_user_id);
create index if not exists forum_threads_user on public.forum_threads (user_id);
