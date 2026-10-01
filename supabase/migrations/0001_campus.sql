-- Campus virtual de Fullness Camp: perfiles, cohortes, sesiones, inscripciones y avisos.
-- Ejecutar en Supabase: SQL Editor -> pegar todo -> Run. Es seguro de leer antes de correr.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- tipos
create type public.app_role as enum ('student', 'teacher', 'admin');

-- ---------------------------------------------------------------- tablas
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'student',
  full_name text not null default '',
  email text,
  -- Formato internacional sin "+", por ejemplo 573116741900
  whatsapp_phone text check (whatsapp_phone is null or whatsapp_phone ~ '^[0-9]{10,15}$'),
  notify_email boolean not null default true,
  notify_whatsapp boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  program_slug text not null,               -- coincide con el slug de src/data/programs.ts
  name text not null,
  sede text not null check (sede in ('Bogotá', 'Cajicá', 'Tabío', 'Online')),
  teacher_id uuid references public.profiles (id) on delete set null,
  starts_on date,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.enrollments (
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  created_at timestamptz not null default now(),
  primary key (cohort_id, student_id)
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  online_url text,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index sessions_cohort_starts_idx on public.sessions (cohort_id, starts_at);

-- Historial de cambios hechos por profesoras: quién, cuándo, qué cambió y por qué.
create table public.session_changes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  changed_by uuid references public.profiles (id) on delete set null,
  old_data jsonb not null,
  new_data jsonb not null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- Avisos que se ven dentro de la plataforma.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete cascade,
  change_id uuid references public.session_changes (id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Cola de envíos por correo y WhatsApp (se procesa desde el servidor con la llave de servicio).
create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp')),
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts int not null default 0,
  last_error text,
  claimed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (notification_id, channel)
);
create index deliveries_status_idx on public.notification_deliveries (status, created_at);

-- ---------------------------------------------------------------- funciones de apoyo
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create function public.teaches_cohort(p_cohort uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cohorts where id = p_cohort and teacher_id = auth.uid());
$$;

create function public.is_enrolled(p_cohort uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.enrollments
    where cohort_id = p_cohort and student_id = auth.uid() and status = 'active'
  );
$$;

-- Cada usuaria nueva recibe un perfil de estudiante. El rol solo lo cambia una administradora.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- seguridad (RLS)
alter table public.profiles enable row level security;
alter table public.cohorts enable row level security;
alter table public.enrollments enable row level security;
alter table public.sessions enable row level security;
alter table public.session_changes enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;

-- profiles: cada persona ve y edita lo suyo (solo nombre, WhatsApp y preferencias).
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (full_name, whatsapp_phone, notify_email, notify_whatsapp) on public.profiles to authenticated;

-- cohorts
create policy cohorts_select on public.cohorts for select to authenticated
  using (public.is_admin() or teacher_id = auth.uid() or public.is_enrolled(id));
create policy cohorts_admin_all on public.cohorts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- enrollments
create policy enrollments_select on public.enrollments for select to authenticated
  using (public.is_admin() or student_id = auth.uid() or public.teaches_cohort(cohort_id));
create policy enrollments_admin_all on public.enrollments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- sessions: se leen según la cohorte; las profesoras NO las editan directo, usan reschedule_session().
create policy sessions_select on public.sessions for select to authenticated
  using (public.is_admin() or public.teaches_cohort(cohort_id) or public.is_enrolled(cohort_id));
create policy sessions_admin_all on public.sessions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- session_changes
create policy changes_select on public.session_changes for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.sessions s where s.id = session_id and public.teaches_cohort(s.cohort_id))
  );

-- notifications: cada persona ve las suyas y solo puede marcarlas como leídas.
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- notification_deliveries: sin políticas = nadie desde la web; solo el servidor con la llave de servicio.
-- Además se quitan los permisos por completo (defensa adicional), y a "anon" se le quita todo el esquema:
-- las visitantes sin sesión no necesitan leer nada de estas tablas.
revoke all on public.notification_deliveries from anon, authenticated;
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------- cambio de horario
-- Una sola operación atómica: actualiza la sesión, guarda el historial, avisa en la plataforma
-- y deja en cola el correo y el WhatsApp de cada estudiante inscrita.
create function public.reschedule_session(
  p_session uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_location text,
  p_online_url text,
  p_status text,
  p_reason text
) returns int
language plpgsql security definer set search_path = public as $$
declare
  s public.sessions%rowtype;
  v_change uuid;
  v_notified int := 0;
  v_title text;
  v_body text;
  r record;
  v_notif uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  if p_status not in ('scheduled', 'cancelled') then raise exception 'Estado no válido'; end if;
  if p_ends_at <= p_starts_at then raise exception 'La hora de fin debe ser posterior al inicio'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Escribe el motivo del cambio'; end if;

  select * into s from public.sessions where id = p_session for update;
  if not found then raise exception 'La sesión no existe'; end if;
  if not (public.is_admin() or public.teaches_cohort(s.cohort_id)) then
    raise exception 'No tienes permiso para cambiar esta sesión';
  end if;

  -- Sin cambios reales no se molesta a nadie.
  if s.starts_at = p_starts_at and s.ends_at = p_ends_at
     and s.location is not distinct from nullif(trim(p_location), '')
     and s.online_url is not distinct from nullif(trim(p_online_url), '')
     and s.status = p_status then
    return 0;
  end if;

  insert into public.session_changes (session_id, changed_by, old_data, new_data, reason)
  values (
    s.id, auth.uid(),
    jsonb_build_object('starts_at', s.starts_at, 'ends_at', s.ends_at, 'location', s.location,
                       'online_url', s.online_url, 'status', s.status),
    jsonb_build_object('starts_at', p_starts_at, 'ends_at', p_ends_at, 'location', nullif(trim(p_location), ''),
                       'online_url', nullif(trim(p_online_url), ''), 'status', p_status),
    trim(p_reason)
  ) returning id into v_change;

  update public.sessions set
    starts_at = p_starts_at, ends_at = p_ends_at,
    location = nullif(trim(p_location), ''), online_url = nullif(trim(p_online_url), ''),
    status = p_status, updated_at = now()
  where id = s.id;

  if p_status = 'cancelled' then
    v_title := 'Clase cancelada: ' || s.title;
    v_body := 'Se canceló la clase "' || s.title || '". Motivo: ' || trim(p_reason);
  else
    v_title := 'Cambio de horario: ' || s.title;
    v_body := 'La clase "' || s.title || '" ahora es el '
      || to_char(p_starts_at at time zone 'America/Bogota', 'DD/MM/YYYY')
      || ' de ' || to_char(p_starts_at at time zone 'America/Bogota', 'HH24:MI')
      || ' a ' || to_char(p_ends_at at time zone 'America/Bogota', 'HH24:MI')
      || ' (hora de Colombia). Motivo: ' || trim(p_reason);
  end if;

  for r in
    select p.id, p.whatsapp_phone, p.notify_email, p.notify_whatsapp, p.email
    from public.enrollments e
    join public.profiles p on p.id = e.student_id
    where e.cohort_id = s.cohort_id and e.status = 'active'
  loop
    insert into public.notifications (user_id, session_id, change_id, title, body)
    values (r.id, s.id, v_change, v_title, v_body)
    returning id into v_notif;

    if r.notify_email and r.email is not null then
      insert into public.notification_deliveries (notification_id, channel) values (v_notif, 'email');
    end if;
    if r.notify_whatsapp and r.whatsapp_phone is not null then
      insert into public.notification_deliveries (notification_id, channel) values (v_notif, 'whatsapp');
    end if;
    v_notified := v_notified + 1;
  end loop;

  return v_notified;
end;
$$;

revoke all on function public.reschedule_session(uuid, timestamptz, timestamptz, text, text, text, text) from public, anon;
grant execute on function public.reschedule_session(uuid, timestamptz, timestamptz, text, text, text, text) to authenticated;
