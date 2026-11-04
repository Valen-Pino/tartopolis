begin;

insert into public.participants (id, full_name, nickname, slug)
values ('10000000-0000-0000-0000-000000000013', 'Juani', 'Juani', 'juani')
on conflict (slug) do nothing;

insert into public.score_events (participant_id, source_key, description, points, source_kind)
select id, 'initial-juani', 'Situación inicial', initial_ovr, 'initial'
from public.participants where slug = 'juani'
on conflict (source_key) do nothing;

commit;
