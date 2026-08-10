# ClimbCycle

App web (PWA) de **periodización de entrenamiento para escalada** (roca / boulder / mixto / competición). A partir de tu objetivo, nivel, grado actual y disponibilidad semanal, arma un macrociclo de 6 o 10 semanas dividido en fases (resistencia, fuerza, potencia, deload), con ejercicios concretos por día, protocolos de dedos con cargas calculadas, tests de evaluación, motor de recuperación (ACWR) y seguimiento de proyectos.

Vanilla JS, **sin framework y con cero dependencias en runtime**. Corre 100% en el cliente; sync, cifrado y crash-reporting son opcionales. Idioma: español (rioplatense). Mobile-first.

## Correr la app

Es un sitio estático. Serví la carpeta con cualquier servidor y abrí `index.html`:

```bash
npx serve .            # o: python3 -m http.server
```

(Con `file://` funciona casi todo, pero el service worker / PWA necesita `http://`.)

## Tests, lint y build

```bash
npm test               # 487 tests — harness propio, sin navegador ni dependencias
npm run lint           # ESLint 9              (requiere: npm install)
npm run build          # bundle de producción  (requiere: npm install)
```

**`npm test` no necesita `npm install`.** El harness (`test/harness.js`) carga los módulos en un sandbox `vm` con `localStorage`, `document` y Web Crypto stubbeados. La estrategia es testear el **view-model y el motor**, no el HTML — con tres excepciones deliberadas, que son donde aparecieron los bugs más caros:

| Qué | Cómo | Por qué |
|---|---|---|
| **Ancho de la UI** | `test/layout-metrics.js` modela lo mínimo de flexbox y mide el HTML generado contra un móvil de 390 px | Dos bugs reales fueron de *ancho*, no de lógica: un chip rígido que partía el nombre del ejercicio letra por letra, y una nav donde "Calendario" no entraba en su cuota |
| **Sync y modo entrenador** | `test/fake-supabase.js` levanta un servidor que habla el protocolo real (GoTrue + PostgREST, con RLS) y corre **dos dispositivos** simulados | El peor bug del proyecto no estaba en la lógica pura —que tenía tests en verde— sino en la costura con la red |
| **Bundle de producción** | `test/build.test.js` compara el conjunto completo de funciones globales y los ~90 handlers `onclick` del bundle contra los fuentes | Si el minificador renombrara un global, la app cargaría bien y explotaría al primer click |

El **CI** (`.github/workflows/ci.yml`) corre en cada push: tests sin dependencias → lint → build → tests otra vez con `dist/` presente.

Para subir cambios hay un atajo que **verifica antes de commitear** (si los tests fallan, no sube nada):

```powershell
.\subir.ps1                      # mensaje automático con la fecha
.\subir.ps1 "Arreglo el timer"   # mensaje propio
```

## Arquitectura (resumen)

Globales cargados por orden de `<script>` en `index.html`. Capas:

```
errors → observability → storage → crypto → auth → vault → data/* → state → events → store →
planner → recovery → tests/intensity/goal → render-* → widgets/projects/timer → sync/coach → pwa → app
```

- **`state.js`** — estado mutable global (`U`, `planMap`, `sessionLog`, `recData`) + persistencia.
- **`store.js`** — `commit(slice)` centraliza *persistir + emitir* (el write path); `events.js` (Bus) hace el fan-out de render.
- **`storage.js`** — dueño único de `localStorage`: prefijo por usuario + espejo en memoria para el vault.
- **`planner.js`** — generación del plan, scheduling (disponibilidad + N/semana espaciados), selección de ejercicios con rotación, ripple de días de roca.
- **`recovery.js`** — motor de recuperación y **carga interna**: session-RPE de Foster (`duración × RPE`), ACWR de Gabbett, y el punto de entrada único `logSessionDone` por el que pasa toda sesión dada por hecha.
- **`vault.js`** — cifrado en reposo (AES-GCM + PBKDF2, con clave de recuperación). Detrás de flag, apagado por defecto.
- **`data/*`** — datos estáticos puros (ejercicios, tests, fases, grados…), con las fuentes citadas por bloque.

👉 **Detalle completo, decisiones de diseño, estado de cada módulo y próximos pasos: [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md)** (la fuente de verdad de alto nivel).
👉 **Cómo agregar un ejercicio / test / widget: [`CONTRIBUTING.md`](./CONTRIBUTING.md)**.

## Configuración opcional

Copiá `js/sync-config.example.js` → `js/sync-config.js` (git-ignored) y completá lo que uses:

- **Sync en la nube** (Supabase): `CC_SUPABASE_URL` + `CC_SUPABASE_ANON_KEY`. Ver [`SYNC_SETUP.md`](./SYNC_SETUP.md) y [`COACH_SETUP.md`](./COACH_SETUP.md).
- **Crash reporting** (Sentry): `CC_SENTRY_DSN`. Vacío = apagado (no carga ningún SDK externo).
- **Cifrado en reposo**: `CC_VAULT_ENABLED`. Ver la advertencia de abajo.

Los tres valores son *públicos* (anon key / DSN) — no pongas secretos ahí. El archivo entero es opcional: sin él la app arranca igual, con todo eso apagado.

## Cifrado en reposo (experimental)

Los datos se guardan cifrados con tu contraseña; el desbloqueo ocurre al abrir la app. Hay una **clave de recuperación** de 24 caracteres por si la olvidás — sin ella *y* sin la contraseña, los datos son irrecuperables por diseño.

⚠️ **Apagado por defecto.** La lógica está testeada con WebCrypto real, pero todavía no se probó en un navegador, y un fallo acá significa perder el historial. Antes de activarlo, seguí [`QA_VAULT.md`](./QA_VAULT.md) **con datos de prueba**.

## Estado

Beta técnica: núcleo funcional completo y testeado, **sin usuarios reales todavía**.

Lo que falta para producción: **QA en dispositivo real** (la medición de ancho es una estimación, no reemplaza mirar un teléfono), correr el e2e de sync contra un Supabase de verdad (`npm run test:live`), y empaquetado nativo (TWA para Play Store).

Dependencias en runtime: **ninguna**. Las de desarrollo son sólo ESLint y esbuild.
