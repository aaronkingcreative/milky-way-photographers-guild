insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-avatars', 'profile-avatars', true, 31457280, array['image/jpeg','image/png','image/webp']),
  ('field-report-images', 'field-report-images', true, 31457280, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists region text;
alter table public.profiles add column if not exists specific_location text;

alter table public.guild_images add column if not exists image_bucket text;
alter table public.guild_images add column if not exists image_original_path text;
alter table public.guild_images add column if not exists image_width integer;
alter table public.guild_images add column if not exists image_height integer;
alter table public.guild_images add column if not exists image_size_bytes bigint;
alter table public.guild_images add column if not exists display_image_path text;
alter table public.guild_images add column if not exists detail_image_path text;
alter table public.guild_images add column if not exists status text not null default 'published' check (status in ('published','hidden','removed'));

create table if not exists public.field_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  capture_date date not null,
  country text not null,
  region text not null,
  specific_location text,
  gear text not null,
  story text,
  went_well text,
  could_have_gone_better text,
  image_original_path text not null,
  image_bucket text not null default 'field-report-images',
  image_width integer,
  image_height integer,
  image_size_bytes bigint,
  is_iotw_candidate boolean not null default false,
  iotw_week_start date,
  guild_image_id uuid references public.guild_images(id) on delete set null,
  status text not null default 'published' check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists field_reports_one_iotw_per_week_idx on public.field_reports(user_id, iotw_week_start) where is_iotw_candidate = true and status <> 'removed';
create index if not exists field_reports_user_created_idx on public.field_reports(user_id, created_at desc);
create index if not exists field_reports_status_created_idx on public.field_reports(status, created_at desc);
drop trigger if exists field_reports_set_updated_at on public.field_reports;
create trigger field_reports_set_updated_at before update on public.field_reports for each row execute function public.set_updated_at();

alter table public.user_achievements add column if not exists source_field_report_id uuid references public.field_reports(id) on delete set null;
alter table public.user_achievements add column if not exists status text not null default 'verified' check (status in ('auto_awarded_pending_review','verified','rejected','revoked'));

create table if not exists public.field_report_achievement_claims (
  id uuid primary key default gen_random_uuid(),
  field_report_id uuid not null references public.field_reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.achievement_definitions(id) on delete cascade,
  status text not null default 'auto_awarded_pending_review' check (status in ('auto_awarded_pending_review','verified','rejected','revoked')),
  claimed_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_notes text,
  unique(field_report_id, achievement_id)
);
create index if not exists field_report_claims_user_idx on public.field_report_achievement_claims(user_id, claimed_at desc);

alter table public.field_reports enable row level security;
alter table public.field_report_achievement_claims enable row level security;

create policy "Members read published field reports or own" on public.field_reports for select using (public.is_admin() or user_id = auth.uid() or (public.can_view_guild() and status = 'published'));
create policy "Members insert own field reports" on public.field_reports for insert with check (user_id = auth.uid() and public.can_submit_images());
create policy "Members update own field reports" on public.field_reports for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Admins manage field reports" on public.field_reports for all using (public.is_admin()) with check (public.is_admin());

create policy "Members read own achievement claims" on public.field_report_achievement_claims for select using (user_id = auth.uid() or public.is_admin());
create policy "Members insert own achievement claims" on public.field_report_achievement_claims for insert with check (user_id = auth.uid());
create policy "Admins manage achievement claims" on public.field_report_achievement_claims for all using (public.is_admin()) with check (public.is_admin());

create policy "Users upload own avatars" on storage.objects for insert to authenticated with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text);
create policy "Users update own avatars" on storage.objects for update to authenticated using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text) with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text);
create policy "Public read avatars" on storage.objects for select using (bucket_id = 'profile-avatars');
create policy "Users upload own field report images" on storage.objects for insert to authenticated with check (bucket_id = 'field-report-images' and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text);
create policy "Users update own field report images" on storage.objects for update to authenticated using (bucket_id = 'field-report-images' and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text) with check (bucket_id = 'field-report-images' and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text);
create policy "Public read field report images" on storage.objects for select using (bucket_id = 'field-report-images');

grant select, insert, update on public.field_reports to authenticated;
grant select, insert on public.field_report_achievement_claims to authenticated;
grant update (full_name, display_name, avatar_url, avatar_path, country, region, state_or_province, specific_location, specific_location_name) on public.profiles to authenticated;
grant insert, update (earned_at, source_submission_id, source_field_report_id, awarded_by, notes, metadata, status) on public.user_achievements to authenticated;

create policy "Users can insert own pending achievements" on public.user_achievements for insert with check (user_id = auth.uid() and status = 'auto_awarded_pending_review');
create policy "Users can update own pending achievements" on public.user_achievements for update using (user_id = auth.uid() and status = 'auto_awarded_pending_review') with check (user_id = auth.uid() and status = 'auto_awarded_pending_review');
