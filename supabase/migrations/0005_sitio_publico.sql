-- Recovery Parts — Sitio público + CMS (A1-A4)
-- RF-42 y "todo el contenido sale del CMS, nada hardcodeado" (criterio de
-- aceptación de A1). Ver docs/ESPECIFICACION.md secciones A1-A4.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'categoria_foto') then
    create type categoria_foto as enum ('aulas', 'clases', 'trabajos_alumnos', 'egresados', 'eventos');
  end if;
end$$;

-- ─────────────────────────────────────────────────────────
-- sitio_config — singleton (una sola fila, id=1) con los textos/números
-- editables de la Home que no ameritan una tabla propia (hero, áreas, stats,
-- datos de contacto). Editable solo por el Admin desde /admin/sitio.
-- ─────────────────────────────────────────────────────────
create table if not exists public.sitio_config (
  id smallint primary key default 1 check (id = 1),
  hero jsonb not null default '{}',      -- {titulo, subtitulo, imagen_url, cta_texto}
  areas jsonb not null default '{}',     -- {tecnico:{titulo,descripcion,imagen_url}, diseno:{...}}
  stats jsonb not null default '{}',     -- {aulas, profesores, egresados}
  contacto jsonb not null default '{}',  -- {whatsapp, direccion, instagram, facebook, email}
  updated_at timestamptz not null default now()
);
-- Semilla con el contenido real del cliente (brand-config.json de la fábrica)
-- para que el sitio no arranque roto (sin whatsapp/dirección) antes de que el
-- Admin entre a /admin/sitio la primera vez.
insert into public.sitio_config (id, hero, areas, stats, contacto)
values (
  1,
  '{"titulo": "Dominá la tecnología en el corazón de Córdoba", "subtitulo": "Formación técnica 100% práctica en reparación y microelectrónica.", "imagen_url": "/images/hero.jpg"}',
  '{"tecnico": {"titulo": "Servicio Técnico y Tecnológico", "descripcion": "Celulares, impresoras, notebooks, PC y televisores."}, "diseno": {"titulo": "Creación y Diseño", "descripcion": "Estampado, impresión 3D, cartelería y señalética."}}',
  '{"aulas": 3, "profesores": 10, "egresados": 0}',
  '{"whatsapp": "5493512336810", "direccion": "La Rioja 345, X5022, Córdoba, Argentina", "instagram": "@recoveryparts", "email": "info@recoveryparts.com.ar"}'
)
on conflict (id) do nothing;

drop trigger if exists sitio_config_set_updated_at on public.sitio_config;
create trigger sitio_config_set_updated_at
before update on public.sitio_config
for each row execute function public.set_updated_at();

-- Cursos destacados en Home (A1 sección 3) — el Admin elige cuáles y en qué orden.
alter table public.cursos add column if not exists destacado boolean not null default false;
alter table public.cursos add column if not exists orden_destacado int not null default 0;

create table if not exists public.galeria_fotos (
  id bigint generated always as identity primary key,
  url text not null,
  categoria categoria_foto not null,
  area area_curso,
  alt text not null default '',
  descripcion text,
  orden int not null default 0,
  publicado boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists galeria_fotos_categoria_idx on public.galeria_fotos(categoria, orden);

create table if not exists public.testimonios (
  id bigint generated always as identity primary key,
  nombre text not null,
  curso_id bigint references public.cursos(id) on delete set null,
  puntaje smallint not null check (puntaje between 1 and 5),
  comentario text not null,
  foto_url text,
  orden int not null default 0,
  publicado boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.faq (
  id bigint generated always as identity primary key,
  pregunta text not null,
  respuesta text not null,
  orden int not null default 0,
  publicado boolean not null default true
);

create table if not exists public.egresados (
  id bigint generated always as identity primary key,
  nombre text not null,
  especialidad text not null,
  foto_url text not null,
  destacado boolean not null default false,
  orden int not null default 0,
  publicado boolean not null default true,
  created_at timestamptz not null default now()
);

-- RF-42: la consulta del form de contacto queda visible para el personal
-- interno (excepción a "solo Resend, sin DB" — pedido explícito del cliente).
create table if not exists public.contactos (
  id bigint generated always as identity primary key,
  nombre text not null,
  email text not null,
  telefono text,
  mensaje text not null,
  leido boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────
alter table public.sitio_config enable row level security;
alter table public.galeria_fotos enable row level security;
alter table public.testimonios enable row level security;
alter table public.faq enable row level security;
alter table public.egresados enable row level security;
alter table public.contactos enable row level security;

drop policy if exists "sitio_config select publico" on public.sitio_config;
create policy "sitio_config select publico" on public.sitio_config for select using (true);
drop policy if exists "sitio_config admin write" on public.sitio_config;
create policy "sitio_config admin write" on public.sitio_config for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "galeria_fotos select publico o admin" on public.galeria_fotos;
create policy "galeria_fotos select publico o admin" on public.galeria_fotos for select using (publicado = true or public.is_admin());
drop policy if exists "galeria_fotos admin write" on public.galeria_fotos;
create policy "galeria_fotos admin write" on public.galeria_fotos for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "testimonios select publico o admin" on public.testimonios;
create policy "testimonios select publico o admin" on public.testimonios for select using (publicado = true or public.is_admin());
drop policy if exists "testimonios admin write" on public.testimonios;
create policy "testimonios admin write" on public.testimonios for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "faq select publico o admin" on public.faq;
create policy "faq select publico o admin" on public.faq for select using (publicado = true or public.is_admin());
drop policy if exists "faq admin write" on public.faq;
create policy "faq admin write" on public.faq for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "egresados select publico o admin" on public.egresados;
create policy "egresados select publico o admin" on public.egresados for select using (publicado = true or public.is_admin());
drop policy if exists "egresados admin write" on public.egresados;
create policy "egresados admin write" on public.egresados for all using (public.is_admin()) with check (public.is_admin());

-- contactos: CUALQUIERA (incluso sin sesión) puede insertar su consulta; solo
-- el Admin puede leerlas o marcarlas como leídas.
drop policy if exists "contactos insert publico" on public.contactos;
create policy "contactos insert publico" on public.contactos for insert with check (true);
drop policy if exists "contactos select admin" on public.contactos;
create policy "contactos select admin" on public.contactos for select using (public.is_admin());
drop policy if exists "contactos update admin" on public.contactos;
create policy "contactos update admin" on public.contactos for update using (public.is_admin()) with check (public.is_admin());
