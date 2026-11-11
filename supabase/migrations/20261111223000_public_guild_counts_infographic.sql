-- Extend public_guild_counts with more public aggregates for the Guild stats panel.
-- Still returns counts and group totals only, never a member row or a personal field.
--
-- Existing keys stay as they are:
--   comments  image_comments rows that are not deleted
--   pics      field_reports with status published (one shared picture each)
--   honors    user_achievements in an earned status, excluding rank milestones
--
-- Added keys:
--   members          rows in profiles
--   reactions        rows in image_reactions
--   regions          distinct non-empty field_reports.region among published reports
--   countries        distinct non-empty field_reports.country among published reports
--   week_pics        published reports created in the current America/Denver week
--   honor_categories [{key, n}] earned honors grouped by definition category, no ranks
--   places           top eight published-report regions as [{name, n}]
--   us_states        published-report regions that match a US state, as [{code, n}]
--   capture_years    published reports by capture year (1990 through the current year)

create or replace function public.public_guild_counts()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with honors as (
    select ad.category
    from public.user_achievements ua
    join public.achievement_definitions ad on ad.id = ua.achievement_id
    where ua.status in ('auto_awarded_pending_review', 'verified')
      and ad.category <> 'rank'
      and coalesce(ad.counts_toward_rank, true)
      and pg_catalog.strpos(ua.achievement_id, 'rank_') <> 1
  ),
  reports as (
    select
      fr.created_at,
      fr.capture_date,
      nullif(pg_catalog.btrim(fr.country), '') as country,
      nullif(pg_catalog.btrim(fr.region), '') as region
    from public.field_reports fr
    where fr.status = 'published'
  ),
  coded as (
    select
      case pg_catalog.lower(region)
        when 'alabama' then 'AL'
        when 'alaska' then 'AK'
        when 'arizona' then 'AZ'
        when 'arkansas' then 'AR'
        when 'california' then 'CA'
        when 'colorado' then 'CO'
        when 'connecticut' then 'CT'
        when 'delaware' then 'DE'
        when 'district of columbia' then 'DC'
        when 'washington dc' then 'DC'
        when 'washington, d.c.' then 'DC'
        when 'florida' then 'FL'
        when 'georgia' then 'GA'
        when 'hawaii' then 'HI'
        when 'idaho' then 'ID'
        when 'illinois' then 'IL'
        when 'indiana' then 'IN'
        when 'iowa' then 'IA'
        when 'kansas' then 'KS'
        when 'kentucky' then 'KY'
        when 'louisiana' then 'LA'
        when 'maine' then 'ME'
        when 'maryland' then 'MD'
        when 'massachusetts' then 'MA'
        when 'michigan' then 'MI'
        when 'minnesota' then 'MN'
        when 'mississippi' then 'MS'
        when 'missouri' then 'MO'
        when 'montana' then 'MT'
        when 'nebraska' then 'NE'
        when 'nevada' then 'NV'
        when 'new hampshire' then 'NH'
        when 'new jersey' then 'NJ'
        when 'new mexico' then 'NM'
        when 'new york' then 'NY'
        when 'north carolina' then 'NC'
        when 'north dakota' then 'ND'
        when 'ohio' then 'OH'
        when 'oklahoma' then 'OK'
        when 'oregon' then 'OR'
        when 'pennsylvania' then 'PA'
        when 'rhode island' then 'RI'
        when 'south carolina' then 'SC'
        when 'south dakota' then 'SD'
        when 'tennessee' then 'TN'
        when 'texas' then 'TX'
        when 'utah' then 'UT'
        when 'vermont' then 'VT'
        when 'virginia' then 'VA'
        when 'washington' then 'WA'
        when 'west virginia' then 'WV'
        when 'wisconsin' then 'WI'
        when 'wyoming' then 'WY'
        else null
      end as code,
      count(*)::int as n
    from reports
    where region is not null
    group by 1
  )
  select pg_catalog.jsonb_build_object(
    'comments', (
      select count(*)::int
      from public.image_comments
      where deleted_at is null
    ),
    'pics', (
      select count(*)::int
      from reports
    ),
    'honors', (
      select count(*)::int
      from honors
    ),
    'members', (
      select count(*)::int
      from public.profiles
    ),
    'reactions', (
      select count(*)::int
      from public.image_reactions
    ),
    'regions', (
      select count(distinct region)::int
      from reports
      where region is not null
    ),
    'countries', (
      select count(distinct country)::int
      from reports
      where country is not null
    ),
    'week_pics', (
      select count(*)::int
      from reports
      where created_at >= pg_catalog.date_trunc(
        'week',
        pg_catalog.timezone('America/Denver', pg_catalog.now())
      ) at time zone 'America/Denver'
    ),
    'honor_categories', (
      select coalesce(
        pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object('key', category, 'n', n)
          order by n desc, category
        ),
        '[]'::jsonb
      )
      from (
        select category, count(*)::int as n
        from honors
        group by category
      ) categories
    ),
    'places', (
      select coalesce(
        pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object('name', region, 'n', n)
          order by n desc, region
        ),
        '[]'::jsonb
      )
      from (
        select region, count(*)::int as n
        from reports
        where region is not null
        group by region
        order by count(*) desc, region
        limit 8
      ) top_places
    ),
    'us_states', (
      select coalesce(
        pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object('code', code, 'n', n)
          order by n desc, code
        ),
        '[]'::jsonb
      )
      from coded
      where code is not null
    ),
    'capture_years', (
      select coalesce(
        pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object('year', year, 'n', n)
          order by year
        ),
        '[]'::jsonb
      )
      from (
        select extract(year from capture_date)::int as year, count(*)::int as n
        from reports
        where capture_date is not null
          and extract(year from capture_date) between 1990
            and extract(year from pg_catalog.timezone('America/Denver', pg_catalog.now()))
        group by 1
      ) years
    )
  );
$$;

comment on function public.public_guild_counts() is
  'Public aggregates only. comments, pics, honors, members, reactions, regions, countries, week_pics, plus honor_categories, places, us_states, and capture_years. Never returns a member row.';

revoke all on function public.public_guild_counts() from public, anon, authenticated;
grant execute on function public.public_guild_counts() to anon, service_role;
