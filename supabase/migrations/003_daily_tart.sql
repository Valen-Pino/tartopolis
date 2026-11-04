begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('daily-tarts', 'daily-tarts', false, 4194304, array['image/webp'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create table public.tart_images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  uploaded_by uuid not null references public.participants(id),
  times_selected bigint not null default 0 check (times_selected >= 0),
  created_at timestamptz not null default now()
);

create table public.daily_tarts (
  day date primary key,
  image_id uuid not null references public.tart_images(id),
  selected_at timestamptz not null default now()
);

create index tart_images_selection_idx on public.tart_images(times_selected);
alter table public.tart_images enable row level security;
alter table public.daily_tarts enable row level security;
revoke all on public.tart_images, public.daily_tarts from public, anon, authenticated;
grant select, insert, update on public.tart_images, public.daily_tarts to service_role;

-- El servidor llama sin argumentos. El parámetro permite verificar la rotación
-- por fechas en una base de pruebas, sin depender del reloj de esa máquina.
create function public.get_daily_tart(
  p_day date default (now() at time zone 'America/Argentina/Buenos_Aires')::date
)
returns table(image_id uuid, day date)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_image uuid;
  v_previous uuid;
begin
  if p_day is null then raise exception 'Falta la fecha'; end if;
  -- Serializa también la primera elección, cuando todavía no hay fila para bloquear.
  perform pg_advisory_xact_lock(20271122, 1);
  select d.image_id into v_image from daily_tarts d where d.day = p_day;
  if found then
    return query select v_image, p_day;
    return;
  end if;

  select d.image_id into v_previous from daily_tarts d where d.day = p_day - 1;
  select i.id into v_image
  from tart_images i
  where v_previous is null or i.id <> v_previous
     or not exists (select 1 from tart_images other where other.id <> v_previous)
  order by i.times_selected, random()
  limit 1;

  -- No guarda un día vacío: la primera subida puede estrenarse ese mismo día.
  if v_image is null then return; end if;
  insert into daily_tarts(day, image_id) values (p_day, v_image);
  update tart_images set times_selected = times_selected + 1 where id = v_image;
  return query select v_image, p_day;
end;
$$;

revoke all on function public.get_daily_tart(date) from public, anon, authenticated;
grant execute on function public.get_daily_tart(date) to service_role;

commit;
