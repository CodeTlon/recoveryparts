-- Recovery Parts — Auth e Invitaciones (B0) + Roles y Permisos (B1)
-- RF-01 a RF-11. Ver ARCHITECTURE.md -> "Auth y RLS" y "Esquema de datos".

-- ─────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'rol_usuario') then
    create type rol_usuario as enum ('alumno', 'profesor', 'administrador');
  end if;
end$$;

-- ─────────────────────────────────────────────────────────
-- profiles (1:1 con auth.users)
-- ─────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null default '',
  telefono text,
  email text,
  rol rol_usuario not null default 'alumno',
  cuenta_activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_rol_idx on public.profiles(rol);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────
-- Trigger: crear profile al registrar un auth.user
--
-- Alta de profesor/alumno la hace SIEMPRE el Admin vía
-- admin.inviteUserByEmail() (nunca signUp público — no hay registro abierto
-- en este proyecto). El rol propuesto viaja en user_metadata.rol; se
-- respeta solo si invited_at no es null (usuario creado por invitación),
-- igual que el patrón validado en vimet — así un signUp directo contra la
-- API (si alguna vez se habilitara) nunca podría auto-asignarse admin.
-- ─────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_rol  text := new.raw_user_meta_data->>'rol';
  rol_final rol_usuario := 'alumno';
begin
  if new.invited_at is not null and meta_rol in ('alumno', 'profesor', 'administrador') then
    rol_final := meta_rol::rol_usuario;
  end if;

  insert into public.profiles (id, email, nombre, telefono, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    nullif(new.raw_user_meta_data->>'telefono', ''),
    rol_final
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────
-- Helpers de rol (usados en RLS de esta y futuras migraciones)
-- ─────────────────────────────────────────────────────────
create or replace function public.current_user_rol()
returns rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_user_rol() = 'administrador';
$$;

create or replace function public.is_profesor()
returns boolean
language sql
stable
as $$
  select public.current_user_rol() = 'profesor';
$$;

-- ─────────────────────────────────────────────────────────
-- Anti-escalación de privilegios (RF-06-ish)
-- Un no-admin no puede cambiar su propio rol ni reactivarse/desactivarse.
-- Short-circuit en auth.uid() is null: solo lo alcanza el service role
-- (Server Actions de invitación/administración), que de todos modos
-- saltea RLS — sin este short-circuit, correcciones manuales desde el
-- SQL editor de Supabase quedarían bloqueadas (gotcha documentado en vimet).
-- ─────────────────────────────────────────────────────────
create or replace function public.profiles_block_privilege_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.rol is distinct from old.rol then
    raise exception 'No autorizado a cambiar el rol del perfil';
  end if;
  if new.cuenta_activa is distinct from old.cuenta_activa then
    raise exception 'No autorizado a cambiar el estado activo del perfil';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_block_privilege_self_update on public.profiles;
create trigger profiles_block_privilege_self_update
before update on public.profiles
for each row execute function public.profiles_block_privilege_self_update();

-- ─────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "profiles select own or admin" on public.profiles;
create policy "profiles select own or admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles update own or admin" on public.profiles;
create policy "profiles update own or admin"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "profiles admin all" on public.profiles;
create policy "profiles admin all"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());
