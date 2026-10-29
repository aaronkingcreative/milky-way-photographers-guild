-- Founding free year is granted only once a member confirms their email.
-- Bots that sign up with addresses they cannot read never receive it.
-- Existing grants are left exactly as they are.

create or replace function public.grant_founding_free_year(p_user_id uuid, p_joined_at timestamptz)
returns void
language plpgsql security definer set search_path = 'public' as $$
begin
  if p_joined_at < public.founding_free_year_cutoff()
     and not exists (
       select 1 from public.membership_grants g
        where g.user_id = p_user_id and g.membership_type = 'founding_free_year'
     ) then
    insert into public.membership_grants (user_id, source, status, starts_at, expires_at, auto_renews, access_level, membership_type, notes)
    values (p_user_id, 'founding_free_year', 'active', now(), public.founding_free_year_expires(), false, 'trial', 'founding_free_year',
            'Free founding year for members who joined in 2026');
  end if;
end; $$;
revoke execute on function public.grant_founding_free_year(uuid, timestamptz) from public, anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = 'public' as $$
declare v_name text := nullif(btrim(new.raw_user_meta_data->>'full_name'), '');
begin
  insert into public.profiles (id, email, full_name, display_name, role)
  values (new.id, new.email, v_name, case when public.guild_plausible_name(v_name) then v_name end, 'member')
  on conflict (id) do nothing;

  -- Only already-confirmed users (for example ones an admin creates) get the grant at insert.
  if new.email_confirmed_at is not null then
    perform public.grant_founding_free_year(new.id, new.created_at);
  end if;
  return new;
end; $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.handle_user_email_confirmed() returns trigger
language plpgsql security definer set search_path = 'public' as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    -- Joining date is the signup date, so someone who signs up in 2026 and confirms after New Year still qualifies.
    perform public.grant_founding_free_year(new.id, new.created_at);
  end if;
  return new;
end; $$;
revoke execute on function public.handle_user_email_confirmed() from public, anon, authenticated;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_email_confirmed();
