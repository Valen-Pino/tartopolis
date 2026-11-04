-- Evitar la ambigüedad entre la columna status y el parámetro de salida.
create or replace function cast_achievement_vote(
  p_claim_id uuid,
  p_voter_id uuid,
  p_approve boolean,
  p_proposed_points integer default null
)
returns table(status text, resolved_points integer, approval_count integer, rejection_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim achievement_claims%rowtype;
  v_achievement achievements%rowtype;
  v_eligible integer;
  v_threshold integer;
  v_approvals integer;
  v_rejections integer;
  v_prior_count integer := 0;
  v_points integer;
  v_status text := 'pending';
begin
  select * into v_claim from achievement_claims where id = p_claim_id for update;
  if not found then raise exception 'La acusación no existe'; end if;
  if v_claim.status <> 'pending' then raise exception 'La votación ya está cerrada'; end if;
  if not exists (select 1 from participants where id = p_voter_id and is_active) then
    raise exception 'El votante no está habilitado';
  end if;

  select * into v_achievement from achievements where id = v_claim.achievement_id;
  if p_approve and v_achievement.score_mode = 'range' then
    if p_proposed_points is null or p_proposed_points < v_achievement.minimum_points or p_proposed_points > v_achievement.maximum_points then
      raise exception 'El puntaje propuesto está fuera del rango permitido';
    end if;
  else
    p_proposed_points := null;
  end if;

  insert into achievement_votes (claim_id, voter_id, approve, proposed_points)
  values (p_claim_id, p_voter_id, p_approve, p_proposed_points)
  on conflict (claim_id, voter_id) do update
    set approve = excluded.approve,
        proposed_points = excluded.proposed_points,
        updated_at = now();

  select count(*)::integer into v_eligible from participants where is_active;
  v_threshold := floor(v_eligible / 2.0)::integer + 1;

  select
    count(*) filter (where approve)::integer,
    count(*) filter (where not approve)::integer
  into v_approvals, v_rejections
  from achievement_votes where claim_id = p_claim_id;

  if v_approvals >= v_threshold then
    if v_achievement.per_person_limit is not null then
      select count(*)::integer into v_prior_count
      from achievement_claims prior_claim
      where prior_claim.achievement_id = v_claim.achievement_id
        and prior_claim.target_participant_id = v_claim.target_participant_id
        and prior_claim.status = 'approved';
    end if;

    if v_achievement.per_person_limit is not null and v_prior_count >= v_achievement.per_person_limit then
      v_status := 'rejected';
      v_points := null;
    else
      v_status := 'approved';
      if v_achievement.score_mode = 'fixed' then
        v_points := v_achievement.fixed_points;
      else
        select round(avg(proposed_points))::integer into v_points
        from achievement_votes where claim_id = p_claim_id and approve;
      end if;

      insert into score_events (
        participant_id, achievement_claim_id, description, points, source_kind, occurred_at
      ) values (
        v_claim.target_participant_id,
        p_claim_id,
        v_achievement.title || ': ' || v_claim.details,
        v_points,
        'claim',
        now()
      ) on conflict (achievement_claim_id) do nothing;
    end if;
  elsif v_rejections > (v_eligible - v_threshold) then
    v_status := 'rejected';
    v_points := null;
  end if;

  update achievement_claims
  set eligible_voters = v_eligible,
      approval_count = v_approvals,
      rejection_count = v_rejections,
      status = v_status,
      resolved_points = v_points,
      resolved_at = case when v_status = 'pending' then null else now() end
  where id = p_claim_id;

  return query select v_status, v_points, v_approvals, v_rejections;
end;
$$;

revoke all on function cast_achievement_vote(uuid, uuid, boolean, integer) from public, anon, authenticated;
grant execute on function cast_achievement_vote(uuid, uuid, boolean, integer) to service_role;
