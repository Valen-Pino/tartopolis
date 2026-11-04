-- Incluir +1 / -1 según la polaridad, también para votaciones ya abiertas.
-- No modifica votos existentes ni puntajes ya resueltos.
update achievements
set minimum_points = least(minimum_points, 1),
    maximum_points = greatest(maximum_points, 1)
where kind = 'subjective' and score_mode = 'range' and polarity = 'positive';

update achievements
set minimum_points = least(minimum_points, -1),
    maximum_points = greatest(maximum_points, -1)
where kind = 'subjective' and score_mode = 'range' and polarity = 'negative';
