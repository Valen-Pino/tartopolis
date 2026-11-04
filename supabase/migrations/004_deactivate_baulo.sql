-- Retira al participante del ranking, del ingreso y de las acciones del viaje.
-- Conserva los registros históricos relacionados.
update public.participants
set is_active = false, updated_at = now()
where slug = 'baulo';
