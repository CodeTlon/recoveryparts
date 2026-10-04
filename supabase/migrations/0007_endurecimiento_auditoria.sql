-- 0007 · Endurecimiento tras la auditoría de seguridad.
-- Cierra caminos que saltaban la validación de las server actions (un profesor puede escribir
-- directo por PostgREST con su JWT) y baja el alcance de datos personales en la auditoría.

-- ── materiales: URL http(s), storage_path del propio curso, clase del mismo curso ───────────
-- NOT VALID: se exige en filas nuevas/modificadas sin frenar el deploy por datos previos.
alter table materiales add constraint materiales_url_http
  check (url is null or url ~* '^https?://') not valid;
alter table materiales add constraint materiales_path_del_curso
  check (storage_path is null or storage_path like curso_id::text || '/%') not valid;

create or replace function materiales_integridad() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.storage_path is distinct from old.storage_path or new.curso_id <> old.curso_id) then
    raise exception 'No se puede cambiar el archivo ni el curso de un material';
  end if;
  if new.clase_id is not null
     and not exists (select 1 from clases where id = new.clase_id and curso_id = new.curso_id) then
    raise exception 'La clase no pertenece al curso del material';
  end if;
  return new;
end $$;
create trigger materiales_integridad before insert or update on materiales
  for each row execute function materiales_integridad();

-- ── audit_log: solo se puede firmar como uno mismo ──────────────────────────────────────────
drop policy audit_insert on audit_log;
create policy audit_insert on audit_log for insert to authenticated
  with check (actor_id = auth.uid() and auth_rol() is not null);

-- La auditoría automática no guarda email ni teléfono (datos personales).
create or replace function audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_ocultar text[] := array['motivo_desercion', 'email', 'telefono'];
begin
  insert into audit_log (actor_id, accion, entidad, entidad_id, detalle)
  values (auth.uid(), tg_op, tg_table_name,
          coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id')),
          jsonb_build_object('antes', to_jsonb(old) - v_ocultar, 'despues', to_jsonb(new) - v_ocultar));
  return coalesce(new, old);
end $$;

-- ── formularios públicos: largos acotados (se puede insertar directo por PostgREST) ──────────
drop policy contactos_insert on contactos;
create policy contactos_insert on contactos for insert to anon, authenticated
  with check (length(nombre) between 1 and 120 and length(mensaje) between 1 and 4000
              and length(email) <= 254 and length(coalesce(telefono, '')) <= 40);
drop policy demanda_insert on demanda_cursos;
create policy demanda_insert on demanda_cursos for insert to anon, authenticated
  with check (length(interes) between 1 and 200 and length(coalesce(contacto, '')) <= 200);

-- ── RPC: no ejecutables por anon (Supabase concede EXECUTE a anon por defecto) ──────────────
revoke execute on function responder_encuesta(uuid, jsonb) from public, anon;
revoke execute on function material_visible(uuid) from public, anon;
revoke execute on function reporte_ocupacion() from public, anon;
revoke execute on function reporte_desercion() from public, anon;
