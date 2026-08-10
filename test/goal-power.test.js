/* ====================================================
   goal-power.test.js -- la capacidad sin test no puede desaparecer

   EL BUG (2026-08-07). `computeGoalPlan` puntuaba cada capacidad con una
   `severity` derivada de su test. La potencia era la única capacidad SIN
   test (`testKey: null`), así que su severity era siempre `null` — y tanto
   el foco como el diagnóstico filtraban los `null`.

   Consecuencia: apenas el usuario medía cualquier test, la potencia
   desaparecía del motor. Verificado antes de tocar nada, con un boulderista
   de 7a apuntando a 7c:

       sin ningún test  → "fuerza de dedos y potencia"    (correcto)
       con los 4 tests  → "base aeróbica y fuerza de tracción"

   O sea: **medir empeoraba el consejo**, y en la peor dirección posible
   (base aeróbica es casi lo contrario de lo que necesita un boulderista).
   El usuario hacía lo correcto —evaluarse— y el sistema lo castigaba.

   El error de fondo: tratar "no tengo el dato" como "no hay problema". La
   ausencia de medición no es evidencia de que la capacidad esté bien.

   Se arregla en dos capas, y las dos se testean acá:
     1. una capacidad sin medir conserva la prioridad de su disciplina
        (`presumedSeverity`) y COMPITE, en vez de desaparecer;
     2. la potencia deja de ser inmedible: se suma el powerslap
        (Draper et al. 2011; batería IRCRA 2021).
==================================================== */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  function setUser(over){
    app.U = Object.assign({
      goal:'boulder', level:'intermediate', plan:'4-3-2-1', days:4,
      weight:70, age:25, rhr:55, session:90,
      name:'', grade:'7a', targetGrade:'7c', tests:[], startDate:null,
      gymDays:[1,3,5], rockDays:[], rockWeekend:'never', trainTime:'evening'
    }, over || {});
    app.localStorage.removeItem('cc_tests');
  }
  /* Valores holgadamente por encima del `mid` de intermediate: el punto es
     que las capacidades MEDIDAS estén bien, para que se vea qué hace el
     motor con la que falta. */
  function medirLasCuatroFuertes(){
    app.saveTestResult('hang_max', '95');        /* ratio 1.36 vs mid 1.15 */
    app.saveTestResult('pullup_3rm', '95');      /* 1.36 vs 1.25 */
    app.saveTestResult('cf_minutes', '12');      /* vs mid 7 */
    app.saveTestResult('repeater_6rep', '85');   /* 1.21 vs 1.05 */
  }
  const focos = p => p.focuses.map(f => f.key);
  const dx    = (p, label) => p.diagnosis.filter(d => d.label.indexOf(label) === 0)[0];

  describe('(J) una capacidad sin medir compite en vez de desaparecer', function(){

    it('EL BUG: al boulderista fuerte en todo lo medible se le propone potencia', function(){
      setUser();
      medirLasCuatroFuertes();
      const p = app.computeGoalPlan();
      expect(p.usesTests).toBe(true);
      /* Antes del arreglo esto daba ['aerobic','pullStrength']: las cuatro
         medidas competían solas y la potencia ni existía. */
      expect(focos(p).indexOf('power') > -1).toBe(true);
    });

    it('pero un test REAL que sale flojo le gana a una presunción', function(){
      /* Si las capacidades medidas están mal, mandan ellas: un dato vale
         más que una heurística por disciplina. */
      setUser();
      app.saveTestResult('hang_max', '55');        /* ratio 0.79, muy por debajo */
      app.saveTestResult('pullup_3rm', '60');
      app.saveTestResult('cf_minutes', '3');
      app.saveTestResult('repeater_6rep', '50');
      const p = app.computeGoalPlan();
      expect(focos(p).indexOf('fingerStrength') > -1).toBe(true);
    });

    it('el diagnóstico dice "sin medir" en vez de omitir la capacidad', function(){
      /* Omitirla dejaba al usuario sin forma de saber que su diagnóstico
         estaba incompleto: la pantalla se veía entera. */
      setUser();
      medirLasCuatroFuertes();
      const p = app.computeGoalPlan();
      const pot = dx(p, 'Potencia');
      expect(!!pot).toBe(true);
      expect(pot.status).toBe('unmeasured');
      expect(pot.severity).toBe(null);
      /* y ofrece el test que llenaría el hueco */
      expect(pot.testKey).toBe('power_slap');
    });

    it('sin ningún test no se inventa un diagnóstico', function(){
      /* El modo heurístico no tiene nada que diagnosticar: mostrar cinco
         filas en gris sería ruido, no información. */
      setUser();
      expect(app.computeGoalPlan().diagnosis.length).toBe(0);
    });

    it('a un principiante se le sigue sin priorizar potencia', function(){
      /* Sin base, el trabajo explosivo es riesgo sin rendimiento. La
         presunción no puede pasar por encima de esa regla.

         Este caso encontró un agujero en el propio arreglo: una capacidad
         ausente del orden heurístico recibía igual el piso de severidad
         presunta (0.10), que le ganaba a las capacidades MEDIDAS y en buen
         estado (0.00-0.06). El principiante terminaba con potencia en el
         foco. De ahí salió `capacityBlocked`. */
      setUser({ level:'beginner' });
      medirLasCuatroFuertes();
      const p = app.computeGoalPlan();
      expect(focos(p).indexOf('power')).toBe(-1);
    });

    it('y tampoco se le ofrece el test de lo que no debe entrenar', function(){
      /* Decirle "no entrenes potencia todavía" y a la vez "medí tu
         potencia" es una contradicción que el usuario nota. */
      setUser({ level:'beginner' });
      medirLasCuatroFuertes();
      const pot = dx(app.computeGoalPlan(), 'Potencia');
      expect(pot.status).toBe('blocked');
      expect(pot.testKey).toBe(null);
    });

    it('capacityBlocked sólo veda potencia, y sólo a principiantes (PURA)', function(){
      expect(app.capacityBlocked('power', 'beginner')).toBe(true);
      expect(app.capacityBlocked('power', 'intermediate')).toBe(false);
      expect(app.capacityBlocked('fingerStrength', 'beginner')).toBe(false);
    });

    it('el orden heurístico es coherente por disciplina (PURO)', function(){
      expect(app.heuristicOrder('boulder', 'intermediate')[0]).toBe('fingerStrength');
      expect(app.heuristicOrder('boulder', 'intermediate')[1]).toBe('power');
      expect(app.heuristicOrder('sport', 'intermediate')[0]).toBe('aerobic');
      expect(app.heuristicOrder('beginner-check', 'beginner').indexOf('power')).toBe(-1);
    });

    it('la severidad presunta es moderada a propósito (PURA)', function(){
      /* Tiene que competir, pero nunca ganarle a una medida claramente
         floja. El umbral de "weak" es 0.15. */
      expect(app.presumedSeverity(0)).toBeGreaterThan(0.15);
      expect(app.presumedSeverity(0)).toBeLessThan(0.5);
      expect(app.presumedSeverity(0)).toBeGreaterThan(app.presumedSeverity(1));
      expect(app.presumedSeverity(1)).toBeGreaterThan(app.presumedSeverity(2));
      expect(app.presumedSeverity(99)).toBeLessThan(app.presumedSeverity(2));
    });
  });

  describe('(J) el render no afirma lo que no sabe', function(){

    it('cada estado del diagnóstico tiene su etiqueta propia', function(){
      /* El default de `goalDiagnosisHTML` era "En camino": una capacidad
         nunca medida se mostraba como si estuviera bien encaminada. El
         sistema afirmando algo que no tiene forma de saber. */
      const m = app.GOAL_DIAG_META;
      ['weak','ok','strong','tracked','unmeasured','blocked'].forEach(function(k){
        if(!m[k]) throw new Error('falta etiqueta para el estado: ' + k);
      });
      expect(m.unmeasured.lbl).toBe('Sin medir');
      expect(m.unmeasured.lbl === m.ok.lbl).toBe(false);
      expect(m.blocked.lbl === m.ok.lbl).toBe(false);
      expect(m.tracked.lbl === m.ok.lbl).toBe(false);
    });

    it('una capacidad sin medir no se pinta como "En camino"', function(){
      setUser();
      medirLasCuatroFuertes();
      const html = app.goalDiagnosisHTML(app.computeGoalPlan());
      expect(html.indexOf('Sin medir') > -1).toBe(true);
    });
  });

  describe('(J) el test de potencia: powerslap', function(){

    const test = () => (app.TESTS || []).filter(t => t.result_key === 'power_slap')[0];

    it('está en la batería, con protocolo y unidad', function(){
      const t = test();
      expect(!!t).toBe(true);
      expect(t.category).toBe('power');
      expect(t.unit.indexOf('cm') > -1).toBe(true);
      /* El protocolo tiene que nombrar las presas GRANDES: el powerslap se
         valida desde jugs, no desde regletas. Hacerlo en listones chicos lo
         convierte en el ejercicio de campus que la app excluye por riesgo. */
      expect(/jugs|presas grandes/i.test(t.how)).toBe(true);
    });

    it('el protocolo exige repetir las condiciones entre tests', function(){
      /* Es una medida de distancia: si cambiás la presa o la altura de
         inicio, el número del próximo ciclo no compara con nada. */
      const t = test();
      expect(/mismas presas|misma altura/i.test(t.how)).toBe(true);
    });

    it('GOAL_CAPS.power ya no es una capacidad ciega', function(){
      const cap = app.GOAL_CAPS.filter(c => c.key === 'power')[0];
      expect(cap.testKey).toBe('power_slap');
    });

    it('medirlo cambia el estado de "sin medir" a "seguido"', function(){
      /* Tercer estado: hay dato, pero no hay normas por nivel publicadas
         para el powerslap. Decir "sin medir" sería mentir; puntuarlo contra
         una tabla inventada, peor. */
      setUser();
      medirLasCuatroFuertes();
      expect(dx(app.computeGoalPlan(), 'Potencia').status).toBe('unmeasured');
      app.saveTestResult('power_slap', '95');
      expect(dx(app.computeGoalPlan(), 'Potencia').status).toBe('tracked');
    });

    it('el intérprete escala con el alcance y tolera basura', function(){
      const t = test();
      const txt = v => (app.interpretTest(t, v, 'intermediate', 70) || {}).txt || '';
      expect(app.interpretTest(t, '', 'intermediate', 70)).toBe(null);
      expect(app.interpretTest(t, 'abc', 'intermediate', 70)).toBe(null);
      expect(app.interpretTest(t, '-5', 'intermediate', 70)).toBe(null);
      expect(txt('70').length).toBeGreaterThan(20);
      expect(txt('120').length).toBeGreaterThan(20);
      /* un alcance bajo señala la potencia como limitante; uno alto, no */
      expect(/limitante/i.test(txt('70'))).toBe(true);
      expect(/no parece ser tu limitante/i.test(txt('120'))).toBe(true);
    });

    it('cita de dónde sale la referencia y no la disfraza de norma por nivel', function(){
      /* No hay normas por nivel publicadas para el powerslap. El texto tiene
         que decir contra qué compara y recordar que lo que sirve es la
         propia tendencia — inventar rangos para llenar la pantalla es el
         error que ya cometimos con los RPE puestos a ojo. */
      const t = test();
      const txt = app.interpretTest(t, '80', 'intermediate', 70).txt;
      expect(/Vasile|referencia/i.test(txt)).toBe(true);
      expect(/tu propia marca|envergadura/i.test(txt)).toBe(true);
    });

    it('a un principiante no se lo compara contra nadie', function(){
      /* El ancla publicada es de jóvenes AVANZADOS: aplicársela a alguien
         que recién empieza no informa, desmoraliza. */
      const t = test();
      const txt = app.interpretTest(t, '55', 'beginner', 70).txt;
      expect(/primera marca|este número suba/i.test(txt)).toBe(true);
    });
  });
};
