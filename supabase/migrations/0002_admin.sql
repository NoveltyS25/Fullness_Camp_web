-- Panel de administración: cambio de roles solo para administradoras, sin exponer la llave de servicio.

create function public.admin_set_role(p_email text, p_role public.app_role) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then raise exception 'Solo una administradora puede cambiar roles'; end if;

  select id into v_id from public.profiles where lower(email) = lower(trim(p_email));
  if v_id is null then
    raise exception 'Esa persona aún no ha entrado al campus. Pídele que ingrese una vez con su correo.';
  end if;
  if v_id = auth.uid() and p_role <> 'admin' then
    raise exception 'No puedes quitarte a ti misma el rol de administradora';
  end if;

  update public.profiles set role = p_role where id = v_id;
  return true;
end;
$$;

revoke all on function public.admin_set_role(text, public.app_role) from public, anon;
grant execute on function public.admin_set_role(text, public.app_role) to authenticated;
