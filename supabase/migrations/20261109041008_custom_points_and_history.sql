-- Current catalog titles; keep the historical label explicitly requested.
update public.achievements set title = 'Custom Positivo' where slug = 'custom-positiva';
update public.achievements set title = 'Custom Negativo' where slug = 'custom-negativa';
update public.achievements set title = 'Custom Negativa' where slug = 'negativo-grave';
update public.score_events s set description = a.title || ': ' || c.details
from public.achievement_claims c join public.achievements a on a.id = c.achievement_id
where s.achievement_claim_id = c.id and a.slug = 'negativo-grave';

-- Address imported events by their stable source key and participant, not generated IDs.
update public.score_events s set points = v.points,
  description = coalesce(v.description, s.description)
from public.participants p, (values
  ('baulo','import-01',-2,null::text),
  ('empanada','import-02',-1,'Fue wachin para sacar casas'),
  ('nator','import-03',3,null::text),
  ('dero','import-11',1,null::text),
  ('fornari','import-13',2,null::text),
  ('garza','import-14',2,null::text)
) v(slug, source_key, points, description)
where s.participant_id = p.id and p.slug = v.slug and s.source_key = v.source_key
  and s.source_kind = 'imported';

delete from public.score_events s using public.participants p
where s.participant_id = p.id and s.source_kind = 'imported'
  and ((p.slug = 'colorado' and s.source_key = 'import-05')
    or (p.slug = 'garza' and s.source_key = 'import-16'));

insert into public.score_events (participant_id,source_key,description,points,source_kind,occurred_at)
select p.id,'late-ticket-' || p.slug,'Tardó en sacar pasaje',-2,'imported',
  coalesce((select occurred_at from public.score_events where source_key = 'import-01'),now())
from public.participants p where p.slug in ('juani','negro')
on conflict (source_key) do update set points = excluded.points, description = excluded.description;

create or replace function public.prepare_achievement_claim()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_achievement public.achievements%rowtype;
  v_inputs jsonb := new.scoring_inputs;
  v_allowed text[];
  v_key text;
  v_women integer;
  v_men integer;
begin
  select * into v_achievement from public.achievements where id = new.achievement_id;
  if not found or not v_achievement.is_active then
    raise exception 'La Hazaña seleccionada ya no está disponible';
  end if;
  if not exists (select 1 from public.participants where id = new.created_by and is_active)
     or not exists (select 1 from public.participants where id = new.target_participant_id and is_active) then
    raise exception 'El participante no está habilitado';
  end if;
  if v_inputs is null or jsonb_typeof(v_inputs) <> 'object' then
    raise exception 'Datos de puntaje inválidos';
  end if;

  if v_achievement.slug in ('custom-positiva','custom-negativa') then
    if (v_inputs - 'points') <> '{}'::jsonb
      or jsonb_typeof(v_inputs->'points') is distinct from 'number'
      or (v_inputs->>'points') !~ '^-?[0-9]{1,2}$' then
      raise exception 'Elegí un puntaje entero para la Custom';
    end if;
    new.assigned_points := (v_inputs->>'points')::integer;
    if new.assigned_points < v_achievement.minimum_points or new.assigned_points > v_achievement.maximum_points then
      raise exception 'El puntaje está fuera del rango permitido';
    end if;
  elsif v_achievement.slug = 'atraer-after' then
    if (v_inputs - array['women','men']) <> '{}'::jsonb then
      raise exception 'Datos de puntaje inválidos';
    end if;
    foreach v_key in array array['women','men'] loop
      if jsonb_typeof(v_inputs->v_key) is distinct from 'number'
        or (v_inputs->>v_key) !~ '^[0-9]{1,7}$' then
        raise exception 'Ingresá cantidades enteras no negativas';
      end if;
      if (v_inputs->>v_key)::integer > 1000000 then
        raise exception 'Cantidad fuera de rango';
      end if;
    end loop;
    v_women := (v_inputs->>'women')::integer;
    v_men := (v_inputs->>'men')::integer;
    new.assigned_points := greatest(0, v_women - v_men);
  elsif v_achievement.slug in ('tartear','detonacion','felattio') then
    v_allowed := case v_achievement.slug
      when 'tartear' then array['pau','infidelity']
      when 'felattio' then array['visiting','pau','infidelity']
      else array['visiting','pau','infidelity','trio'] end;
    if (v_inputs - v_allowed) <> '{}'::jsonb then
      raise exception 'Adicional no permitido para esta Hazaña';
    end if;
    for v_key in select jsonb_object_keys(v_inputs) loop
      if jsonb_typeof(v_inputs->v_key) <> 'boolean' then
        raise exception 'Adicional inválido';
      end if;
    end loop;
    new.assigned_points := v_achievement.fixed_points
      + case when v_inputs->>'visiting' = 'true' then 2 else 0 end
      + case when v_inputs->>'pau' = 'true' then 10 else 0 end
      + case when v_inputs->>'infidelity' = 'true' then 4 else 0 end
      + case when v_inputs->>'trio' = 'true' then 2 else 0 end;
  else
    if v_inputs <> '{}'::jsonb then raise exception 'Esta Hazaña no admite adicionales'; end if;
    new.assigned_points := v_achievement.fixed_points;
  end if;
  return new;
end;
$$;
revoke all on function public.prepare_achievement_claim() from public, anon, authenticated;
grant execute on function public.prepare_achievement_claim() to service_role;

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
  if p_approve and v_achievement.score_mode = 'range' and v_claim.assigned_points is null then
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
      if v_achievement.score_mode = 'fixed' or v_claim.assigned_points is not null then
        v_points := coalesce(v_claim.assigned_points, v_achievement.fixed_points);
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
