# Plan de Partido

App para preparar y analizar partidos de fútbol:

- **Páginas**: plantilla, equipos y partidos.
- **Detalle de partido**: informe del rival, alineación con arrastrar y soltar, plan de partido, ABP y eventos sobre vídeo.
- **Extras**: exportación a PDF, recorte de clips e IA simulada.

**Stack:** React 18 + Vite, Tailwind, Zustand, Supabase (Postgres, Auth, Storage) y Vercel.

## Probar sin configurar nada

```bash
npm install
npm run dev
```

Abre http://localhost:5173 y pulsa **Ver demo**. Los datos de ejemplo se cargan en memoria y no se guarda nada.

## Configurar Supabase

1. Crea un proyecto nuevo en https://supabase.com.
2. En **SQL Editor**, pega y ejecuta `supabase/setup.sql` (junta las tres migraciones). También puedes ejecutarlas por separado en este orden:
   - `supabase/migrations/0001_schema.sql`: tablas y trigger de alta de usuarios.
   - `supabase/migrations/0002_rls.sql`: permisos (lectura para quien tenga sesión, escritura solo para admin).
   - `supabase/migrations/0003_storage.sql`: bucket privado `media` para imágenes.
3. En **Authentication → Sign In / Providers**, desactiva **Allow new users to sign up**. Así solo entra quien tú invites.
4. En **Authentication → Users**, pulsa **Add user** (o **Invite**) y crea tu usuario. Pon la contraseña ahí, nunca en el código.
5. Conviértete en admin ejecutando esto en el SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'tu-email@ejemplo.com';
   ```
   Todos los demás usuarios serán **viewers** (solo lectura).
6. Copia `.env.example` a `.env.local` y rellena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (están en **Project Settings → API**).
   - `.env.local` está en `.gitignore`.
   - **Nunca uses la `service_role` key en el cliente.**
7. Ejecuta `npm run dev`, entra con tu usuario y usa **Plantilla de ejemplo** si quieres datos de prueba.

## Desplegar en Vercel

1. Importa el repositorio en Vercel. Detectará Vite.
2. En **Settings → Environment Variables** añade:
   - `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, que usa el navegador.
   - `SUPABASE_URL` y `SUPABASE_ANON_KEY`, que usa la función `/api/clip` para comprobar la sesión.
   - `VIMEO_ACCESS_TOKEN`, solo si quieres clips de Vimeo. Necesita un plan Pro con permiso de descarga.

## Seguridad

| Problema en el original | Cómo se resuelve aquí |
|---|---|
| `.env` con claves subido al repo | `.gitignore` excluye `.env*`. Solo se sube `.env.example`, vacío. |
| Contraseñas (`DEMO123`) en un SQL | No hay credenciales en el código. Los usuarios se crean en el panel de Supabase. |
| Cualquier usuario con sesión podía escribir en `teams` | RLS en todas las tablas: escritura solo si `is_admin()`. |
| Un viewer podía cambiarse el rol a admin | `profiles` no tiene política de UPDATE para viewers y un trigger bloquea los cambios de rol. |
| Bucket de imágenes abierto a subidas anónimas | El bucket es privado: se lee con sesión y solo un admin escribe. Tiene límite de tamaño y de tipos de archivo. |
| `/api/clip` sin autenticación | Exige un JWT válido de Supabase y solo acepta URLs `https` de YouTube o Vimeo. Duración máxima de 120 s. |
| Sin acceso para usuarios sin sesión | El rol `anon` no puede leer nada. |

> Si usabas el proyecto Supabase del repositorio original, **cambia sus claves** (Project Settings → API → *Reset*). Su `.env` es público.

La UI oculta los botones de edición a los viewers, pero quien protege de verdad los datos es RLS.

## IA

`src/services/ai/index.js` es el único punto de entrada.

- Por defecto usa `mockProvider`, que da respuestas de plantilla. Se marcan como **simulada** en la UI.
- Para conectar un modelo real:
  1. Crea `api/ai.js`. Debe verificar el JWT igual que `api/clip.js`, llamar al modelo con una clave guardada en una variable de servidor (sin prefijo `VITE_`) y devolver el mismo formato JSON que `mockProvider`.
  2. Pon `VITE_AI_PROVIDER=claude`. `claudeProvider.js` ya llama a `/api/ai`.

## Clips de vídeo

`/api/clip` descarga el vídeo y corta ±8 s alrededor del evento con ffmpeg (`-c copy`).

Limitaciones:

- YouTube usa `@distube/ytdl-core`, que se rompe a menudo cuando YouTube cambia algo.
- Vercel limita la duración de las funciones (60 s configurados) y el tamaño de las respuestas, así que funciona mejor con vídeos cortos o de baja resolución.
- En modo demo no está disponible.

## Estructura

```
api/clip.js                 función serverless (recorte de clips)
supabase/migrations/        esquema, RLS y storage
src/
  store/useStore.js         estado global (Zustand) + modo demo en memoria
  services/                 db, storage, videoClip, ai/, pdf/
  components/               UI, campo, reproductor, multimedia
  pages/                    Plantilla, Equipos, Partidos, detalle
  pages/partido/            InformeRival, Alineacion, PlanPartido, ABP, Eventos
```
