-- Funciones auxiliares, triggers de negocio y vistas públicas.

-- ── Helpers de rol (security definer para evitar recursión de RLS) ──
create or replace function auth_rol() returns rol_usuario
language sql stable security definer set search_path = public as $$
  select rol from profiles where id = auth.uid() and estado_cuenta <> 'inactiva'
$$;

create or replace function es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth_rol() = 'admin', false)
$$;

create or replace function es_profesor_de(p_curso uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from cursos c
    where c.id = p_curso and c.profesor_id = auth.uid() and auth_rol() = 'profesor'
  )
$$;

-- El alumno ve un curso mientras su inscripción no sea desertor.
create or replace function alumno_activo_en(p_curso uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from inscripciones i
    where i.curso_id = p_curso and i.alumno_id = auth.uid()
      and i.estado <> 'desertor' and auth_rol() = 'alumno'
  )
$$;

-- ── Crear perfil al registrarse un usuario en Auth ──────────
-- El rol viene de raw_user_meta_data, que solo setea el servidor
-- (inviteUserByEmail con service_role). No hay autorregistro.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, rol, nombre, apellido, email, telefono)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'rol')::rol_usuario, 'alumno'),
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    new.email,
    new.raw_user_meta_data->>'telefono'
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Al confirmar la invitación (email verificado) la cuenta pasa a activa.
create or replace function handle_user_confirmed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update profiles set estado_cuenta = 'activa'
    where id = new.id and estado_cuenta = 'pendiente_activacion';
  end if;
  return new;
end $$;

create trigger on_auth_user_confirmed after update on auth.users
  for each row execute function handle_user_confirmed();

-- ── RF-55: N° de clase de deserción ─────────────────────
-- n_clase = clases con fecha <= fecha_desercion, sin contar suspendidas/reprogramadas.
create or replace function calcular_n_clase(p_curso uuid, p_fecha date) returns int
language sql stable as $$
  select count(*)::int from clases
  where curso_id = p_curso and fecha <= p_fecha and estado = 'programada'
$$;

create or replace function inscripciones_before_write() returns trigger
language plpgsql as $$
begin
  -- Desertor es estado final (no vuelve a Activo).
  if tg_op = 'UPDATE' and old.estado = 'desertor' and new.estado <> 'desertor' then
    raise exception 'Desertor es un estado final';
  end if;

  if new.estado = 'desertor' then
    new.n_clase_desercion := calcular_n_clase(new.curso_id, new.fecha_desercion);
    if tg_op = 'INSERT' or old.estado <> 'desertor' then
      new.marcado_por := coalesce(new.marcado_por, auth.uid());
      new.marcado_en := now();
    end if;
  end if;

  -- No superar el cupo al añadir alumnos.
  if tg_op = 'INSERT' then
    if (select count(*) from inscripciones where curso_id = new.curso_id)
       >= (select cupo from cursos where id = new.curso_id) then
      raise exception 'El curso no tiene cupos disponibles';
    end if;
  end if;
  return new;
end $$;

create trigger inscripciones_biu before insert or update on inscripciones
  for each row execute function inscripciones_before_write();

-- Nunca se elimina al alumno del curso (datos para reportes de deserción).
create or replace function inscripciones_no_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'Las inscripciones no se eliminan: marcá al alumno como Desertor';
end $$;
create trigger inscripciones_bd before delete on inscripciones
  for each row execute function inscripciones_no_delete();

-- ── RF-17: sin superposición de aula, profesor ni horario ───
create or replace function validar_horario() returns trigger
language plpgsql as $$
declare
  v_aula uuid; v_prof uuid;
begin
  select aula_id, profesor_id into v_aula, v_prof from cursos where id = new.curso_id;
  if exists (
    select 1 from horarios_curso h join cursos c on c.id = h.curso_id
    where h.id <> new.id and c.activo and c.id <> new.curso_id
      and h.dia_semana = new.dia_semana
      and h.hora_inicio < new.hora_fin and h.hora_fin > new.hora_inicio
      and ((v_aula is not null and c.aula_id = v_aula)
        or (v_prof is not null and c.profesor_id = v_prof))
  ) then
    raise exception 'Superposición de aula o profesor en ese día y horario';
  end if;
  return new;
end $$;
create trigger horarios_biu before insert or update on horarios_curso
  for each row execute function validar_horario();

-- El cupo no puede ser menor que los alumnos ya asignados.
create or replace function validar_cupo() returns trigger
language plpgsql as $$
begin
  if new.cupo < (select count(*) from inscripciones where curso_id = new.id) then
    raise exception 'El cupo no puede ser menor que los alumnos ya asignados';
  end if;
  return new;
end $$;
create trigger cursos_cupo_bu before update of cupo on cursos
  for each row execute function validar_cupo();

-- ── Vistas públicas (RF-27: cupos en tiempo real) ───────
-- security_invoker = false: exponen solo columnas seguras a visitantes.
create or replace view cursos_publicos with (security_invoker = false) as
select c.id, c.slug, c.nombre, c.area, c.tipo, c.nivel, c.descripcion, c.requisitos,
       c.imagen_url, c.video_url, c.modalidad, c.duracion_semanas, c.cupo,
       c.precio, c.descuento_pct, c.precio_actualizado_en, c.fecha_inicio,
       c.destacado, c.orden,
       a.nombre as aula,
       greatest(c.cupo - (select count(*) from inscripciones i where i.curso_id = c.id), 0)::int as cupos_disponibles,
       p.nombre || ' ' || p.apellido as profesor_nombre,
       p.foto_url as profesor_foto, p.experiencia as profesor_experiencia,
       p.certificaciones as profesor_certificaciones
from cursos c
left join aulas a on a.id = c.aula_id
left join profiles p on p.id = c.profesor_id
where c.activo;

create or replace view horarios_publicos with (security_invoker = false) as
select h.* from horarios_curso h join cursos c on c.id = h.curso_id where c.activo;

create or replace view modulos_publicos with (security_invoker = false) as
select m.* from modulos_curso m join cursos c on c.id = m.curso_id where c.activo;

create or replace view kit_publico with (security_invoker = false) as
select k.* from kit_items k join cursos c on c.id = k.curso_id where c.activo;

grant select on cursos_publicos, horarios_publicos, modulos_publicos, kit_publico to anon, authenticated;

-- ── Visibilidad del material para el alumno (RF-32, RF-37) ──
-- Liberado = manual o fecha <= hoy. Además, solo el TÍTULO de la clase siguiente.
create or replace function material_visible(p_curso uuid)
returns table (id uuid, tipo tipo_material, titulo text, url text, clase_numero int, clase_titulo text)
language sql stable security definer set search_path = public as $$
  select m.id, m.tipo, m.titulo, case when m.tipo = 'link' then m.url end, cl.numero, cl.titulo
  from materiales m
  left join clases cl on cl.id = m.clase_id
  where m.curso_id = p_curso and alumno_activo_en(p_curso)
    and (m.liberado_manual or (m.liberar_en is not null and m.liberar_en <= current_date))
  order by cl.numero nulls last, m.creado_en
$$;

create or replace function proxima_clase_titulo(p_curso uuid)
returns table (numero int, fecha date, titulo text)
language sql stable security definer set search_path = public as $$
  select cl.numero, cl.fecha, cl.titulo from clases cl
  where cl.curso_id = p_curso and cl.fecha >= current_date and cl.estado = 'programada'
    and (alumno_activo_en(p_curso) or es_profesor_de(p_curso) or es_admin())
  order by cl.fecha limit 1
$$;

-- ── Reportes (solo admin) ───────────────────────────────
create or replace function reporte_ocupacion()
returns table (curso_id uuid, nombre text, cupo int, inscriptos int, ocupacion_pct numeric)
language sql stable security definer set search_path = public as $$
  select c.id, c.nombre, c.cupo,
         (select count(*)::int from inscripciones i where i.curso_id = c.id),
         round(100.0 * (select count(*) from inscripciones i where i.curso_id = c.id) / c.cupo, 1)
  from cursos c where es_admin() order by 5 desc
$$;

create or replace function reporte_desercion()
returns table (curso_id uuid, nombre text, total int, desertores int, desercion_pct numeric, n_clase int, cantidad int)
language sql stable security definer set search_path = public as $$
  select c.id, c.nombre,
         (select count(*)::int from inscripciones i where i.curso_id = c.id),
         (select count(*)::int from inscripciones i where i.curso_id = c.id and i.estado = 'desertor'),
         round(100.0 * (select count(*) from inscripciones i where i.curso_id = c.id and i.estado = 'desertor')
               / nullif((select count(*) from inscripciones i where i.curso_id = c.id), 0), 1),
         d.n_clase_desercion, d.cant::int
  from cursos c
  left join lateral (
    select n_clase_desercion, count(*) cant from inscripciones i
    where i.curso_id = c.id and i.estado = 'desertor' group by 1
  ) d on true
  where es_admin() order by c.nombre, d.n_clase_desercion
$$;
