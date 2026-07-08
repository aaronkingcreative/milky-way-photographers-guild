create table if not exists public.achievement_definitions (
  id text primary key,
  name text not null,
  category text not null check (category in ('monthly','seasonal','foreground','technique','year','rank')),
  reward_type text not null check (reward_type in ('sticker','square_pin','sticker_and_square_pin')),
  glyph text not null,
  description text not null,
  requirement text not null,
  constellation text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.achievement_definitions(id) on delete cascade,
  earned_at timestamptz,
  source_submission_id uuid references public.guild_images(id) on delete set null,
  awarded_by uuid references auth.users(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create index if not exists achievement_definitions_category_sort_idx on public.achievement_definitions(category, sort_order);
create index if not exists user_achievements_user_earned_idx on public.user_achievements(user_id, earned_at);

drop trigger if exists achievement_definitions_set_updated_at on public.achievement_definitions;
create trigger achievement_definitions_set_updated_at before update on public.achievement_definitions for each row execute function public.set_updated_at();
drop trigger if exists user_achievements_set_updated_at on public.user_achievements;
create trigger user_achievements_set_updated_at before update on public.user_achievements for each row execute function public.set_updated_at();

alter table public.achievement_definitions enable row level security;
alter table public.user_achievements enable row level security;

create policy "Active achievement definitions are readable" on public.achievement_definitions for select using (is_active or public.is_admin());
create policy "Admins can manage achievement definitions" on public.achievement_definitions for all using (public.is_admin()) with check (public.is_admin());
create policy "Users can read own achievements" on public.user_achievements for select using (user_id = auth.uid());
create policy "Admins can read all achievements" on public.user_achievements for select using (public.is_admin());
create policy "Admins can manage user achievements" on public.user_achievements for all using (public.is_admin()) with check (public.is_admin());

grant select on public.achievement_definitions to authenticated;
grant select on public.user_achievements to authenticated;

insert into public.achievement_definitions (id, name, category, reward_type, glyph, description, requirement, constellation, sort_order, is_active, metadata) values
('monthly_january','January Milky Way','monthly','sticker','☾','A Milky Way image captured in January.','Submit a Milky Way image captured in January.','field_year',10,true,'{"month":1}'::jsonb),
('monthly_february','February Milky Way','monthly','sticker','☾','A Milky Way image captured in February.','Submit a Milky Way image captured in February.','field_year',11,true,'{"month":2}'::jsonb),
('monthly_march','March Milky Way','monthly','sticker','☾','A Milky Way image captured in March.','Submit a Milky Way image captured in March.','field_year',12,true,'{"month":3}'::jsonb),
('monthly_april','April Milky Way','monthly','sticker','☾','A Milky Way image captured in April.','Submit a Milky Way image captured in April.','field_year',13,true,'{"month":4}'::jsonb),
('monthly_may','May Milky Way','monthly','sticker','☾','A Milky Way image captured in May.','Submit a Milky Way image captured in May.','field_year',14,true,'{"month":5}'::jsonb),
('monthly_june','June Milky Way','monthly','sticker','☾','A Milky Way image captured in June.','Submit a Milky Way image captured in June.','field_year',15,true,'{"month":6}'::jsonb),
('monthly_july','July Milky Way','monthly','sticker','☾','A Milky Way image captured in July.','Submit a Milky Way image captured in July.','field_year',16,true,'{"month":7}'::jsonb),
('monthly_august','August Milky Way','monthly','sticker','☾','A Milky Way image captured in August.','Submit a Milky Way image captured in August.','field_year',17,true,'{"month":8}'::jsonb),
('monthly_september','September Milky Way','monthly','sticker','☾','A Milky Way image captured in September.','Submit a Milky Way image captured in September.','field_year',18,true,'{"month":9}'::jsonb),
('monthly_october','October Milky Way','monthly','sticker','☾','A Milky Way image captured in October.','Submit a Milky Way image captured in October.','field_year',19,true,'{"month":10}'::jsonb),
('monthly_november','November Milky Way','monthly','sticker','☾','A Milky Way image captured in November.','Submit a Milky Way image captured in November.','field_year',20,true,'{"month":11}'::jsonb),
('monthly_december','December Milky Way','monthly','sticker','☾','A Milky Way image captured in December.','Submit a Milky Way image captured in December.','field_year',21,true,'{"month":12}'::jsonb),
('foreground_rocky','Rocky Foreground Milky Way','foreground','sticker','◆','A Milky Way image featuring rocky foreground interest.','Submit a Milky Way image with rocky foreground interest.','foregrounds',100,true,'{}'::jsonb),
('foreground_water','Water Foreground Milky Way','foreground','sticker','◒','A Milky Way image featuring water foreground interest.','Submit a Milky Way image with water foreground interest.','foregrounds',101,true,'{}'::jsonb),
('foreground_trees','Trees Foreground Milky Way','foreground','sticker','♣','A Milky Way image featuring trees foreground interest.','Submit a Milky Way image with trees foreground interest.','foregrounds',102,true,'{}'::jsonb),
('foreground_desert','Desert Foreground Milky Way','foreground','sticker','◆','A Milky Way image featuring desert foreground interest.','Submit a Milky Way image with desert foreground interest.','foregrounds',103,true,'{}'::jsonb),
('foreground_man_made','Man Made Foreground Milky Way','foreground','sticker','◆','A Milky Way image featuring man made foreground interest.','Submit a Milky Way image with man made foreground interest.','foregrounds',104,true,'{}'::jsonb),
('foreground_chasm','Chasm Foreground Milky Way','foreground','sticker','◆','A Milky Way image featuring chasm foreground interest.','Submit a Milky Way image with chasm foreground interest.','foregrounds',105,true,'{}'::jsonb),
('foreground_light_polluted','Light Polluted Foreground Milky Way','foreground','sticker','◆','A Milky Way image featuring light polluted foreground interest.','Submit a Milky Way image with light polluted foreground interest.','foregrounds',106,true,'{}'::jsonb),
('foreground_plant','Plant Foreground Milky Way','foreground','sticker','◆','A Milky Way image featuring plant foreground interest.','Submit a Milky Way image with plant foreground interest.','foregrounds',107,true,'{}'::jsonb),
('foreground_reflection','Reflection Foreground Milky Way','foreground','sticker','◒','A Milky Way image featuring reflection foreground interest.','Submit a Milky Way image with reflection foreground interest.','foregrounds',108,true,'{}'::jsonb),
('foreground_selfie_human','Selfie/Human Foreground Milky Way','foreground','sticker','♟','A Milky Way image featuring selfie/human foreground interest.','Submit a Milky Way image with selfie/human foreground interest.','foregrounds',109,true,'{}'::jsonb),
('foreground_abandoned','Abandoned Foreground Milky Way','foreground','sticker','◆','A Milky Way image featuring abandoned foreground interest.','Submit a Milky Way image with abandoned foreground interest.','foregrounds',110,true,'{}'::jsonb),
('foreground_light_painted','Light Painted Foreground Milky Way','foreground','sticker','◆','A Milky Way image featuring light painted foreground interest.','Submit a Milky Way image with light painted foreground interest.','foregrounds',111,true,'{}'::jsonb),
('year_2018','2018 Milky Way','year','sticker_and_square_pin','✦','A Milky Way image captured during 2018.','Submit a Milky Way image captured during 2018.','decade',220,true,'{"year":2018}'::jsonb),
('seasonal_winter','Winter Milky Way','seasonal','sticker_and_square_pin','✧','A Milky Way image captured in Winter.','Submit a Milky Way image captured in Winter.','seasons',240,true,'{}'::jsonb),
('seasonal_spring','Spring Milky Way','seasonal','sticker_and_square_pin','✧','A Milky Way image captured in Spring.','Submit a Milky Way image captured in Spring.','seasons',241,true,'{}'::jsonb),
('seasonal_summer','Summer Milky Way','seasonal','sticker_and_square_pin','✧','A Milky Way image captured in Summer.','Submit a Milky Way image captured in Summer.','seasons',242,true,'{}'::jsonb),
('seasonal_fall','Fall Milky Way','seasonal','sticker_and_square_pin','✧','A Milky Way image captured in Fall.','Submit a Milky Way image captured in Fall.','seasons',243,true,'{}'::jsonb),
('technique_milky_way_timelapse','Milky Way Timelapse','technique','sticker_and_square_pin','▷','Milky Way Timelapse field technique honor.','Submit a milky way timelapse image or sequence.','techniques',300,true,'{}'::jsonb),
('technique_moving_milky_way_timelapse','Moving Milky Way Timelapse','technique','sticker_and_square_pin','▣','Moving Milky Way Timelapse field technique honor.','Submit a moving milky way timelapse image or sequence.','techniques',301,true,'{}'::jsonb),
('technique_panorama','Panorama Milky Way','technique','sticker_and_square_pin','▱','Panorama Milky Way field technique honor.','Submit a panorama milky way image or sequence.','techniques',302,true,'{}'::jsonb),
('technique_stacked','Stacked Milky Way','technique','sticker_and_square_pin','♨','Stacked Milky Way field technique honor.','Submit a stacked milky way image or sequence.','techniques',303,true,'{}'::jsonb),
('technique_tracked','Tracked Milky Way','technique','sticker_and_square_pin','⊕','Tracked Milky Way field technique honor.','Submit a tracked milky way image or sequence.','techniques',304,true,'{}'::jsonb),
('technique_time_blended','Time Blended Milky Way','technique','sticker_and_square_pin','◫','Time Blended Milky Way field technique honor.','Submit a time blended milky way image or sequence.','techniques',305,true,'{}'::jsonb),
('rank_beginner','Beginner Milky Way Photographer','rank','square_pin','★','Beginner Guild rank honor.','Earn enough field honors to reach Beginner rank.','ranks',400,true,'{}'::jsonb),
('rank_amateur','Amateur Milky Way Photographer','rank','square_pin','★','Amateur Guild rank honor.','Earn enough field honors to reach Amateur rank.','ranks',401,true,'{}'::jsonb),
('rank_novice','Novice Milky Way Photographer','rank','square_pin','★','Novice Guild rank honor.','Earn enough field honors to reach Novice rank.','ranks',402,true,'{}'::jsonb),
('rank_veteran','Veteran Milky Way Photographer','rank','square_pin','★','Veteran Guild rank honor.','Earn enough field honors to reach Veteran rank.','ranks',403,true,'{}'::jsonb),
('rank_master','Master Milky Way Photographer','rank','square_pin','★','Master Guild rank honor.','Earn enough field honors to reach Master rank.','ranks',404,true,'{}'::jsonb)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  reward_type = excluded.reward_type,
  glyph = excluded.glyph,
  description = excluded.description,
  requirement = excluded.requirement,
  constellation = excluded.constellation,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  metadata = public.achievement_definitions.metadata || excluded.metadata;
