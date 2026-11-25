-- L&P AI database schema. Run in Supabase: SQL Editor > New query > Run.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'student' check (role in ('student','instructor','admin')),
  wants_instructor boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text default '',
  category text default 'General',
  level text default 'Beginner',
  thumbnail_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  video_url text,
  body text default '',
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null,
  file_path text not null,
  file_url text not null,
  file_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (course_id, student_id)
);

create table if not exists public.lesson_progress (
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null
);

create table if not exists public.translations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null,
  source text,
  target text,
  input text,
  output text,
  created_at timestamptz not null default now()
);

insert into public.platform_settings (key, value) values
  ('allow_registration', 'true'),
  ('allow_instructor_requests', 'true'),
  ('translator_enabled', 'true'),
  ('announcement', '""')
on conflict (key) do nothing;

-- Helpers ------------------------------------------------------------------
create or replace function public.current_role_name() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() and is_active $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.current_role_name() = 'admin', false) $$;

create or replace function public.owns_course(cid uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.courses where id = cid and instructor_id = auth.uid()) $$;

create or replace function public.is_enrolled(cid uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.enrollments where course_id = cid and student_id = auth.uid()) $$;

-- New user -> profile -------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, wants_instructor)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'wants_instructor')::boolean, false)
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only admins may change role / active status
create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.is_active := old.is_active;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Row level security --------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.materials enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.platform_settings enable row level security;
alter table public.translations enable row level security;

create policy "profiles read" on public.profiles for select
  using (id = auth.uid() or public.is_admin() or role = 'instructor');
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert
  with check (id = auth.uid() and role = 'student' and is_active = true);
create policy "profiles update" on public.profiles for update
  using (id = auth.uid() or public.is_admin());
create policy "profiles delete" on public.profiles for delete using (public.is_admin());

create policy "courses read" on public.courses for select
  using (is_published or instructor_id = auth.uid() or public.is_admin());
create policy "courses insert" on public.courses for insert
  with check (instructor_id = auth.uid() and public.current_role_name() in ('instructor','admin'));
create policy "courses update" on public.courses for update
  using (instructor_id = auth.uid() or public.is_admin());
create policy "courses delete" on public.courses for delete
  using (instructor_id = auth.uid() or public.is_admin());

create policy "lessons read" on public.lessons for select
  using (public.owns_course(course_id) or public.is_admin() or public.is_enrolled(course_id));
create policy "lessons write" on public.lessons for all
  using (public.owns_course(course_id) or public.is_admin())
  with check (public.owns_course(course_id) or public.is_admin());

create policy "materials read" on public.materials for select
  using (public.owns_course(course_id) or public.is_admin() or public.is_enrolled(course_id));
create policy "materials write" on public.materials for all
  using (public.owns_course(course_id) or public.is_admin())
  with check (public.owns_course(course_id) or public.is_admin());

create policy "enrollments read" on public.enrollments for select
  using (student_id = auth.uid() or public.owns_course(course_id) or public.is_admin());
create policy "enrollments insert" on public.enrollments for insert
  with check (student_id = auth.uid()
    and exists (select 1 from public.courses c where c.id = course_id and c.is_published));
create policy "enrollments delete" on public.enrollments for delete
  using (student_id = auth.uid() or public.is_admin());

create policy "progress own" on public.lesson_progress for all
  using (student_id = auth.uid() or public.is_admin())
  with check (student_id = auth.uid());

create policy "settings read" on public.platform_settings for select using (true);
create policy "settings write" on public.platform_settings for all
  using (public.is_admin()) with check (public.is_admin());

create policy "translations own" on public.translations for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

-- Storage -------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('course-materials', 'course-materials', true)
on conflict (id) do nothing;

create policy "materials upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'course-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_role_name() in ('instructor','admin'));
create policy "materials read files" on storage.objects for select
  using (bucket_id = 'course-materials');
create policy "materials delete" on storage.objects for delete to authenticated
  using (bucket_id = 'course-materials'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- After you register, make yourself Super Admin:
-- update public.profiles set role = 'admin' where email = 'you@example.com';
