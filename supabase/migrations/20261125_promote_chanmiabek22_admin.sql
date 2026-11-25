-- Admin is the application's highest role and is labeled Super Admin in the UI.
-- Run after chanmiabek22@gmail.com has registered in this Supabase project.
do $$
begin
  update public.profiles
  set role = 'admin', is_active = true, wants_instructor = false
  where lower(email) = lower('chanmiabek22@gmail.com');

  if not found then
    raise notice 'No profile found for chanmiabek22@gmail.com. Register that email first, then run this migration again.';
  end if;
end
$$;
