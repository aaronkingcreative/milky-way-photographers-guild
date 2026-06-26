create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  display_name text,
  avatar_url text,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.membership_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  auto_renews boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists membership_grants_set_updated_at on public.membership_grants;
create trigger membership_grants_set_updated_at before update on public.membership_grants for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'member')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.has_active_guild_access() returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.membership_grants
    where user_id = auth.uid() and status = 'active' and starts_at <= now() and (expires_at is null or expires_at > now())
  );
$$;

alter table public.profiles enable row level security;
alter table public.membership_grants enable row level security;

create policy "Users can read their own profile" on public.profiles for select using (id = auth.uid());
create policy "Users can update limited own profile fields" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()) and email is not distinct from (select email from public.profiles where id = auth.uid()));
create policy "Admins can read all profiles" on public.profiles for select using (public.is_admin());
create policy "Admins can update all profiles" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

create policy "Users can read own membership grants" on public.membership_grants for select using (user_id = auth.uid());
create policy "Admins can read membership grants" on public.membership_grants for select using (public.is_admin());
create policy "Admins can insert membership grants" on public.membership_grants for insert with check (public.is_admin());
create policy "Admins can update membership grants" on public.membership_grants for update using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete membership grants" on public.membership_grants for delete using (public.is_admin());

revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, display_name, avatar_url) on public.profiles to authenticated;
grant select on public.membership_grants to authenticated;
