-- Weekly submission slots now follow the IOTW entry week: Sunday 12:00 PM MT to the next Sunday 12:00 PM MT.
-- guild_images.week_starts_on is the Sunday (MT date) on which that entry week began. Re-key existing rows
-- made on a Sunday morning (before noon MT) into the previous week. Nothing is deleted.
update public.guild_images g
set week_starts_on = x.new_week
from (
  select id,
         (mt::date - extract(dow from mt)::int - case when extract(dow from mt) = 0 and extract(hour from mt) < 12 then 7 else 0 end) as new_week
  from (select id, created_at at time zone 'America/Denver' as mt from public.guild_images) s
) x
where x.id = g.id and g.week_starts_on <> x.new_week;

comment on column public.guild_images.week_starts_on is
  'Sunday (America/Denver date) that opened this image''s submission week. Weeks turn over Sunday 12:00 PM MT, matching the IOTW entry week.';
