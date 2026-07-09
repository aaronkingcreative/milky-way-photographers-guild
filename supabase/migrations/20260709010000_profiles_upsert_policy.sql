do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can insert their own profile'
  ) then
    create policy "Users can insert their own profile" on public.profiles
      for insert to authenticated
      with check (id = auth.uid() and role = 'member');
  end if;
end $$;

grant insert (id, email, display_name, avatar_url, avatar_path, country, region, state_or_province, specific_location, specific_location_name) on public.profiles to authenticated;
