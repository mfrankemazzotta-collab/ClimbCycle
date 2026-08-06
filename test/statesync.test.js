/* ====================================================
   statesync.test.js -- fronteras entre estados que se escriben por separado

   Tercera pasada del mismo método que destapó los 5 bugs anteriores:
   buscar pares de estados que se actualizan en lugares distintos y
   preguntar si pueden quedar diciendo cosas contradictorias.

   (D) `cc_tests` ↔ `intensity.js` — los kg que la app prescribe salían del
       último test SIN mirar su antigüedad. `testStatus()` ya sabía calcular
       que un test estaba vencido, pero intensity.js no lo consultaba: un max
       hang de hace 14 meses imprimía los mismos 45 kg que uno de hace dos
       semanas, con la misma confianza visual.

   (E) `exDone` ↔ `sessionLog` — el progreso por ejercicio no se limpiaba
       nunca. Deshacer una sesión la dejaba "abierta" pero con todos los
       ejercicios tildados: un estado que la propia lógica considera
       imposible (marcar el último la cierra sola), y del que sólo se sale
       desmarcando y remarcando un ejercicio.
==================================================== */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  const DIA = 86400000;

  /* Deja un día de fuerza con TODOS sus ejercicios marcados (lo que cierra
     la sesión sola). Compartido por los dos describes de (E). */
  function sesionCompletaPorEjercicios(){
    const ini = new Date(2026, 6, 6); ini.setHours(0,0,0,0);
    Object.assign(app.U, { goal:'sport', level:'intermediate', plan:'10', days:4,
      weight:72, session:90, startDate:ini, gymDays:[1,2,4,5], rockDays:[] });
    app.generatePlan();
    const k = Object.keys(app.planMap).find(x => app.planMap[x] && app.planMap[x].block === 'strength');
    app.TODAY = new Date(k); app.TODAY.setHours(0,0,0,0);
    app.exDone = {}; app.sessionLog = {}; app.saveSLogs([]);
    const exs = app.getExercisesForDay(k, 'strength');
    app._hoyExs = exs;
    exs.forEach(function(_, i){ app.hoyToggleEx(i); });
    return { k: k, exs: exs };
  }

  describe('(D) la antigüedad del test afecta la confianza en los kg', function(){

    function conTestDeHace(dias){
      Object.assign(app.U, { goal:'sport', level:'intermediate', plan:'10', weight:72 });
      app.saveAllTestResults({});
      app.saveTestResult('hang_max', '60', Date.now() - dias * DIA);
      return app.getCategoryLoad('finger_strength', 0.85);
    }

    it('un test reciente no lleva ninguna advertencia', function(){
      const L = conTestDeHace(14);
      expect(L.stale).toBe(false);
      expect(app.staleLoadNote(L)).toBe('');
    });

    it('un test de hace 14 meses se marca como dato viejo', function(){
      const L = conTestDeHace(425);
      expect(L.stale).toBe(true);
      expect(L.daysSince).toBeGreaterThan(400);
      expect(app.staleLoadNote(L)).toContainText('revalidá');
    });

    it('vencido no es lo mismo que caduco: un poco pasado NO alarma', function(){
      /* El intervalo de hang_max es 4-6 semanas (~35 días). A los 50 días el
         test está vencido para re-testear, pero el dato sigue siendo usable:
         avisar de todo sería ruido y el usuario dejaría de leer los avisos. */
      const L = conTestDeHace(50);
      expect(L.stale).toBe(false);
    });

    it('la carga en kg sigue siendo la misma: se avisa, no se inventa', function(){
      /* Deliberado: un test viejo NO implica haber perdido fuerza (podés
         haber entrenado 6 meses sin re-testear). Aplicar un decaimiento
         automático sería inventar un dato que no tenemos. */
      expect(conTestDeHace(425).kg).toBe(conTestDeHace(14).kg);
    });

    it('rateTestFreshness clasifica los tres niveles', function(){
      expect(app.rateTestFreshness(10, 35).level).toBe('fresh');
      expect(app.rateTestFreshness(50, 35).level).toBe('overdue');
      expect(app.rateTestFreshness(200, 35).level).toBe('stale');
      expect(app.rateTestFreshness(null, 35).level).toBe('none');
    });

    it('el baseline del onboarding no se marca como viejo (no tiene fecha)', function(){
      Object.assign(app.U, { goal:'sport', level:'intermediate', plan:'10', weight:72, baseFinger:'55' });
      app.saveAllTestResults({});
      const L = app.getCategoryLoad('finger_strength', 0.85);
      expect(L.kg).toBeGreaterThan(0);
      expect(L.stale).toBe(false);
    });
  });

  describe('(E) el progreso por ejercicio sigue al estado de la sesión', function(){

    it('marcar todos los ejercicios cierra la sesión', function(){
      const { k, exs } = sesionCompletaPorEjercicios();
      expect(app.sessionLog[k]).toBe('done');
      expect(app.countExDone(k, exs)).toBe(exs.length);
    });

    it('deshacer la sesión también destilda los ejercicios', function(){
      const { k, exs } = sesionCompletaPorEjercicios();
      app.undoSess(k);
      expect(app.sessionLog[k]).toBe(undefined);
      expect(app.countExDone(k, exs)).toBe(0);
    });

    it('marcarla como no realizada también los destilda', function(){
      const { k, exs } = sesionCompletaPorEjercicios();
      app.markSess(k, 'fail');
      expect(app.sessionLog[k]).toBe('fail');
      expect(app.countExDone(k, exs)).toBe(0);
    });

    it('nunca queda una sesión abierta con todos los ejercicios hechos', function(){
      /* Es el estado contradictorio que motivó el fix. */
      const { k, exs } = sesionCompletaPorEjercicios();
      app.undoSess(k);
      const abierta = app.sessionLog[k] !== 'done';
      const todosHechos = app.countExDone(k, exs) === exs.length;
      expect(abierta && todosHechos).toBe(false);
    });
  });

  describe('(E) purga del progreso huérfano al regenerar el plan', function(){

    it('staleExDoneKeys detecta los días que ya no son de entrenamiento', function(){
      const plan = {
        'Mon Jul 06 2026': { block:'strength' },
        'Tue Jul 07 2026': { block:'rest' },
        'Wed Jul 08 2026': { block:'test' }
      };
      const marcas = {
        'Mon Jul 06 2026': { str1:true },
        'Tue Jul 07 2026': { str3:true },   /* pasó a descanso */
        'Wed Jul 08 2026': { str5:true },   /* pasó a test */
        'Fri Jul 10 2026': { str7:true }    /* ya ni existe en el plan */
      };
      const muertos = app.staleExDoneKeys(marcas, plan);
      expect(muertos.length).toBe(3);
      expect(muertos).notToContain('Mon Jul 06 2026');
    });

    it('regenerar el plan conserva el progreso de los días que siguen vivos', function(){
      const { k, exs } = sesionCompletaPorEjercicios();
      app.generatePlan();
      /* el día sigue siendo de entrenamiento con la misma selección */
      expect(app.countExDone(k, exs)).toBe(exs.length);
    });

    it('...y descarta el de los días que dejaron de serlo', function(){
      sesionCompletaPorEjercicios();
      app.exDone['Sun Jan 04 2026'] = { str1:true };   /* día fuera del plan */
      app.generatePlan();
      expect(app.exDone['Sun Jan 04 2026']).toBe(undefined);
    });
  });

  describe('(F) los datos de ejercicio se escapan antes de ir al HTML', function(){
    /* §10 fija la regla: todo lo que va a innerHTML pasa por escapeHtml. Hoy
       EX_POOL es estático, así que no es explotable — pero la app importa
       bundles de backup, y el día que un ejercicio venga de ahí la regla es
       lo único que separa el render de un XSS. Se testea con un ejercicio
       hostil inyectado en el pool. */
    const HOSTIL = {
      id:'xss_probe', n:'Hang <img src=x onerror="alert(1)">', cat:'finger_strength',
      sys:'Fuerza max', col:'#38BDF8', fatigue:3, skill:2, minLevel:0,
      det:'detalle <script>alert(2)</script>', nota:'5x10s "<b>ojo</b>"',
      simple:'simple <i>x</i>', sci:'', tips:[]
    };

    function sinEscapar(html){
      /* el payload crudo no debe aparecer nunca tal cual */
      return html.indexOf('<img src=x') >= 0
          || html.indexOf('<script>') >= 0;
    }

    it('renderExerciseCard neutraliza el markup del ejercicio', function(){
      const plan = { block:'strength', week:1 };
      const html = app.renderExerciseCard(HOSTIL, plan, '#38BDF8', 'xss1', '', {});
      expect(sinEscapar(html)).toBe(false);
      expect(html).toContainText('&lt;img');
    });

    it('la tarjeta con check tampoco lo deja pasar', function(){
      const plan = { block:'strength', week:1 };
      const html = app.renderExerciseCard(HOSTIL, plan, '#38BDF8', 'xss2', '',
                                          { check:true, done:false, onCheck:'x()' });
      expect(sinEscapar(html)).toBe(false);
    });
  });
};
