# Tartópolis 2027

Portada pública con ranking OVR y cuenta regresiva del viaje. Para cargar Hazañas,
votar y acceder a perfiles se requiere una cuenta personal, sin correo electrónico.

## Puesta en marcha

1. Crear un proyecto en Supabase.
2. Ejecutar las migraciones SQL de `supabase/migrations` en orden.
3. Ejecutar `supabase/seed.sql` solamente para una base nueva.
4. Copiar `.env.example` a `.env.local` y completar las variables.
5. Ejecutar `pnpm install` y luego `pnpm dev` (Node.js 22.18 o posterior).

## Actualizar el sitio existente

1. Aplicar `supabase/migrations/002_password_accounts.sql` en el SQL Editor de
   Supabase. La migración conserva participantes, apodos, votos y puntajes. Revoca
   los enlaces de acceso anteriores. No volver a ejecutar el seed.
2. Publicar esta versión en Vercel con las mismas variables de entorno. Verificar
   que el proyecto de Supabase esté activo y su dirección sea la correcta.
3. Configurar `NEXT_PUBLIC_APP_URL=https://tartopolis.vercel.app` en `.env.local`
   antes de generar invitaciones para el sitio publicado.
4. Ejecutar `pnpm access-links`. Genera invitaciones para los participantes activos
   que todavía no tienen contraseña y las guarda en un archivo privado
   `invitation-links-<fecha>.txt`, excluido de Git.
5. Enviar a cada persona solamente su propio enlace por WhatsApp. No se envían
   mensajes automáticamente ni se guardan teléfonos.

La migración y la publicación deben realizarse en una misma ventana de
mantenimiento: esta versión requiere las tablas y funciones nuevas.

## Registro e ingreso

- La portada `/` es pública y muestra el ranking completo y la cuenta regresiva.
- `/acceso` permite elegir participante e ingresar la contraseña.
- `/registro` explica cómo obtener la invitación personal del organizador.
- `/invitacion/<token>` muestra el nombre asociado y permite definir y confirmar
  la contraseña. No se puede seleccionar otra identidad.
- Las invitaciones vencen en 7 días y solo se consumen al guardar la contraseña;
  abrirlas o generar una vista previa en WhatsApp no las consume.
- Un segundo envío del mismo formulario no puede volver a usar la invitación.
- La contraseña requiere entre 10 y 128 caracteres. Se guarda su hash scrypt con
  sal aleatoria; nunca se guarda la contraseña original.
- La sesión dura hasta 90 días. Al vencer, se vuelve a ingresar con la contraseña.
  Las sesiones anteriores a esta actualización no sirven para acceder a funciones.
- Los perfiles y las acciones de votación se verifican en el servidor. Los hashes
  y las funciones de administración no están disponibles para el navegador.
- Se permiten 10 intentos de ingreso por participante cada 15 minutos. El límite
  se guarda en la base y funciona entre distintas instancias del sitio.

## Invitación individual y restablecimiento manual

```bash
pnpm access-links <slug>
pnpm access-links --reset <slug>
```

El `slug` es el identificador del participante existente en `participants`.
La primera variante sirve para crear una cuenta. La segunda sirve para alguien
que ya tiene contraseña y te pidió restablecerla. Ambas guardan el enlace en un
archivo privado y reemplazan los enlaces pendientes de esa persona.

Al generar un restablecimiento se invalidan inmediatamente las sesiones y la
contraseña anteriores. El participante debe abrir el enlace nuevo y elegir su
contraseña. El enlace no permite cambiar el apodo, los votos ni el puntaje. Si
vence o se pierde, se puede emitir otro. No hay flujo automático de recuperación.

## Verificación

```bash
pnpm lint
pnpm typecheck
pnpm test:accounts
pnpm build
```

`test:accounts` ejecuta las migraciones en PostgreSQL embebido y comprueba registro,
consumo único, vencimiento, revocación, restablecimiento, invalidación de sesiones,
límites de ingreso y permisos. No usa ni modifica la base real.

## Reglas de votación

- Los 12 participantes pueden votar, incluidos acusador y acusado.
- Una Hazaña se aprueba cuando obtiene más de la mitad de los participantes activos.
- Se rechaza cuando ya no es matemáticamente posible alcanzar esa mayoría.
- En Hazañas variables, el puntaje final es el promedio redondeado de los puntajes
  propuestos por los votos favorables.

Estas reglas están centralizadas en la función SQL `cast_achievement_vote`.
