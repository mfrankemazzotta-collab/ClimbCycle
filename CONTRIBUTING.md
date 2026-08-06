# Cómo extender ClimbCycle

Recetas para las 4 extensiones más comunes. Regla de oro: **la lógica pura va con un test** (`npm test` tiene que quedar verde), y **todo dato de usuario que va al DOM se escapa** con `escapeHtml` antes de `innerHTML`.

Antes de tocar código, leé `PROJECT_CONTEXT.md` (§0 y §17).

---

## 1. Agregar un ejercicio

Los ejercicios viven en `EX_POOL` en **`js/data/exercises.js`**, agrupados por bloque (`strength`, `power`, `endurance`, `deload`). Agregá un objeto al array del bloque correcto:

```js
{id:'str1c', n:'Nombre visible', cat:'finger_strength', sys:'Fuerza max',
 col:'#38BDF8', fatigue:4, skill:3, minLevel:1,
 det:'Qué hacés, series/reps/descanso, concreto.',
 nota:'5 series · 10s · descanso 3 min',           // resumen de una línea
 simple:'Versión sin jerga para principiantes.',   // se muestra en modo simple / nivel 0
 sci:'Cita la fuente (Horst, Anderson, Eva López…).',
 tips:['tip 1','tip 2'],
 how:['paso 1','paso 2'],                           // opcional — expander "cómo hacerlo"
 errors:['error común 1']}                          // opcional
```

Claves:

- **`cat`** debe coincidir con una categoría de slot del bloque (ver `SLOT_COMPOSITION` en `planner.js`: `finger_strength`, `pull_strength`, `wall_training`, `power`, `campus_board`, `aerobic_endurance`, `power_endurance`, `technique`, `mobility`).
- **`minLevel`**: `0` principiante · `1` intermedio · `2` avanzado · `3` elite. Usalo para **gating de seguridad** (ej. `campus_board` con `minLevel:2` — nadie campusea de principiante). Opcional `maxLevel` para lo inverso.
- **`phase:'warmup'`** excluye el ejercicio de los slots principales en nivel intermedio+.
- **Más ejercicios por categoría = más rotación.** El selector (`selectExercises`) evita repetir lo de la semana pasada; si una categoría tiene 1 solo ejercicio a un nivel, ese slot no puede rotar.

No hace falta tocar nada más: `selectExercises` lo toma solo.

---

## 2. Agregar un test de evaluación

Tres archivos:

1. **`js/data/test-defs.js`** — agregá la definición a `TESTS[]` (datos puros): `{id, title, result_key, mide, freq, …}`. El `result_key` es la clave única del historial (ej. `hang_max`).
2. **`js/test-interpret.js`** — agregá el intérprete a `TEST_INTERPRETERS[result_key] = function(value, level, weight){ return {txt, col, …}; }` (función **pura**, testeable).
3. **`js/data/ranges-meta.js`** — si el test tiene bandas de rango para la gráfica, agregá `TEST_RANGES[result_key]`.

Agregá un caso a `test/test-interpret.test.js` para el intérprete nuevo.

---

## 3. Agregar un widget al dashboard de inicio

El home es configurable vía `WIDGET_DEFS` en **`js/widgets.js`**:

1. Agregá la definición (id + título + markup):

   ```js
   { id:'mi-widget', title:'Mi widget', icon:'📊', html:function(){
       return '<div id="mi-widget-body"></div>';   // solo el contenedor
   }}
   ```

2. En el loop de "populate" de `renderWidgets()` (mismo archivo), enganchá tu renderer sobre el ancla:

   ```js
   try { if(g('mi-widget-body')) renderMiWidget(); } catch(e){ if(typeof logError==='function') logError(e,'renderMiWidget'); }
   ```

Queda disponible en "Personalizar" (on/off + reorder) automáticamente. El registro de widgets es el punto de extensión más limpio del código.

---

## 4. Agregar un test unitario

1. Creá `test/mi-modulo.test.js`:

   ```js
   const { describe, it, expect } = require('./assert');
   module.exports = function(app){
     describe('miFuncion()', function(){
       it('hace lo que dice', function(){
         expect(app.miFuncion(2)).toBe(4);
       });
     });
   };
   ```

2. Registralo en `test/run.js` (`require('./mi-modulo.test')(app);`).

- `app` es el sandbox: accedé a cualquier global del código como `app.miFuncion`.
- Para lógica **async** (Web Crypto), la función del `it` puede devolver una Promise o ser `async` — `flush()` la espera. Esos tests usan el sandbox `secure` (`loadSecureApp`).
- El harness **no** ejecuta el DOM: testeá el view-model / motor, no el HTML.

---

## Checklist antes de commitear

- [ ] `npm test` verde.
- [ ] `npm run lint` sin errores.
- [ ] La app arranca sin `ReferenceError` (los `<script>` cargan en orden de dependencia).
- [ ] Actualizaste `PROJECT_CONTEXT.md` (§5, §6, §8, §17) si corresponde.
