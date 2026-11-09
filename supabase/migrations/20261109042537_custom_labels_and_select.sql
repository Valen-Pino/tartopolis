-- Unify labels without changing existing scores, ranges, or votes.
update public.achievements set title = 'Custom Positiva' where slug in ('custom-positiva','boludez');
update public.achievements set title = 'Custom Negativa' where slug = 'custom-negativa';
