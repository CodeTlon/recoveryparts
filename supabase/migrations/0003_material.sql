-- Recovery Parts — Material de estudio (B5)
-- RF-31 a RF-37. Ver docs/ESPECIFICACION.md sección B5.

create table if not exists public.materiales (
  id bigint generated always as identity primary key,
  curso_id bigint not null references public.cursos(id) on delete cascade,
  clase_id bigint references public.clases(id) on delete set null,
  titulo text not null,
  tipo text not null check (tipo in ('pdf', 'link')),
  url text not null,
  -- null = no liberado. Liberación automática por fecha (RF-32) y manual
  -- (RF-34, "liberar ahora") son la MISMA columna: se libera en cuanto
  -- liberado_en <= now(), sin necesidad de un job/cron aparte.
  liberado_en timestamptz,
  orden int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists materiales_curso_idx on public.materiales(curso_id, orden);

alter table public.materiales enable row level security;

drop policy if exists "materiales select alumno matriculado activo" on public.materiales;
create policy "materiales select alumno matriculado activo"
  on public.materiales for select
  using (
    liberado_en is not null and liberado_en <= now()
    and exists (
      select 1 from public.matriculas m
      where m.curso_id = materiales.curso_id and m.alumno_id = auth.uid() and m.estado = 'activo'
    )
  );

drop policy if exists "materiales select staff" on public.materiales;
create policy "materiales select staff"
  on public.materiales for select
  using (
    public.is_admin()
    or exists (select 1 from public.cursos c where c.id = materiales.curso_id and c.profesor_id = auth.uid())
  );

drop policy if exists "materiales staff write" on public.materiales;
create policy "materiales staff write"
  on public.materiales for all
  using (
    public.is_admin()
    or exists (select 1 from public.cursos c where c.id = materiales.curso_id and c.profesor_id = auth.uid())
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.cursos c where c.id = materiales.curso_id and c.profesor_id = auth.uid())
  );
