-- Review notes privacy, step 2 of 2 (apply AFTER the app reads notes via claim_review_notes()).
-- Every column of claims stays readable under the existing RLS policies except review_notes.
revoke select on public.field_report_achievement_claims from anon, authenticated;
grant select (id, field_report_id, user_id, achievement_id, status, claimed_at, reviewed_at, reviewed_by,
              original_achievement_id, member_seen_at)
  on public.field_report_achievement_claims to anon, authenticated;
