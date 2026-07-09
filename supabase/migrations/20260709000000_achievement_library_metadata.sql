update public.achievement_definitions set
  requirement = format('Choose this Field Honor on an image captured in %s.', split_part(name, ' ', 1)),
  description = format('A manually claimed Field Honor for a Milky Way image captured in %s.', split_part(name, ' ', 1)),
  is_manual_claimable = true,
  is_automatic = false,
  counts_toward_rank = true
where category = 'monthly';

update public.achievement_definitions set requirement = values_table.requirement, description = values_table.description, is_manual_claimable = true, is_automatic = false, counts_toward_rank = true
from (values
('seasonal_winter','Choose this Field Honor on an image captured in December, January, or February.','A manually claimed Field Honor for a Milky Way image captured in Winter.'),
('seasonal_spring','Choose this Field Honor on an image captured in March, April, or May.','A manually claimed Field Honor for a Milky Way image captured in Spring.'),
('seasonal_summer','Choose this Field Honor on an image captured in June, July, or August.','A manually claimed Field Honor for a Milky Way image captured in Summer.'),
('seasonal_fall','Choose this Field Honor on an image captured in September, October, or November.','A manually claimed Field Honor for a Milky Way image captured in Fall.')
) as values_table(id, requirement, description)
where public.achievement_definitions.id = values_table.id;

update public.achievement_definitions set requirement = values_table.requirement, description = values_table.description, is_manual_claimable = true, is_automatic = false, counts_toward_rank = true
from (values
('foreground_rocky','Choose this Field Honor for an image where rock, stone, cliffs, arches, towers, or formations are a major foreground element.','A manually claimed Field Honor for a rocky foreground Milky Way image.'),
('foreground_water','Choose this Field Honor for an image where water is a major foreground element.','A manually claimed Field Honor for a water foreground Milky Way image.'),
('foreground_trees','Choose this Field Honor for an image where trees or a forested scene are a major foreground element.','A manually claimed Field Honor for a trees foreground Milky Way image.'),
('foreground_desert','Choose this Field Honor for an image where desert landscape is a major foreground element.','A manually claimed Field Honor for a desert foreground Milky Way image.'),
('foreground_man_made','Choose this Field Honor for an image where a building, ruin, structure, road, vehicle, or other human-made element is a major foreground element.','A manually claimed Field Honor for a man made foreground Milky Way image.'),
('foreground_chasm','Choose this Field Honor for an image where a canyon, gorge, ravine, cave opening, or chasm is a major foreground element.','A manually claimed Field Honor for a chasm foreground Milky Way image.'),
('foreground_light_polluted','Choose this Field Honor for an image that intentionally includes city glow, town glow, or other light pollution as part of the scene.','A manually claimed Field Honor for a light polluted foreground Milky Way image.'),
('foreground_plant','Choose this Field Honor for an image where a plant, cactus, shrub, wildflower, or smaller natural subject is a major foreground element.','A manually claimed Field Honor for a plant foreground Milky Way image.'),
('foreground_reflection','Choose this Field Honor for an image where the Milky Way, stars, or night sky are reflected in water, wet sand, salt flats, ice, or another reflective surface.','A manually claimed Field Honor for a reflection foreground Milky Way image.'),
('foreground_selfie_human','Choose this Field Honor for an image where a person or silhouette is a meaningful part of the composition.','A manually claimed Field Honor for a selfie/human foreground Milky Way image.'),
('foreground_abandoned','Choose this Field Honor for an image with an abandoned building, vehicle, mine, ruin, or forgotten human-made subject.','A manually claimed Field Honor for an abandoned foreground Milky Way image.'),
('foreground_light_painted','Choose this Field Honor for an image where intentional light painting or low-level lighting is part of the final image.','A manually claimed Field Honor for a light painted foreground Milky Way image.')
) as values_table(id, requirement, description)
where public.achievement_definitions.id = values_table.id;

update public.achievement_definitions set requirement = values_table.requirement, is_manual_claimable = true, is_automatic = false, counts_toward_rank = true
from (values
('technique_milky_way_timelapse','Choose this Field Honor for a submitted Milky Way timelapse sequence or timelapse-based field report.'),
('technique_moving_milky_way_timelapse','Choose this Field Honor for a Milky Way timelapse with meaningful camera movement, motion control, pan, tilt, slider movement, or moving composition.'),
('technique_panorama','Choose this Field Honor for a stitched Milky Way panorama.'),
('technique_stacked','Choose this Field Honor for a Milky Way image made with stacked exposures to reduce noise or improve detail.'),
('technique_tracked','Choose this Field Honor for a Milky Way image made with a star tracker or tracking mount.'),
('technique_time_blended','Choose this Field Honor for an image that combines exposures from different times, such as blue hour foreground with night sky.')
) as values_table(id, requirement)
where public.achievement_definitions.id = values_table.id;

update public.achievement_definitions set name = 'Decade Under the Stars', category = 'special', description = 'Milky Way year coverage across ten different calendar years.', requirement = 'Earned when a member has Milky Way year coverage across ten different calendar years.', is_manual_claimable = false, is_automatic = true
where id in ('year_2018','special_decade_under_the_stars');

update public.achievement_definitions set description = 'Automatic honor for coverage in all 12 months of one calendar year.', requirement = 'Automatically earned when a member has submitted at least one Milky Way field report from every month in the same calendar year.', is_manual_claimable = false, is_automatic = true, counts_toward_rank = true where id = 'special_perfect_year';

update public.achievement_definitions set requirement = values_table.requirement, is_manual_claimable = false, is_automatic = true, counts_toward_rank = false
from (values
('rank_beginner','Earn 1 to 7 rank-counting Field Honors.'),
('rank_amateur','Earn 8 to 17 rank-counting Field Honors.'),
('rank_novice','Earn 18 to 24 rank-counting Field Honors.'),
('rank_veteran','Earn 25 to 32 rank-counting Field Honors.'),
('rank_master','Earn 33 or more rank-counting Field Honors.')
) as values_table(id, requirement)
where public.achievement_definitions.id = values_table.id;
