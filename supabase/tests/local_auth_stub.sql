-- Enough of Supabase's auth surface to test policies in a plain Postgres.
--
-- Real Supabase provides all of this. This file exists so the policy tests can
-- run against `docker run postgres` in a few seconds, instead of needing the
-- whole local stack up. It is never applied to a real project — note that it
-- lives in tests/, not migrations/.
--
-- Apply order: this file, then the migrations, then local_grants.sql.

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Supabase reads the signed-in user from the request's JWT. Here it comes from
-- a session setting, which `set local` can change per transaction — that is
-- what lets one test act as several different people.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

-- Enough of Supabase Storage for the bucket migration to apply and its
-- policies to be checked. Real Supabase provides these.
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;

-- Supabase grants these; a plain Postgres does not. Without them a function
-- that calls auth.uid() while acting as a signed-in user fails here and works
-- in production, which is the same shape of difference that once let a whole
-- passing suite hide a project rejecting every request.
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
