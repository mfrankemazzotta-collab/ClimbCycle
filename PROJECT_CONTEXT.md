# PROJECT_CONTEXT.md — ClimbCycle

> **Propósito de este archivo:** memoria permanente del proyecto. Está pensado para que en futuras conversaciones no haga falta re-analizar todo el código. Si sos un modelo leyendo esto: confiá en este documento como fuente de verdad de alto nivel, y solo abrí archivos puntuales cuando necesites detalle de implementación. Mantenelo actualizado al cerrar cada sesión.
>
> **Última actualización:** 2026-08-05 (sesión "QA de render + fronteras + e2e + carga + vault + build") · **Estado:** Beta técnica avanzada · **Tests:** 486 pasando (41 archivos) · **LOC:** ~11.300 JS + ~2.725 CSS + ~600 HTML.
>
> ## 📦 BUILD DE PRODUCCIÓN (esbuild) — y el lint por fin corrió
>
> `npm run build` genera `dist/`: **45 scripts → 1 archivo** (629 KB → 400 KB, −37%) + CSS minificado, ambos con **hash de contenido** en el nombre. Adiós al `?v=20260725b` a mano, que ya había causado el bug de "el usuario ve versiones viejas".
>
> **No es un bundler al uso, y no puede serlo.** El proyecto no usa ESM: son scripts que comparten globales y el HTML los llama por `onclick="markSess(...)"`. Verificado empíricamente: `esbuild --format=iife` **deja el archivo vacío**, y una IIFE sacaría del scope global justo las funciones que el HTML necesita. Lo que sí funciona es concatenar en el orden real del `index.html` (única fuente de verdad, así no hay lista duplicada que se desincronice) y minificar **sin `--bundle`** — en ese modo esbuild preserva los identificadores de nivel superior y renombra sólo los internos.
>
> **El riesgo real de esto es silencioso:** si el minificador renombrara un global, la app cargaría sin errores y explotaría recién al primer click. Por eso `build.test.js` (11 casos) no se conforma con "arranca": compara el conjunto **completo** de funciones globales del bundle contra el de los fuentes, y verifica que los ~90 handlers de `onclick` (los del HTML y los que generan los renderers) existen.
>
> **Bug encontrado de paso:** el `sw.js` cachea `./css/app.css`, que en `dist/` no existe → la PWA quedaba **sin estilos offline**. Y el nombre del caché (`climbcycle-v29`) se bumpeaba a mano, el mismo problema que el `?v=`. Ahora el build reescribe el SHELL con los nombres reales y deriva el caché del hash del contenido. Dos tests lo cubren, incluido uno que verifica que todo lo que el SHELL lista **existe de verdad** en dist.
>
> El build es **aditivo**: no toca los fuentes, `index.html` sigue sirviendo para desarrollo. `dist/` va al `.gitignore`.
>
> ✅ **`npm run lint`: 0 errores.** Se agregó `build.js` al alcance del linter (es Node, no navegador → va en el bloque de config de `test/`). Era lo único que había quedado sin verificar en toda la sesión, por falta de red para instalar ESLint.
>
> **CI ampliado.** Antes corría tests + lint; ahora también **construye y vuelve a testear**. El orden importa: (1) tests SIN dependencias — verifica que la suite sigue siendo zero-dep y `build.test.js` se auto-saltea; (2) install + lint; (3) `npm run build`; (4) tests otra vez, ahora **con `dist/` presente**, donde `build.test.js` sí compara el bundle contra los fuentes. Verificado en un clone simulado: 477 tests sin `dist/`, 486 con él.
>
> ## 🔐 VAULT DE CIFRADO EN REPOSO — implementado, DETRÁS DE FLAG
>
> §16.2 lo daba por "alto riesgo, refactor del arranque a async". **Resultó bastante más simple de lo documentado:** `storage.js` ya era dueño único de `localStorage` y el login ya era async por PBKDF2, así que no hubo que tocar los ~355 sitios de lectura.
>
> **Cómo funciona.** WebCrypto es async y `localStorage` es sync — no se puede descifrar dentro de un `getItem()`. La salida es un **espejo en memoria**: al desbloquear se descifra una vez y de ahí en adelante las lecturas siguen siendo síncronas sin enterarse. El espejo vive en `storage.js` (que no sabe de cripto); `vault.js` hace el trabajo criptográfico.
>
> **Esquema de claves (el de 1Password/Bitwarden).** No se cifra con la clave derivada de la contraseña sino con una **DEK aleatoria**, guardada envuelta dos veces: con la contraseña y con una **clave de recuperación** de 24 caracteres (sin `O/0/I/1/l`, para poder copiarla de un papel). Consecuencias: la recuperación es criptográficamente equivalente, no una puerta trasera más débil; y **cambiar la contraseña no recifra los datos** — sólo re-envuelve la DEK, por eso es instantáneo y la recovery key sigue valiendo.
>
> **Formato:** un ÚNICO blob por usuario, no una clave por dato. Más lento de escribir, pero **atómico**: nunca queda medio cifrado, que es el estado del que no se vuelve.
>
> **Red de seguridad de la migración.** Activar el cifrado es el momento de mayor riesgo de la app. Antes de tocar nada se guarda una **copia en claro** (`ccvault_rescue_*`) que sobrevive hasta que el usuario confirma que pudo desbloquear. `ccVaultRescue()` la restaura si algo falló. *Trade-off explícito y documentado:* esa copia ES texto plano — su razón de ser es sobrevivir a un fallo del propio cifrado, así que cifrarla la volvería inútil. Hay una ventana de exposición hasta que se confirma.
>
> ⚠️ **`CC_VAULT_ENABLED = false` por defecto.** Cargado en index.html pero **inerte**: verificado que con el flag apagado el espejo no se monta y `ccVaultBootState()` devuelve `'off'`. El harness corre WebCrypto real, pero **no ve cuota de localStorage, timing de navegador ni recargas de página**. Para activarlo: poner el flag en true en `sync-config.js` y probar con datos de prueba antes de confiarle un historial real.
>
> **UI (2026-08-05, misma sesión):** faltaba la mitad — el motor estaba pero **nada lo llamaba**. Ahora `vault-ui.js` trae (1) `ccVaultGate()`, cableado en `app.js` **antes** de `loadU()`: si hay vault toma la pantalla y pide la contraseña, con opción de clave de recuperación. Sin esto `loadU()` leía null y la app mostraba el onboarding — el usuario vería su historial "borrado" estando entero y cifrado. (2) Sección en Perfil para activar/desactivar, con la clave de recuperación mostrada **una sola vez** y checkbox obligatorio antes de borrar la copia en claro. Guía de prueba paso a paso en **`QA_VAULT.md`**.
>
> **Bug encontrado escribiendo la guía:** `ccVaultBootState()` miraba el feature flag ANTES que la existencia del vault, así que apagar `CC_VAULT_ENABLED` con datos ya cifrados hacía arrancar la app en blanco. Ahora la existencia manda: el flag decide si el vault se puede **activar**, no si se respeta uno existente. +1 test.
>
> **+8 casos** (`vault.test.js`), centrados en qué pasa cuando algo sale mal: contraseña incorrecta, recovery falsa, blob manipulado (AES-GCM lo detecta), migración a medias, y que el arranque **nunca** diga "sin vault" habiendo datos cifrados — eso haría arrancar la app en blanco y el usuario creería que perdió todo.
>
> **Efecto lateral:** esto ya no choca con el modo entrenador. Antes cifrar y compartir eran incompatibles porque el coach necesitaba el bundle crudo; desde el fix de privacidad sólo recibe un resumen que el atleta genera ya descifrado.
>
> **Deuda del harness que salió a la luz:** `assert.js` lanza todos los `it` async **en paralelo**, así que suites que comparten sandbox se pisan el estado. Ya lo había resuelto `backup-crypto.test` con un `it` secuencial; ahora `vault.test` usa un helper `seq()` que encadena manteniendo un ✓ por caso. Además el PBKDF2 de 150k iteraciones saturaba el event loop y volvía **frágil** a `backup-crypto.test` (que espera 120 ms fijos) — de ahí `opts.iters` para bajar el work factor en tests. Y se agregó `remove()` a los stubs de DOM: sin él, cualquier test que pasara por un `confirmDialog` moría con un unhandled rejection que enmascaraba el fallo real.
>
> ## 📐 EL MODELO DE CARGA, CONTRA LA LITERATURA
>
> Los `SESSION_RPE` que se inventaron para que el ACWR funcionara estaban **puestos a ojo**. Al contrastarlos con las fuentes aparecieron dos problemas distintos:
>
> **(1) La fórmula tenía doble conteo.** `loadForLog` calculaba `dur × RPE × factor_de_tipo` (power 1.2, endurance 0.7…). El método **session-RPE de Foster (2001)** — el estándar de carga interna, y desde hace poco **validado en escalada** (climbers italianos de todas las disciplinas, r = 0.83 contra métodos de frecuencia cardíaca) — es `dur × RPE` **y nada más**. Si una sesión se percibió más dura, eso ya está en el RPE; multiplicar de nuevo por el tipo lo cuenta dos veces. Peor: cuando el usuario registraba con detalle *"resistencia, RPE 8"*, el factor 0.7 lo rebajaba a **5,6 efectivo** — el sistema contradecía a quien había estado ahí.
> *Matiz importante:* el factor **se conserva en `calcRecovery`**, porque ahí modela otra cosa — cuánto tarda el **tejido** en recuperarse, no cuánto costó el esfuerzo. Una sesión de potencia estresa SNC y poleas más que una de resistencia al mismo RPE. Son dos modelos con propósitos distintos y ahora están separados.
>
> **(2) Los valores estaban comprimidos hacia el medio.** Contrastados con los rangos que publica **Lattice Training** para escalada:
>
> | Fase | Antes (a ojo) | Ahora | Fuente |
> |---|---|---|---|
> | `strength` | 7 | **7** ✓ | max hang = RPE 7 (≈3 s en reserva sobre 7 s) |
> | `power` | 8 | **9** | limit bouldering / campus = RPE 9-10 |
> | `endurance` | 6 | **4** | intervalos = 4/10; ARC = 2/10 |
> | `deload` | 4 | **2** | ARC y escalada fácil = 2/10 |
> | `outdoor` | 8 | **7** | día de roca típico, no jornada de proyecto |
> | `project` | 8 | **9** | proyectar *es* limit climbing |
>
> El error **no era aleatorio**: sobrevaloraba las fases suaves, lo que inflaba la carga crónica (media de 4 semanas) y por lo tanto **subestimaba los picos del ACWR**. Otra vez la dirección peligrosa — la app decía "carga baja, progresá" en semanas que no lo eran. +13 tests (`loadmodel.test.js`), incluidos dos que verifican el comportamiento del ACWR de punta a punta: una semana dura sobre fondo suave ahora produce un pico visible (>1,3).
>
> **Línea abierta (de la misma búsqueda):** el estudio de validación en escalada encontró que en **bouldering** el session-RPE general correlaciona apenas moderado (r = 0,40), pero usando **RPE local de antebrazos** sube a casi perfecto (r = 0,91 en lead). Para una app de escalada, preguntar "¿cuánto se te cargaron los antebrazos?" sería más preciso que el RPE general. No implementado — requiere cambiar el modal de check-in y re-calibrar.
>
> ## 🔒 EL MODO ENTRENADOR FILTRABA TODO
>
> `buildCoachView` recorta el bundle a un resumen limpio (nombre, grado, adherencia, tests, proyectos) — pero corría **en el navegador del coach**. `coachPullAthlete` pedía `climbcycle_state?select=bundle`, así que **el bundle completo viajaba igual**: peso, edad, pulsaciones en reposo y **las notas libres de cada sesión**, que es donde un escalador escribe cosas como *"dolor en la polea A2, no se lo conté a nadie"*. Quedaba en la pestaña Network y en la caché del coach.
>
> La UI prometía "solo lectura, un resumen". El sistema entregaba el historial entero. **No se ve mirando la pantalla — sólo mirando el tráfico**, que es justo lo que el arnés e2e ya permitía hacer.
>
> **Raíz:** la policy `climbcycle_state_coach_read` de COACH_SETUP.md daba `SELECT` sobre la fila completa. Cambiar sólo el cliente no alcanzaba: cualquier coach con la sesión abierta podía pedir el bundle con un `fetch`.
>
> **Fix (cliente + SQL):** el resumen ahora lo calcula el dispositivo del **atleta** (que ya tiene los datos) y lo publica en una tabla nueva `coach_summaries`; el coach lee de ahí. Los datos privados no salen del dispositivo del dueño. El SQL incluye el **`drop policy` de la política vieja**, que no es opcional. Revocar al último entrenador **borra el resumen publicado**. Sólo publica quien realmente usa el modo coach (`meta.hasCoaches`).
>
> *Efecto lateral valioso:* esto **destraba el cifrado en reposo** (§16.2). Antes cifrar y compartir con el coach eran incompatibles porque el coach necesitaba el bundle crudo; ahora sólo necesita un resumen que el atleta genera ya descifrado.
>
> **+11 tests e2e** (`coach-e2e.test.js`), incluido uno que **demuestra el bug viejo**: con la policy anterior reactivada en el servidor de prueba, el mismo pedido devuelve el bundle con la nota privada adentro. Y otro que verifica que los datos sensibles **no aparecen en el tráfico**, no sólo que la UI no los muestra.
>
> ✅ **Verificado contra el Supabase real del usuario (2026-08-05):** la base está **vacía** — no existe `climbcycle_state` ni ninguna de las tablas del modo coach, ni una sola policy. El sync nunca se instaló (`sync-config.js` sigue con los placeholders), así que **la fuga nunca estuvo abierta en producción**. Se dejó `sql/diagnostico-coach.sql` para poder repetir el chequeo en cualquier base. *Lección del script:* la primera versión consultaba `public.coach_links` directamente y Postgres **falla al parsear** si la tabla no existe, cortando el diagnóstico justo cuando más falta hacía; la versión final usa `to_regclass` + SQL dinámico.
>
> ## 🌐 E2E DE SYNC: la capa de red ya no es un punto ciego
>
> `sync.js` era el único subsistema sin probar de punta a punta — y ahí había aparecido el peor bug de la auditoría. La lección era clara: **el fallo no estaba en la lógica pura (que tenía tests en verde) sino en la costura con la red**, y ninguna cantidad de unit tests lo hubiera visto.
>
> **`test/fake-supabase.js`** — servidor HTTP que habla el protocolo real: GoTrue (`/auth/v1/signup`, `/token?grant_type=password|refresh_token`) y PostgREST (`GET/POST /rest/v1/climbcycle_state` con `Prefer: merge-duplicates`). Emula lo que importa: **RLS** (cada usuario sólo ve su fila), **401 + refresh** (para ejercitar el retry, que nunca se había probado), y `updated_at` **sellado por el servidor** con un desfase de reloj configurable.
>
> **`loadDevice(url)`** en el harness — un "dispositivo" = localStorage propio + copia de los módulos + `fetch` **real**. Dos instancias = dos teléfonos contra el mismo servidor.
>
> **`test/sync-e2e.test.js` (12 tests)** cubre el escenario que perdía datos: A entrena y sube · B baja lo de A · B **no** pisa el trabajo de A · los dos cambian → conflicto sin tocar nada · copia de rescate · ida y vuelta A→B→A · el bundle entero viaja · token vencido se renueva solo.
>
> **Y el arnés encontró 2 bugs más, invisibles en local:**
> 1. **Pull espurio por desfase de relojes.** `syncPush` sellaba `lastPush` con la hora que mandaba el CLIENTE, pero el servidor guarda la SUYA. Con el reloj del server unos ms adelantado, la fila remota parecía más nueva que el propio push → cada sync bajaba datos **y recargaba la página** sin que nadie hubiera cambiado nada. Fix: sellar con el `updated_at` que devuelve el servidor (`Prefer: return=representation` ya lo trae).
> 2. **Push inútil en `insync`.** `syncNow` subía aunque no hubiera cambios; eso movía el `updated_at` remoto y hacía que **todos los demás dispositivos** creyeran que había novedades y bajaran, en cascada. Fix: si la dirección es `insync`, no se sube.
>
> **`test/sync-live.js` + `npm run test:live`** — el mismo recorrido contra un **Supabase real**, por variables de entorno (`CC_URL`/`CC_KEY`/`CC_EMAIL`/`CC_PASS`). Fuera de `npm test` porque necesita credenciales y escribe datos. Valida lo que el mock no puede: que la tabla y la RLS estén bien creadas, el formato real de los errores de GoTrue, y que un historial de 400 sesiones viaje completo. Documentado en SYNC_SETUP.md. ⚠️ **Todavía no se corrió** — hace falta un proyecto Supabase de prueba.
>
> ## 🔴🔴 EL PEOR BUG: el sync nunca bajaba datos
>
> `syncPull` decidía la dirección así:
> ```js
> var localTs = syncBundleTs(_syncBuildBundle());   // ← exportedAt: new Date()
> var dir = syncResolve(localTs, remote.updated_at);
> ```
> `_syncBuildBundle()` sella `exportedAt` con **la hora de la consulta**. Como el remoto nunca está en el futuro, `syncResolve` devolvía **siempre `'push'`**: el pull no ocurría jamás.
>
> **El sync era unidireccional sin que nadie lo notara.** Abrir la app en un segundo dispositivo con datos viejos no bajaba nada, y el auto-push (debounce de 2,5 s ante cualquier cambio) **pisaba en la nube el trabajo del primero**. Multi-dispositivo = pérdida de datos silenciosa. Es el bug más caro de toda la auditoría, y el `sync.test.js` existente pasaba en verde porque probaba `syncResolve` **aislada, con valores inyectados a mano** — el fallo estaba en la costura, no en la función.
>
> **Fix:** `resolveSyncDirection(meta, remoteTs)` **PURO** compara dos *hechos registrados* — `lastPush` (cuándo subí) y `lastLocalChange` (cuándo cambió algo acá, sellado en `_syncSchedulePush`) — en vez de "ahora". Devuelve `pull` / `push` / `insync` / **`conflict`**. En conflicto **no se pisa nada**: `syncNow` corta antes del push y la UI pregunta cuál conservar, diciendo explícitamente que la otra copia se descarta. Además: `_syncApplyRemote` guarda una copia de rescate (`ccsync_prepull`) antes de sobrescribir, `syncPush` ya no borra el resto de la meta al sellar `lastPush`, y `syncUiNow` dejó de sellar `lastPush` a ciegas incluso tras un pull (falseaba la referencia). ⚠️ **Sigue sin probarse contra un Supabase real** — la lógica está testeada, la red no.
>
> **Y los proyectos eran una isla:** 12 días proyectando al límite dejaban el ACWR en cero. Proyectar es la escalada *más intensa* que hace el usuario, así que ignorarla desarmaba la alerta justo en el peor escenario. `projectAttemptDays` + `syncProjectLoad` (PUROS) agrupan **por día** — 12 intentos no son 12 sesiones — y **respetan cualquier sesión ya registrada** ese día (los intentos ocurrieron *dentro* de la salida de roca que ya se logueó). +17 tests.
>
> **Fronteras auditadas y SANAS** (vale decirlo: no todo hallazgo es bug): `U.startDate` ↔ `planMap`/`cc_logs` — mover la fecha de inicio deja `cc_logs` con el bloque viejo, y eso es **correcto**: el historial es un registro de hechos, no una proyección del plan; borrarlo sería el bug. `getWeekCompletion` ya saltea los días `rest`/`test`, así que un `sessionLog` huérfano no infla el % ni desbloquea semanas. Residuo menor: claves muertas en `sessionLog` (almacenamiento, no funcional) — no se tocó porque es el registro del usuario.
>
> ## 🔬 EL MÉTODO QUE ENCONTRÓ 8 BUGS EN UNA SESIÓN
>
> Todos salieron de la misma pregunta, aplicada a **pares de estados que se escriben en lugares distintos**: *¿pueden quedar diciendo cosas contradictorias?* Ninguno estaba reportado, ninguno rompe la app de forma visible, y varios llevaban meses ahí.
>
> | Frontera | Bug | Efecto medido |
> |---|---|---|
> | `sessionLog` ↔ `cc_logs` | Sólo el modal de detalle escribía el historial de carga | **10 sesiones → ACWR `ratio:null`**: la alerta de lesión no se disparaba nunca |
> | roca ↔ `cc_logs` | Las salidas no se registraban | la sesión más dura de la semana no contaba |
> | fecha del evento ↔ `ts` del log | `ts:Date.now()` en vez del día de la sesión | una sesión de hace 6 días entraba en la ventana **aguda** |
> | fecha del evento ↔ `recData` | `hoursAgo:0` fijo | registrar sesión vieja: **100% → 0%**; agendar roca futura: **100% → 8%** |
> | bloque ↔ multiplicador | `blockToStype('outdoor')` caía en el fallback | **−22%** por salida |
> | `cc_tests` ↔ `intensity.js` | Los kg salían del último test sin mirar su antigüedad | un max hang de **hace 14 meses** prescribía los mismos 45 kg, con la misma confianza visual |
> | `exDone` ↔ `sessionLog` | El progreso por ejercicio no se limpiaba nunca | deshacer una sesión la dejaba "abierta" **con todos los ejercicios tildados** — estado que la lógica considera imposible |
> | `EX_POOL` ↔ innerHTML | 8 interpolaciones sin `escapeHtml` | no explotable hoy (pool estático), sí el día que un ejercicio venga de un backup importado |
>
> **Fixes de esta tanda (además de los de carga, ya descritos abajo):**
> - **Frescura del test** — `rateTestFreshness` / `categoryFreshness` / `staleLoadNote` (PUROS). Deliberadamente **no** se aplica un decaimiento automático: un test viejo no implica haber perdido fuerza (podés haber entrenado 6 meses sin re-testear), así que el error puede ir en **cualquier** dirección — y eso es justamente el argumento para no fingir precisión. Se muestra el kg con un aviso "test de hace N meses — revalidá" y sin el color de confianza. Umbral: **más del doble** del intervalo sugerido (a los 50 días no alarma; avisar de todo sería ruido y el usuario dejaría de leer los avisos).
> - **`exDone` sigue a `sessionLog`** — `clearExDone` en `undoSess` y en `markSess('fail')`; `pruneExDone`/`staleExDoneKeys` (PURO) al final de `generatePlan` purgan los días que dejaron de ser entrenables, **conservando** los que siguen vivos (regenerar el plan no borra lo hecho).
> - **`escapeHtml` completo** en render-week / render-plan / render-utils / render-home (8 sitios), + 2 tests que inyectan un ejercicio hostil (`<img src=x onerror=...>`) en la tarjeta y verifican que no sale crudo.
>
> ## 🔴 EL HALLAZGO DE LA SESIÓN: el ACWR no se activaba nunca
>
> Auditando la frontera **plan ↔ motor de carga** con una sola pregunta — *¿la fecha del evento coincide con la fecha que se registra?* — apareció que **`cc_logs` casi no se escribía**. El único camino que lo alimentaba era el modal *"Registrar con detalle"*. Todo lo demás — el **botón grande** de Hoy (`markSess`), **completar los ejercicios** uno por uno (el flujo estrella del rediseño, que cierra la sesión sola), **"Entrené hoy"** y las **salidas de roca** — marcaba `sessionLog` y nada más.
>
> **Medido, no supuesto:** un usuario con **10 sesiones completadas** con el botón principal → `cc_logs` vacío → `computeACWR()` devolvía `ratio:null`. Como `acwrAssessment()` no hace nada sin ratio, **la alerta preventiva de lesión (Gabbett 2016) no se disparaba jamás**. La app tenía toda la infraestructura de prevención construida y desconectada del uso real. Es el bug más caro encontrado hasta ahora: no rompe nada visible, simplemente hace que una feature de seguridad no exista.
>
> **Otros dos, mismo origen, en `saveSessionLog`** (el modal se abre para *cualquier* día, no sólo hoy): guardaba `ts:Date.now()` en vez del día de la sesión → registrar hoy una sesión de hace 6 días la metía en la ventana **aguda** e inflaba el ACWR; y `hoursAgo:0` fijo → esa misma sesión vieja **hundía la recuperación de 100% a 0%**.
>
> **Fix:** punto de entrada único `logSessionDone(dateStr)` en recovery.js (lo llaman los 4 caminos), con carga **estimada por fase** (`estimateSessionLoad`, `SESSION_RPE`) y marcada `auto:true`. Una estimación uniforme mantiene informativo el ratio agudo:crónico — es la misma métrica comparada consigo misma — y el registro detallado del usuario **siempre la pisa** (y nunca se borra al deshacer). `resolveSessionTiming` (el `resolveRockLogging` de antes, generalizado: no tenía nada de específico de roca) decide pasado/hoy/futuro; `dayTimestamp` ubica el log en su día real. Verificación end-to-end: 10 sesiones + 4 salidas de roca → **14 logs, ratio 0.71, `ready:true`**. +14 tests (`sessionload.test.js`).
>
> *Lección para la próxima auditoría:* los tres bugs de esta sesión y los dos de roca son **el mismo patrón** — el estado del *plan* (`sessionLog`, `planMap`) y el estado de la *carga* (`cc_logs`, `recData`) se escriben por separado, y es fácil actualizar uno y olvidar el otro. Cualquier camino nuevo que dé una sesión por hecha tiene que pasar por `logSessionDone`.
>
> **SESIÓN 2026-08-05 — QA de ancho automatizado + 2 bugs de dominio en las salidas de roca.**
>
> **(1) QA de render, ahora automatizado (`test/layout-metrics.js` + `test/layout.test.js`).** El harness testeaba view-models, pero los dos peores bugs del rediseño fueron de **ancho** (chip `flex:none` con 74 chars que partía el nombre letra por letra; nav de 6 items donde "Calendario" no entraba en su cuota de ~60px) — invisibles para un test de lógica. Se modeló lo mínimo de flexbox para cazar esa clase: `findOverflows(html)` estima anchos y detecta 3 modos de fallo distintos — **desborde** (ni encogiendo entra), **aplastada** (la fila "entra" sólo porque una celda con `min-width:0` colapsó por debajo de su palabra más larga → texto partido) y **cuota** (celdas `flex:1` reparten parejo: el sobrante de una corta NO se le presta a una larga). Ignora filas con `overflow-x` declarado (scroll intencional). Nuevo `loadRenderApp()` en el harness: sandbox que ejecuta los renderers de verdad con un `document` que retiene el `innerHTML` de cada id. **Los 4 primeros tests verifican la herramienta** contra los dos bugs históricos y sus versiones corregidas — sin eso, los 13 tests siguientes pasarían en verde sin significar nada. *Resultado del barrido:* **48 ejercicios × 2 variantes + 10 pantallas completas → 0 desbordes**. La medición es estimada (±8%, de ahí `MARGEN=1.10`): **no reemplaza el QA en dispositivo**, sólo caza desbordes groseros en CI.
>
> **(2) Dos bugs REALES en el marcado de roca (encontrados auditando, no reportados).** Ambos en la frontera entre "el plan" y "el motor de carga": *(a) planificar una salida futura hundía la recuperación* — `markRockDay` aplicaba `hoursAgo:0` sin mirar la fecha, así que agendar el sábado desde el miércoles decía "acabás de escalar 4 h" y el score caía **de 100% a 8%** por algo que no había pasado. *(b) **el ACWR era ciego a la roca*** — las salidas nunca entraban en `cc_logs` (sólo tocaban `recData`), y `computeACWR()` lee `cc_logs`. Para el público de esta app la roca es la sesión **más dura de la semana**: la carga aguda se subestimaba sistemáticamente y la app recomendaba progresar justo cuando más carga se acumulaba. El ACWR **es** la alerta preventiva de lesión (Gabbett 2016), así que el fallo iba en la dirección peligrosa. Verificado: 8 salidas de roca → `cc_logs` vacío → `ratio:null`. *Fix:* `resolveRockLogging(dateStr, today)` **PURO** distingue pasado/hoy/futuro (futuro: no registra ni toca recuperación; pasada: registra con el timestamp DEL DÍA para que caiga en la ventana correcta; vieja: cuenta para el ACWR pero no pisa el check-in de hoy), `logRockOuting`/`unlogRockOuting` escriben en `cc_logs` con dedup por fecha y **respetan los logs manuales del usuario** (sólo borran los `auto`), y `applyRockSideEffects` unifica ambos call sites. *Bonus:* `blockToStype('outdoor')` caía en el fallback `'endurance'` → cada salida se contabilizaba con multiplicador 0.7 en vez de 0.9 (**−22%**). +13 tests.
>
> **(3) Bloque D fase 3 — la ventana de roca en la vista Semana (rediseñada sobre el hallazgo).** La tarea original ("surfacear días-candidatos con tap→markRockDay") resultó **casi redundante**: el planner ya reserva automáticamente los días de `U.rockDays` (`plannedRock:true`), así que no había "candidatos libres" que ofrecer. El valor real estaba en el hueco de (2): **una reserva que ya pasó no le preguntaba nada a nadie**. `rockCandidates()` (PURO) distingue los **tres** estados — `plannedRock` (tentativo), outdoor sin planned (confirmado), libre — y devuelve `kind:'confirm'` (día reservado que ya llegó → "¿saliste?", registra la carga) o `kind:'mark'` (día libre a futuro → agendar). No pregunta por reservas futuras (no tienen respuesta) ni reofrece lo confirmado. +14 tests.
>
> **(4) Limpieza de código muerto.** Borrados `renderHeroTodayMidline` (~115 líneas, nunca llamada, además interpolaba `ex.n`/`ex.det`/`ex.sci` sin `escapeHtml`), `toggleInstructions` (sólo la usaba ella), el bloque muerto del slider `ci-rpe` en `ciUpd()` (el RPE se elige con pills desde el refactor; `ci-rpe` y `ci-rpe-lbl` **no existen en el DOM** — verificado) y **~155 líneas de CSS huérfano** (`.workout-*`, `.exercise-*`, `.btn-finish`, `.btn-view`, `.instructions-content`: 0 usos en todo el repo).
>
> **(5) `.gitignore` (no existía).** El repo asumía que `sync-config.js` estaba git-ignorado (§2.1 lo dice) pero **no había `.gitignore` en ningún nivel**. Creado, cubriendo `node_modules/`, `sync-config.js` y los backups exportados (`*.ccenc`, que sí contienen datos personales). *Matiz honesto:* ni la anon key de Supabase ni el DSN de Sentry son secretos — viajan al navegador por diseño y la seguridad depende de la RLS — así que **no hubo fuga**; se ignora para no atar el repo a un proyecto concreto.
>
> ⚠️ **Pendiente manual del usuario:** (a) quedó un `node_modules/` **a medio instalar** (~9,7 MB, `npm install` se cortó por timeout y el mount no permite borrar) → `rm -rf ClimbCycle/node_modules && npm install` en local. (b) **ESLint no se pudo correr** esta sesión (sin red en el sandbox); se verificó `node --check` sobre los 77 archivos + simulación de boot de los 43 scripts + los 61 handlers generados por JS, todo limpio, pero **el lint queda pendiente de confirmar en local/CI**. (c) El **DSN de Sentry ya está pegado** en `sync-config.js` — §17.2 del Bloque A está más avanzado de lo que decía el doc.
>
> **CHEQUEO SISTEMÁTICO DE BUGS (post-Hoy).** Barrido automatizado: (a) los 95 handlers `onclick/onchange` → **todos apuntan a funciones existentes**; (b) `getElementById` vs ids reales (88 estáticos + 61 dinámicos) → sin referencias rotas; (c) **simulación de boot**: los 43 scripts cargados en orden en un sandbox + los 7 renderers principales ejecutados → **0 errores**; (d) sin ids duplicados en index.html. **Encontrado y corregido:** (1) *bug latente propio* — en `render-hoy.js` pasaba el nombre del ejercicio dentro de un `onclick` con `escapeHtml(...).replace(/'/g,…)`, que es incorrecto (escapeHtml ya convierte `'`→`&#39;` y el parser lo revierte dentro del atributo, rompiendo el JS): hoy no explota porque ningún ejercicio tiene apóstrofe, pero explotaría al agregar uno → ahora se pasa **solo el índice** (`hoyRest(i)`), eliminando la superficie de inyección. (2) *riesgo de layout* — con 6 items la nav dejaba ~60px por botón y "Calendario"/"Ejercicios" (10 chars a 11px) no entraban → labels acortados a **"Mes"/"Ejerc."** + CSS de seguridad (`nowrap`+ellipsis, e íconos más chicos <360px). **Deuda detectada (no bugs):** `renderHeroTodayMidline` + `toggleInstructions` son **código muerto** (nunca se llaman), y en `ciUpd()` el bloque del slider `ci-rpe` quedó muerto tras el refactor a pills (está guardado con `if(rp)`, no crashea).
>
> **REDISEÑO COMPLETO (Claude Design) — 3 pantallas implementadas.** El diseño llegó como `.dc.html` y **respetó las restricciones** (312 usos de variables CSS, solo 2 colores hardcodeados, ningún tamaño <11px), así que fue muy portable. (1) **Tarjeta de ejercicio** — 3 niveles de lectura: dosis+kg en Mono grande (lo que se relee entre series), progresión como única pieza tintada, y guía/ciencia plegadas. Nuevas puras: `splitDose` (dosis compacta vs. detalle vs. descanso) y `formatRest`. Se pasó de hex+alfa a **`color-mix()`**, lo que permite tintar con variables CSS. (2) **Hoy** — hero de 30px con color de fase, contador N/3 y barra de segmentos; **progreso por ejercicio** (dato NUEVO `exDone`, persistido en `cc_exdone`, en backups y en sync, indexado por ID no por posición), check de 44px en la zona del pulgar, ejercicio hecho se atenúa, y **la sesión se completa sola** al marcar el último (y se reabre si desmarcás). (3) **Inicio como hub** — 11 widgets sueltos → 8 en **4 grupos** (Estado/Accesos/Seguimiento/Plan); los 3 que duplicaban la sesión (next/today/todaylist) se apagan y se reemplazan por un **puente de una línea a Hoy**; macrociclo de 10 segmentos como único gráfico; tiles de 64px. Incluye **migración única** de configs pre-rediseño (si solo mergeáramos, el usuario quedaba con duplicados + nuevos = más abrume). (4) **Mini-player sticky** del temporizador sobre la nav: minimizar oculta el overlay **sin detener la cuenta**, con tiempo, pausa, +30s y tap para volver a pantalla completa.
>
> **Bugs propios encontrados y corregidos durante el rediseño (lecciones):** (a) *el diseño asumía datos más cortos que los reales* — la dosis del mockup era "5×10s" (6 chars) pero las `nota` reales llegan a 44, y en una grilla sin `min-width:0` **las celdas no encogen: desbordan**. (b) *peor*: puse `SYS_HUMAN` (descripciones de 42-77 chars) en un chip `flex:none`, que se comió el ancho y partió el nombre **letra por letra**; se creó `SYS_CHIP` con etiquetas cortas. Desde entonces **se calcula el ancho real contra un móvil de 390px** antes de dar por buena una tarjeta, y hay tests de regresión para ambos.
>
> **NUEVA PANTALLA "HOY" (6º tab) + 2 bugs de UI.** (1) **Bug "+ ver estructura" (reportado):** el markup era correcto (ids coincidían); la causa era que en pantalla angosta la fila `flex` desbordaba y **el área táctil del botón quedaba clipeada**. Fix: toda la barra es ahora el `<button>` (tap target completo), label corto y `gap`. (2) **Bug peor, encontrado auditando:** los textos de `WEEK_PROGRESSION` **re-prescribían protocolo** en categorías con protocolos heterogéneos → la app daba dos instrucciones contradictorias en la misma tarjeta (ej. "Pirámides en rutas · 2-3 ciclos" con progresión "20 min continuos"; `wall_training` decía "al 70%" mientras "Bouldering al límite" pide 95-100%; `power_endurance` decía "descanso 3 min" contra ejercicios con "rest=work"/"1:1"). Fix: reescritos para **dosificar** (extremo bajo/medio/alto del rango que pide el ejercicio), que es su función real; los `load` numéricos (que usa `intensity.js` para los kg) quedaron intactos. (3) **`js/render-hoy.js`** — pantalla de ejecución enfocada: solo la sesión de hoy, tarjetas de ejercicio, **temporizador de descanso por ejercicio precargado** con lo que el ejercicio pide (`parseRestSeconds`, PURO + 6 tests; 30/48 ejercicios dan valor exacto, el resto son de descanso relativo 1:1 y abren el timer manual), botón grande de "marcar hecha" y estados para día de descanso/roca/sesión ya hecha. Cableado en nav (`data-p="hoy"`), `goPage`, y **ambos eventos del Bus** para que se repinte al marcar. *División de responsabilidades:* **Inicio = hub** (objetivos, plan, proyectos, protocolos, timer, stats); **Hoy = ejecución**.
>
> **VERIFICACIÓN CONTRA LITERATURA (web, jul-2026) — colocación en el macrociclo + novedades.** *Colocación:* verificada y correcta. Las secuencias de fase por nivel son coherentes con las fuentes (principiante: base aeróbica larga → fuerza; intermedio: resistencia → fuerza → potencia (Horst); avanzado/elite: fuerza → potencia → resistencia = peaking pre-temporada, modelo Barrows). Verificado además que la progresión por nivel funciona (principiante recibe ARC suave; avanzado recibe capacidad anaeróbica dura) y que `exPerSession` 2/3/4/4 es por diseño. *Novedades aplicadas:* (1) **`str1c` Density hangs** (Tyler Nelson) — protocolo NUEVO en el pool: 20-40s a intensidad moderada, foco en remodelación del tendón; la evidencia reciente indica que la carga ligera frecuente mejora la fuerza de forma comparable a la máxima y que **combinarlas es aditivo**. Bajo riesgo → útil con molestias o carga acumulada. Con esto el slot de dedos rota entre 3 protocolos distintos en 3 semanas. (2) Cita de `str1` mejorada a **Eva López-Rivera** (la data más rigurosa: max hangs de bajo volumen/carga máxima, ~34% de mejora en resistencia de agarre en 8 semanas). (3) `str1b` (repeaters): matizado que el estímulo se corre a fuerza-RESISTENCIA (max hangs = frescura y reclutamiento; repeaters = fatiga y volumen) → puente hacia la fase de resistencia. (4) `end4` (ARC): matizada la afirmación de capilaridad — las adaptaciones vasculares en escaladores están documentadas (mayor capilarización y diámetro de arteria braquial), pero el mecanismo exacto sigue en estudio. *Evaluado y NO incorporado:* **BFR (restricción de flujo)** — la evidencia 2025-26 es contradictoria (mejora el flujo braquial, pero un estudio reporta caída de fuerza de dedos y "utilidad práctica limitada"); no está maduro para prescribirlo. *Nota abierta:* la periodización **ondulante** muestra ventajas frente a la lineal en fuerza general; el plan es lineal (Horst clásico) — posible línea futura, no un error.
>
> **Enriquecimiento de contenido:** ejercicios con guía completa (`how` paso a paso + `errors` comunes) pasaron de **7 → 16**. Priorizados por riesgo de lesión y frecuencia de programación: `str3` (dominadas lastradas), `str5` (lock-offs), `str6`/`str7`/`str8` (dedos avanzado/elite — donde los `errors` previenen roturas de polea), `pow1`/`pow8` (campus, riesgo articular), `pow3` (pliométricas), `del2` (antagonistas, se hace todas las semanas). Verificado que `renderExerciseGuide` los muestra en la UI. **Segunda tanda (resistencia): 16 → 25** — `end1`, `end3`, `end6`, `end8`, `end9`, `end10`, `end11`, `end12`, `end13`. El bloque de **resistencia queda 100% cubierto** salvo 2 warmups y 2 drills de técnica. **Quedan 21 sin guía**: 7 warmups (bajo valor), los drills `end0c`/`end0d`, varios de potencia (`pow1b`, `pow2`, `pow3b`, `pow5`, `pow6`, `pow6b`, `pow7`), `str2b` y 4 de deload (`del1`, `del3`, `del4`, `del5`).
>
> **AUDITORÍA DE CONTENIDO de los 47 ejercicios (vs fuentes).** 7 correcciones: (1) `pow8` estaba clasificado `An Cap` pero su propia ciencia describe RFD → **`An Pow`**. (2) `pow2` decía ser potencia pero prescribía descanso=trabajo (20s) → contradecía su propio "powered out, NOT pumped"; ahora **descanso completo 3-5 min** (ATP-PC). (3) `str0b` afirmaba que **la tracción es el predictor #1** de rendimiento — falso según Baláš/Laffaye (es la fuerza de DEDOS relativa al peso); corregido sin perder el motivo real (los tendones necesitan meses de adaptación). (4) **`pow4` (campus) prescribía 90-160 movimientos/sesión** — riesgo alto de polea/hombro; bajado a 4-6 series × 6-10 movs + `errors` y tope de 1 sesión/semana. (5) `pow7` era casi un duplicado de `str2` → redefinido como **movimiento aislado / max recruitment**. (6) `end13` ("4x4 al límite", 70-85%) solapaba con `end2` (70-80%) → ahora **80-90%** y explicitado como progresión de end2. (7) `str1` decía rotar agarre "cada 2-3 semanas" pero `getGripForWeek()` rota cada semana → alineado a 1-2. Además, la fase `condi` describía los antagonistas como *"solo si queda energía"*, contradiciendo a `del2` y a la literatura de prevención → reformulado como no opcional (Horst: 2×/semana todo el ciclo). **Verificado:** 47 ejercicios, 0 ids duplicados, 0 campos faltantes, 0 contradicciones sys↔ciencia restantes, herramientas de riesgo (campus/one-arm) correctamente gateadas.
>
> **Pool ampliado (más rotación):** de 32 → **44 ejercicios**. Intermedio: `str2b` (bloques al límite), `pow1b` (dead-points), `pow6b` (bloques potentes en spray), `end0c`/`end0d` (drills de técnica — cerró el hueco de `endurance/technique` que estaba en 0), `del5` (lectura de vías). Avanzado/elite fuerza/potencia: `str7` (min-edge hangs), `str8` (one-arm max hang, elite), `pow7` (limit bouldering), `pow8` (campus bumps, elite). **Resistencia dura** (era 0 a `minLevel≥2`): `end11` (bloques enlazados al límite), `end12` (intervalos de vía al límite), `end13` (4x4 duro). **Total 47 ejercicios**; los de nivel avanzado+ pasaron de 5 → 12. Todos citados. Rotación verificada a todos los niveles.
>
> **⚠️ INCIDENTE de datos (resuelto):** al intentar borrar el stub `js/data.js`, se borró por error la **carpeta `js/data/`** (los 11 archivos de datos). Se recuperó de la **Papelera de reciclaje** (completa, con los ejercicios de la sesión). Lección: **el mount NO permite borrar archivos** (`Operation not permitted`) — cualquier limpieza (borrar el stub `js/data.js`, huérfanos) es **tarea manual del usuario en su repo/OS**, con MUCHO cuidado de no confundir el archivo `js/data.js` con la carpeta `js/data/`. El stub y `ClimbCycle_v5.html` **siguen sin borrarse** (el huérfano v5 sí se borró).
>
> **Docs + limpieza:** README reescrito (era de 2 líneas) con quickstart/tests/arquitectura/config, y nuevo **`CONTRIBUTING.md`** con recetas concretas (cómo agregar ejercicio / test / widget / test unitario).
>
> **FIX (2 bugs reportados de fecha de inicio):** (1) **No se podía elegir HOY como inicio** — raíz: `TODAY=new Date()` tenía la hora actual, así que en el picker `date<TODAY` marcaba hoy-a-medianoche como día pasado. Fix de raíz: **`TODAY` normalizado a medianoche** (`setHours(0,0,0,0)`) — hoy ya es seleccionable y se elimina toda una clase de bugs de comparación de fechas. +2 tests de regresión. (2) **"Entrené hoy" no funcionaba con el plan a futuro** — si `TODAY < startDate`, `trainedToday()` ahora ofrece **empezar el plan hoy** (mueve la fecha de inicio a hoy, regenera y registra la sesión; no se pierde progreso porque el plan no había arrancado).
>
> **Pool de ejercicios + observabilidad:** (1) **Pool ampliado** para más rotación: `str1b` Repeaters (finger, complementa los max-hangs de str1 → el slot ancla de fuerza ahora ROTA a intermedio) y `pow3b` Bloqueos/lock-offs (power/pull, 2ª opción). Con fuentes citadas. Verificado: finger_strength intermedio pasó de 1→2 opciones y rota semana a semana. (2) **`js/observability.js`** — crash reporting Sentry **drop-in**: `makeSentryReporter` (puro, testeado), `sentryConfigured`, `initSentry` (carga el SDK + `setErrorReporter`). **No-op hasta setear `window.CC_SENTRY_DSN`** (en sync-config.js). +5 tests. Falta solo: crear el proyecto Sentry y pegar el DSN.
>
> **FIX (bug reportado): un finde de roca deloadeaba toda la semana.** `applyRockDayToPlan` (a) trataba cada día de roca por separado → Sáb y Dom **stackeaban** sus reducciones, y (b) tenía `endurance→deload` en el downgrade → días reducidos se etiquetaban como la fase *deload*. Corregido: un bloque de roca (días consecutivos) = **un** evento (solo el fin del bloque descansa/alivia, sin stacking; guardas `blockContinuation`/`alreadyReduced`), endurance ya NO se downgradea (es de baja intensidad; alcanza el día de descanso), y se preserva `originalBlock` para restaurar bien. Resultado: Sáb+Dom → **1 día de descanso, 0 deload**. Alineado con las fuentes (Horst: el deload es una fase planificada, no lo dispara un finde). +3 tests (caso Sáb+Dom, round-trip de removal, y que un día suelto SÍ siga aliviando la próxima sesión fuerte).
>
> **Feature: rotación de ejercicios entre semanas.** `selectExercises` ahora **usa el historial** (antes `lastExUsed` se escribía pero no se leía): el scan de `planMap` junta `usedLastWeek` además de `usedThisWeek`, y prefiere candidatos frescos en ambas ventanas + avanza el pick por `weekIdx` → semana N se siente distinta de N-1, sin perder el determinismo por fecha. Rota donde el pool de nivel lo permite (categorías con 1 solo ejercicio de nivel no pueden rotar — es data, no bug). +3 tests (`rotation.test.js`: determinismo, no-idéntico semana a semana, más variedad en 3 semanas).
>
> **Feature días flexibles — FASE 2:** (A) **"Entrené hoy"** (log-as-you-go, para desorganizados): botón en quick-actions de días de descanso que registra la sesión en el día real. `resolveTrainedToday(weekDays)` PURO+testeado decide: marcá hoy / anclá una sesión pendiente a hoy / sesión extra / ya-registrado; el wrapper `trainedToday()` aplica con los primitivos existentes. (B) **Ventana flexible de roca**: editor "Días de roca" en Perfil (misma UI parametrizada que gym, ahora `renderDayWindowSection(kind)`), reusa el core compartido `rescheduleFuture()` (gym y roca). +5 tests (resolver). Falta (fase 3, opcional): surface de días-candidatos de roca en la vista Semana (hoy se marcan desde Home/día).
>
> **Feature: ventana flexible de gym (rocódromo) — fase 1.** Para el público "desorganizado": `U.gymDays` ya era *disponibilidad* (el plan elige N/semana por fase y espacia con max-min-gap). Se sumó: (1) **editar la ventana cuando quieras** desde Perfil (`renderGymWindowSection`/`saveGymWindow`), que **re-programa solo el futuro** (`rescheduleGymWindow` → `mergePreservePast`, PURO+testeado: preserva pasado + sesiones logueadas + tweaks manuales, re-arma futuro). (2) **Aviso de descanso** en la vista Semana cuando hay sesiones en días seguidos (`hasTightSpacing`, puro+testeado; usa offsets intra-semana, no DOW). (3) Reencuadre de copy en onboarding. +8 tests (`flexdays.test.js`). Falta (fase 2): replicar el mismo modelo flexible a **roca**, y opcional botón "Entrené hoy" (log-as-you-go).
>
> **Cabos sueltos (post-Bloque B):** (a) **a11y**: subidos a 11px los ~110 `font-size` 8-10px inline generados por JS (render-\*, tests.js, etc.) — cierra el gap del bump de Bloque A que solo tocó CSS+index.html. Quedan solo los `font-size="8"` de **atributos SVG** en gráficas (labels de eje diminutos). (b) **Backup cifrado e2e**: `test/backup-crypto.test.js` — round-trip real `.ccenc` por `importUserData` (pass correcta restaura, incorrecta rechaza). Cierra el gap de Bloque A. (c) **Store accessors**: `Store.setUser(patch)` / `Store.setRec(patch, emit)` (patch+commit). Hallazgo: el código **ya batchea** las escrituras (saveU se llama 1 vez), así que hay pocos targets — migrado el patch de `recData` en `markRockDay`; el resto del facade es API forward-looking.
>
> **Cambios de la sesión (Bloque B — deuda estructural):** (0) `js/store.js` — **capa de commit** (#7): centraliza el trío *mutá→persistí→emití* en `commit(slice)` (registry `slice → {save, evento del Bus}`) + `commitAll()`. Migrados 7 sitios de acción (`saveX()`+`Bus.emit()` adyacentes) en planner/render-home a `commit()`. 5 tests. **Enfoque deliberado:** NO es un store con getters/setters en los 355 reads (big-bang de alto riesgo sin build/ESM); se centraliza el *write path*, que es donde estaban los bugs. Facade de accessors = siguiente incremento opcional. (1) `js/storage.js` — **dueño único** de la capa localStorage: mató el doble monkeypatch (auth secuestraba, sync lo esquivaba). Ahora auth solo registra el "usuario activo" (provider) y sync usa `ccRawGet/Set/Remove`. 5 tests (prefijo, aislamiento entre usuarios, bypass raw). (2) `renderExerciseCard` en render-utils.js: la tarjeta "rica" estaba duplicada verbatim 2× en `showDayPanel` → unificada + 5 tests. Nota: las tarjetas compactas de week/plan se dejaron separadas a propósito (variantes distintas; merge = sobre-abstracción). (3) `tsRecView()` extraído de `buildTsTab` (view-model puro + 5 tests). (4) +15 tests (252→267). **Diferido a propósito:** split view-model/paint *completo* de showDayPanel/buildTsTab (el paint no es verificable sin browser → riesgo de regresión), store.js (#7), render-por-región (#11) y ESM/esbuild (#12).
>
> **Cambios sesión previa (Bloque A):** (1) `js/errors.js` — log central + handlers globales (`window.onerror`/`unhandledrejection`) + reporter pluggable (hook para Sentry, sin DSN todavía); catches de cara al usuario (import/export/backup/auth/ics/sync) ahora avisan por toast en vez de tragar el error. (2) Harness con soporte **async** + Web Crypto → se testean por primera vez `crypto.js` y `auth.js`. (3) +37 tests: `errors`, `persistence`, `crypto` (round-trip/tamper/wrong-key), `auth` (hash/migración/aislamiento). (4) a11y: `--text-muted` y `--text-secondary` (oscuro) ahora cumplen WCAG AA; piso de fuente subido a 11px. (5) CI (GitHub Actions) + ESLint (0 errores) en cada push; 2 bugs `no-redeclare` corregidos.

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
│   ├── observability.js  # crash reporting Sentry drop-in (no-op sin CC_SENTRY_DSN): makeSentryReporter + initSentry
│   ├── storage.js        # DUEÑO ÚNICO de localStorage: prefijo por usuario + ccRawGet/Set/Remove (device-global) + ESPEJO en memoria para el vault (lecturas síncronas sobre datos descifrados)
│   ├── crypto.js         # PBKDF2 + AES-GCM (WebCrypto) + DEK (ccNewDataKeyHex/ccImportDataKey/ccExportDataKeyHex)
│   ├── vault.js          # cifrado EN REPOSO: espejo en memoria + DEK envuelta 2× (contraseña y clave de recuperación). INERTE sin CC_VAULT_ENABLED
│   ├── auth.js           # auth local, hashing, prefijo de claves por usuario
│   ├── state.js          # ESTADO GLOBAL (U, planMap, sessionLog, recData…) + persistencia + backup
│   ├── events.js         # Bus pub/sub mínimo + wireBus() (fan-out de render)
│   ├── store.js          # capa de commit: commit(slice) centraliza persist+emit (mutá→commit). Registry slice→{save,evento}. + commitAll()
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
└── test/                 # 38 archivos *.test.js + harness.js (loadApp/loadSecureApp/loadRenderApp/loadDevice) + layout-metrics.js (ancho sin browser) + fake-supabase.js (servidor de prueba) + sync-live.js (e2e contra Supabase real, fuera de npm test) + assert.js (flush) + run.js
(repo root: .github/workflows/ci.yml — corre tests + lint en cada push)
```

### 2.2 Módulos y capas (orden de carga real)

El orden importa porque son globales por `<script>`. De arriba a abajo en `index.html`:

```
errors → storage → crypto → auth → data/* (11) → state → events → store → planner → recovery →
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
- **Lecturas directas** a las globales (223× `U.`, etc.) — a propósito, no son fuente de bugs. **El write path está centralizado** en `store.js`: tras mutar, un `commit(slice)` persiste (`saveX`) y emite el evento del Bus en un solo lugar (antes era "mutá y acordate de guardar/repintar", convención implícita y olvidable). Falta migrar los sitios que aún llaman `saveX()` suelto y un facade de accessors de escritura (opcional).

### 2.5 Almacenamiento

- **localStorage**, con **prefijo por usuario** ahora en `storage.js` (dueño único que sobreescribe `localStorage.getItem/setItem/removeItem` una sola vez): `cc_plan` → `cc_<usuario>_plan`. `auth.js` solo registra el usuario activo vía `setStorageUserProvider(getCurrentUser)`. Claves de auth (`cc_users`, `cc_current_user`) NO se prefijan. Claves de sync (`ccsync_*`) tampoco: sync usa `ccRawGet/ccRawSet/ccRawRemove` (device-global) de `storage.js`.
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
10. **`store.js` como capa de commit, NO como store de getters/setters** (Bloque B, #7). *Contexto:* el estado son globals (`U`, `planMap`…) con 355 lecturas directas y sin build/ESM. *Decisión:* centralizar solo el *write path* (`commit(slice)` = persist + emit), que es donde estaban los bugs ("mutá y acordate de guardar/repintar"). *Descartado:* envolver los 355 reads en `Store.get/set` (big-bang de alto riesgo, bajo ROI para solo-dev pre-usuarios). *Camino abierto:* un facade de accessors de escritura puede sumarse encima, incrementalmente, sin re-tocar los reads.

---

## 5. Estado de cada módulo

| Módulo | Estado | Notas |
|---|---|---|
| `data/*` (11) | ✅ Terminado | Datos puros, byte-verificados en el split. Los rangos de test podrían citar fuente numérica exacta. |
| `errors.js` | ✅ Terminado | Nuevo (Bloque A). Log central + ring buffer + handlers globales + reporter pluggable. Testeado (7 tests). |
| `observability.js` | ✅ Terminado (scaffold) | Crash reporting Sentry drop-in. `makeSentryReporter` puro + testeado. **No-op hasta `window.CC_SENTRY_DSN`** — falta crear proyecto Sentry + pegar DSN. |
| `storage.js` | ✅ Terminado | Nuevo (Bloque B). Dueño único de localStorage: prefijo por usuario + raw device-global. Testeado (5 tests). Reemplaza el doble monkeypatch auth+sync. |
| `crypto.js` | ✅ Terminado | Ahora **testeado en el harness** (round-trip, tamper, wrong-key, determinismo de hash) — antes era verificación manual. |
| `auth.js` | ✅ Terminado (funcional) | PBKDF2 + migración, **testeado** (aislamiento vía `ccUserKey`, register/login, migración SHA-256→PBKDF2). **Ya NO secuestra `localStorage`** (eso vive en storage.js); solo registra el usuario activo. |
| `state.js` | 🟡 Necesita refactor | Persistencia **testeada** (round-trips + collect/import). Suma `clearExDone` / `staleExDoneKeys` (PURO) / `pruneExDone`: el progreso por ejercicio sigue al estado de la sesión y se purga al regenerar el plan. Sigue siendo estado global mutable sin encapsular; candidato a `store.js`. |
| `events.js` | ✅ Terminado | Bus mínimo, testeado. |
| `store.js` | ✅ Terminado (capa de commit) | Nuevo (Bloque B, #7). `commit(slice)` centraliza persist+emit; 7 sitios migrados. + `Store.setUser/setRec` (patch+commit) — 7 tests. NO es getters/setters full (decisión: ver §4/§15). |
| `planner.js` | ✅ Terminado / 🟡 funciones largas | `generatePlan`, `selectExercises`, scheduling y `sessionsForPhase` OK y testeados. Nuevos puros: `resolveSessionTiming` (pasado/hoy/futuro de CUALQUIER sesión; `resolveRockLogging` quedó como alias) y `rockCandidates` (los 3 estados de un día de roca); `applyRockSideEffects` unifica los efectos no-plan de marcar roca. |
| `recovery.js` | ✅ Terminado + calibrado | Motor + ACWR testeado. `loadForLog` sigue **session-RPE de Foster** (`dur × RPE`, sin factor de tipo: era doble conteo); el factor sí se conserva en `calcRecovery`, que modela recuperación tisular. `SESSION_RPE` calibrado contra Lattice. **Dueño del historial de carga**: `logSessionDone` (punto de entrada único para "sesión hecha", lo llaman markSess / auto-completar / trainedToday / roca), `estimateSessionLoad` (RPE por fase, PURO), `writeSessionLog`, `dayTimestamp`, `logAutoSession`/`unlogAutoSession`. Antes `cc_logs` sólo se escribía desde el modal de detalle y el ACWR no se activaba nunca. `blockToStype` mapea `outdoor` explícitamente. Mezcla motor puro con DOM (check-in/logger). |
| `test-interpret.js` | ✅ Terminado | Extraído y testeado (5 intérpretes). |
| `tests.js` | 🟡 Parcial | Dashboards y gráficas OK. Se extrajo `tsRecView()` (view-model puro, testeado) de `buildTsTab`, pero `buildTsTab`/`makeTestDashboard` siguen siendo funciones-god con mucho HTML inline (descomposición completa pendiente, requiere QA de browser). |
| `intensity.js` | ✅ Terminado | tests→kg, testeado. **Ahora mira la antigüedad del test**: `rateTestFreshness`/`categoryFreshness` (PUROS) marcan `stale` cuando el dato pasó del doble del intervalo, y `staleLoadNote` da el texto del aviso (una sola fuente para los 3 renderers que imprimen kg). No aplica decaimiento automático a propósito — ver §8. |
| `goal.js` | ✅ Terminado | Motor de objetivo testeado. |
| `ics.js` | ✅ Terminado | Export .ics testeado (RFC 5545). |
| `projects.js` | ✅ Terminado | CRUD puro testeado + widget. **Los días con intentos ahora cuentan como carga** (`syncProjectLoad`, en recovery.js): agrupa por día y respeta una sesión ya registrada. Antes eran una isla y el ACWR no los veía. |
| `timer.js` | ✅ Terminado | Motor puro testeado (incl. prep). UI sin test (DOM). |
| `render-utils.js` | 🟡 OK con deuda | Buenos helpers (escapeHtml, confirmDialog, glosario) + `renderMacrocycleSummary` (largo). |
| `a11y.js` | ✅ Terminado (tanda 1+2) | Falta auditoría de contraste/tamaños. |
| `render-home.js` | 🟡 Mejor | `showDayPanel` bajó ~30 líneas: la tarjeta rica (duplicada 2×) ahora llama a `renderExerciseCard` (render-utils). **−126 líneas** al borrar `renderHeroTodayMidline`/`toggleInstructions` (código muerto). Sigue siendo la función más pesada; descomposición completa pendiente (requiere QA browser). |
| `render-utils.js` | ✅ Terminado | Ahora aloja `renderExerciseCard` (tarjeta rica unificada, testeada) además de escapeHtml/confirmDialog/glosario/renderExerciseGuide. |
| `render-week.js` / `render-plan.js` / `render-calendar.js` / `render-profile.js` / `render-onboarding.js` | 🟡 OK | Las tarjetas compactas de week (`renderWkExCard`) y plan (`renderExCard`) se dejan como **variantes distintas a propósito** (border/badges/bg diferentes; merge sería sobre-abstracción). `render-week` suma el bloque de roca (`renderRockWindowHint` + `wkMarkRock`/`wkConfirmRock`/`wkSkipRock`). ⚠️ Interpola `e.n`/`e.nota`/`e.det` sin `escapeHtml` — hoy son datos estáticos del pool (no de usuario), pero es una regla del proyecto que conviene sostener. |
| `widgets.js` | ✅ Terminado | Registro de widgets = el punto de extensión más limpio del código. |
| `sync.js` | ✅ Lógica + transporte testeados | **Tenía el peor bug de la auditoría**: el pull no ocurría nunca (comparaba contra `Date.now()`), así que el sync era unidireccional y el segundo dispositivo pisaba al primero. Ahora `resolveSyncDirection` (PURO) compara `lastPush` vs `lastLocalChange` vs el remoto y devuelve también **`conflict`**, que no pisa nada y pregunta. Copia de rescate `ccsync_prepull` antes de aplicar un remoto. **E2E sobre HTTP real** contra un servidor que habla el protocolo de Supabase (12 tests: dos dispositivos, conflicto, refresh de token, RLS, rescate). Falta sólo correrlo contra un Supabase **de verdad** (`npm run test:live`, credenciales del usuario). |
| `coach.js` | ✅ Corregido + e2e | **Filtraba el bundle completo al coach** (el recorte corría en SU navegador). Ahora el atleta publica un resumen en `coach_summaries` y los datos privados no salen. 11 tests e2e sobre HTTP, incluida la demostración del bug viejo. ⚠️ **Requiere correr el SQL nuevo**, con el `drop policy` incluido. v1 solo lectura. |
| `pwa.js` | 🟡 Funcional con límite | Notificaciones solo al abrir la app (no background real). |
| `app.js` | ✅ Terminado | Init + navegación. |
| `data.js` (stub) | 🗑️ Deuda cosmética | 2 líneas; no se carga; el mount no permitió borrarlo. |

---

## 6. Funcionalidades implementadas

- Onboarding de 7 pasos + quickstart; diagnóstico rápido finger/pull **con fecha del test**.
- Generación de macrociclo (6/10 semanas) por nivel + objetivo, reponderado por grado meta.
- **Frecuencia semanal variable por fase** según disponibilidad (taper de volumen).
- Selección de ejercicios por composición de slots + semilla determinista + **rotación real entre semanas** (usa `usedLastWeek` + offset por `weekIdx`; semana N ≠ N-1 donde el pool lo permite).
- Pool de ejercicios rico (warmup/strength/power/endurance/deload) con "cómo hacerlo", tips, errores, ciencia.
- Progresión intra-fase con **carga objetivo en kg** derivada de los tests (Max Hang / 3RM).
- Protocolos de dedos (Lattice/Eva López) con cargas calculadas.
- **Temporizador de intervalos** (series/reps/trabajo/descansos + **preparación 10s**), integrado con protocolos + kg, con pitidos/vibración.
- Motor de recuperación: check-in + score + interpretación + **ACWR (carga aguda:crónica)** + alerta preventiva de lesión.
- Tests de evaluación (5) con interpretación, dashboard y **gráfica de progreso (SVG con bandas de rango)**.
- Motor de objetivo (grado meta → capacidades prioritarias + ejercicios).
- Días de roca con "ripple" **por bloque** (un finde de roca = 1 evento: 1 día de descanso + a lo sumo 1 sesión aliviada, sin stacking ni deload) + edición manual por día.
- **Ventana flexible de gym y roca** (para desorganizados): declarás los días que *podés* ir; el plan arma N/semana y los espacia. Editable siempre desde Perfil (editor parametrizado gym+roca), re-programa solo el futuro sin pisar lo hecho. Aviso de descanso si quedan sesiones en días seguidos.
- **"Entrené hoy"**: botón en quick-actions (días de descanso) que registra que fuiste al gym aunque no tocara — marca hoy, ancla una sesión pendiente al día real, o registra sesión extra, según corresponda.
- **Carga interna según la literatura** (2026-08-05): session-RPE de Foster (validado en escalada) y RPE por fase calibrados contra Lattice Training, en vez de valores inventados.
- **Modo entrenador con privacidad real** (2026-08-05): el coach ve un resumen publicado por el atleta, no su historial. Peso, edad y notas de sesión no salen del dispositivo del dueño. Revocar borra el resumen.
- **Sync probado de punta a punta** (2026-08-05): 12 tests e2e sobre HTTP real con dos dispositivos simulados, más `npm run test:live` para correr lo mismo contra un Supabase de verdad.
- **Sync bidireccional de verdad** (2026-08-05): el pull ocurre cuando corresponde, y si los dos lados cambiaron la app **pregunta** en vez de pisar. Copia de rescate antes de aplicar un bundle remoto.
- **Los días de proyecto cuentan como carga** (2026-08-05): agrupados por día, sin duplicar una sesión ya registrada.
- **Aviso de test vencido** (2026-08-05): si los kg prescritos salen de un test de más del doble del intervalo recomendado, la tarjeta lo marca ("test de hace N meses — revalidá") en vez de mostrarlo como dato fresco.
- **Toda sesión hecha cuenta como carga** (2026-08-05): el botón grande, completar los ejercicios, "Entrené hoy" y las salidas de roca registran su carga en `cc_logs` (estimada por fase, `auto`; el registro detallado la reemplaza). Sin esto el **ACWR no se activaba nunca** y la alerta de lesión era decorativa.
- **Roca ↔ carga real** (2026-08-05): la vista Semana **pregunta por las reservas de roca que ya pasaron** ("¿saliste?" / "no salí"), y confirmar **registra la salida en `cc_logs`** para que cuente en el ACWR. Agendar una salida futura ya **no** hunde la recuperación del día de hoy. Los días libres de la ventana se pueden agendar desde la misma vista.
- Sistema de **proyectos** (vías/bloques) con intentos **fechados**, estado y progreso.
- Auth local multi-usuario (PBKDF2).
- Backup export/import + **backup cifrado (AES-GCM)**.
- Export del plan a **.ics** (calendario).
- **Sync** opcional con Supabase (conflictos por timestamp).
- **Modo entrenador** (compartir datos read-only vía código + RLS).
- **PWA** instalable + offline (SW network-first) + **notificaciones locales** opt-in.
- **Manejo de errores central** (`errors.js`): log buffer + `window.onerror`/`unhandledrejection` globales + toast al usuario en operaciones críticas (import/export/backup/auth/ics) + `setErrorReporter()` para enchufar Sentry sin tocar el resto.
- **CI + lint**: GitHub Actions corre `node test/run.js` + ESLint 9 en cada push (0 errores).
- a11y: zoom habilitado, teclado en calendario, focus-trap en modales, roles ARIA en tabs/sliders/nav, `aria-current`; **contraste WCAG AA** en textos muted/secondary (verificado por cálculo) y **piso de fuente 11px** en CSS, index.html **y los ~110 estilos inline generados por JS** (solo quedan `font-size="8"` de atributos SVG en gráficas).
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
| ~~**Datos en reposo en texto plano**~~ 🟡 RESUELTO tras el flag | Exposición en dispositivo compartido/robado | Alta (privacidad) | `vault.js` implementado y testeado, **apagado por defecto** (`CC_VAULT_ENABLED`). Falta el QA de navegador para activarlo. |
| **Cache-busting fue manual** (`?v=`), causó ver versiones viejas | El usuario no veía cambios | Media (ya mitigado: SW network-first + bump de versión) | Automatizar el versionado en un build |
| **Notificaciones solo al abrir la app** | Recordatorios débiles (retención) | Media | Push server o Periodic Background Sync vía TWA (§16.1) |
| ~~**Sync sin e2e**~~ 🟡 CASI RESUELTO | La costura lógica↔red ya está cubierta (12 tests e2e sobre HTTP, que encontraron 2 bugs más). **Falta correr `npm run test:live` contra un Supabase real** para validar RLS y esquema | Media | Crear un proyecto Supabase de prueba y correrlo |
| ~~**Contraste/9px** en textos~~ ✅ RESUELTO | Legibilidad, WCAG AA | — | Tokens muted/secondary a AA (verificado por cálculo) + piso 11px en CSS, index.html **y ~110 estilos inline JS**. Sobra solo: `font-size="8"` de **atributos SVG** (labels de eje) y **QA visual en dispositivo** del re-flow. |
| **Huérfano `ClimbCycle_v5.html`** | Confusión (el usuario abrió ese por error) | Baja | Borrarlo o moverlo a `/legacy` |
| **`data.js` stub** no borrable | Cosmético | Baja | Borrar cuando el entorno lo permita |
| **README de 2 líneas** | Onboarding de devs | Baja | Escribir README + ARCHITECTURE (este doc ayuda) |
| **Re-render total por acción** | Perf en gama baja | Media | Render por región (el Bus ya lo habilita) |
| ~~**`localStorage` monkey-patch doble** (auth + sync)~~ ✅ RESUELTO | Fragilidad por orden de carga | — | Encapsulado en `storage.js` (dueño único) + 5 tests. |

*No hay bugs funcionales conocidos que rompan la app hoy: la suite (**386**) está verde y el boot de los 43 scripts no lanza ReferenceError (verificado en sandbox, igual que los 61 handlers generados por JS). ⚠️ **ESLint no se pudo correr el 2026-08-05** (sin red en el entorno): se sustituyó por `node --check` sobre los 77 archivos, pero **el lint queda pendiente de confirmar en local/CI**. En Bloque A se corrigieron 2 bugs latentes de `no-redeclare` (`var pid` duplicada en render-home; `di` redeclarada en render-week).*

> **Corregidos el 2026-08-05 — 5 bugs reales, ninguno reportado, todos en la frontera plan ↔ carga:**
>
> | # | Bug | Efecto medido |
> |---|---|---|
> | 1 | **`cc_logs` casi no se escribía**: sólo el modal de detalle lo alimentaba; el botón grande, el auto-completar por ejercicios y "Entrené hoy" no | 10 sesiones hechas → `ratio:null` → **la alerta de lesión no se disparaba nunca** |
> | 2 | **El ACWR era ciego a la roca**: las salidas no entraban en `cc_logs` | la sesión más dura de la semana no contaba; el error iba hacia "progresá" |
> | 3 | **`saveSessionLog` guardaba `ts:Date.now()`** en vez del día de la sesión | registrar una sesión de hace 6 días la metía en la ventana **aguda** de hoy |
> | 4 | **`saveSessionLog` y `markRockDay` fijaban `hoursAgo:0`** sin mirar la fecha | registrar una sesión vieja → recuperación **100% → 0%**; agendar roca futura → **100% → 8%** |
> | 5 | `blockToStype('outdoor')` caía en el fallback `endurance` | **−22%** en la carga de cada salida de roca |
>
> *Los 5 son el mismo patrón*: el estado del **plan** y el de la **carga** se escriben por separado y es fácil actualizar uno y olvidar el otro. Todo camino nuevo que dé una sesión por hecha debe pasar por **`logSessionDone`**.

> ⚠️ **Deuda nueva menor:** `render-week.js` interpola `e.n`/`e.nota`/`e.det` en HTML sin `escapeHtml`. **Hoy no es explotable** (son datos estáticos de `EX_POOL`, no entrada de usuario), pero contradice la regla de §10 y se rompería el día que un ejercicio venga de un bundle importado.

> ⚠️ **Deuda nueva menor (test infra):** el harness es sync-first; los tests async (crypto/auth) se resuelven en un `flush()` al final, por lo que sus ✓ pueden imprimirse fuera del bloque `describe` que los agrupa (cosmético; los conteos y fallos son correctos).

---

## 9. Deuda técnica (a saldar antes de una publicación oficial)

1. **Cifrado en reposo** de datos sensibles (peso, edad, tests).
2. **Arquitectura de render**: 🟡 parcial — tarjeta de ejercicio unificada (`renderExerciseCard`) ✅ y `tsRecView` extraído ✅; falta descomponer del todo showDayPanel/buildTsTab (requiere QA browser) y render por región.
3. **Encapsular el estado**: 🟡 parcial — `store.js` con `commit(slice)` ya centraliza persist+emit (el write path) ✅. Falta (opcional): facade de accessors de escritura (`Store.setUser(patch)`…) y migrar los `saveX()` sueltos restantes. Getters/setters full en los 355 reads = **descartado** (big-bang, ver §15).
4. ✅ ~~**Encapsular storage**~~ — HECHO: `storage.js` es el dueño único (fin del doble secuestro de `localStorage`).
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
- **XSS:** superficie por `innerHTML` masivo. Mitigado con `escapeHtml` en campos de usuario (nombre, notas, grado, proyectos), en el import de backup y —desde 2026-08-05— **también en los datos de ejercicio** (`n`/`nota`/`det`/`simple`/`sys`) en los 4 renderers que los imprimen. Hoy `EX_POOL` es estático y no era explotable, pero la app importa bundles: la regla es lo único que separa el render de un XSS el día que un ejercicio llegue de afuera. **Regla a sostener:** todo dato que va a `innerHTML` pasa por `escapeHtml`, venga de donde venga. Hay 2 tests que inyectan un ejercicio hostil y verifican que no sale crudo.

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
2. ✅ **Sentry CABLEADO** — el DSN ya está pegado en `sync-config.js` (`window.CC_SENTRY_DSN`), o sea el crash reporting está activo. *Resta:* verificar que llegue un evento de prueba a Sentry, y analytics privacy-friendly (PostHog/Plausible), que sigue pendiente.
3. ✅ Tests de `auth.js` (hash, migración, aislamiento) — en `test/auth.test.js`.
4. ✅ Tests de persistencia (round-trips + collect/import plano) — `test/persistence.test.js` — y **backup cifrado end-to-end** ✅ `test/backup-crypto.test.js` (`.ccenc` por `importUserData`: pass correcta restaura, incorrecta rechaza).
5. ✅ CI (`.github/workflows/ci.yml`) + ESLint 9 (`eslint.config.js`, 0 errores).
6. ✅ Auditoría a11y de contraste/tamaños (tokens AA + piso 11px). *Resta:* **QA visual en dispositivo** del re-flow.

**Bloque B — Saldar deuda estructural (alto)** — parcialmente HECHO en la sesión 2026-07-24
7. 🟡 **PARCIAL:** `store.js` con `commit(slice)` — persist+emit centralizado, 7 sitios migrados + `Store.setUser/setRec` (7 tests) ✅. **Descartado a propósito** el big-bang de getters/setters en 355 reads (alto riesgo sin build/ESM, bajo ROI pre-usuarios). *Hallazgo:* el código ya batchea las escrituras, así que quedan pocos targets de accessor (migrado el patch de `markRockDay`). Falta (bajo valor): migrar los `saveX()` batch restantes si algún día se hace ESM.
8. ✅ Encapsular `storage.js` — HECHO (dueño único + 5 tests). Ya no se secuestra `localStorage` en dos capas.
9. ✅ Unificar la tarjeta de ejercicio — HECHO para la tarjeta rica de `showDayPanel` (`renderExerciseCard` + 5 tests). Las compactas de week/plan se dejan distintas a propósito.
10. 🟡 **PARCIAL:** se extrajo `tsRecView()` de `buildTsTab` (testeado) y la tarjeta de `showDayPanel`. Falta el split view-model/paint **completo** de ambas god-functions → requiere **QA de browser** (el paint no es harness-testeable). No hacerlo a ciegas.
11. ⏳ **PENDIENTE (diferido):** Render por región vía el Bus — alto riesgo, perf no urgente.
12. ⏳ **PENDIENTE (diferido):** Build ligero (esbuild): ESM + minify + cache-busting automático. Multi-sesión; contradice "cambios chicos".

> **A11y follow-up:** ✅ HECHO — los ~110 `font-size` inline JS ya están a 11px. Sobra solo los `font-size="8"` de atributos SVG (labels de eje de gráficas) + QA visual en dispositivo.

**Bloque C — Seguridad y datos (alto/medio)**
13. Vault de cifrado en reposo (PBKDF2+AES-GCM + espejo en memoria) detrás de feature flag, con QA de navegador (§16.2).
14. Sync: usar `now()` del server para conflictos; test de "no leer datos ajenos" (RLS) contra una instancia de prueba.
15. Definir y publicar **política de privacidad** + completar el **Data Safety** (borrador).

**Bloque D — Producto / UX (medio)**
- ✅ **Días flexibles fase 2 HECHA:** ventana de roca en Perfil + botón **"Entrené hoy"** (`resolveTrainedToday` puro + `trainedToday`).
- ✅ **Fase 3 HECHA (2026-08-05), pero rediseñada:** la tarea como estaba escrita ("surfacear días-candidatos con tap→markRockDay") era **casi redundante** — el planner ya reserva los días de la ventana (`plannedRock`). El valor real estaba en el hueco que apareció auditando: **nadie preguntaba si la salida reservada ocurrió**, así que no contaba como carga. Ahora la vista Semana pregunta (`rockCandidates` puro, 3 estados) y confirmar alimenta el ACWR. +27 tests.
- ✅ **QA de render automatizado (2026-08-05):** `layout-metrics.js` + `layout.test.js` miden el HTML real contra 390px (48 ejercicios × 2 variantes + 10 pantallas → 0 desbordes). *Sigue pendiente el **QA en dispositivo real*** — la medición es estimada (±8%) y no ve fuentes reales, alturas, ni comportamiento táctil.
16. ✅ ~~`selectExercises`: variación de estímulos por historial~~ — HECHO (usa `usedLastWeek` + offset por semana; 3 tests). Se ampliaron los pools más finos: `str1b` (Repeaters, finger) y `pow3b` (Bloqueos, power/pull) → finger intermedio ahora rota. *Sigue habiendo* categorías con 1 ejercicio a ciertos niveles (más pool = más variedad).
17. ✅ Documentación: README reescrito + `CONTRIBUTING.md` ("cómo agregar ejercicio/test/widget") HECHO. *Resta (opcional):* JSDoc en funciones puras clave.
18. 🟡 Limpieza: los huérfanos `ClimbCycle_v5.html` y stub `data.js` **no se pueden borrar desde acá (el mount lo impide)** → `git rm` manual en el repo. No están referenciados en código.

**Bloque E — Camino a Play Store (medio/bajo, cuando el core esté validado)**
19. Empaquetar como **TWA** (Bubblewrap) + Digital Asset Links + firma + versionado; Lighthouse ≥ 90.
20. Notificaciones background vía el TWA (o push server) + test cerrado en Play Console.

---

---

## 18. Próxima sesión — arrancá por acá (estado al 2026-08-05)

**Antes que nada, 3 tareas manuales que el entorno no permitió hacer:**

1. `rm -rf ClimbCycle/node_modules && npm install` — quedó a medio instalar (~9,7 MB) y el mount no deja borrar.
2. `npm run lint` — **no se pudo correr esta sesión** (sin red). Es lo primero que hay que confirmar: la suite está verde y el boot limpio, pero el lint no se verificó.
3. `git rm` de los huérfanos `Climbing/ClimbCycle_v5.html` y el stub `js/data.js` (§7, siguen sin poder borrarse desde acá).

**Candidatos para la próxima, en orden de valor:**

| # | Tarea | Por qué | Riesgo |
|---|---|---|---|
| 1 | **QA en dispositivo real** | El único hueco que la automatización **no** cubre: `layout-metrics` estima anchos, no ve fuentes reales, alturas, scroll ni táctil. Toda la UI del rediseño + editores de días flexibles + chips de roca + los avisos nuevos nunca se tocaron en un teléfono. | Bajo (es mirar) |
| 2 | ~~Calibrar los RPE estimados~~ ✅ **HECHO** | Calibrados contra Lattice Training + método session-RPE de Foster. De paso apareció un **doble conteo** en la fórmula de carga. Ver el bloque 📐 arriba. | — |
| 3 | ~~Correr el SQL nuevo de COACH_SETUP.md~~ ✅ **NO HACE FALTA** | Verificado el 2026-08-05 contra el Supabase del usuario (`sql/diagnostico-coach.sql`): **la base está vacía** — `climbcycle_state` no existe, ni `coach_links`, ni ninguna policy. El sync nunca se instaló, así que el agujero del coach **nunca estuvo abierto acá**. El SQL corregido queda listo para el día que se encienda la nube. | — |
| 4 | **Correr `npm run test:live`** contra un Supabase de prueba | El arnés está escrito y la costura lógica↔red cubierta por 23 tests e2e. Falta lo que un servidor de mentira no puede validar: **RLS y esquema reales**. Pasando además `CC_COACH_EMAIL`/`CC_COACH_PASS` verifica contra tu base que la policy vieja ya no existe. | Bajo (el trabajo ya está hecho) |
| 5 | ~~Vault de cifrado en reposo~~ 🟡 **IMPLEMENTADO, falta QA** | Hecho y testeado con WebCrypto real, pero **detrás de flag apagado**. Lo único que falta es encenderlo en un navegador con datos de prueba y verificar el ciclo completo (activar → recargar → desbloquear → desactivar). | Bajo si se prueba con datos de prueba |
| 6 | ~~Build ligero (esbuild)~~ ✅ **HECHO** | `npm run build` → dist/ con hash de contenido. Ver el bloque 📦 arriba. | — |

**Fronteras de estado — mapa de lo auditado (2026-08-05).** El método encontró **10 bugs**; conviene no re-auditar lo ya cubierto:

| Frontera | Estado |
|---|---|
| `sessionLog` ↔ `cc_logs` | ✅ corregida (`logSessionDone`) |
| roca ↔ `cc_logs` / `recData` | ✅ corregida |
| fecha del evento ↔ `ts`/`hoursAgo` | ✅ corregida (`resolveSessionTiming`) |
| `cc_tests` ↔ `intensity.js` | ✅ corregida (aviso de dato viejo) |
| `exDone` ↔ `sessionLog` | ✅ corregida (`clearExDone`/`pruneExDone`) |
| `EX_POOL` ↔ innerHTML | ✅ corregida (`escapeHtml` completo) |
| local ↔ nube (`sync`) | ✅ lógica corregida — **falta e2e real** |
| `cc_projects` ↔ `cc_logs` | ✅ corregida (`syncProjectLoad`) |
| `U.startDate` ↔ `planMap`/`cc_logs` | ✅ **auditada y sana** (ver §8) |
| `coach_links` ↔ estado del atleta | ✅ **corregida** — filtraba el bundle entero (peso, edad, notas de sesión); ahora se publica sólo un resumen |

**Mapa cerrado: las 10 fronteras están auditadas.** El método encontró **13 bugs** en total, ninguno reportado por un usuario y ninguno visible en la pantalla. El patrón siempre fue el mismo: *dos cosas que deberían decir lo mismo se escriben en lugares distintos*. Vale como regla para features nuevas — y como recordatorio de que un unit test verde sobre una función pura no dice nada sobre la costura donde se la llama.

**Regla que dejó esta sesión:** cuando dos estados se escriben en lugares distintos, tarde o temprano se contradicen. Antes de agregar un camino nuevo que dé una sesión por hecha, que registre carga o que toque el plan, preguntá **qué otro estado tendría que moverse con él** — y si la respuesta es "ninguno", verificalo, no lo supongas.

*Fin de PROJECT_CONTEXT.md. Para retomar en una próxima sesión: leé §0 (TL;DR) y §18 (arranque); abrí archivos puntuales solo cuando necesites detalle. Actualizá §5, §6, §8, §17 y §18 al cerrar cada sesión de trabajo.*
