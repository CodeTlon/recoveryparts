-- 0030 · Sección «Aulas» del sitio público (RF-60).
-- Las aulas operativas (`aulas`: nombre, capacidad, activa) no cambian. Su ficha pública vive en tablas del CMS que
-- solo edita el admin (Campus › Sitio web › Aulas): descripción, visibilidad, orden, video, destacados y fotos.
-- El visitante NUNCA lee esas tablas ni `aulas`: lee tres vistas que traen solo las aulas activas y visibles, y solo
-- campos públicos (sin capacidad ni nada del uso interno del aula).

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 1. Ficha pública, destacados y fotos
-- ════════════════════════════════════════════════════════════════════════════════════════════
create table cms_aulas (
  aula_id uuid primary key references aulas(id) on delete cascade,
  descripcion text check (descripcion is null or length(descripcion) <= 1500),
  visible boolean not null default false,
  orden int not null default 0 check (orden between 0 and 9999),
  video_url text check (video_url is null or length(video_url) <= 500),
  actualizado_en timestamptz not null default now()
);

create table cms_aula_destacados (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references cms_aulas(aula_id) on delete cascade,
  tipo text not null check (tipo in ('mesas', 'equipamiento', 'herramientas', 'comodidades', 'seguridad', 'otro')),
  texto text not null check (length(btrim(texto)) between 1 and 120),
  orden int not null default 0
);
create index on cms_aula_destacados (aula_id);

create table cms_aula_fotos (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references cms_aulas(aula_id) on delete cascade,
  imagen_url text not null check (length(imagen_url) between 1 and 500),
  alt text not null check (length(btrim(alt)) between 1 and 200),   -- texto alternativo obligatorio
  orden int not null default 0
);
create index on cms_aula_fotos (aula_id);

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 2. RLS: solo el admin. El visitante no tiene ningún permiso sobre estas tablas.
--    (Se revoca explícito: db/bootstrap.sql corre en cada migración y vuelve a dar a anon los permisos por defecto
--    sobre las tablas nuevas, así que no alcanza con lo que hizo la 0028.)
-- ════════════════════════════════════════════════════════════════════════════════════════════
revoke all on cms_aulas, cms_aula_destacados, cms_aula_fotos from anon;
alter table cms_aulas enable row level security;
alter table cms_aula_destacados enable row level security;
alter table cms_aula_fotos enable row level security;
create policy cms_aulas_admin on cms_aulas for all using ((select es_admin())) with check ((select es_admin()));
create policy cms_aula_destacados_admin on cms_aula_destacados for all using ((select es_admin())) with check ((select es_admin()));
create policy cms_aula_fotos_admin on cms_aula_fotos for all using ((select es_admin())) with check ((select es_admin()));

create trigger audit_cms_aulas after insert or update or delete on cms_aulas for each row execute function audit_trigger();
create trigger audit_cms_aula_destacados after insert or update or delete on cms_aula_destacados for each row execute function audit_trigger();
create trigger audit_cms_aula_fotos after insert or update or delete on cms_aula_fotos for each row execute function audit_trigger();

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 3. Lo que ve el visitante: solo aulas activas y visibles, sin capacidad
-- ════════════════════════════════════════════════════════════════════════════════════════════
create view aulas_publicas with (security_invoker = false) as
select a.id, a.nombre, f.descripcion, f.video_url, f.orden
from aulas a join cms_aulas f on f.aula_id = a.id
where a.activa and f.visible;

create view aula_destacados_publicos with (security_invoker = false) as
select d.aula_id, d.tipo, d.texto, d.orden
from cms_aula_destacados d join aulas_publicas a on a.id = d.aula_id;

create view aula_fotos_publicas with (security_invoker = false) as
select f.id, f.aula_id, f.imagen_url, f.alt, f.orden
from cms_aula_fotos f join aulas_publicas a on a.id = f.aula_id;

-- Solo lectura (las vistas también reciben los permisos por defecto: se dejan en SELECT).
revoke all on aulas_publicas, aula_destacados_publicos, aula_fotos_publicas from anon, authenticated;
grant select on aulas_publicas, aula_destacados_publicos, aula_fotos_publicas to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 4. Guardar la ficha completa de un aula de una vez (admin). Nunca queda a medio guardar.
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- p_ficha: {descripcion, visible, orden, video_url}. p_destacados: [{tipo, texto}] en orden. p_fotos: [{imagen_url, alt}] en orden.
create function guardar_ficha_aula(p_aula uuid, p_ficha jsonb, p_destacados jsonb, p_fotos jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not es_admin() then raise exception 'Solo la administración edita las aulas del sitio'; end if;
  if not exists (select 1 from aulas where id = p_aula) then raise exception 'El aula no existe'; end if;
  if jsonb_typeof(p_ficha) <> 'object' or jsonb_typeof(p_destacados) <> 'array' or jsonb_typeof(p_fotos) <> 'array' then
    raise exception 'Ficha inválida';
  end if;
  if jsonb_array_length(p_destacados) > 12 then raise exception 'Cada aula admite hasta 12 destacados.'; end if;
  if jsonb_array_length(p_fotos) > 20 then raise exception 'Cada aula admite hasta 20 fotos.'; end if;

  insert into cms_aulas (aula_id, descripcion, visible, orden, video_url, actualizado_en)
  values (p_aula, nullif(btrim(p_ficha ->> 'descripcion'), ''), coalesce((p_ficha ->> 'visible')::boolean, false),
          coalesce((p_ficha ->> 'orden')::int, 0), nullif(btrim(p_ficha ->> 'video_url'), ''), now())
  on conflict (aula_id) do update set descripcion = excluded.descripcion, visible = excluded.visible,
    orden = excluded.orden, video_url = excluded.video_url, actualizado_en = now();

  delete from cms_aula_destacados where aula_id = p_aula;
  insert into cms_aula_destacados (aula_id, tipo, texto, orden)
  select p_aula, e ->> 'tipo', btrim(e ->> 'texto'), (o - 1)::int from jsonb_array_elements(p_destacados) with ordinality t(e, o);

  delete from cms_aula_fotos where aula_id = p_aula;
  insert into cms_aula_fotos (aula_id, imagen_url, alt, orden)
  select p_aula, btrim(e ->> 'imagen_url'), btrim(e ->> 'alt'), (o - 1)::int from jsonb_array_elements(p_fotos) with ordinality t(e, o);
end $$;
revoke execute on function guardar_ficha_aula(uuid, jsonb, jsonb, jsonb) from public, anon;
