-- Auditoría de cambios sensibles y demanda de cursos que aún no se dictan (RF-52).

create table audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id) on delete set null,
  accion text not null,
  entidad text not null,
  entidad_id text,
  detalle jsonb,
  created_at timestamptz not null default now()
);
alter table audit_log enable row level security;
create policy "audit_log admin lee" on audit_log for select to authenticated using (is_admin());

create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (actor_id, accion, entidad, entidad_id, detalle)
  values (auth.uid(), tg_op, tg_table_name,
          coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id'),
          jsonb_build_object('antes', to_jsonb(old) - 'motivo_baja', 'despues', to_jsonb(new) - 'motivo_baja'));
  return coalesce(new, old);
end $$;

create trigger audit_cursos after insert or update or delete on cursos for each row execute function public.audit_trigger();
create trigger audit_matriculas after insert or update on matriculas for each row execute function public.audit_trigger();
create trigger audit_profiles after update on profiles for each row execute function public.audit_trigger();

create table demanda_cursos (
  id bigint generated always as identity primary key,
  interes text not null check (length(interes) between 1 and 200),
  contacto text check (length(contacto) <= 120),
  created_at timestamptz not null default now()
);
alter table demanda_cursos enable row level security;
create policy "demanda_cursos cualquiera inserta" on demanda_cursos for insert to anon, authenticated with check (true);
create policy "demanda_cursos admin lee" on demanda_cursos for select to authenticated using (is_admin());
