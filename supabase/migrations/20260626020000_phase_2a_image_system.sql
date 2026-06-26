alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists state_or_province text;
alter table public.profiles add column if not exists specific_location_name text;
alter table public.membership_grants add column if not exists access_level text not null default 'manual';

create or replace function public.can_view_guild() returns boolean language sql stable security definer set search_path = public as $$ select public.has_active_guild_access() or public.is_admin(); $$;
create or replace function public.can_submit_images() returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (select 1 from public.membership_grants where user_id=auth.uid() and status='active' and starts_at<=now() and (expires_at is null or expires_at>now()) and coalesce(access_level,'manual') in ('paid','workshop','comp','admin','manual'));
$$;

create table if not exists public.guild_images (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null, image_url text not null, image_source text not null default 'external_url', capture_date date not null,
 country text not null, state_or_province text not null, specific_location_name text, gear_settings text not null,
 short_story text, what_went_well text, what_could_have_gone_better text, is_weekly_candidate boolean not null default false,
 week_starts_on date not null, moderation_status text not null default 'visible' check (moderation_status in ('visible','blurred','hidden','deleted','needs_review')),
 moderation_blur_required boolean not null default false, moderation_reason text, moderation_reviewed_by uuid references auth.users(id), moderation_reviewed_at timestamptz,
 hidden_at timestamptz, hidden_by uuid references auth.users(id), deleted_at timestamptz, deleted_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.image_comments (
 id uuid primary key default gen_random_uuid(), image_id uuid not null references public.guild_images(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
 body text not null, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.image_reactions (
 id uuid primary key default gen_random_uuid(), image_id uuid not null references public.guild_images(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
 reaction_type text not null check (reaction_type in ('like','love','wow','envy','beautiful_sky','great_foreground','strong_composition','inspiring_adventure','helpful_story')),
 created_at timestamptz not null default now(), unique(image_id,user_id,reaction_type)
);
create table if not exists public.achievements (
 id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null, category text not null, description text, badge_type text not null, sort_order int not null default 0, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.image_achievements (
 id uuid primary key default gen_random_uuid(), image_id uuid not null references public.guild_images(id) on delete cascade, achievement_id uuid not null references public.achievements(id) on delete cascade,
 awarded_to_user_id uuid not null references auth.users(id) on delete cascade, awarded_by_user_id uuid references auth.users(id), award_source text not null default 'manual', awarded_at timestamptz not null default now(), notes text, unique(image_id,achievement_id,awarded_to_user_id)
);
create index if not exists guild_images_user_idx on public.guild_images(user_id); create index if not exists guild_images_created_idx on public.guild_images(created_at desc); create index if not exists guild_images_week_idx on public.guild_images(week_starts_on); create index if not exists guild_images_candidate_idx on public.guild_images(is_weekly_candidate); create index if not exists guild_images_location_idx on public.guild_images(country,state_or_province); create unique index if not exists guild_images_one_candidate_per_week_idx on public.guild_images(user_id,week_starts_on) where is_weekly_candidate=true and deleted_at is null;
create index if not exists image_comments_image_idx on public.image_comments(image_id,created_at); create index if not exists image_reactions_image_idx on public.image_reactions(image_id,reaction_type);

drop trigger if exists guild_images_set_updated_at on public.guild_images; create trigger guild_images_set_updated_at before update on public.guild_images for each row execute function public.set_updated_at();
drop trigger if exists image_comments_set_updated_at on public.image_comments; create trigger image_comments_set_updated_at before update on public.image_comments for each row execute function public.set_updated_at();

alter table public.guild_images enable row level security; alter table public.image_comments enable row level security; alter table public.image_reactions enable row level security; alter table public.achievements enable row level security; alter table public.image_achievements enable row level security;
create policy "Members read visible images or own" on public.guild_images for select using (public.is_admin() or user_id=auth.uid() or (public.can_view_guild() and hidden_at is null and deleted_at is null and moderation_status not in ('hidden','deleted')));
create policy "Submit capable users insert own images" on public.guild_images for insert with check (user_id=auth.uid() and public.can_submit_images());
create policy "Owners update own non-admin image fields" on public.guild_images for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "Admins manage all images" on public.guild_images for all using (public.is_admin()) with check (public.is_admin());
create policy "Members read comments" on public.image_comments for select using (public.can_view_guild() and deleted_at is null);
create policy "Members add own comments" on public.image_comments for insert with check (user_id=auth.uid() and public.can_view_guild());
create policy "Owners update comments" on public.image_comments for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "Admins manage comments" on public.image_comments for all using (public.is_admin()) with check (public.is_admin());
create policy "Members read reactions" on public.image_reactions for select using (public.can_view_guild());
create policy "Members manage own reactions" on public.image_reactions for all using (user_id=auth.uid() and public.can_view_guild()) with check (user_id=auth.uid() and public.can_view_guild());
create policy "Admins manage reactions" on public.image_reactions for all using (public.is_admin()) with check (public.is_admin());
create policy "Members read active achievements" on public.achievements for select using (active and public.can_view_guild()); create policy "Admins manage achievements" on public.achievements for all using (public.is_admin()) with check (public.is_admin());
create policy "Members read image achievements" on public.image_achievements for select using (public.can_view_guild()); create policy "Admins manage image achievements" on public.image_achievements for all using (public.is_admin()) with check (public.is_admin());

insert into public.achievements (slug,name,category,description,badge_type,sort_order) values
('january-milky-way','January Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',1),
('february-milky-way','February Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',2),
('march-milky-way','March Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',3),
('april-milky-way','April Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',4),
('may-milky-way','May Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',5),
('june-milky-way','June Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',6),
('july-milky-way','July Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',7),
('august-milky-way','August Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',8),
('september-milky-way','September Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',9),
('october-milky-way','October Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',10),
('november-milky-way','November Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',11),
('december-milky-way','December Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',12),
('rocky-foreground-milky-way','Rocky Foreground Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',13),
('water-foreground-milky-way','Water Foreground Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',14),
('trees-foreground-milky-way','Trees Foreground Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',15),
('desert-foreground-milky-way','Desert Foreground Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',16),
('man-made-foreground-milky-way','Man Made Foreground Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',17),
('chasm-foreground-milky-way','Chasm Foreground Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',18),
('light-polluted-foreground-milky-way','Light Polluted Foreground Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',19),
('plant-foreground-milky-way','Plant Foreground Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',20),
('reflection-foreground-milky-way','Reflection Foreground Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',21),
('selfie-human-foreground-milky-way','Selfie/Human Foreground Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',22),
('abandoned-foreground-milky-way','Abandoned Foreground Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',23),
('light-painted-foreground-milky-way','Light Painted Foreground Milky Way','stickers_only','Manual/future AI achievement for eligible Guild image submissions.','sticker',24),
('2018-milky-way','2018 Milky Way','square_pins_and_stickers','Manual/future AI achievement for eligible Guild image submissions.','pin_and_sticker',25),
('winter-milky-way','Winter Milky Way','square_pins_and_stickers','Manual/future AI achievement for eligible Guild image submissions.','pin_and_sticker',26),
('spring-milky-way','Spring Milky Way','square_pins_and_stickers','Manual/future AI achievement for eligible Guild image submissions.','pin_and_sticker',27),
('summer-milky-way','Summer Milky Way','square_pins_and_stickers','Manual/future AI achievement for eligible Guild image submissions.','pin_and_sticker',28),
('fall-milky-way','Fall Milky Way','square_pins_and_stickers','Manual/future AI achievement for eligible Guild image submissions.','pin_and_sticker',29),
('milky-way-timelapse','Milky Way Timelapse','square_pins_and_stickers','Manual/future AI achievement for eligible Guild image submissions.','pin_and_sticker',30),
('moving-milky-way-timelapse','Moving Milky Way Timelapse','square_pins_and_stickers','Manual/future AI achievement for eligible Guild image submissions.','pin_and_sticker',31),
('panorama-milky-way','Panorama Milky Way','square_pins_and_stickers','Manual/future AI achievement for eligible Guild image submissions.','pin_and_sticker',32),
('stacked-milky-way','Stacked Milky Way','square_pins_and_stickers','Manual/future AI achievement for eligible Guild image submissions.','pin_and_sticker',33),
('tracked-milky-way','Tracked Milky Way','square_pins_and_stickers','Manual/future AI achievement for eligible Guild image submissions.','pin_and_sticker',34),
('time-blended-milky-way','Time Blended Milky Way','square_pins_and_stickers','Manual/future AI achievement for eligible Guild image submissions.','pin_and_sticker',35),
('beginner-milky-way-photographer','Beginner Milky Way Photographer','square_pins_only','Manual/future AI achievement for eligible Guild image submissions.','pin',36),
('amateur-milky-way-photographer','Amateur Milky Way Photographer','square_pins_only','Manual/future AI achievement for eligible Guild image submissions.','pin',37),
('novice-milky-way-photographer','Novice Milky Way Photographer','square_pins_only','Manual/future AI achievement for eligible Guild image submissions.','pin',38),
('veteran-milky-way-photographer','Veteran Milky Way Photographer','square_pins_only','Manual/future AI achievement for eligible Guild image submissions.','pin',39),
('master-milky-way-photographer','Master Milky Way Photographer','square_pins_only','Manual/future AI achievement for eligible Guild image submissions.','pin',40),
('twelve-month-milky-way-photographer','Twelve Month Milky Way Photographer','grand','Earned by submitting at least one Milky Way image captured in each month of the year, across any years.','grand',41),
('master-milky-way-photographer-grand','Master Milky Way Photographer','grand','Future grand achievement placeholder based on reaching a threshold number of achievements. Placeholder threshold: 35 achievements.','grand',42)
on conflict (slug) do update set name=excluded.name, category=excluded.category, description=excluded.description, badge_type=excluded.badge_type, sort_order=excluded.sort_order, active=true;
grant update (full_name, display_name, avatar_url, country, state_or_province, specific_location_name) on public.profiles to authenticated;
grant select, insert, update, delete on public.guild_images to authenticated;
grant select, insert, update, delete on public.image_comments to authenticated;
grant select, insert, update, delete on public.image_reactions to authenticated;
grant select on public.achievements to authenticated;
grant select on public.image_achievements to authenticated;
