-- Recovery Parts — esquema base (spec v0.5)
-- Datos personales del alumno: SOLO nombre, apellido, email y teléfono (RF-57).
-- No hay tablas de asistencia ni de pagos (fuera de alcance).

create extension if not exists "pgcrypto";

-- ── Tipos ────────────────────────────────────────────────
create type rol_usuario as enum ('admin', 'profesor', 'alumno');
create type estado_cuenta as enum ('pendiente_activacion', 'activa', 'inactiva');
create type area_curso as enum ('diseno', 'tecnico');
create type tipo_curso as enum ('curso', 'taller');
create type estado_inscripcion as enum ('activo', 'desertor', 'finalizado');
create type tipo_material as enum ('pdf', 'link');
create type estado_clase as enum ('programada', 'suspendida', 'reprogramada');

-- ── Usuarios ─────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol rol_usuario not null,
  nombre text not null,
  apellido text not null,
  email text not null unique,
  telefono text,
  estado_cuenta estado_cuenta not null default 'pendiente_activacion',
  -- mini-CV público del profesor (RF-25)
  foto_url text,
  experiencia text,
  certificaciones text,
  creado_en timestamptz not null default now()
);

-- ── Aulas y cursos ───────────────────────────────────────
create table aulas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  capacidad int check (capacidad > 0)
);

create table cursos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  area area_curso not null,
  tipo tipo_curso not null default 'curso',
  nivel text,
  descripcion text,
  requisitos text,
  imagen_url text,
  video_url text,
  modalidad text not null default 'presencial' check (modalidad = 'presencial'), -- RF-19
  duracion_semanas int check (duracion_semanas > 0),
  cupo int not null check (cupo > 0),
  precio numeric(12,2) check (precio >= 0),
  descuento_pct numeric(5,2) check (descuento_pct between 0 and 100),
  precio_actualizado_en date,
  fecha_inicio date,
  aula_id uuid references aulas(id),
  profesor_id uuid references profiles(id),          -- un único profesor (RF-18)
  destacado boolean not null default false,
  orden int not null default 0,
  activo boolean not null default true,              -- baja lógica
  creado_en timestamptz not null default now()
);
create index on cursos (profesor_id);
create index on cursos (activo, destacado, orden);

-- Días/horario recurrentes (0 = domingo … 6 = sábado)
create table horarios_curso (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fin time not null,
  check (hora_fin > hora_inicio)
);
create index on horarios_curso (curso_id);

-- Módulos del temario público de alto nivel (RF-26)
create table modulos_curso (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  orden int not null default 0,
  titulo text not null,
  items text[] not null default '{}'
);

-- Calendario real de clases (RF-31, RF-38, RF-55, RF-37)
create table clases (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  numero int not null check (numero > 0),
  fecha date not null,
  titulo text not null,
  estado estado_clase not null default 'programada',
  unique (curso_id, numero)
);
create index on clases (curso_id, fecha);

-- ── Inscripciones (alumno ↔ curso) ───────────────────────
-- Nunca se borra: desertar solo cambia el estado (RF-54).
create table inscripciones (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references profiles(id),
  curso_id uuid not null references cursos(id),
  estado estado_inscripcion not null default 'activo',
  fecha_desercion date,
  n_clase_desercion int,
  motivo_desercion text,
  marcado_por uuid references profiles(id),
  marcado_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (alumno_id, curso_id),
  check (estado <> 'desertor' or (fecha_desercion is not null and length(trim(coalesce(motivo_desercion, ''))) > 0))
);
create index on inscripciones (curso_id);

-- ── Material didáctico (RF-05, RF-32, RF-36) ─────────────
create table materiales (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  clase_id uuid references clases(id) on delete set null,
  tipo tipo_material not null,
  titulo text not null,
  storage_path text,            -- PDFs: ruta en el bucket privado
  url text,                     -- links (YouTube no listado / Drive)
  liberado_manual boolean not null default false,
  liberar_en date,              -- liberación automática por fecha
  subido_por uuid references profiles(id),
  creado_en timestamptz not null default now(),
  check ((tipo = 'pdf' and storage_path is not null) or (tipo = 'link' and url is not null))
);
create index on materiales (curso_id);

-- ── Kit informativo (RF-45, RF-46) ───────────────────────
create table kit_items (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  orden int not null default 0,
  nombre text not null,
  descripcion text,
  precio numeric(12,2) check (precio >= 0),
  link_externo text
);
create index on kit_items (curso_id);

-- ── Encuestas anónimas (RF-47) ───────────────────────────
create table encuestas (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid references cursos(id) on delete cascade,
  titulo text not null,
  preguntas jsonb not null default '[]',
  activa boolean not null default true,
  creado_en timestamptz not null default now()
);
-- Guarda QUE el alumno respondió (para no repetir)...
create table encuesta_completadas (
  encuesta_id uuid not null references encuestas(id) on delete cascade,
  alumno_id uuid not null references profiles(id),
  primary key (encuesta_id, alumno_id)
);
-- ...pero la respuesta va SIN id del alumno.
create table encuesta_respuestas (
  id uuid primary key default gen_random_uuid(),
  encuesta_id uuid not null references encuestas(id) on delete cascade,
  respuestas jsonb not null,
  creado_en timestamptz not null default now()
);

-- ── Contacto y demanda (RF-42, RF-52) ────────────────────
create table contactos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null,
  telefono text,
  mensaje text not null,
  leido boolean not null default false,
  creado_en timestamptz not null default now()
);
create table demanda_cursos (
  id uuid primary key default gen_random_uuid(),
  interes text not null,
  contacto text,
  creado_en timestamptz not null default now()
);

-- ── CMS del sitio público (RF-53) ────────────────────────
create table site_settings (
  clave text primary key,
  valor jsonb not null
);
create table cms_egresados (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  especialidad text not null,
  foto_url text,
  destacado boolean not null default false,
  orden int not null default 0
);
create table cms_testimonios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  curso text,
  texto text not null,
  puntaje smallint not null default 5 check (puntaje between 1 and 5),
  foto_url text,
  curso_id uuid references cursos(id) on delete set null,
  orden int not null default 0
);
create table cms_faq (
  id uuid primary key default gen_random_uuid(),
  pregunta text not null,
  respuesta text not null,
  orden int not null default 0
);
create table cms_galeria (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('aulas','clases','trabajos','egresados','eventos')),
  area area_curso,
  imagen_url text not null,
  alt text not null,
  descripcion text,
  orden int not null default 0
);

-- ── Auditoría ────────────────────────────────────────────
create table audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id),
  accion text not null,
  entidad text not null,
  entidad_id text,
  detalle jsonb,
  creado_en timestamptz not null default now()
);
