-- Verification Desk: verify a claim as a different achievement (reassign), and member review notices.
alter table public.field_report_achievement_claims
  add column if not exists original_achievement_id text, -- no FK: see 20261102060100
  add column if not exists member_seen_at timestamptz;

comment on column public.field_report_achievement_claims.original_achievement_id is 'Achievement the member originally claimed when an admin verified the claim as a different achievement.';
comment on column public.field_report_achievement_claims.member_seen_at is 'When the member saw the review result/note. Null = unseen notice.';

-- Atomically verify a pending claim under a different achievement. Admin only (security invoker + is_admin()).
create or replace function public.admin_reassign_achievement_claim(p_claim uuid, p_target text, p_note text)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare c record; held text; img uuid; note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select * into c from public.field_report_achievement_claims where id = p_claim for update;
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

  -- The originally claimed honor came only from this claim: mark it rejected (kept for history, not shown as earned).
  update public.user_achievements
     set status = 'rejected', awarded_by = auth.uid(), notes = note,
         metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('reassigned_to', p_target, 'claim_id', c.id)
   where user_id = c.user_id and achievement_id = c.achievement_id and status = 'auto_awarded_pending_review'
     and (source_field_report_id = c.field_report_id or source_field_report_id is null);

  insert into public.user_achievements (user_id, achievement_id, earned_at, source_field_report_id, source_submission_id, status, awarded_by, notes, metadata)
  values (c.user_id, p_target, c.claimed_at, c.field_report_id, img, 'verified', auth.uid(), note,
          jsonb_build_object('source', 'admin_reassign', 'original_achievement_id', c.achievement_id, 'claim_id', c.id))
  on conflict (user_id, achievement_id) do update
     set status = 'verified', earned_at = excluded.earned_at, source_field_report_id = excluded.source_field_report_id,
         source_submission_id = excluded.source_submission_id, awarded_by = excluded.awarded_by, notes = excluded.notes,
         metadata = coalesce(public.user_achievements.metadata, '{}'::jsonb) || excluded.metadata;

  update public.field_report_achievement_claims
     set original_achievement_id = c.achievement_id, achievement_id = p_target, status = 'verified',
         reviewed_at = now(), reviewed_by = auth.uid(), review_notes = note, member_seen_at = null
   where id = c.id;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.admin_reassign_achievement_claim(uuid, text, text) from public, anon;
grant execute on function public.admin_reassign_achievement_claim(uuid, text, text) to authenticated;

-- Members mark their own review notices as seen (they have no update policy on claims).
create or replace function public.mark_my_claim_reviews_seen()
returns void language sql security definer set search_path = public as $$
  update public.field_report_achievement_claims set member_seen_at = now()
   where user_id = auth.uid() and member_seen_at is null and reviewed_at is not null;
$$;
revoke all on function public.mark_my_claim_reviews_seen() from public, anon;
grant execute on function public.mark_my_claim_reviews_seen() to authenticated;
