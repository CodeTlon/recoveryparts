-- Salida de Supabase: auth.users pasa a ser la tabla de usuarios propia (con contraseña y
-- tokens de un solo uso) y los archivos viven en disco, así que se elimina el esquema storage.
-- Los triggers de 0006 se mantienen: el perfil solo se crea si invited_at está seteado (RF-57).

alter table auth.users add column if not exists password_hash text;
-- Las sesiones (cookie firmada) emitidas antes de este instante dejan de valer: se actualiza
-- al cambiar la contraseña para cerrar las demás sesiones abiertas.
alter table auth.users add column if not exists sesion_desde timestamptz;

-- Tokens de invitación y de recuperación de contraseña. Se guarda solo el hash (sha256).
create table if not exists auth.tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('invite', 'recovery')),
  token_hash text not null unique,
  expira_en timestamptz not null,
  usado_en timestamptz,
  creado_en timestamptz not null default now()
);
create index if not exists tokens_user_idx on auth.tokens (user_id);

-- Solo el servidor (service_role) toca credenciales; anon y authenticated no ven auth.users.
revoke all on auth.users, auth.tokens from public, anon, authenticated;
grant all on auth.users, auth.tokens to service_role;

drop schema if exists storage cascade;
