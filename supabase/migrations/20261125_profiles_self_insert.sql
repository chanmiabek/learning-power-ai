-- Let a signed-in user repair their own missing student profile.
-- Admin-only fields stay protected by the role and active-status checks.
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert
  with check (id = auth.uid() and role = 'student' and is_active = true);
