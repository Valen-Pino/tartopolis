# Tartópolis 2027

Aplicación privada para seguir la cuenta regresiva del viaje, el ranking OVR y
las Hazañas del grupo.

## Puesta en marcha

1. Crear un proyecto en Supabase.
2. Ejecutar `supabase/migrations/001_initial_schema.sql` en el SQL Editor.
3. Ejecutar `supabase/seed.sql` en el SQL Editor.
4. Copiar `.env.example` a `.env.local` y completar las variables.
5. Ejecutar `pnpm install` y luego `pnpm dev`.
6. Con la app desplegada, ejecutar `pnpm access-links` para generar los enlaces personales.

Los enlaces personales equivalen a una contraseña: deben enviarse en privado.
El servidor guarda únicamente su hash y crea una cookie de sesión segura en el
primer ingreso.

## Comandos

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
pnpm access-links
```

## Decisiones iniciales de votación

- Los 12 participantes pueden votar, incluidos acusador y acusado.
- Una Hazaña se aprueba cuando obtiene más de la mitad de los participantes activos.
- Se rechaza cuando ya no es matemáticamente posible alcanzar esa mayoría.
- En Hazañas variables, el puntaje final es el promedio redondeado de los puntajes
  propuestos por los votos favorables.

Estas reglas están centralizadas en la función SQL `cast_achievement_vote` para
que puedan cambiarse sin rehacer la interfaz.
