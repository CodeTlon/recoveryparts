-- Recovery Parts — Encuesta de fin de curso (B8, RF-47)
-- Anónima en el contenido: se registra QUIÉN respondió (para no repetir y
-- para reportes de participación) en una tabla separada de LA respuesta en sí,
-- que nunca lleva el id del alumno.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_pregunta_encuesta') then
    create type tipo_pregunta_encuesta as enum ('rating', 'texto');
  end if;
end$$;

create table if not exists public.encuesta_preguntas (
  id bigint generated always as identity primary key,
  curso_id bigint not null references public.cursos(id) on delete cascade,
  pregunta text not null,
  tipo tipo_pregunta_encuesta not null default 'rating',
  orden int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists encuesta_preguntas_curso_idx on public.encuesta_preguntas(curso_id, orden);

-- Marca de "ya respondió" — CON alumno, SIN el contenido de su respuesta.
create table if not exists public.encuesta_completada (
  matricula_id bigint primary key references public.matriculas(id) on delete cascade,
  completed_at timestamptz not null default now()
);

-- Las respuestas en sí — SIN alumno_id/matricula_id, verdaderamente anónimas.
create table if not exists public.encuesta_respuestas (
  id bigint generated always as identity primary key,
  pregunta_id bigint not null references public.encuesta_preguntas(id) on delete cascade,
  respuesta text not null,
  created_at timestamptz not null default now()
);

create index if not exists encuesta_respuestas_pregunta_idx on public.encuesta_respuestas(pregunta_id);

alter table public.encuesta_preguntas enable row level security;
alter table public.encuesta_completada enable row level security;
alter table public.encuesta_respuestas enable row level security;

drop policy if exists "encuesta_preguntas select interesado" on public.encuesta_preguntas;
create policy "encuesta_preguntas select interesado"
  on public.encuesta_preguntas for select
  using (
    public.is_admin()
    or exists (select 1 from public.cursos c where c.id = encuesta_preguntas.curso_id and c.profesor_id = auth.uid())
    or exists (select 1 from public.matriculas m where m.curso_id = encuesta_preguntas.curso_id and m.alumno_id = auth.uid())
  );

drop policy if exists "encuesta_preguntas admin write" on public.encuesta_preguntas;
create policy "encuesta_preguntas admin write"
  on public.encuesta_preguntas for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "encuesta_completada propia" on public.encuesta_completada;
create policy "encuesta_completada propia"
  on public.encuesta_completada for select
  using (
    public.is_admin()
    or exists (select 1 from public.matriculas m where m.id = encuesta_completada.matricula_id and m.alumno_id = auth.uid())
  );

drop policy if exists "encuesta_completada insert propia" on public.encuesta_completada;
create policy "encuesta_completada insert propia"
  on public.encuesta_completada for insert
  with check (exists (select 1 from public.matriculas m where m.id = encuesta_completada.matricula_id and m.alumno_id = auth.uid()));

-- Nadie lee encuesta_respuestas directamente por RLS a nivel de fila: los
-- reportes de admin/profesor se sirven agregados vía Server Action con el
-- cliente admin (service role). Evita que un policy filtre "mis respuestas"
-- por accidente, ya que la tabla no tiene ninguna columna de usuario.
drop policy if exists "encuesta_respuestas insert alumno matriculado" on public.encuesta_respuestas;
create policy "encuesta_respuestas insert alumno matriculado"
  on public.encuesta_respuestas for insert
  with check (
    exists (
      select 1 from public.encuesta_preguntas p
      join public.matriculas m on m.curso_id = p.curso_id
      where p.id = encuesta_respuestas.pregunta_id and m.alumno_id = auth.uid()
    )
  );
