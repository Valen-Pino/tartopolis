create or replace function public.get_daily_tart(
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
  v_next_count bigint;
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
  -- Comparar con el siguiente nivel distinto, incluyendo la foto de ayer.
  select chosen.id, coalesce((
    select min(other.times_selected) from tart_images other
    where other.times_selected > chosen.times_selected
  ), chosen.times_selected + 1)
  into v_image, v_next_count
  from (
    select i.id, i.times_selected
    from tart_images i
    where v_previous is null or i.id <> v_previous
       or not exists (select 1 from tart_images other where other.id <> v_previous)
    order by i.times_selected, random()
    limit 1
  ) chosen;

  -- No guarda un día vacío: la primera subida puede estrenarse ese mismo día.
  if v_image is null then return; end if;
  insert into daily_tarts(day, image_id) values (p_day, v_image);
  update tart_images set times_selected = v_next_count where id = v_image;
  return query select v_image, p_day;
end;
$$;
