-- A second FK from claims to achievement_definitions made PostgREST embeds like
-- field_report_achievement_claims.select("achievement_definitions(...)") ambiguous (PGRST201).
-- Keep original_achievement_id as plain text (validated by admin_reassign_achievement_claim).
alter table public.field_report_achievement_claims drop constraint if exists field_report_achievement_claims_original_achievement_id_fkey;
