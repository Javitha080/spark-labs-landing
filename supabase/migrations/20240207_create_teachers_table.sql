-- Create teachers table
create table public.teachers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text not null, -- e.g. "Teacher in Charge"
  bio text,
  image_url text,
  email text,
  display_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.teachers enable row level security;

-- Policies
create policy "Public teachers are viewable by everyone." on public.teachers for select using (true);
create policy "Teachers are insertable by authenticated users only." on public.teachers for insert with check (auth.role() = 'authenticated');
create policy "Teachers are updateable by authenticated users only." on public.teachers for update using (auth.role() = 'authenticated');
create policy "Teachers are deletable by authenticated users only." on public.teachers for delete using (auth.role() = 'authenticated');
