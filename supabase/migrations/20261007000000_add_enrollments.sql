create table if not exists public.enrollments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles (id) on delete cascade not null,
  curriculum_id uuid references public.curriculums (id) on delete cascade not null,
  status text check (status in ('active', 'completed', 'dropped')) default 'active',
  enrolled_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, curriculum_id)
);
