-- Section replies on field reports: comments can belong to the photographer's
-- "what went well" or "what could have gone better" answer. Existing rows stay general.
alter table public.image_comments
  add column if not exists section text not null default 'general';

alter table public.image_comments
  drop constraint if exists image_comments_section_check;
alter table public.image_comments
  add constraint image_comments_section_check
  check (section in ('general', 'went_well', 'could_be_better'));

create index if not exists image_comments_image_section_idx
  on public.image_comments (image_id, section, created_at);

-- Insert check unchanged in spirit (own row, Guild access) but pinned to signed-in users
-- and the allowed sections; the column check above enforces the value set as well.
drop policy if exists "Members add own comments" on public.image_comments;
create policy "Members add own comments" on public.image_comments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.can_view_guild())
    and section in ('general', 'went_well', 'could_be_better')
  );
