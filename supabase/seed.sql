insert into participants (id, full_name, nickname, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Valentin Pino', 'Nator', 'nator'),
  ('10000000-0000-0000-0000-000000000002', 'Nacho Derosa', 'Dero', 'dero'),
  ('10000000-0000-0000-0000-000000000003', 'Nacho Fornari', 'Fornari', 'fornari'),
  ('10000000-0000-0000-0000-000000000004', 'Nico Arias', 'Empanada', 'empanada'),
  ('10000000-0000-0000-0000-000000000005', 'Luca Pedroni', 'Garza', 'garza'),
  ('10000000-0000-0000-0000-000000000006', 'Lautaro Stocco', 'Theri', 'theri'),
  ('10000000-0000-0000-0000-000000000007', 'Lucio Monasterio', 'Prepu', 'prepu'),
  ('10000000-0000-0000-0000-000000000008', 'Pablo Siciliano', 'Colorado', 'colorado'),
  ('10000000-0000-0000-0000-000000000009', 'Tomás Farana', 'Tom', 'tom'),
  ('10000000-0000-0000-0000-000000000010', 'Franco Gatti', 'Abuelo', 'abuelo'),
  ('10000000-0000-0000-0000-000000000011', 'Tobias Martin', 'Linki', 'linki'),
  ('10000000-0000-0000-0000-000000000012', 'Bautista Petris', 'Baulo', 'baulo'),
  ('10000000-0000-0000-0000-000000000013', 'Juan Ignacio Scarcelli', 'Juani', 'juani')
on conflict (id) do update set full_name = excluded.full_name, nickname = excluded.nickname, slug = excluded.slug;

update participants set is_active = false where slug = 'baulo';

insert into achievements (slug, title, description, kind, polarity, score_mode, fixed_points, minimum_points, maximum_points, per_person_limit, sort_order) values
  ('detonacion', 'Detonación', '', 'objective', 'positive', 'fixed', 5, null, null, null, 10),
  ('felattio', 'Felattio', '', 'objective', 'positive', 'fixed', 3, null, null, null, 20),
  ('tartear', 'Tartear en la Jodita o After', '', 'objective', 'positive', 'fixed', 2, null, null, null, 30),
  ('generar-anecdota', 'Generar Anécdota', '', 'objective', 'positive', 'fixed', 2, null, null, null, 40),
  ('aporte-casa', 'Aportar a la casa', '', 'objective', 'positive', 'fixed', 1, null, null, 5, 50),
  ('atraer-after', 'Atraer gente al after', '', 'objective', 'positive', 'fixed', 0, null, null, null, 60),
  ('custom-positiva', 'Custom Positiva', '', 'subjective', 'positive', 'range', null, 1, 10, null, 70),
  ('tirar-mala', 'Tirar la mala', '', 'objective', 'negative', 'fixed', -1, null, null, null, 200),
  ('estar-careta', 'Estar Careta', '', 'objective', 'negative', 'fixed', -1, null, null, null, 210),
  ('dormir-after', 'Dormirse en el After', '', 'objective', 'negative', 'fixed', -2, null, null, null, 220),
  ('no-salir', 'No salir de joda', '', 'objective', 'negative', 'fixed', -5, null, null, null, 230),
  ('masturbarse-casa', 'Masturbarse en Casa', '', 'objective', 'negative', 'fixed', -5, null, null, null, 240),
  ('custom-negativa', 'Custom Negativa', '', 'subjective', 'negative', 'range', null, -10, -1, null, 300)
on conflict (slug) do update set
  title = excluded.title, description = excluded.description, kind = excluded.kind,
  polarity = excluded.polarity, score_mode = excluded.score_mode,
  fixed_points = excluded.fixed_points, minimum_points = excluded.minimum_points,
  maximum_points = excluded.maximum_points, per_person_limit = excluded.per_person_limit,
  sort_order = excluded.sort_order;

insert into score_events (participant_id, source_key, description, points, source_kind, occurred_at) values
  ('10000000-0000-0000-0000-000000000001', 'initial-nator', 'Situación inicial', 65, 'initial', '2026-08-21'),
  ('10000000-0000-0000-0000-000000000002', 'initial-dero', 'Situación inicial', 65, 'initial', '2026-08-21'),
  ('10000000-0000-0000-0000-000000000003', 'initial-fornari', 'Situación inicial', 65, 'initial', '2026-08-21'),
  ('10000000-0000-0000-0000-000000000004', 'initial-empanada', 'Situación inicial', 65, 'initial', '2026-08-21'),
  ('10000000-0000-0000-0000-000000000005', 'initial-garza', 'Situación inicial', 65, 'initial', '2026-08-21'),
  ('10000000-0000-0000-0000-000000000006', 'initial-theri', 'Situación inicial', 65, 'initial', '2026-08-21'),
  ('10000000-0000-0000-0000-000000000007', 'initial-prepu', 'Situación inicial', 65, 'initial', '2026-08-21'),
  ('10000000-0000-0000-0000-000000000008', 'initial-colorado', 'Situación inicial', 65, 'initial', '2026-08-21'),
  ('10000000-0000-0000-0000-000000000009', 'initial-tom', 'Situación inicial', 65, 'initial', '2026-08-21'),
  ('10000000-0000-0000-0000-000000000010', 'initial-abuelo', 'Situación inicial', 65, 'initial', '2026-08-21'),
  ('10000000-0000-0000-0000-000000000011', 'initial-linki', 'Situación inicial', 65, 'initial', '2026-08-21'),
  ('10000000-0000-0000-0000-000000000012', 'initial-baulo', 'Situación inicial', 65, 'initial', '2026-08-21'),
  ('10000000-0000-0000-0000-000000000013', 'initial-juani', 'Situación inicial', 65, 'initial', now()),
  ('10000000-0000-0000-0000-000000000012', 'import-01', 'Tardó en sacar pasaje', -2, 'imported', '2026-08-21 12:01:00-03'),
  ('10000000-0000-0000-0000-000000000004', 'import-02', 'Fue wachin para sacar casas', -1, 'imported', '2026-08-21 12:02:00-03'),
  ('10000000-0000-0000-0000-000000000001', 'import-03', 'Página con cuenta regresiva y leaderboard', 3, 'imported', '2026-08-21 12:03:00-03'),
  ('10000000-0000-0000-0000-000000000010', 'import-04', 'Lleva parlante', 1, 'imported', '2026-08-21 12:04:00-03'),
  ('10000000-0000-0000-0000-000000000009', 'import-06', 'Lleva consola', 2, 'imported', '2026-08-21 12:06:00-03'),
  ('10000000-0000-0000-0000-000000000007', 'import-07', 'Aportó su tarjeta para la casa', 3, 'imported', '2026-08-21 12:07:00-03'),
  ('10000000-0000-0000-0000-000000000006', 'import-08', 'Hizo reglamento y Excel del leaderboard', 2, 'imported', '2026-08-21 12:08:00-03'),
  ('10000000-0000-0000-0000-000000000006', 'import-09', 'Pagó 1500 reales de seña', 1, 'imported', '2026-08-21 12:09:00-03'),
  ('10000000-0000-0000-0000-000000000002', 'import-10', 'Pagó 1500 reales de seña', 1, 'imported', '2026-08-21 12:10:00-03'),
  ('10000000-0000-0000-0000-000000000002', 'import-11', 'Aportó en la búsqueda de casas', 1, 'imported', '2026-08-21 12:11:00-03'),
  ('10000000-0000-0000-0000-000000000006', 'import-12', 'Aportó en la búsqueda de casas', 1, 'imported', '2026-08-21 12:12:00-03'),
  ('10000000-0000-0000-0000-000000000003', 'import-13', 'Aportó en la búsqueda de casas', 2, 'imported', '2026-08-21 12:13:00-03'),
  ('10000000-0000-0000-0000-000000000005', 'import-14', 'Aportó en la búsqueda de casas', 2, 'imported', '2026-08-21 12:14:00-03'),
  ('10000000-0000-0000-0000-000000000005', 'import-15', 'Cerró la casa', 3, 'imported', '2026-08-21 12:15:00-03'),
  ('10000000-0000-0000-0000-000000000003', 'import-17', 'Ayudó con los pasajes', 2, 'imported', '2026-08-21 12:17:00-03'),
  ('10000000-0000-0000-0000-000000000003', 'import-18', 'Consiguió grupos de WhatsApp', 1, 'imported', '2026-08-21 12:18:00-03'),
  ('10000000-0000-0000-0000-000000000002', 'import-19', 'Encontró la casa', 2, 'imported', '2026-08-21 12:19:00-03')
on conflict (source_key) do update set
  participant_id = excluded.participant_id,
  description = excluded.description,
  points = excluded.points;

insert into score_events (participant_id,source_key,description,points,source_kind,occurred_at)
select id,'late-ticket-' || slug,'Tardó en sacar pasaje',-2,'imported','2026-08-21 12:01:00-03'::timestamptz
from participants where slug in ('juani','negro')
on conflict (source_key) do update set points=excluded.points, description=excluded.description;
