-- Row Level Security en TODAS las tablas (mínimo privilegio).
-- Matriz: spec §0 "Matriz de acceso". Las escrituras de admin pasan por
-- es_admin(); el service_role (servidor) se saltea RLS para invitaciones.

alter table profiles             enable row level security;
alter table aulas                enable row level security;
alter table cursos               enable row level security;
alter table horarios_curso       enable row level security;
alter table modulos_curso        enable row level security;
alter table clases               enable row level security;
alter table inscripciones        enable row level security;
alter table materiales           enable row level security;
alter table kit_items            enable row level security;
alter table encuestas            enable row level security;
alter table encuesta_completadas enable row level security;
alter table encuesta_respuestas  enable row level security;
alter table contactos            enable row level security;
alter table demanda_cursos       enable row level security;
alter table site_settings        enable row level security;
alter table cms_egresados        enable row level security;
alter table cms_testimonios      enable row level security;
alter table cms_faq              enable row level security;
alter table cms_galeria          enable row level security;
alter table audit_log            enable row level security;

-- ── profiles ─────────────────────────────────────────────
create policy profiles_self_read on profiles for select using (id = auth.uid());
create policy profiles_admin_all on profiles for all using (es_admin()) with check (es_admin());
-- El profesor ve a los alumnos de SUS cursos (nunca de cursos ajenos).
create policy profiles_profesor_alumnos on profiles for select using (
  auth_rol() = 'profesor' and exists (
    select 1 from inscripciones i join cursos c on c.id = i.curso_id
    where i.alumno_id = profiles.id and c.profesor_id = auth.uid()
  )
);
-- Alumno/visitante ven el nombre del profesor a través de cursos_publicos (vista).

-- ── Contenido de cursos ──────────────────────────────────
create policy aulas_read on aulas for select using (auth_rol() in ('admin','profesor'));
create policy aulas_admin on aulas for all using (es_admin()) with check (es_admin());

create policy cursos_admin on cursos for all using (es_admin()) with check (es_admin());
create policy cursos_profesor on cursos for select using (profesor_id = auth.uid() and auth_rol() = 'profesor');
create policy cursos_alumno on cursos for select using (alumno_activo_en(id));

create policy horarios_admin on horarios_curso for all using (es_admin()) with check (es_admin());
create policy horarios_staff on horarios_curso for select using (es_profesor_de(curso_id) or alumno_activo_en(curso_id));

create policy modulos_admin on modulos_curso for all using (es_admin()) with check (es_admin());

create policy clases_admin on clases for all using (es_admin()) with check (es_admin());
create policy clases_profesor on clases for all using (es_profesor_de(curso_id)) with check (es_profesor_de(curso_id)); -- RF-31
-- El alumno NO lee `clases` directo (ocultaría temas futuros): usa material_visible/proxima_clase_titulo.

-- ── inscripciones ────────────────────────────────────────
create policy insc_admin on inscripciones for all using (es_admin()) with check (es_admin());
create policy insc_profesor on inscripciones for select using (es_profesor_de(curso_id));
-- El alumno ve sus propias inscripciones, incluida la deserción (aviso con motivo).
create policy insc_alumno on inscripciones for select using (alumno_id = auth.uid() and auth_rol() = 'alumno');

-- ── materiales ───────────────────────────────────────────
create policy mat_admin on materiales for all using (es_admin()) with check (es_admin());
create policy mat_profesor on materiales for all
  using (es_profesor_de(curso_id)) with check (es_profesor_de(curso_id));
-- Alumno: sin acceso directo; consume material_visible() (liberado, no desertor).

-- ── kit ──────────────────────────────────────────────────
create policy kit_admin on kit_items for all using (es_admin()) with check (es_admin());
create policy kit_profesor on kit_items for select using (es_profesor_de(curso_id));
create policy kit_alumno on kit_items for select using (alumno_activo_en(curso_id));

-- ── encuestas ────────────────────────────────────────────
create policy enc_admin on encuestas for all using (es_admin()) with check (es_admin());
create policy enc_alumno on encuestas for select using (activa and alumno_activo_en(curso_id));
create policy enc_comp_admin on encuesta_completadas for select using (es_admin());
create policy enc_comp_alumno on encuesta_completadas for select using (alumno_id = auth.uid());
create policy enc_resp_admin on encuesta_respuestas for select using (es_admin());
-- Las respuestas se insertan solo vía responder_encuesta() (sin alumno_id).

create or replace function responder_encuesta(p_encuesta uuid, p_respuestas jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_curso uuid;
begin
  select curso_id into v_curso from encuestas where id = p_encuesta and activa;
  if v_curso is null or not alumno_activo_en(v_curso) then
    raise exception 'No podés responder esta encuesta';
  end if;
  insert into encuesta_completadas (encuesta_id, alumno_id) values (p_encuesta, auth.uid()); -- PK evita repetir
  insert into encuesta_respuestas (encuesta_id, respuestas) values (p_encuesta, p_respuestas);
end $$;
revoke all on function responder_encuesta from public;
grant execute on function responder_encuesta to authenticated;

-- ── contacto y demanda (RF-42, RF-52) ────────────────────
create policy contactos_insert on contactos for insert to anon, authenticated
  with check (length(nombre) between 1 and 120 and length(mensaje) between 1 and 4000);
create policy contactos_admin on contactos for all using (es_admin()) with check (es_admin());
create policy demanda_insert on demanda_cursos for insert to anon, authenticated
  with check (length(interes) between 1 and 200);
create policy demanda_admin on demanda_cursos for select using (es_admin());

-- ── CMS: lectura pública, escritura solo admin (RF-53) ───
create policy settings_read on site_settings for select using (true);
create policy settings_admin on site_settings for all using (es_admin()) with check (es_admin());
create policy egresados_read on cms_egresados for select using (true);
create policy egresados_admin on cms_egresados for all using (es_admin()) with check (es_admin());
create policy testimonios_read on cms_testimonios for select using (true);
create policy testimonios_admin on cms_testimonios for all using (es_admin()) with check (es_admin());
create policy faq_read on cms_faq for select using (true);
create policy faq_admin on cms_faq for all using (es_admin()) with check (es_admin());
create policy galeria_read on cms_galeria for select using (true);
create policy galeria_admin on cms_galeria for all using (es_admin()) with check (es_admin());

-- ── auditoría ────────────────────────────────────────────
create policy audit_admin_read on audit_log for select using (es_admin());
create policy audit_insert on audit_log for insert to authenticated with check (auth_rol() is not null);

-- ── Auditoría automática de cambios sensibles ────────────
create or replace function audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (actor_id, accion, entidad, entidad_id, detalle)
  values (auth.uid(), tg_op, tg_table_name,
          coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id')),
          jsonb_build_object('antes', to_jsonb(old) - 'motivo_desercion', 'despues', to_jsonb(new) - 'motivo_desercion'));
  return coalesce(new, old);
end $$;

create trigger audit_cursos after insert or update or delete on cursos for each row execute function audit_trigger();
create trigger audit_inscripciones after insert or update on inscripciones for each row execute function audit_trigger();
create trigger audit_profiles after update on profiles for each row execute function audit_trigger();
