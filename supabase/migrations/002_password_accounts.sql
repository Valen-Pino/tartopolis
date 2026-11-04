begin;
create table public.participant_credentials (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  password_hash text not null,
  session_version uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);
alter table public.participant_credentials enable row level security;
revoke all on public.participant_credentials from anon, authenticated;
grant all on public.participant_credentials to service_role;
alter table public.access_links
  add column purpose text not null default 'legacy' check (purpose in ('legacy', 'register', 'reset')),
  add column consumed_at timestamptz;
update public.access_links set revoked_at = now() where revoked_at is null;
create table public.login_attempts (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 1
);
alter table public.login_attempts enable row level security;
revoke all on public.login_attempts from anon, authenticated;
grant all on public.login_attempts to service_role;

create function public.allow_login_attempt(p_participant_id uuid)
returns boolean language plpgsql set search_path = '' as $$
declare v_attempts integer;
begin
  if not exists (select 1 from public.participants where id = p_participant_id and is_active) then return false; end if;
  insert into public.login_attempts as current (participant_id) values (p_participant_id)
  on conflict (participant_id) do update set
    attempts = case when current.window_started_at < now() - interval '15 minutes' then 1 else least(current.attempts + 1, 11) end,
    window_started_at = case when current.window_started_at < now() - interval '15 minutes' then now() else current.window_started_at end
  returning attempts into v_attempts;
  return v_attempts <= 10;
end;
$$;

create function public.issue_account_invitation(p_participant_id uuid, p_token_hash text, p_purpose text)
returns void language plpgsql set search_path = '' as $$
begin
  perform 1 from public.participants where id = p_participant_id and is_active for update;
  if not found then raise exception 'Participante inválido'; end if;
  if p_purpose not in ('register', 'reset') or p_purpose is null then raise exception 'Propósito inválido'; end if;
  if p_purpose = 'register' and exists (select 1 from public.participant_credentials where participant_id = p_participant_id) then
    raise exception 'El participante ya tiene cuenta; usá un restablecimiento';
  end if;
  if p_purpose = 'reset' and not exists (select 1 from public.participant_credentials where participant_id = p_participant_id) then
    raise exception 'El participante todavía no tiene cuenta';
  end if;
  update public.access_links set revoked_at = now() where participant_id = p_participant_id and revoked_at is null;
  insert into public.access_links(participant_id, token_hash, purpose, expires_at)
    values (p_participant_id, p_token_hash, p_purpose, now() + interval '7 days');
  if p_purpose = 'reset' then
    update public.participant_credentials set password_hash = '', session_version = gen_random_uuid() where participant_id = p_participant_id;
  end if;
end;
$$;

create function public.redeem_account_invitation(p_token_hash text, p_password_hash text)
returns table(participant_id uuid, session_version uuid) language plpgsql set search_path = '' as $$
declare v_link public.access_links%rowtype; v_version uuid := gen_random_uuid();
begin
  select * into v_link from public.access_links where token_hash = p_token_hash;
  if not found then return; end if;
  -- Emisión y consumo bloquean en el mismo orden para evitar carreras.
  perform 1 from public.participants where id = v_link.participant_id and is_active for update;
  if not found then return; end if;
  select * into v_link from public.access_links where token_hash = p_token_hash for update;
  if v_link.revoked_at is not null or v_link.consumed_at is not null
    or v_link.expires_at is null or v_link.expires_at <= now()
    or v_link.purpose not in ('register', 'reset') then return; end if;
  if v_link.purpose = 'register' and exists (select 1 from public.participant_credentials c where c.participant_id = v_link.participant_id) then return; end if;
  if v_link.purpose = 'reset' and not exists (select 1 from public.participant_credentials c where c.participant_id = v_link.participant_id) then return; end if;
  insert into public.participant_credentials (participant_id, password_hash, session_version)
    values (v_link.participant_id, p_password_hash, v_version)
    on conflict on constraint participant_credentials_pkey do update
      set password_hash = excluded.password_hash, session_version = excluded.session_version, updated_at = now();
  update public.access_links set consumed_at = now(), last_used_at = now() where id = v_link.id;
  update public.access_links set revoked_at = now() where access_links.participant_id = v_link.participant_id and revoked_at is null;
  delete from public.login_attempts where login_attempts.participant_id = v_link.participant_id;
  return query select v_link.participant_id, v_version;
end;
$$;
revoke all on function public.allow_login_attempt(uuid) from public, anon, authenticated;
revoke all on function public.issue_account_invitation(uuid, text, text) from public, anon, authenticated;
revoke all on function public.redeem_account_invitation(text, text) from public, anon, authenticated;
grant execute on function public.allow_login_attempt(uuid) to service_role;
grant execute on function public.issue_account_invitation(uuid, text, text) to service_role;
grant execute on function public.redeem_account_invitation(text, text) to service_role;
commit;
