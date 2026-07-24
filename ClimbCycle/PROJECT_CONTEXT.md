# PROJECT_CONTEXT.md — ClimbCycle

> **Propósito de este archivo:** memoria permanente del proyecto. Está pensado para que en futuras conversaciones no haga falta re-analizar todo el código. Si sos un modelo leyendo esto: confiá en este documento como fuente de verdad de alto nivel, y solo abrí archivos puntuales cuando necesites detalle de implementación. Mantenelo actualizado al cerrar cada sesión.
>
> **Última actualización:** 2026-07-24 (sesión "Bloque A — estabilizar") · **Estado:** Beta técnica avanzada · **Tests:** 252 pasando (21 archivos) · **LOC:** ~8.380 JS + ~2.870 CSS + ~580 HTML.
>
> **Cambios de la última sesión (Bloque A):** (1) `js/errors.js` — log central + handlers globales (`window.onerror`/`unhandledrejection`) + reporter pluggable (hook para Sentry, sin DSN todavía); catches de cara al usuario (import/export/backup/auth/ics/sync) ahora avisan por toast en vez de tragar el error. (2) Harness con soporte **async** + Web Crypto → se testean por primera vez `crypto.js` y `auth.js`. (3) +37 tests: `errors`, `persistence`, `crypto` (round-trip/tamper/wrong-key), `auth` (hash/migración/aislamiento). (4) a11y: `--text-muted` y `--text-secondary` (oscuro) ahora cumplen WCAG AA; piso de fuente subido a 11px. (5) CI (GitHub Actions) + ESLint (0 errores) en cada push; 2 bugs `no-redeclare` corregidos.

---

## 0. Mapa rápido (TL;DR para arrancar rápido)

- **Qué es:** app web (PWA) de **periodización de entrenamiento para escaladores**. Vanilla JS, sin framework, sin build step. Corre 100% en el cliente; sync opcional con Supabase.
- **Entrypoint real:** `ClimbCycle/index.html` (carga 39 `<script src>` + 1 inline anti-FOUC, en orden). ⚠️ Existe un archivo viejo `Climbing/ClimbCycle_v5.html` (single-file, mayo 2026) **que NO tiene ninguna de las features nuevas** — es un huérfano, ignoralo o borralo.
- **Cómo correr tests / lint:** `node test/run.js` (o `npm test`) y `npm run lint` (ESLint 9, requiere `npm install`). Harness sin navegador (`test/harness.js`) que carga los módulos de lógica en un sandbox `vm`; ahora soporta tests **async** y expone `loadSecureApp()` (crypto+auth aislados, con Web Crypto). CI en `.github/workflows/ci.yml` corre ambos en cada push.
- **Arquitectura en una frase:** variables y funciones globales cargadas por orden de `<script>`; estado mutable en `state.js`; datos estáticos en `js/data/*`; render por concatenación de strings a `innerHTML`; bus de eventos mínimo (`events.js`) para desacoplar mutación de repintado.
- **Madurez:** funciona de punta a punta, con buena cobertura de lógica pura. NO está listo para producción pública (ver §10, §13). Es un proyecto **solo-dev, pre-usuarios**.

---

## 1. Objetivo de la aplicación

**Qué hace.** ClimbCycle genera y gestiona un **macrociclo de entrenamiento periodizado** para escalada (roca/boulder/mixto/competición). A partir del objetivo, nivel, grado actual, grado meta y disponibilidad semanal del usuario, arma un plan de 6 o 10 semanas dividido en fases (resistencia, fuerza, potencia, deload) con ejercicios concretos por día, protocolos de dedos con cargas calculadas, tests de evaluación, un motor de recuperación (check-in diario + carga aguda/crónica), seguimiento de proyectos (vías/bloques), un temporizador de intervalos tipo Grippy, y export/sync.

**Problema que resuelve.** La periodización seria (Bompa, Horst, Barrows, Lattice) es conocimiento de nicho: la mayoría de escaladores entrena sin estructura, sin respetar tiempos de recuperación de tendones/SNC, sin medir progreso ni variar el estímulo por fase. ClimbCycle codifica ese conocimiento y lo entrega como un plan accionable y auto-ajustable, con la ciencia citada por bloque.

**Público objetivo.** Escaladores **intermedios a avanzados** (grados ~6a–8a) que ya entrenan y quieren estructura. Secundariamente principiantes (el plan los protege: sin campus ni max hangs intensos) y entrenadores (modo coach de solo lectura). Idioma: **español (rioplatense)**. Uso primario: **móvil** (diseño mobile-first).

**Estado actual del desarrollo.** Núcleo funcional completo y testeado. Se sumó en la última tanda: cifrado de backups, modo entrenador, PWA+notificaciones, gráficas de progreso, export .ics, sistema de proyectos, temporizador, calendario de frecuencia variable, y fecha de test en onboarding. Falta pulido de producción (a11y de contraste, empaquetado nativo, cifrado en reposo, observabilidad).

**Nivel de madurez: Beta técnica.** Más que un MVP (tiene mucha profundidad de dominio y features), pero por debajo de "Producción" (sin usuarios reales, sin analytics/crash-reporting, sin empaquetado para tienda, con deuda de a11y y seguridad-en-reposo). No probado en dispositivos reales de forma sistemática.

---

## 2. Arquitectura

### 2.1 Estructura de carpetas

```
ClimbCycle/
├── index.html            # shell único: onboarding (#vob) + app (#vapp) + modales. 38 <script> en orden.
├── manifest.json         # PWA (standalone, iconos, theme)
├── sw.js                 # service worker (NETWORK-FIRST + fallback cache offline)
├── icon.svg / icon-192.png / icon-512.png / icon-maskable.png
├── css/app.css           # ~2.870 líneas, un solo archivo, variables CSS + temas claro/oscuro
├── package.json          # scripts test+lint; devDeps: eslint (runtime: NINGUNA)
├── eslint.config.js      # ESLint 9 flat config (no-undef off por arquitectura global; caza bugs reales)
├── README.md             # ⚠️ 2 líneas (deuda de documentación)
├── SYNC_SETUP.md         # SQL/instrucciones de Supabase para sync
├── COACH_SETUP.md        # SQL/RLS/RPC de Supabase para modo entrenador
├── PROJECT_CONTEXT.md    # este archivo
├── js/
│   ├── data/             # DATOS ESTÁTICOS puros (troceados del viejo god-file data.js)
│   │   ├── labels.js         # GLBL, LLBL, DLG
│   │   ├── glossary.js       # GLOSSARY, SYS_HUMAN
│   │   ├── training-constants.js  # BLOCK_FATIGUE, MIN_GAP_H, SL_RPE_LABELS
│   │   ├── grades.js         # GRADES, GRADE_ORDER, gradeIndex(), gradeLevel()
│   │   ├── test-defs.js      # TESTS[] (datos puros; SIN interpret)
│   │   ├── blocks.js         # BLOCKS, BSCI (textos científicos por fase)
│   │   ├── exercises.js      # EX, SS_META, EX_POOL (pool principal de ejercicios)
│   │   ├── sessions.js       # UNIVERSAL_WARMUP, SESSION_STRUCTURE, WEEK_PROGRESSION, SUPP_CONTENT
│   │   ├── protocols.js      # HBP, FINGER_PROTOCOLS, FINGER_GUIDELINES
│   │   ├── ranges-meta.js    # TEST_RANGES, REC_META, SYS_HUMAN
│   │   └── levels.js         # LEVEL_PROFILES (secuencias de fase por nivel+objetivo)
│   ├── data.js           # ⚠️ STUB de 2 líneas (el mount no permitió borrarlo; ya no se carga)
│   ├── errors.js         # log central + handlers globales (window.onerror/unhandledrejection) + reporter pluggable (Sentry-ready)
│   ├── crypto.js         # PBKDF2 + AES-GCM (WebCrypto)
│   ├── auth.js           # auth local, hashing, prefijo de claves por usuario
│   ├── state.js          # ESTADO GLOBAL (U, planMap, sessionLog, recData…) + persistencia + backup
│   ├── events.js         # Bus pub/sub mínimo + wireBus() (fan-out de render)
│   ├── planner.js        # generación del plan, scheduling, selección de ejercicios, rock days
│   ├── recovery.js       # motor de recuperación + ACWR + check-in + logger de sesiones
│   ├── test-interpret.js # interpretación de tests (funciones puras, extraídas de los datos)
│   ├── tests.js          # dashboard de tests + gráficas (buildTestChartModel/renderTestChart) + fachada runInterpret
│   ├── intensity.js      # tests → cargas concretas (kg) + calibración
│   ├── ics.js            # export del plan a iCalendar (.ics)
│   ├── goal.js           # motor de objetivo (grado meta → capacidades a priorizar)
│   ├── render-utils.js   # helpers de UI (escapeHtml, ring, toast, confirmDialog, glosario, macrociclo)
│   ├── a11y.js           # helpers de accesibilidad (clickable, focus-trap, tablist, slider)
│   ├── render-onboarding.js / render-calendar.js / render-home.js / render-week.js / render-plan.js / render-profile.js
│   ├── widgets.js        # dashboard de inicio configurable (registro de widgets) + protocolos de dedos
│   ├── projects.js       # sistema de proyectos (CRUD puro + widget)
│   ├── timer.js          # temporizador de intervalos (motor puro + UI)
│   ├── sync-config.js / sync-config.example.js  # credenciales Supabase (git-ignore el real)
│   ├── sync.js           # capa de sync (Supabase vía fetch)
│   ├── coach.js          # modo entrenador (Supabase + vista read-only)
│   ├── pwa.js            # registro SW + notificaciones locales + buildReminder puro
│   └── app.js            # init, navegación (goPage), arranque
└── test/                 # 21 archivos *.test.js + harness.js (async + loadSecureApp) + assert.js (flush) + run.js
(repo root: .github/workflows/ci.yml — corre tests + lint en cada push)
```

### 2.2 Módulos y capas (orden de carga real)

El orden importa porque son globales por `<script>`. De arriba a abajo en `index.html`:

```
errors → crypto → auth → data/* (11) → state → events → planner → recovery →
test-interpret → tests → intensity → render-utils → a11y → ics →
render-onboarding → render-calendar → render-home → render-week →
render-plan → render-profile → goal → widgets → projects → timer →
sync-config → sync → coach → pwa → app
```
> `errors.js` carga **primero** (zero-dep) para que todo módulo pueda llamar `logError()`. `installGlobalErrorHandlers()` se engancha en el init de `app.js`.

Capas conceptuales:
1. **Cripto/Auth** (crypto, auth) — hashing y aislamiento por usuario.
2. **Datos** (data/*) — tablas estáticas, sin funciones ni DOM (salvo grades.js que tiene 2 helpers puros).
3. **Estado + persistencia** (state) — singletons mutables + localStorage.
4. **Bus** (events) — desacople mutación↔render.
5. **Dominio puro** (planner, recovery, test-interpret, intensity, goal, projects, timer, ics) — la mayoría testeable sin DOM.
6. **Render** (render-*, widgets, a11y, tests dashboard) — strings → innerHTML.
7. **Nube** (sync, coach) — Supabase opcional, no-op sin configurar.
8. **Plataforma** (pwa) — service worker + notificaciones.
9. **App** (app) — init + navegación.

### 2.3 Flujo de datos

- **Config del usuario** vive en `U` (state.js): objetivo, nivel, grado, meta, días de gym/roca, peso, etc.
- **`generatePlan()`** (planner) lee `U` + `LEVEL_PROFILES` y construye `planMap` (dateString → `{block, week, …}`). La secuencia de fases sale de `getPlanSeq()` (memoizada, reponderada por el grado meta vía `applyGoalFocusToSeq`).
- **Selección de ejercicios**: perezosa. `getExercisesForDay()` llama `selectExercises(block, dateStr, n)` (slot-composition + rotación intra-semana + semilla determinista por fecha) y cachea en `planMap[date].exercises`.
- **Render**: cada pantalla lee el estado global y produce HTML por concatenación. Mutaciones → `Bus.emit('cc:planChanged'|'cc:sessionChanged')` → `wireBus()` repinta el set de vistas correspondiente. Cada acción conserva su propia lógica de `showDayPanel`/`hcSel`.
- **Tests → plan**: los resultados de test (`cc_tests`) alimentan (a) `intensity.js/getCategoryLoad` que imprime kg objetivo en las tarjetas de fuerza, y (b) `goal.js/computeGoalPlan` que reordena el macrociclo hacia la capacidad más débil.
- **Recuperación**: `calcRecovery()` combina la última sesión (tiempo+RPE+tipo) con el modelo ACWR (`computeACWR()` sobre `cc_logs`) + modificadores de sueño/dolor/fatiga.

### 2.4 Estado global

Definido en `state.js` como variables mutables globales:
- `U` — configuración/perfil del usuario (persistido en `cc_user`).
- `planMap` — el plan generado (persistido "slim" en `cc_plan`, sin los arrays de ejercicios).
- `sessionLog` — estado por día (done/fail/moved) (`cc_sl`).
- `recData` — datos del último check-in de recuperación (`cc_rec`).
- `ciState`, `slState`, `hcSel`, `wkOff`, `lastExUsed`, `exShowSci`, `TODAY`, etc. — estado de UI/efímero.
- **No hay store con getters/setters**: cualquier módulo lee/escribe estas globales directamente. Tras mutar hay que llamar a `saveX()` y emitir/repintar (convención implícita, no forzada).

### 2.5 Almacenamiento

- **localStorage**, con **prefijo por usuario** inyectado por `auth.js` (que sobreescribe `localStorage.getItem/setItem/removeItem`): `cc_plan` → `cc_<usuario>_plan`. Claves de auth (`cc_users`, `cc_current_user`) NO se prefijan. Claves de sync (`ccsync_*`) tampoco (globales al dispositivo).
- Claves de datos: `cc_user, cc_plan, cc_sl, cc_logs, cc_tests, cc_rec, cc_lastex, cc_theme, cc_projects, cc_widgets, cc_notif, cc_notif_last, cc_exmode`.
- **Backups**: `exportUserData()` (JSON plano) y `downloadEncryptedBackup(pass)` (AES-GCM). Import detecta cifrado vs plano.
- ⚠️ **Los datos en reposo están en texto plano.** El "login" solo cambia el nombre de la clave, no cifra nada (ver §10, §16).

### 2.6 Autenticación

- **Local, por dispositivo.** `registerUser/loginUser` (auth.js). Password hasheada con **PBKDF2-SHA256 (150k iteraciones)** vía crypto.js, con **migración automática** desde el SHA-256 de una pasada anterior (al primer login exitoso). Fallback seguro a SHA-256 si crypto.js no cargara.
- Aislamiento de datos = **prefijo de clave**, no cifrado. Cualquiera con acceso al dispositivo lee los datos por DevTools.
- No hay recuperación de contraseña (es local). Multi-usuario en el mismo dispositivo, sí.

### 2.7 Navegación

- **SPA por toggle de clases.** `goPage(id)` muestra `#p<id>` y marca el botón de nav (`aria-current`). Páginas: `home, semana, cal, plan, profile` (+ `nutri` referenciado). Onboarding (`#vob`, wizard de 7 pasos) vs app (`#vapp`).
- Modales por clase `.on` (check-in, log de sesión, mover, quick-actions, editar, config de widgets, auth), con focus-trap (a11y.js) en los principales. El temporizador crea su propio overlay full-screen.

### 2.8 Sincronización

- **Supabase opcional** (sync.js), vía `fetch` a GoTrue (auth) y PostgREST (REST). **No-op hasta configurar** `sync-config.js`.
- Tabla `climbcycle_state(user_id, bundle jsonb, updated_at)` con RLS. El "bundle" es el mismo formato del backup.
- **Resolución de conflictos** por timestamp (`syncResolve`: pull/push/insync). Auto-push con debounce al cambiar datos. Pull al iniciar.
- **Modo entrenador** (coach.js) reusa la plomería de sync: `coach_shares` (código de un solo uso), `coach_links` (enlace aceptado), RLS que deja al coach leer la fila del atleta, y RPC `redeem_coach_share` (SECURITY DEFINER). Vista **solo lectura** (`buildCoachView`). Requiere correr el SQL de COACH_SETUP.md.

### 2.9 Componentes principales

- **Onboarding wizard** (render-onboarding): 7 pasos; diagnóstico rápido finger+pull con **fecha del test**; quickstart.
- **Home configurable** (widgets.js): registro de widgets (glance, next, today, recovery, goal, stats, plan, todaylist, fingers, projects, timer) reordenables/toggleables ("Personalizar").
- **Day panel** (render-home/showDayPanel): la vista detallada del día — la función más pesada del código.
- **Motor de recuperación** (recovery) con check-in + ACWR + alerta preventiva de lesión.
- **Dashboard de tests** (tests.js) con gráfica de progreso (SVG) + bandas de rango.
- **Temporizador** (timer.js) integrado con protocolos de dedos.
- **Proyectos** (projects.js) con intentos fechados y progreso.

---

## 3. Tecnologías utilizadas

| Tecnología | Uso | Por qué se eligió | Posible reemplazo futuro |
|---|---|---|---|
| **Vanilla JS (ES5-ish)** | Todo | Cero dependencias, cero build, portable, carga instantánea | Migrar a ESM + esbuild/Vite (sin cambiar el estilo) para eliminar el orden de `<script>` y el namespace global |
| **HTML/CSS plano** | UI | Simplicidad; un solo `app.css` con variables | Tailwind o CSS modules si crece el equipo |
| **WebCrypto (SubtleCrypto)** | PBKDF2 + AES-GCM | Nativo, sin librerías, robusto | — (es el estándar) |
| **localStorage** | Persistencia | Simple, síncrono, offline | IndexedDB si se necesita async/cifrado en reposo o >5MB |
| **Supabase (GoTrue + PostgREST)** | Sync + coach | Backend-as-a-service con RLS; se habla por `fetch` puro sin SDK | Firebase/PocketBase; o edge functions propias si crece |
| **Service Worker + Web App Manifest** | PWA/offline | Instalable + offline sin store | — |
| **Node `vm` (test harness propio)** | Tests | Correr la lógica sin navegador ni deps | Vitest/Jest + jsdom si se quiere cobertura de render |
| **`assert.js` propio (describe/it/expect)** | Framework de test | Zero-dep, síncrono | Vitest |

**Dependencias runtime: NINGUNA.** `package.json` solo tiene scripts de test. Esto es una fortaleza (superficie mínima, sin supply-chain) y una limitación (todo a mano).

---

## 4. Decisiones importantes de diseño

1. **Sin framework, sin build.** *Ventaja:* simplicidad extrema, carga instantánea, cero mantenimiento de toolchain, fácil de razonar archivo por archivo. *Desventaja:* namespace global, dependencia del orden de `<script>`, sin tree-shaking, sin componentes reactivos, cache-busting manual (`?v=`). *Descartado:* React/Vue (overkill para un solo dev, añade build). Se aceptó la deuda a cambio de velocidad.
2. **Datos ≠ lógica.** El god-file `data.js` (1.190 líneas) se troceó en `js/data/*` (11 módulos temáticos) y las funciones `interpret()` de los tests se extrajeron a `test-interpret.js` (puras, testeables). *Ventaja:* datos serializables puros, lógica aislada. *Motivación:* el review externo lo marcó como la violación #1.
3. **Bus de eventos mínimo** en vez de framework reactivo. *Ventaja:* desacopla las ~8 "action functions" de sus renders (antes cada una listaba a mano 3-5 renderers). *Desventaja:* sigue habiendo re-render total por región, no diffing.
4. **Lógica pura + verificación por harness `vm`.** La estrategia de test es "no testear el HTML, testear el view-model/motor". *Ventaja:* 215 tests rápidos sin DOM. *Desventaja:* la capa de render queda sin test automatizado.
5. **Render por `innerHTML` + estilos inline.** *Ventaja:* directo, sin plantillas. *Desventaja:* superficie XSS, funciones gigantes (showDayPanel), duplicación de tarjetas, coste de perf. Se mitigó XSS con `escapeHtml` en campos de usuario y se unificó parcialmente la tarjeta de ejercicio.
6. **Auth local por prefijo de clave, no cifrado.** *Decisión pragmática* para MVP offline. *Riesgo asumido:* datos en claro (ver §16).
7. **Sync como capa aditiva no-op.** La app funciona 100% offline; la nube es opcional. *Ventaja:* no bloquea a usuarios sin cuenta. *Consecuencia:* el modo entrenador comparte el bundle completo (choca con cifrado en reposo — decisión documentada).
8. **Frecuencia semanal variable por fase** (última tanda): el usuario marca disponibilidad y el plan hace taper de volumen (Barrows). *Ventaja:* periodización correcta + "3 y 2 según la semana". *Alternativa descartada:* edición manual por semana (más fricción; igual existe como fallback per-day).
9. **PWA network-first** (no cache-first). *Motivación:* el cache-first servía assets viejos en desarrollo. *Trade-off:* leve coste de red a cambio de frescura garantizada; offline sigue con fallback a cache.

---

## 5. Estado de cada módulo

| Módulo | Estado | Notas |
|---|---|---|
| `data/*` (11) | ✅ Terminado | Datos puros, byte-verificados en el split. Los rangos de test podrían citar fuente numérica exacta. |
| `errors.js` | ✅ Terminado | Nuevo. Log central + ring buffer + handlers globales + reporter pluggable. Testeado (7 tests). Reporter de Sentry: falta wirear el DSN. |
| `crypto.js` | ✅ Terminado | Ahora **testeado en el harness** (round-trip, tamper, wrong-key, determinismo de hash) — antes era verificación manual. |
| `auth.js` | ✅ Terminado (funcional) | PBKDF2 + migración, ahora **testeado** (getUserKey/aislamiento, register/login, migración SHA-256→PBKDF2). Sigue monkey-patcheando `localStorage` (frágil, deuda pendiente). |
| `state.js` | 🟡 Necesita refactor | Persistencia ahora **testeada** (round-trips + collect/import). Sigue siendo estado global mutable sin encapsular; candidato a `store.js`. |
| `events.js` | ✅ Terminado | Bus mínimo, testeado. |
| `planner.js` | ✅ Terminado / 🟡 funciones largas | `generatePlan`, `selectExercises`, scheduling y `sessionsForPhase` OK y testeados. `selectExercises` podría usar mejor el historial (`lastExUsed` casi no se lee). |
| `recovery.js` | ✅ Terminado | Motor + ACWR testeado. Mezcla motor puro con DOM (check-in/logger). |
| `test-interpret.js` | ✅ Terminado | Extraído y testeado (5 intérpretes). |
| `tests.js` | 🟡 Parcial | Dashboards y gráficas OK. Sigue siendo una función-god (`buildTsTab`, `makeTestDashboard`) con mucho HTML inline. |
| `intensity.js` | ✅ Terminado | tests→kg, testeado. |
| `goal.js` | ✅ Terminado | Motor de objetivo testeado. |
| `ics.js` | ✅ Terminado | Export .ics testeado (RFC 5545). |
| `projects.js` | ✅ Terminado | CRUD puro testeado + widget. |
| `timer.js` | ✅ Terminado | Motor puro testeado (incl. prep). UI sin test (DOM). |
| `render-utils.js` | 🟡 OK con deuda | Buenos helpers (escapeHtml, confirmDialog, glosario) + `renderMacrocycleSummary` (largo). |
| `a11y.js` | ✅ Terminado (tanda 1+2) | Falta auditoría de contraste/tamaños. |
| `render-home.js` | 🟠 Necesita refactor | `showDayPanel` ~360 líneas; se extrajo `renderProgressionBadge` pero falta descomponer el resto. |
| `render-week.js` / `render-plan.js` / `render-calendar.js` / `render-profile.js` / `render-onboarding.js` | 🟡 OK con duplicación | La tarjeta de ejercicio está replicada en varias (deuda). |
| `widgets.js` | ✅ Terminado | Registro de widgets = el punto de extensión más limpio del código. |
| `sync.js` | 🟡 Funcional, sin e2e | Correcto por construcción; **nunca probado contra un Supabase real** desde aquí. Resolución de conflictos por timestamp (simplista). |
| `coach.js` | 🟡 Experimental | Lógica pura testeada; red sin e2e; depende del SQL de COACH_SETUP.md. v1 solo lectura. |
| `pwa.js` | 🟡 Funcional con límite | Notificaciones solo al abrir la app (no background real). |
| `app.js` | ✅ Terminado | Init + navegación. |
| `data.js` (stub) | 🗑️ Deuda cosmética | 2 líneas; no se carga; el mount no permitió borrarlo. |

---

## 6. Funcionalidades implementadas

- Onboarding de 7 pasos + quickstart; diagnóstico rápido finger/pull **con fecha del test**.
- Generación de macrociclo (6/10 semanas) por nivel + objetivo, reponderado por grado meta.
- **Frecuencia semanal variable por fase** según disponibilidad (taper de volumen).
- Selección de ejercicios por composición de slots + rotación + semilla determinista.
- Pool de ejercicios rico (warmup/strength/power/endurance/deload) con "cómo hacerlo", tips, errores, ciencia.
- Progresión intra-fase con **carga objetivo en kg** derivada de los tests (Max Hang / 3RM).
- Protocolos de dedos (Lattice/Eva López) con cargas calculadas.
- **Temporizador de intervalos** (series/reps/trabajo/descansos + **preparación 10s**), integrado con protocolos + kg, con pitidos/vibración.
- Motor de recuperación: check-in + score + interpretación + **ACWR (carga aguda:crónica)** + alerta preventiva de lesión.
- Tests de evaluación (5) con interpretación, dashboard y **gráfica de progreso (SVG con bandas de rango)**.
- Motor de objetivo (grado meta → capacidades prioritarias + ejercicios).
- Días de roca con "ripple" (ajuste de días adyacentes) + edición manual por día.
- Sistema de **proyectos** (vías/bloques) con intentos **fechados**, estado y progreso.
- Auth local multi-usuario (PBKDF2).
- Backup export/import + **backup cifrado (AES-GCM)**.
- Export del plan a **.ics** (calendario).
- **Sync** opcional con Supabase (conflictos por timestamp).
- **Modo entrenador** (compartir datos read-only vía código + RLS).
- **PWA** instalable + offline (SW network-first) + **notificaciones locales** opt-in.
- **Manejo de errores central** (`errors.js`): log buffer + `window.onerror`/`unhandledrejection` globales + toast al usuario en operaciones críticas (import/export/backup/auth/ics) + `setErrorReporter()` para enchufar Sentry sin tocar el resto.
- **CI + lint**: GitHub Actions corre `node test/run.js` + ESLint 9 en cada push (0 errores).
- a11y: zoom habilitado, teclado en calendario, focus-trap en modales, roles ARIA en tabs/sliders/nav, `aria-current`; **contraste WCAG AA** en textos muted/secondary (verificado por cálculo) y **piso de fuente 11px** (antes había 8-10px).
- Home configurable (widgets on/off + reorder).
- Glosario tap-to-explain; modo simple/ciencia; tema claro/oscuro.

---

## 7. Funcionalidades pendientes

**Alta prioridad**
- ✅ ~~Auditoría de contraste/tamaños~~ — HECHO (tokens AA + piso 11px).
- ✅ ~~Tests de auth y persistencia~~ — HECHO (+37 tests).
- ✅ ~~Manejo de errores visible~~ — HECHO en gran parte (`errors.js` + handlers globales + toasts en operaciones críticas). Quedan ~49 `catch(e){}` **benignos** (escrituras best-effort a localStorage) intencionalmente sin notificar.
- **Observabilidad**: el hook está listo (`setErrorReporter`), falta **wirear Sentry (DSN)** + analytics privacy-friendly (PostHog/Plausible). Hoy: solo log en memoria + consola.
- **Empaquetado para publicación** (PWA instalable ya; para Play Store falta wrapper TWA — ver §13).

**Media prioridad**
- **Cifrado en reposo** (vault en memoria) — ver §16.2.
- **Notificaciones en background** reales — ver §16.1.
- Unificar la **tarjeta de ejercicio** (aún duplicada en render-week/plan/calendar).
- Descomponer `showDayPanel` y `buildTsTab` (funciones-god).
- `selectExercises`: usar el historial para variar estímulos entre semanas.
- Modo entrenador v2 (coach escribe/ajusta el plan) + e2e real contra Supabase.

**Baja prioridad**
- Migración a ESM + build ligero (esbuild) para matar el orden de `<script>` y las guardas `typeof`.
- Un test de tipo movilidad/potencia (hoy no hay test de potencia; `GOAL_CAPS.power` tiene `testKey:null`).
- Compartir plan / social; multi-idioma (i18n ya semi-preparado con labels).
- Borrar el huérfano `Climbing/ClimbCycle_v5.html` y el stub `data.js`.

---

## 8. Problemas conocidos

| Problema | Impacto | Gravedad | Solución recomendada |
|---|---|---|---|
| **Datos en reposo en texto plano** en localStorage | Exposición en dispositivo compartido/robado | Alta (privacidad) | Vault de cifrado en reposo (§16.2) |
| **Cache-busting fue manual** (`?v=`), causó ver versiones viejas | El usuario no veía cambios | Media (ya mitigado: SW network-first + bump de versión) | Automatizar el versionado en un build |
| **Notificaciones solo al abrir la app** | Recordatorios débiles (retención) | Media | Push server o Periodic Background Sync vía TWA (§16.1) |
| **Sync/coach sin e2e real** contra Supabase | Riesgo de bugs en red no detectados | Media | Suite de integración con una instancia de prueba |
| ~~**Contraste/9px** en muchos textos~~ ✅ RESUELTO | Legibilidad, WCAG AA | — | Tokens muted/secondary a AA (verificado por cálculo) + piso 11px. Falta **QA visual en dispositivo** del re-flow por el bump de fuente. |
| **Huérfano `ClimbCycle_v5.html`** | Confusión (el usuario abrió ese por error) | Baja | Borrarlo o moverlo a `/legacy` |
| **`data.js` stub** no borrable | Cosmético | Baja | Borrar cuando el entorno lo permita |
| **README de 2 líneas** | Onboarding de devs | Baja | Escribir README + ARCHITECTURE (este doc ayuda) |
| **Re-render total por acción** | Perf en gama baja | Media | Render por región (el Bus ya lo habilita) |
| **`localStorage` monkey-patch doble** (auth + sync) | Fragilidad por orden de carga | Media | Encapsular en `storage.js` |

*No hay bugs funcionales conocidos que rompan la app hoy: la suite (252) está verde, ESLint da 0 errores y el boot de scripts no lanza ReferenceError. En esta sesión se corrigieron 2 bugs latentes de `no-redeclare` (`var pid` duplicada en render-home; `di` redeclarada en render-week).*

> ⚠️ **Deuda nueva menor (test infra):** el harness es sync-first; los tests async (crypto/auth) se resuelven en un `flush()` al final, por lo que sus ✓ pueden imprimirse fuera del bloque `describe` que los agrupa (cosmético; los conteos y fallos son correctos).

---

## 9. Deuda técnica (a saldar antes de una publicación oficial)

1. **Cifrado en reposo** de datos sensibles (peso, edad, tests).
2. **Arquitectura de render**: descomponer funciones-god (showDayPanel, buildTsTab), unificar la tarjeta de ejercicio, render por región.
3. **Encapsular el estado** en un `store.js` con getters/setters + persistencia + emisión centralizada (hoy es "muta y acordate de guardar/repintar").
4. **Encapsular storage** (dejar de secuestrar `localStorage` global en dos capas).
5. **Cobertura de test** de auth, persistencia y (al menos view-models de) render.
6. **Manejo de errores** de cara al usuario (los `catch(e){}` silenciosos ocultan fallos).
7. **Tooling**: ✅ ESLint + CI (`node test/run.js` en cada push) ya están. *Resta:* formatter (Prettier) y un build opcional (esbuild) que además automatice el cache-busting.
8. **Migración a ESM** para eliminar el orden de `<script>` y las ~decenas de guardas `typeof x==='function'`.
9. **Documentación**: README + guía "cómo agregar ejercicio/test/widget" + JSDoc en las funciones puras clave.
10. **Limpieza**: borrar orphan `ClimbCycle_v5.html` y stub `data.js`.

---

## 10. Seguridad

- **Autenticación:** PBKDF2-SHA256 (150k) con migración desde SHA-256. Correcto para verificación de contraseña. Pero el login **no protege los datos** (solo namespacing por clave).
- **Almacenamiento:** **texto plano** en localStorage. Cualquiera con acceso al dispositivo/DevTools lee peso, edad, tests, notas.
- **Cifrado:** existe (crypto.js, PBKDF2+AES-GCM) pero **solo se usa para backups**, no en reposo. La incompatibilidad clave: WebCrypto es async y `localStorage` es sync → cifrado transparente en reposo requiere un vault en memoria (refactor de arranque async).
- **Permisos:** la web pide Notificaciones (opt-in). Sin otros permisos sensibles. Como PWA en TWA, habría que declarar permisos Android.
- **Sync/nube:** tokens de sesión (`ccsync_session`) en localStorage → exfiltrables por XSS. La seguridad depende **enteramente** de que la RLS de Supabase esté bien configurada (documentada en SYNC_SETUP.md / COACH_SETUP.md). El upsert manda `updated_at` desde el cliente (mejor usar `now()` del server).
- **XSS:** superficie por `innerHTML` masivo. Mitigado con `escapeHtml` en campos de usuario (nombre, notas, grado, proyectos) y en el import de backup. **Regla a sostener:** todo dato de usuario o de bundle importado pasa por `escapeHtml` antes de `innerHTML`.

**Qué falta para producción (seguridad):** cifrado en reposo (o declararlo honestamente), `now()` del server en conflictos, revisión de RLS con tests de "no puedo leer datos ajenos", CSP headers en el hosting, y una política de privacidad real.

---

## 11. Performance

- **Carga inicial:** 39 `<script src>` (+1 inline) sin minificar (~8.380 líneas JS) + un CSS de ~2.870 líneas. Sin build/minify/gzip explícito (depende del hosting). Aceptable en desktop; en móvil gama baja convendría minificar y bundlear.
- **Renderizados:** patrón dominante = `innerHTML =` de páginas enteras por acción. `markSess` repinta ~6 vistas. Bueno: `_seqCache` memoiza `getPlanSeq()`, y `getExercisesForDay` cachea. Mejora clara: render por región vía el Bus (ya está la infraestructura).
- **Memoria:** baja (todo en memoria + localStorage). Sin fugas conocidas; el timer limpia su `setInterval` al cerrar/reset.
- **Almacenamiento:** localStorage (límite ~5MB); historiales acotados (logs a 120, tests a 20/métrica). Sin riesgo cercano.
- **Batería:** el temporizador usa `setInterval(1s)` y WebAudio solo mientras corre; la app no hace polling en background. Consumo bajo. Las notificaciones no corren en background (sin costo).
- **Uso offline:** ✅ real vía service worker (network-first con fallback a cache) + localStorage. La app funciona sin conexión salvo sync/coach.

---

## 12. Escalabilidad

La app es **client-heavy**: casi todo corre en el dispositivo; el único backend es Supabase (opcional). Por eso escala barato.

- **1.000 usuarios:** sin cambios. Hosting estático (Netlify/Vercel/Pages) + Supabase free/pro. La app no tiene servidor propio que escalar.
- **10.000 usuarios:** Supabase plan pago; verificar índices en `climbcycle_state(user_id)` y `coach_links`; CDN para assets (build minificado); empezar analytics/crash-reporting para entender uso; rate-limiting en Auth. El modelo (una fila JSONB por usuario) sigue siendo trivial.
- **100.000 usuarios:** connection pooling (pgBouncer/Supabase pooler), mover lógica de sync/coach a **edge functions** si aparece lógica de servidor, particionar/monitorear la tabla de estado, backups y observabilidad de DB, y considerar mover de "bundle JSONB monolítico" a columnas/tablas si se necesitan queries analíticas. Assets por CDN con cache agresivo + versionado automático. Nada de esto es un rediseño: la superficie de servidor es mínima por diseño.

*Cuello de botella real a esa escala:* no es técnico, es de producto (retención, soporte, i18n, moderación de contenido compartido si hubiera social).

---

## 13. Publicación en Play Store — checklist

> ⚠️ **Punto arquitectónico clave:** hoy ClimbCycle es una **PWA (app web)**, NO una app Android nativa. Para estar en Google Play hay que **envolverla en un TWA (Trusted Web Activity)** con Bubblewrap o PWABuilder (genera un APK/AAB que abre la PWA a pantalla completa). Alternativa: Capacitor. Esto es un trabajo en sí mismo.

**Empaquetado / firma / versionado**
- [ ] Generar el TWA (Bubblewrap/PWABuilder) → AAB firmado.
- [ ] **Digital Asset Links** (`assetlinks.json` en el dominio) para que el TWA no muestre la barra de URL.
- [ ] Firma de app (Play App Signing) + keystore resguardado.
- [ ] `versionCode`/`versionName` y política de versionado; hoy el versionado web es manual (`?v=`).
- [ ] Target API level vigente que exige Google (revisar el mínimo del año).
- [ ] Hospedar la PWA en HTTPS con dominio propio estable.

**Requisitos de Google / privacidad**
- [ ] **Política de privacidad** publicada (URL) — hoy NO existe.
- [ ] **Data Safety form** del Play Console: declarar qué datos se recogen (peso, edad, email si hay sync), cómo se almacenan (local plano / Supabase), si se cifran en tránsito (sí, HTTPS) y en reposo (hoy NO).
- [ ] Cumplir políticas de contenido y de cuentas (si hay login).
- [ ] Consentimiento explícito para el modo entrenador (ya existe) y para notificaciones (ya opt-in).

**Seguridad**
- [ ] Cifrado en reposo (o declarar honestamente que es local sin cifrar).
- [ ] Revisión de RLS de Supabase + test de acceso ajeno.
- [ ] CSP y headers de seguridad en el hosting.

**Backups / datos**
- [ ] Export/import ya existe (plano + cifrado). Documentar recuperación y el aviso de "si olvidás la contraseña del backup, es irrecuperable" (ya está).

**Rendimiento**
- [ ] Minificar/bundlear JS+CSS, lazy-load, auditar Lighthouse (PWA/Perf/Best-Practices/SEO ≥ 90).
- [ ] Probar en dispositivos reales de gama baja.

**Accesibilidad**
- [ ] Cerrar la tanda de contraste/tamaños; pasar un audit (axe/Lighthouse a11y).

**Manejo de errores / observabilidad**
- [ ] **Crash reporting** (Sentry o similar) — hoy cero.
- [ ] **Analytics** de uso (privacy-friendly: Plausible/PostHog) — hoy cero.
- [ ] Reemplazar `catch(e){}` silenciosos por manejo visible + reporte.

**Pruebas**
- [ ] Test interno/cerrado en Play Console; QA en dispositivos.
- [ ] Ampliar cobertura a auth/persistencia/render (view-models).

---

## 14. Roadmap (por fases, con esfuerzo estimado)

> Esfuerzo en "jornadas de dev" (1 = ~medio día enfocado). Estimaciones para un solo dev con asistencia de IA.

**Fase 1 — Correcciones críticas y confianza (≈ 4-6 jornadas)**
- Manejo de errores visible + eliminar `catch` silenciosos (2).
- Tests de auth + persistencia (export/import) (1-2).
- Auditoría de contraste/tamaños a11y (1-2).
- Limpieza: borrar orphan v5 + stub data.js + README/ARCHITECTURE (1).

**Fase 2 — Mejoras importantes / seguridad (≈ 6-9 jornadas)**
- Encapsular estado (`store.js`) + storage (`storage.js`) (2-3).
- Descomponer `showDayPanel`/`buildTsTab` + unificar tarjeta de ejercicio (2-3).
- Cifrado en reposo (vault en memoria) **con QA de navegador** (2-3).

**Fase 3 — Mejoras UX (≈ 5-7 jornadas)**
- Render por región vía el Bus (perf) (2).
- `selectExercises` con variación por historial (1).
- Notificaciones background (evaluar TWA push) (1-2).
- Gráficas/di­agnóstico ampliados; test de potencia/movilidad (1-2).

**Fase 4 — Escalabilidad / plataforma (≈ 5-8 jornadas)**
- Migración a ESM + build (esbuild) + cache-busting automático + minify (2-3).
- CI (lint + test) + crash reporting + analytics (2-3).
- e2e de sync/coach contra Supabase de prueba (1-2).

**Fase 5 — Publicación (≈ 5-8 jornadas)**
- TWA (Bubblewrap) + Asset Links + firma + versionado (2-3).
- Política de privacidad + Data Safety + assets de tienda (2).
- QA en dispositivos + test cerrado en Play Console + Lighthouse ≥ 90 (2-3).

---

## 15. Revisión crítica (auditoría externa, sin complacencia)

**Malas decisiones / riesgos**
- **La "seguridad" fue teatro hasta hace poco** y sigue incompleta: PBKDF2 mejora el hash, pero los datos siguen en claro. La UI insinúa privacidad ("100% offline, sin tracking") que en reposo no se sostiene. Es el riesgo reputacional más claro si se publica.
- **Render por `innerHTML` con estilos inline** es la peor decisión estructural: superficie XSS, funciones de 300+ líneas, duplicación, y perf pobre. Es tolerable a esta escala pero envejece mal.
- **38 `<script>` globales sin build** funciona hoy pero es una bomba de tiempo para colaboración: orden de carga implícito, ~decenas de guardas `typeof`, y el bug de cache-busting manual que ya golpeó al usuario (vio versiones viejas).

**Sobreingeniería**
- Para una app **con cero usuarios**, tener **sync + modo entrenador + cifrado + PWA + Supabase RLS + RPCs** es construir para escala antes de validar producto. Es capacidad impresionante, pero varias de esas piezas (coach v1, sync) están **sin probar en real** y añaden superficie de mantenimiento. Un Tech Lead externo cuestionaría el orden: primero validar retención con 20 usuarios, después nube/coach.
- El motor de dominio, en cambio, **no** es sobreingeniería: es el core diferencial y está bien.

**Código innecesario / duplicación**
- Tarjeta de ejercicio duplicada en 3-4 renderers.
- `selectExercises` persiste `lastExUsed` que casi no se lee (promesa de rotación entre semanas a medio cablear).
- Stub `data.js` y orphan `ClimbCycle_v5.html`: ruido.
- `catch(e){}` silenciosos por todos lados (ocultan errores, dificultan debug).

**Riesgos futuros**
- Sin CI/linter, una regresión pasa fácil (la suite hay que correrla a mano).
- Sync sin `now()` de server y con conflictos por timestamp del cliente → corrupción posible con relojes desfasados o multi-dispositivo simultáneo.
- Notificaciones que "no son background" pueden frustrar expectativas.

**Simplificaciones posibles**
- Si el objetivo cercano es lanzar y validar: **congelar** sync/coach/cifrado-en-reposo, pulir a11y + errores + observabilidad, y salir como PWA (sin TWA) para un grupo cerrado. Reduce alcance sin perder el core.
- Un build ligero (esbuild) resolvería de una: minify + cache-busting + ESM (mata las guardas `typeof` y el orden de scripts). Alto ROI.

**Veredicto:** producto con **un core de dominio excepcional** (raro de ver) montado sobre una **base de ingeniería frágil pero honesta para un solo dev**. Nota global del código: **6.5-7/10**, con techo de 9 si se salda la deuda de render + seguridad-en-reposo + tooling. La mayor amenaza no es técnica sino de foco: hay más features que usuarios.

---

## 16. Evaluación de las dos tareas pendientes marcadas

### 16.1 Avisos en background (PWA instalada + Periodic Background Sync o Push Server)

- **¿Necesaria?** No para que la app funcione; sí para **retención** (una app de entrenamiento vive de recordar entrenar).
- **¿Recomendable?** Sí, a mediano plazo.
- **¿Imprescindible para producción?** **No.** Muchas apps lanzan con notificaciones "al abrir" o locales básicas.
- **¿Antes del lanzamiento?** No; es una mejora de engagement post-lanzamiento.
- **¿Se puede posponer?** Sí.
- **Impacto de no hacerla:** recordatorios más débiles → posible menor adherencia/retención, pero sin romper nada. Hoy ya hay recordatorio al abrir.
- **Complejidad real:** Periodic Background Sync es **solo Chrome/Android y poco fiable**; hacerlo bien implica un **push server** (infra + costo + backend) o aprovechar el **TWA** para notificaciones nativas. Es desproporcionado para el valor actual.
- **Prioridad: MEDIA.** *Justificación:* alto valor de retención pero alto costo/infra y baja urgencia; encaja naturalmente cuando se haga el TWA para Play Store (Fase 5), no antes.

### 16.2 Vault de cifrado en reposo (descifrado a espejo en memoria durante el login)

- **¿Necesaria?** Depende del posicionamiento. Los datos son de fitness (peso, edad, tests): sensibles pero no financieros/historia clínica.
- **¿Recomendable?** **Sí**, sobre todo porque la app **se promociona como privada/offline**; sin cifrado en reposo esa promesa es parcial (verdad-en-publicidad).
- **¿Imprescindible para producción?** **No estrictamente** (muchísimas apps guardan datos locales sin cifrar y lo **declaran** en el Data Safety). Pero es lo que separa "app personal" de "producto que respeta la privacidad".
- **¿Antes del lanzamiento?** **Recomendado antes de un lanzamiento público serio**, especialmente si se comunica privacidad. Para un test cerrado, se puede posponer **declarándolo honestamente**.
- **¿Se puede posponer?** Sí, con honestidad en la comunicación/Data Safety.
- **Impacto de no hacerla:** en dispositivo compartido/robado, exposición de datos por DevTools/localStorage. Riesgo **moderado** para datos no críticos, pero con costo reputacional si se vende privacidad.
- **Complejidad real:** **Alta y riesgosa.** WebCrypto async vs `localStorage` sync obliga a un espejo en memoria + refactor del arranque async (descifrar al login antes de `loadU/loadPlan`). Un bug ahí = **pérdida de datos**. Necesita **QA real en navegador** (el harness `vm` no alcanza). Además **choca con el modo entrenador** (que hoy comparte el bundle en claro): habría que separar "datos privados" de "compartibles" o compartir clave.
- **Prioridad: MEDIA-ALTA.** *Justificación:* valor de privacidad real + coherencia con el mensaje de la app, pero riesgo de implementación alto y no bloqueante si se declara. **Hacerla en Fase 2**, con feature flag y QA de navegador, **antes** del lanzamiento público pero **después** de estabilizar errores/tests. Si el lanzamiento es un grupo cerrado, se puede diferir declarándolo.

**Resumen priorización:** Vault en reposo = **Media-Alta** (hacer en Fase 2, con QA). Background notifications = **Media** (Fase 5, junto al TWA). Ninguna es **Crítica** ni **No-necesaria**.

---

## 17. Próximos pasos — las 20 tareas siguientes (ordenadas por prioridad)

> No incluye escribir código todavía: es el plan de trabajo. Orden = qué haría un Tech Lead para llegar a un lanzamiento cerrado sólido y de ahí a Play Store.

**Bloque A — Estabilizar y dar confianza (crítico)** — ✅ HECHO en la sesión 2026-07-24, salvo lo marcado
1. ✅ Reemplazar `catch(e){}` silenciosos por manejo visible + log central (`errors.js`). *Resta:* rutear (sin notify) las ~49 escrituras best-effort a `logError` si se quiere telemetría fina.
2. ⏳ **PENDIENTE (nuevo top de Bloque A):** wirear **Sentry** (el hook `setErrorReporter` ya existe → solo falta el DSN + `<script>` del SDK) y analytics privacy-friendly (PostHog/Plausible).
3. ✅ Tests de `auth.js` (hash, migración, aislamiento) — en `test/auth.test.js`.
4. ✅ Tests de persistencia (round-trips + collect/import plano) — en `test/persistence.test.js`. *Resta:* round-trip de **backup cifrado end-to-end** (hoy se testea la capa crypto, no `importUserData` con archivo `.ccenc`).
5. ✅ CI (`.github/workflows/ci.yml`) + ESLint 9 (`eslint.config.js`, 0 errores).
6. ✅ Auditoría a11y de contraste/tamaños (tokens AA + piso 11px). *Resta:* **QA visual en dispositivo** del re-flow.

**Bloque B — Saldar deuda estructural (alto)**
7. Encapsular estado en `store.js` (getters/setters + persistencia + emisión centralizada).
8. Encapsular `storage.js` (dejar de secuestrar `localStorage` global en dos capas).
9. Unificar la tarjeta de ejercicio en un único `renderExerciseCard` usado por todos los renderers.
10. Descomponer `showDayPanel` y `buildTsTab` en builders de view-model + paint.
11. Render por región vía el Bus (repintar solo la celda/sección afectada).
12. Build ligero (esbuild): ESM + minify + **cache-busting automático** (elimina el bug de `?v=` y las guardas `typeof`).

**Bloque C — Seguridad y datos (alto/medio)**
13. Vault de cifrado en reposo (PBKDF2+AES-GCM + espejo en memoria) detrás de feature flag, con QA de navegador (§16.2).
14. Sync: usar `now()` del server para conflictos; test de "no leer datos ajenos" (RLS) contra una instancia de prueba.
15. Definir y publicar **política de privacidad** + completar el **Data Safety** (borrador).

**Bloque D — Producto / UX (medio)**
16. `selectExercises`: variación de estímulos por historial (cerrar la promesa de rotación entre semanas).
17. Documentación: README + "cómo agregar ejercicio/test/widget" + JSDoc en funciones puras clave.
18. Limpieza: borrar orphan `ClimbCycle_v5.html` y stub `data.js`; mover legacy a `/legacy`.

**Bloque E — Camino a Play Store (medio/bajo, cuando el core esté validado)**
19. Empaquetar como **TWA** (Bubblewrap) + Digital Asset Links + firma + versionado; Lighthouse ≥ 90.
20. Notificaciones background vía el TWA (o push server) + test cerrado en Play Console.

---

*Fin de PROJECT_CONTEXT.md. Para retomar en una próxima sesión: leé §0 (TL;DR) y §17 (próximos pasos); abrí archivos puntuales solo cuando necesites detalle. Actualizá §5, §6, §8 y §17 al cerrar cada sesión de trabajo.*
