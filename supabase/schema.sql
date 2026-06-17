-- PortoLink SaaS MVP Supabase Schema
-- Jalankan di Supabase SQL Editor.
-- Setelah itu buat user melalui Auth atau register dari aplikasi.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_-]{3,30}$'),
  full_name text not null,
  headline text,
  bio text,
  photo_url text,
  location text,
  email_public text,
  phone_public text,
  linkedin_url text,
  github_url text,
  instagram_url text,
  website_url text,
  template_id text default 'clean-blue',
  is_published boolean default true,
  is_premium boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  demo_url text,
  repo_url text,
  tags text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  level text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  company text not null,
  start_date text,
  end_date text,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.educations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  school text not null,
  degree text,
  year text,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  issuer text,
  year text,
  url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  sender_name text,
  sender_email text,
  message text not null,
  created_at timestamptz default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'active',
  started_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.skills enable row level security;
alter table public.experiences enable row level security;
alter table public.educations enable row level security;
alter table public.certificates enable row level security;
alter table public.contact_messages enable row level security;
alter table public.subscriptions enable row level security;

-- Bersihkan policy lama jika menjalankan ulang file ini.
drop policy if exists "public can read published profiles" on public.profiles;
drop policy if exists "owner can read own profile" on public.profiles;
drop policy if exists "owner can insert profile" on public.profiles;
drop policy if exists "owner can update profile" on public.profiles;
drop policy if exists "owner can delete profile" on public.profiles;

create policy "public can read published profiles" on public.profiles
  for select using (is_published = true);
create policy "owner can read own profile" on public.profiles
  for select using (auth.uid() = user_id);
create policy "owner can insert profile" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "owner can update profile" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner can delete profile" on public.profiles
  for delete using (auth.uid() = user_id);

-- Helper policy pattern untuk tabel item portofolio.
drop policy if exists "public can read published projects" on public.projects;
drop policy if exists "owner can manage projects" on public.projects;
create policy "public can read published projects" on public.projects
  for select using (exists (select 1 from public.profiles p where p.user_id = projects.user_id and p.is_published = true));
create policy "owner can manage projects" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "public can read published skills" on public.skills;
drop policy if exists "owner can manage skills" on public.skills;
create policy "public can read published skills" on public.skills
  for select using (exists (select 1 from public.profiles p where p.user_id = skills.user_id and p.is_published = true));
create policy "owner can manage skills" on public.skills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "public can read published experiences" on public.experiences;
drop policy if exists "owner can manage experiences" on public.experiences;
create policy "public can read published experiences" on public.experiences
  for select using (exists (select 1 from public.profiles p where p.user_id = experiences.user_id and p.is_published = true));
create policy "owner can manage experiences" on public.experiences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "public can read published educations" on public.educations;
drop policy if exists "owner can manage educations" on public.educations;
create policy "public can read published educations" on public.educations
  for select using (exists (select 1 from public.profiles p where p.user_id = educations.user_id and p.is_published = true));
create policy "owner can manage educations" on public.educations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "public can read published certificates" on public.certificates;
drop policy if exists "owner can manage certificates" on public.certificates;
create policy "public can read published certificates" on public.certificates
  for select using (exists (select 1 from public.profiles p where p.user_id = certificates.user_id and p.is_published = true));
create policy "owner can manage certificates" on public.certificates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Contact messages: publik boleh kirim pesan ke profile published, owner bisa baca pesan untuk profilenya.
drop policy if exists "public can insert contact message" on public.contact_messages;
drop policy if exists "owner can read contact message" on public.contact_messages;
create policy "public can insert contact message" on public.contact_messages
  for insert with check (exists (select 1 from public.profiles p where p.id = contact_messages.profile_id and p.is_published = true));
create policy "owner can read contact message" on public.contact_messages
  for select using (exists (select 1 from public.profiles p where p.id = contact_messages.profile_id and p.user_id = auth.uid()));

-- Subscription sementara dibaca user sendiri. Aktivasi premium manual bisa dari Supabase dashboard.
drop policy if exists "owner can read subscription" on public.subscriptions;
create policy "owner can read subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Function timestamp.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects for each row execute procedure public.set_updated_at();
drop trigger if exists skills_set_updated_at on public.skills;
create trigger skills_set_updated_at before update on public.skills for each row execute procedure public.set_updated_at();
drop trigger if exists experiences_set_updated_at on public.experiences;
create trigger experiences_set_updated_at before update on public.experiences for each row execute procedure public.set_updated_at();
drop trigger if exists educations_set_updated_at on public.educations;
create trigger educations_set_updated_at before update on public.educations for each row execute procedure public.set_updated_at();
drop trigger if exists certificates_set_updated_at on public.certificates;
create trigger certificates_set_updated_at before update on public.certificates for each row execute procedure public.set_updated_at();
