-- Freeze each existing fixed score before changing the catalog.
alter table public.achievement_claims
  add column assigned_points integer,
  add column scoring_inputs jsonb not null default '{}'::jsonb;

update public.achievement_claims c
set assigned_points = coalesce(c.resolved_points, a.fixed_points)
from public.achievements a
where c.achievement_id = a.id and a.score_mode = 'fixed';

-- Keep retired entries for historical and pending votes.
update public.achievements set is_active = false where slug in (
  'detonacion-visitante', 'adicional-pau', 'infidelidad-tarteo',
  'infidelidad-detonacion', 'encuentro-grupal', 'gestionar-contratacion',
  'positivo-leve', 'positivo-remarcable', 'boludez', 'negativo-grave'
);
update public.achievements set description = '';

update public.achievements a set title = v.title, fixed_points = v.points,
  sort_order = v.position
from (values
  ('detonacion', 'Detonación', 5, 10),
  ('felattio', 'Felattio', 3, 20),
  ('tartear', 'Tartear en la Jodita o After', 2, 30),
  ('aporte-casa', 'Aportar a la casa', 1, 50),
  ('atraer-after', 'Atraer gente al after', 0, 60),
  ('tirar-mala', 'Tirar la mala', -1, 200),
  ('dormir-after', 'Dormirse en el After', -2, 220),
  ('no-salir', 'No salir de joda', -5, 230),
  ('masturbarse-casa', 'Masturbarse en Casa', -5, 240)
) as v(slug, title, points, position) where a.slug = v.slug;

insert into public.achievements
  (slug,title,description,kind,polarity,score_mode,fixed_points,minimum_points,maximum_points,sort_order)
values
  ('generar-anecdota','Generar Anécdota','','objective','positive','fixed',2,null,null,40),
  ('estar-careta','Estar Careta','','objective','negative','fixed',-1,null,null,210),
  ('custom-positiva','Custom','','subjective','positive','range',null,1,10,70),
  ('custom-negativa','Custom','','subjective','negative','range',null,-10,-1,300);

-- Compute the authoritative total from inputs, never from a browser-supplied score.
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

  if v_achievement.slug = 'atraer-after' then
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

create trigger prepare_achievement_claim
before insert on public.achievement_claims
for each row execute function public.prepare_achievement_claim();

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
