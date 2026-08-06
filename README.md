# ClimbCycle

App web (PWA) de **periodización de entrenamiento para escalada** (roca / boulder / mixto / competición). A partir de tu objetivo, nivel, grado actual y disponibilidad semanal, arma un macrociclo de 6 o 10 semanas dividido en fases (resistencia, fuerza, potencia, deload), con ejercicios concretos por día, protocolos de dedos con cargas calculadas, tests de evaluación, motor de recuperación (ACWR) y seguimiento de proyectos.

Vanilla JS, **sin framework y sin build step**. Corre 100% en el cliente; sync y crash-reporting son opcionales. Idioma: español (rioplatense). Mobile-first.

## Correr la app

Es un sitio estático — no hay build. Serví la carpeta con cualquier servidor estático y abrí `index.html`:

```bash
npx serve .            # o: python3 -m http.server
```

(Abrir `index.html` con `file://` funciona para casi todo, pero el service worker / PWA requiere `http://`.)

## Tests y lint

```bash
npm test               # node test/run.js  — harness sin navegador (vm), ~300 tests
npm run lint           # ESLint 9 (requiere: npm install)
```

El harness (`test/harness.js`) carga los módulos de lógica en un sandbox `vm` con `localStorage`/`document`/Web Crypto stubbeados, sin navegador. La estrategia es **testear el view-model / motor, no el HTML**. CI (`.github/workflows/ci.yml`) corre tests + lint en cada push.

## Arquitectura (resumen)

Globales cargados por orden de `<script>` en `index.html`. Capas:

```
errors → observability → storage → crypto → auth → data/* → state → events → store →
planner → recovery → tests/intensity/goal → render-* → widgets/projects/timer → sync/coach → pwa → app
```

- **`state.js`** — estado mutable global (`U`, `planMap`, `sessionLog`, `recData`) + persistencia.
- **`store.js`** — `commit(slice)` centraliza *persistir + emitir* (el write path); `events.js` (Bus) hace el fan-out de render.
- **`storage.js`** — dueño único de `localStorage` (prefijo por usuario).
- **`planner.js`** — generación del plan, scheduling (disponibilidad + N/semana espaciados), selección de ejercicios con rotación, ripple de días de roca.
- **`data/*`** — datos estáticos puros (ejercicios, tests, fases, grados…).
- **`errors.js` / `observability.js`** — log central + handlers globales + crash reporting Sentry opcional.

👉 **Detalle completo, decisiones de diseño, estado de cada módulo y próximos pasos: [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md)** (la fuente de verdad de alto nivel).
👉 **Cómo agregar un ejercicio / test / widget: [`CONTRIBUTING.md`](./CONTRIBUTING.md)**.

## Configuración opcional

Copiá `js/sync-config.example.js` → `js/sync-config.js` (git-ignored) y completá lo que uses:

- **Sync en la nube** (Supabase): `CC_SUPABASE_URL` + `CC_SUPABASE_ANON_KEY`. Ver `SYNC_SETUP.md` y `COACH_SETUP.md`.
- **Crash reporting** (Sentry): `CC_SENTRY_DSN`. Vacío = apagado (no carga ningún SDK externo).

Los tres valores son *públicos* (anon key / DSN) — no pongas secretos ahí.

## Estado

Beta técnica: núcleo funcional completo y testeado, **sin usuarios reales todavía**. Falta empaquetado nativo (TWA para Play Store), cifrado en reposo y QA sistemático en dispositivos. Dependencias runtime: **ninguna**.
