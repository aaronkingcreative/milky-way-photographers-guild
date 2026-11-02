-- Seasons are earned from months: a season is earned once all three of its months are earned
-- (in any years). Winter = Dec, Jan, Feb; Spring = Mar, Apr, May; Summer = Jun, Jul, Aug; Fall = Sep, Oct, Nov.
-- All three verified -> season verified; all three held but any pending -> season pending review.
-- Rows written by this rule carry metadata.source = 'season_rule'. Rows from other sources (e.g. the
-- 2026-11-01 library backfill) are never changed by the rule.

update public.achievement_definitions d
   set is_manual_claimable = false,
       is_automatic = true,
       description = s.description,
       requirement = s.requirement
  from (values
    ('seasonal_winter', 'Earned automatically when you hold all three winter months: December, January and February, in any years.', 'Earn the December, January and February Milky Way honors (any years). Earning the third month also earns Winter.'),
    ('seasonal_spring', 'Earned automatically when you hold all three spring months: March, April and May, in any years.', 'Earn the March, April and May Milky Way honors (any years). Earning the third month also earns Spring.'),
    ('seasonal_summer', 'Earned automatically when you hold all three summer months: June, July and August, in any years.', 'Earn the June, July and August Milky Way honors (any years). Earning the third month also earns Summer.'),
    ('seasonal_fall',   'Earned automatically when you hold all three fall months: September, October and November, in any years.', 'Earn the September, October and November Milky Way honors (any years). Earning the third month also earns Fall.')
  ) as s(id, description, requirement)
 where d.id = s.id;

create or replace function public.season_for_month_honor(p_achievement text)
returns text language sql immutable as $$
  select case p_achievement
    when 'monthly_december' then 'seasonal_winter' when 'monthly_january' then 'seasonal_winter' when 'monthly_february' then 'seasonal_winter'
    when 'monthly_march' then 'seasonal_spring' when 'monthly_april' then 'seasonal_spring' when 'monthly_may' then 'seasonal_spring'
    when 'monthly_june' then 'seasonal_summer' when 'monthly_july' then 'seasonal_summer' when 'monthly_august' then 'seasonal_summer'
    when 'monthly_september' then 'seasonal_fall' when 'monthly_october' then 'seasonal_fall' when 'monthly_november' then 'seasonal_fall'
  end $$;

create or replace function public.recompute_season_honor(p_user uuid, p_season text)
returns void language plpgsql security definer set search_path = public as $$
declare months text[]; held int; verified int; latest timestamptz; existing record;
begin
  months := case p_season
    when 'seasonal_winter' then array['monthly_december','monthly_january','monthly_february']
    when 'seasonal_spring' then array['monthly_march','monthly_april','monthly_may']
    when 'seasonal_summer' then array['monthly_june','monthly_july','monthly_august']
    when 'seasonal_fall'   then array['monthly_september','monthly_october','monthly_november'] end;
  if months is null then return; end if;
  select count(distinct achievement_id), count(distinct achievement_id) filter (where status = 'verified'), max(earned_at)
    into held, verified, latest
    from public.user_achievements
   where user_id = p_user and achievement_id = any(months) and status in ('verified', 'auto_awarded_pending_review');
  select status, metadata into existing from public.user_achievements where user_id = p_user and achievement_id = p_season;
  if found and coalesce(existing.metadata->>'source', '') <> 'season_rule' then return; end if;
  if held = 3 then
    if found then
      update public.user_achievements
         set status = case when verified = 3 then 'verified' else 'auto_awarded_pending_review' end,
             earned_at = latest, metadata = jsonb_build_object('source', 'season_rule', 'months', to_jsonb(months))
       where user_id = p_user and achievement_id = p_season;
    else
      insert into public.user_achievements (user_id, achievement_id, earned_at, status, metadata)
      values (p_user, p_season, latest, case when verified = 3 then 'verified' else 'auto_awarded_pending_review' end,
              jsonb_build_object('source', 'season_rule', 'months', to_jsonb(months)));
    end if;
  elsif found then
    delete from public.user_achievements where user_id = p_user and achievement_id = p_season;
  end if;
end $$;
revoke all on function public.recompute_season_honor(uuid, text) from public, anon, authenticated;

create or replace function public.trg_user_achievements_season()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT', 'UPDATE') and public.season_for_month_honor(new.achievement_id) is not null then
    perform public.recompute_season_honor(new.user_id, public.season_for_month_honor(new.achievement_id));
  end if;
  if tg_op in ('UPDATE', 'DELETE') and public.season_for_month_honor(old.achievement_id) is not null
     and (tg_op = 'DELETE' or old.achievement_id <> new.achievement_id or old.user_id <> new.user_id) then
    perform public.recompute_season_honor(old.user_id, public.season_for_month_honor(old.achievement_id));
  end if;
  return null;
end $$;
revoke all on function public.trg_user_achievements_season() from public, anon, authenticated;

drop trigger if exists user_achievements_season on public.user_achievements;
create trigger user_achievements_season after insert or update or delete on public.user_achievements
  for each row execute function public.trg_user_achievements_season();
