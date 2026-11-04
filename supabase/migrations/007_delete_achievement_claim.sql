create or replace function delete_achievement_claim(p_claim_id uuid, p_actor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim achievement_claims%rowtype;
begin
  select * into v_claim from achievement_claims where id = p_claim_id for update;
  if not found then raise exception 'La votación no existe'; end if;
  if not exists (select 1 from participants where id = p_actor_id and is_active) then
    raise exception 'El participante no está habilitado';
  end if;
  if p_actor_id <> v_claim.created_by
    and p_actor_id <> '10000000-0000-0000-0000-000000000001'::uuid then
    raise exception 'No podés eliminar esta votación';
  end if;

  -- La eliminación y la reversión de puntos se hacen en la misma transacción.
  delete from score_events where achievement_claim_id = p_claim_id;
  delete from achievement_claims where id = p_claim_id;
end;
$$;

revoke all on function delete_achievement_claim(uuid, uuid) from public, anon, authenticated;
grant execute on function delete_achievement_claim(uuid, uuid) to service_role;
