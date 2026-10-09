-- Base mínima para correr las migraciones sobre Postgres plano (sin Supabase).
-- Reproduce lo que las migraciones 0001–0015 esperan de Supabase: los roles anon /
-- authenticated / service_role, auth.uid() y las tablas auth.users y storage.*.
-- Es idempotente. La migración 0016 convierte auth.users en la tabla de usuarios propia
-- y elimina el esquema storage (los archivos pasan a disco).

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

-- El usuario de la conexión puede asumir cada rol (SET LOCAL ROLE) en cada request.
do $$
begin
  execute format('grant anon, authenticated, service_role to %I', current_user);
end $$;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

-- Usuario autenticado de la request: el backend lo fija con set_config('app.user_id', …, true)
-- dentro de la transacción (ver src/lib/db.ts). Vacío = anónimo.
create or replace function auth.uid() returns uuid
language sql stable as $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}',
  invited_at timestamptz,
  email_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Stubs de storage: solo para que 0004/0011/0015 apliquen sin cambios. 0016 los elimina.
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
);
create table if not exists storage.objects (bucket_id text, name text);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;

-- Como en Supabase: los roles de la API acceden a todo lo que se crea en public y RLS decide.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
