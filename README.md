# Milky Way Photographers Guild

Phase 1 foundation for MilkyWayPhotographersGuild.com: a standalone Next.js App Router, Tailwind, and Supabase Auth/Postgres site at the repository root.

## Local setup

```bash
npm install
npm run dev
```

## Environment variables

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Do not commit real Supabase credentials.

## Supabase migrations

Run the SQL in `supabase/migrations/20260626000000_phase_1_foundation.sql` with the Supabase CLI or SQL editor.

```bash
supabase db push
```

The migration creates `profiles`, `membership_grants`, helper functions, RLS policies, a new-user profile trigger, and reusable `updated_at` triggers.

## Manual first admin

After signing up, make the first admin in the Supabase SQL editor:

```sql
update public.profiles
set role = 'admin'
where email = 'YOUR_EMAIL_HERE';
```

## Manual active Guild access grant

```sql
insert into public.membership_grants (
  user_id,
  source,
  status,
  starts_at,
  expires_at,
  auto_renews,
  notes
)
select
  id,
  'manual_admin_grant',
  'active',
  now(),
  null,
  false,
  'Initial manual access grant'
from auth.users
where email = 'YOUR_EMAIL_HERE';
```

## Deployment to Vercel

Keep the Vercel Root Directory set to the repository root. Vercel will detect Next.js from the root `package.json` and build with the default Next.js preset. Add the required environment variables in Vercel Project Settings before deploying.

## Phase 1 scope

Included: public marketing site, login, signup, dashboard, access gating, protected placeholder pages, admin shell, and Supabase schema. Later phases can add image uploads, Cloudflare R2, weekly voting, achievements, moderation, and Stripe memberships.
