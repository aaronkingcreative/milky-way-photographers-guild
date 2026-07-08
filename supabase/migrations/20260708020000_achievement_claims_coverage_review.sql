alter table public.achievement_definitions add column if not exists is_manual_claimable boolean not null default true;
alter table public.achievement_definitions add column if not exists is_automatic boolean not null default false;
alter table public.achievement_definitions add column if not exists counts_toward_rank boolean not null default true;
alter table public.achievement_definitions add column if not exists allow_repeat boolean not null default false;
alter table public.achievement_definitions drop constraint if exists achievement_definitions_category_check;
alter table public.achievement_definitions add constraint achievement_definitions_category_check check (category in ('monthly','seasonal','foreground','technique','special','rank'));

update public.achievement_definitions set category = 'special', is_manual_claimable = false, is_automatic = true, counts_toward_rank = true, reward_type = 'sticker_and_square_pin' where id = 'year_2018';
insert into public.achievement_definitions (id, name, category, reward_type, glyph, description, requirement, constellation, sort_order, is_active, metadata, is_manual_claimable, is_automatic, counts_toward_rank, allow_repeat) values
('special_perfect_year','Perfect Year','special','sticker_and_square_pin','✦','A field report from every month in one calendar year.','Submit at least one Milky Way field report from every month in the same calendar year.','special',360,true,'{}'::jsonb,false,true,true,true)
on conflict (id) do update set category=excluded.category, reward_type=excluded.reward_type, description=excluded.description, requirement=excluded.requirement, is_manual_claimable=false, is_automatic=true, counts_toward_rank=true, allow_repeat=true, is_active=true;
update public.achievement_definitions set is_manual_claimable = category in ('monthly','seasonal','foreground','technique'), is_automatic = category = 'special', counts_toward_rank = category <> 'rank';

create table if not exists public.user_field_coverage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  field_report_id uuid not null references public.field_reports(id) on delete cascade,
  capture_date date not null,
  capture_year integer not null,
  capture_month integer not null check (capture_month between 1 and 12),
  capture_season text not null check (capture_season in ('Winter','Spring','Summer','Fall')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(field_report_id)
);
create index if not exists user_field_coverage_user_year_month_idx on public.user_field_coverage(user_id, capture_year, capture_month);
drop trigger if exists user_field_coverage_set_updated_at on public.user_field_coverage;
create trigger user_field_coverage_set_updated_at before update on public.user_field_coverage for each row execute function public.set_updated_at();

alter table public.field_report_achievement_claims drop constraint if exists field_report_achievement_claims_field_report_id_achievement_id_key;
create unique index if not exists field_report_achievement_claims_one_manual_per_report_idx on public.field_report_achievement_claims(field_report_id);
create index if not exists field_report_claims_status_idx on public.field_report_achievement_claims(status, claimed_at desc);

alter table public.user_field_coverage enable row level security;
create policy "Members read own coverage and admins read all" on public.user_field_coverage for select using (user_id = auth.uid() or public.is_admin());
create policy "Members insert own coverage" on public.user_field_coverage for insert with check (user_id = auth.uid() and exists (select 1 from public.field_reports fr where fr.id = field_report_id and fr.user_id = auth.uid()));
create policy "Admins manage coverage" on public.user_field_coverage for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Members insert own achievement claims" on public.field_report_achievement_claims;
create policy "Members insert one own manual achievement claim" on public.field_report_achievement_claims for insert with check (user_id = auth.uid() and status = 'auto_awarded_pending_review' and exists (select 1 from public.field_reports fr where fr.id = field_report_id and fr.user_id = auth.uid()) and exists (select 1 from public.achievement_definitions ad where ad.id = achievement_id and ad.is_active and ad.is_manual_claimable));

grant select, insert on public.user_field_coverage to authenticated;
grant update (status, reviewed_at, reviewed_by, review_notes) on public.field_report_achievement_claims to authenticated;
