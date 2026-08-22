create extension if not exists pgcrypto;

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  nickname text not null,
  slug text not null unique,
  initial_ovr integer not null default 65,
  is_active boolean not null default true,
  profile_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists access_links (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  kind text not null check (kind in ('objective', 'subjective')),
  polarity text not null check (polarity in ('positive', 'negative')),
  score_mode text not null check (score_mode in ('fixed', 'range')),
  fixed_points integer,
  minimum_points integer,
  maximum_points integer,
  per_person_limit integer,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (
    (score_mode = 'fixed' and fixed_points is not null and minimum_points is null and maximum_points is null)
    or
    (score_mode = 'range' and fixed_points is null and minimum_points is not null and maximum_points is not null and minimum_points <= maximum_points)
  )
);

create table if not exists achievement_claims (
  id uuid primary key default gen_random_uuid(),
  achievement_id uuid not null references achievements(id),
  created_by uuid not null references participants(id),
  target_participant_id uuid not null references participants(id),
  details text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  eligible_voters integer not null default 0,
  approval_count integer not null default 0,
  rejection_count integer not null default 0,
  resolved_points integer,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (created_by <> target_participant_id)
);

create table if not exists achievement_votes (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references achievement_claims(id) on delete cascade,
  voter_id uuid not null references participants(id),
  approve boolean not null,
  proposed_points integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (claim_id, voter_id)
);

create table if not exists score_events (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id),
  achievement_claim_id uuid unique references achievement_claims(id),
  source_key text unique,
  description text not null,
  points integer not null,
  source_kind text not null check (source_kind in ('initial', 'imported', 'claim', 'manual')),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists score_events_participant_idx on score_events(participant_id, occurred_at desc);
create index if not exists claims_status_idx on achievement_claims(status, created_at desc);
create index if not exists votes_claim_idx on achievement_votes(claim_id);
create index if not exists access_links_token_idx on access_links(token_hash) where revoked_at is null;

create or replace view participant_ranking as
select
  p.id,
  p.full_name,
  p.nickname,
  p.slug,
  coalesce(sum(se.points), 0)::integer as ovr,
  count(se.id)::integer as event_count
from participants p
left join score_events se on se.participant_id = p.id
where p.is_active
group by p.id, p.full_name, p.nickname, p.slug;

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
      from achievement_claims
      where achievement_id = v_claim.achievement_id
        and target_participant_id = v_claim.target_participant_id
        and status = 'approved';
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

alter table participants enable row level security;
alter table access_links enable row level security;
alter table achievements enable row level security;
alter table achievement_claims enable row level security;
alter table achievement_votes enable row level security;
alter table score_events enable row level security;

-- La app accede a estas tablas exclusivamente desde el servidor mediante la service role.
revoke all on function cast_achievement_vote(uuid, uuid, boolean, integer) from public, anon, authenticated;
grant execute on function cast_achievement_vote(uuid, uuid, boolean, integer) to service_role;
