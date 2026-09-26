-- Recovery Parts — Cursos y Talleres (B3) + Cupos y Precios (B4) + Alumnos (B2)
-- RF-12 a RF-30, RF-54 a RF-57. Ver docs/ESPECIFICACION.md secciones B2/B3/B4.

-- ─────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_curso') then
    create type tipo_curso as enum ('curso', 'taller'); -- RF-22: taller = curso corto, mismo modelo
  end if;
  if not exists (select 1 from pg_type where typname = 'area_curso') then
    create type area_curso as enum ('tecnico', 'diseno');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_curso') then
    -- 'activo' | 'finalizado' | 'de_baja' (RF-01) — distinto de `publicado`, que es visibilidad pública
    create type estado_curso as enum ('activo', 'finalizado', 'de_baja');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_clase') then
    create type estado_clase as enum ('programada', 'suspendida', 'reprogramada');
  end if;
end$$;

-- ─────────────────────────────────────────────────────────
-- Mini-CV de profesor (RF-25) — vive en profiles, no por curso: es del profesor,
-- se reusa en todos sus cursos.
-- ─────────────────────────────────────────────────────────
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists foto_url text;

-- ─────────────────────────────────────────────────────────
-- cursos
-- ─────────────────────────────────────────────────────────
create table if not exists public.cursos (
  id bigint generated always as identity primary key,
  slug text not null unique,
  titulo text not null,
  tipo tipo_curso not null default 'curso',
  area area_curso not null default 'tecnico',
  descripcion text not null default '',
  requisitos text not null default '',
  temario jsonb not null default '[]', -- [{titulo, descripcion}] — RF-26, alto nivel
  imagenes text[] not null default '{}',
  video_url text,
  testimonios_ids bigint[] not null default '{}', -- referencia a public.testimonios (B-sitio, migración posterior)

  -- Calendario (RF-16, RF-17)
  dias_semana smallint[] not null default '{}', -- 0=domingo … 6=sábado
  hora_inicio time not null,
  hora_fin time not null,
  aula text not null,
  fecha_inicio date not null,
  duracion_semanas int not null check (duracion_semanas > 0),

  -- Profesor (RF-18: un único profesor)
  profesor_id uuid references public.profiles(id) on delete set null,

  -- Cupos y precios (B4)
  cupo_total int not null check (cupo_total > 0),
  precio numeric(12, 2) not null default 0,
  precio_descuento numeric(12, 2), -- RF-30, null = sin descuento
  precio_actualizado_en date not null default current_date,
  kit_items jsonb not null default '[]', -- [{nombre, descripcion, precio, link}] — RF-45/46

  publicado boolean not null default false, -- visibilidad en el sitio público
  estado estado_curso not null default 'activo', -- RF-01

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint horario_valido check (hora_fin > hora_inicio)
);

create index if not exists cursos_publicado_idx on public.cursos(publicado) where publicado = true;
create index if not exists cursos_profesor_idx on public.cursos(profesor_id);
create index if not exists cursos_estado_idx on public.cursos(estado);

drop trigger if exists cursos_set_updated_at on public.cursos;
create trigger cursos_set_updated_at
before update on public.cursos
for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────
-- clases (calendario del curso — RF-31)
-- Se generan automáticamente al crear el curso (ver acción de servidor),
-- una fila por clase según dias_semana × duracion_semanas.
-- ─────────────────────────────────────────────────────────
create table if not exists public.clases (
  id bigint generated always as identity primary key,
  curso_id bigint not null references public.cursos(id) on delete cascade,
  numero int not null,
  fecha date not null,
  tema text not null default '',
  estado estado_clase not null default 'programada',
  unique (curso_id, numero)
);

create index if not exists clases_curso_idx on public.clases(curso_id, numero);

-- ─────────────────────────────────────────────────────────
-- Helper: ¿se superponen dos horarios (mismos días + rango horario)?
-- Usado por la acción de servidor para validar RF-17 (aula) y RF-18 (profesor).
-- ─────────────────────────────────────────────────────────
create or replace function public.horarios_se_superponen(
  dias_a smallint[], inicio_a time, fin_a time,
  dias_b smallint[], inicio_b time, fin_b time
)
returns boolean
language sql
immutable
as $$
  select (dias_a && dias_b) and (inicio_a < fin_b) and (fin_a > inicio_b);
$$;

-- ─────────────────────────────────────────────────────────
-- matriculas (B2 — RF-12 a RF-15, RF-54 a RF-57)
-- En la misma migración que cursos: las policies de ambas tablas se
-- referencian cruzadas (un curso es visible si el alumno está matriculado,
-- una matrícula es visible si sos el profesor del curso), así que crear
-- `matriculas` en una migración posterior rompería el `create policy` de
-- `cursos` de arriba (la tabla todavía no existiría).
-- ─────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_matricula') then
    create type estado_matricula as enum ('activo', 'finalizado', 'suspendido', 'desertor', 'inactivo');
  end if;
end$$;

create table if not exists public.matriculas (
  id bigint generated always as identity primary key,
  alumno_id uuid not null references public.profiles(id) on delete cascade,
  curso_id bigint not null references public.cursos(id) on delete cascade,
  estado estado_matricula not null default 'activo',
  fecha_inicio date not null default current_date,
  fecha_fin date,
  -- Deserción (RF-15, RF-54, RF-55): motivo obligatorio a nivel app (Server
  -- Action), n_clase_desercion calculado server-side al marcar (ver
  -- lib/actions/matriculas.ts) contando solo clases con estado='programada'
  -- hasta esa fecha — las suspendidas/reprogramadas no cuentan (RF-38).
  motivo_baja text,
  fecha_desercion date,
  n_clase_desercion int,
  marcado_por uuid references public.profiles(id),
  marcado_en timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (alumno_id, curso_id),
  constraint motivo_baja_obligatorio check (
    estado not in ('desertor', 'inactivo') or motivo_baja is not null
  )
);

create index if not exists matriculas_alumno_idx on public.matriculas(alumno_id);
create index if not exists matriculas_curso_idx on public.matriculas(curso_id);
create index if not exists matriculas_estado_idx on public.matriculas(estado);

drop trigger if exists matriculas_set_updated_at on public.matriculas;
create trigger matriculas_set_updated_at
before update on public.matriculas
for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────
alter table public.cursos enable row level security;
alter table public.clases enable row level security;
alter table public.matriculas enable row level security;

drop policy if exists "matriculas select propia o staff" on public.matriculas;
create policy "matriculas select propia o staff"
  on public.matriculas for select
  using (
    alumno_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.cursos c where c.id = matriculas.curso_id and c.profesor_id = auth.uid())
  );

drop policy if exists "matriculas admin write" on public.matriculas;
create policy "matriculas admin write"
  on public.matriculas for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "cursos select publico o interesado" on public.cursos;
create policy "cursos select publico o interesado"
  on public.cursos for select
  using (
    publicado = true
    or public.is_admin()
    or profesor_id = auth.uid()
    or exists (
      select 1 from public.matriculas m
      where m.curso_id = cursos.id and m.alumno_id = auth.uid()
    )
  );

drop policy if exists "cursos admin write" on public.cursos;
create policy "cursos admin write"
  on public.cursos for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "clases select interesado" on public.clases;
create policy "clases select interesado"
  on public.clases for select
  using (
    public.is_admin()
    or exists (select 1 from public.cursos c where c.id = clases.curso_id and c.profesor_id = auth.uid())
    or exists (
      select 1 from public.matriculas m
      where m.curso_id = clases.curso_id and m.alumno_id = auth.uid()
    )
  );

drop policy if exists "clases profesor propio write" on public.clases;
create policy "clases profesor propio write"
  on public.clases for all
  using (
    public.is_admin()
    or exists (select 1 from public.cursos c where c.id = clases.curso_id and c.profesor_id = auth.uid())
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.cursos c where c.id = clases.curso_id and c.profesor_id = auth.uid())
  );
