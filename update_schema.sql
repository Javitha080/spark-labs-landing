-- Add learning_user_progress table to track module completion
create table if not exists learning_user_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  course_id uuid references learning_courses(id) on delete cascade not null,
  module_id uuid references learning_modules(id) on delete cascade not null,
  is_completed boolean default false,
  last_watched_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, module_id)
);

-- Add RLS policies for learning_user_progress
alter table learning_user_progress enable row level security;

create policy "Users can view their own progress"
  on learning_user_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own progress"
  on learning_user_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own progress"
  on learning_user_progress for update
  using (auth.uid() = user_id);

-- Ensure learning_enrollments exists (if not already) and serves as the "My Learning" source
create table if not exists learning_enrollments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  course_id uuid references learning_courses(id) on delete cascade not null,
  enrolled_at timestamptz default now(),
  unique(user_id, course_id)
);

-- RLS for enrollments
alter table learning_enrollments enable row level security;

create policy "Users can view their own enrollments"
  on learning_enrollments for select
  using (auth.uid() = user_id);

create policy "Users can enroll themselves"
  on learning_enrollments for insert
  with check (auth.uid() = user_id);
