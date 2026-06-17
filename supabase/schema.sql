-- PortoLink SaaS MVP - Supabase Schema
-- Jalankan di Supabase SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.admin_users where user_id = uid);
$$;


create or replace function public.is_portfolio_published(owner_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles where user_id = owner_uid and is_published = true);
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null default 'Nama Lengkap',
  headline text,
  bio text,
  photo_url text,
  location text,
  email_public text,
  phone_public text,
  website_url text,
  linkedin_url text,
  github_url text,
  instagram_url text,
  template_id text not null default 'classic',
  is_published boolean not null default false,
  is_premium boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9][a-z0-9-]{2,38}[a-z0-9]$')
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  role text,
  description text,
  tech_stack text,
  image_url text,
  demo_url text,
  repo_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  level text,
  category text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  role text not null,
  start_date date,
  end_date date,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.educations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  school text not null,
  degree text,
  start_year integer,
  end_year integer,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  issuer text,
  issued_year integer,
  credential_url text,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  portfolio_user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles(username);
create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists skills_user_id_idx on public.skills(user_id);
create index if not exists experiences_user_id_idx on public.experiences(user_id);
create index if not exists educations_user_id_idx on public.educations(user_id);
create index if not exists certificates_user_id_idx on public.certificates(user_id);
create index if not exists contact_messages_portfolio_user_idx on public.contact_messages(portfolio_user_id);

drop trigger if exists profiles_updated_at on public.profiles;
drop trigger if exists projects_updated_at on public.projects;
drop trigger if exists skills_updated_at on public.skills;
drop trigger if exists experiences_updated_at on public.experiences;
drop trigger if exists educations_updated_at on public.educations;
drop trigger if exists certificates_updated_at on public.certificates;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger skills_updated_at before update on public.skills for each row execute function public.set_updated_at();
create trigger experiences_updated_at before update on public.experiences for each row execute function public.set_updated_at();
create trigger educations_updated_at before update on public.educations for each row execute function public.set_updated_at();
create trigger certificates_updated_at before update on public.certificates for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.skills enable row level security;
alter table public.experiences enable row level security;
alter table public.educations enable row level security;
alter table public.certificates enable row level security;
alter table public.contact_messages enable row level security;

-- Drop old PortoLink policies if re-running this file
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('admin_users','profiles','projects','skills','experiences','educations','certificates','contact_messages')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- admin_users
create policy "admin_users_select_self_or_admin" on public.admin_users
for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- profiles
create policy "profiles_select_public_owner_admin" on public.profiles
for select using (is_published = true or auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = user_id);

create policy "profiles_update_own_or_admin" on public.profiles
for update using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "profiles_delete_own_or_admin" on public.profiles
for delete using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- repeated owner/public policies
create policy "projects_select_public_owner_admin" on public.projects
for select using (
  public.is_portfolio_published(projects.user_id)
  or auth.uid() = user_id or public.is_admin(auth.uid())
);
create policy "projects_insert_own" on public.projects for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects for update using (auth.uid() = user_id or public.is_admin(auth.uid())) with check (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "projects_delete_own" on public.projects for delete using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "skills_select_public_owner_admin" on public.skills
for select using (
  public.is_portfolio_published(skills.user_id)
  or auth.uid() = user_id or public.is_admin(auth.uid())
);
create policy "skills_insert_own" on public.skills for insert with check (auth.uid() = user_id);
create policy "skills_update_own" on public.skills for update using (auth.uid() = user_id or public.is_admin(auth.uid())) with check (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "skills_delete_own" on public.skills for delete using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "experiences_select_public_owner_admin" on public.experiences
for select using (
  public.is_portfolio_published(experiences.user_id)
  or auth.uid() = user_id or public.is_admin(auth.uid())
);
create policy "experiences_insert_own" on public.experiences for insert with check (auth.uid() = user_id);
create policy "experiences_update_own" on public.experiences for update using (auth.uid() = user_id or public.is_admin(auth.uid())) with check (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "experiences_delete_own" on public.experiences for delete using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "educations_select_public_owner_admin" on public.educations
for select using (
  public.is_portfolio_published(educations.user_id)
  or auth.uid() = user_id or public.is_admin(auth.uid())
);
create policy "educations_insert_own" on public.educations for insert with check (auth.uid() = user_id);
create policy "educations_update_own" on public.educations for update using (auth.uid() = user_id or public.is_admin(auth.uid())) with check (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "educations_delete_own" on public.educations for delete using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "certificates_select_public_owner_admin" on public.certificates
for select using (
  public.is_portfolio_published(certificates.user_id)
  or auth.uid() = user_id or public.is_admin(auth.uid())
);
create policy "certificates_insert_own" on public.certificates for insert with check (auth.uid() = user_id);
create policy "certificates_update_own" on public.certificates for update using (auth.uid() = user_id or public.is_admin(auth.uid())) with check (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "certificates_delete_own" on public.certificates for delete using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Contact messages: publik boleh kirim, pemilik portfolio/admin boleh baca
create policy "contact_messages_insert_public" on public.contact_messages
for insert with check (true);
create policy "contact_messages_select_owner_admin" on public.contact_messages
for select using (auth.uid() = portfolio_user_id or public.is_admin(auth.uid()));
create policy "contact_messages_delete_owner_admin" on public.contact_messages
for delete using (auth.uid() = portfolio_user_id or public.is_admin(auth.uid()));
