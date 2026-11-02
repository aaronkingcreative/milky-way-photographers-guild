-- Review notes privacy, step 1 of 2 (safe to apply before the app deploy).
-- Members may read only their own claims' review notes; admins read all. Notes are served by this
-- function; step 2 (20261102070100) removes direct read access to the review_notes column.
create or replace function public.claim_review_notes(p_ids uuid[])
returns table (claim_id uuid, review_notes text)
language sql stable security definer set search_path = public as $$
  select c.id, c.review_notes from public.field_report_achievement_claims c
   where c.id = any(p_ids) and c.review_notes is not null
     and (c.user_id = auth.uid() or public.is_admin());
$$;
revoke all on function public.claim_review_notes(uuid[]) from public, anon;
grant execute on function public.claim_review_notes(uuid[]) to authenticated;

-- The member-facing note now lives only on the claim (user_achievements is readable Guild-wide).
-- The reassign function is security invoker: read named columns (not *) so it keeps working
-- once review_notes is no longer directly readable.
create or replace function public.admin_reassign_achievement_claim(p_claim uuid, p_target text, p_note text)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare c record; held text; img uuid; note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select id, user_id, field_report_id, achievement_id, status, claimed_at into c
    from public.field_report_achievement_claims where id = p_claim for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if c.status <> 'auto_awarded_pending_review' then return jsonb_build_object('ok', false, 'error', 'not_pending'); end if;
  if p_target = c.achievement_id then return jsonb_build_object('ok', false, 'error', 'same_achievement'); end if;
  if not exists (select 1 from public.achievement_definitions where id = p_target and is_active and is_manual_claimable) then
    return jsonb_build_object('ok', false, 'error', 'bad_target');
  end if;
  select status into held from public.user_achievements
   where user_id = c.user_id and achievement_id = p_target and status in ('auto_awarded_pending_review', 'verified');
  if found then return jsonb_build_object('ok', false, 'error', 'already_has', 'status', held); end if;
  if exists (select 1 from public.field_report_achievement_claims where field_report_id = c.field_report_id and achievement_id = p_target and id <> c.id) then
    return jsonb_build_object('ok', false, 'error', 'duplicate_claim');
  end if;
  select guild_image_id into img from public.field_reports where id = c.field_report_id;
  update public.user_achievements
     set status = 'rejected', awarded_by = auth.uid(),
         metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('reassigned_to', p_target, 'claim_id', c.id)
   where user_id = c.user_id and achievement_id = c.achievement_id and status = 'auto_awarded_pending_review'
     and (source_field_report_id = c.field_report_id or source_field_report_id is null);
  insert into public.user_achievements (user_id, achievement_id, earned_at, source_field_report_id, source_submission_id, status, awarded_by, notes, metadata)
  values (c.user_id, p_target, c.claimed_at, c.field_report_id, img, 'verified', auth.uid(), null,
          jsonb_build_object('source', 'admin_reassign', 'original_achievement_id', c.achievement_id, 'claim_id', c.id))
  on conflict (user_id, achievement_id) do update
     set status = 'verified', earned_at = excluded.earned_at, source_field_report_id = excluded.source_field_report_id,
         source_submission_id = excluded.source_submission_id, awarded_by = excluded.awarded_by,
         metadata = coalesce(public.user_achievements.metadata, '{}'::jsonb) || excluded.metadata;
  update public.field_report_achievement_claims
     set original_achievement_id = c.achievement_id, achievement_id = p_target, status = 'verified',
         reviewed_at = now(), reviewed_by = auth.uid(), review_notes = note, member_seen_at = null
   where id = c.id;
  return jsonb_build_object('ok', true);
end $$;
