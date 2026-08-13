/* ====================================================
   vistas-coherentes.test.js -- Hoy y Semana muestran lo mismo

   (R) DOS REPORTES DE LA BETA, LA MISMA CAUSA DE FONDO.

   1. "en la semana se ve fase fuerza arriba pero es una semana de
       resistencia" — y en la de fuerza decía potencia.

      `renderWk()` recalculaba la secuencia de fases con
      `getLevelProfile().phaseSeq[U.plan]` (la BASE del nivel), mientras que
      `generatePlan()` la construye con `getPlanSeq()` (la AJUSTADA por el
      motor de objetivo, que reasigna semanas hacia la capacidad más débil).
      Reproducido: en la semana 5 la vista decía `strength` y el plan tenía
      `endurance`.

   2. "el ejercicio circuito potencia resistencia no es igual en Hoy que en
       Semana".

      Las dos vistas eligen los mismos ejercicios; lo que difería era el
      render. `splitDose()` parte la nota para mostrar la dosis en grande y
      el descanso aparte, pero cuando el descanso es RELATIVO ("el doble de
      lo que tardás", "1:1") `parseRestSeconds` devuelve null — y esa
      cláusula desaparecía. Resultado: la pantalla que se usa DURANTE la
      sesión mostraba menos que la de planificación.

   De paso apareció un tercero que nadie había reportado: `parseRestSeconds`
   leía `nota + det` concatenados y, cuando se contradecían, ganaba el det.
   En `str0b` la nota dice "3 min de descanso" y el det "Descanso 2-3 min":
   devolvía 120 s para un ejercicio prescrito a 180.

   Todo es la misma regla que este proyecto viene aplicando: dos lugares que
   deberían decir lo mismo terminan diciendo cosas distintas.
==================================================== */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  const TODOS = [];
  Object.keys(app.EX_POOL).forEach(function(b){
    (app.EX_POOL[b] || []).forEach(function(e){ TODOS.push(e); });
  });

  describe('(R) la fase que muestra Semana sale del plan', function(){

    function conPlan(fn){
      app.U = Object.assign(app.U || {}, {
        goal:'sport', level:'intermediate', plan:'4-3-2-1', days:4,
        weight:70, age:30, gymDays:[1,3,5,6], rockDays:[], rockWeekend:'never',
        trainTime:'evening', grade:'6c', targetGrade:'7a',
        startDate: new Date(2026, 7, 3).toDateString()
      });
      app.generatePlan();
      return fn();
    }

    it('blockOfWeek coincide con el plan en TODAS las semanas', function(){
      conPlan(function(){
        const seq = app.getPlanSeq();
        const malas = [];
        for(let w = 0; w < seq.length; w++){
          const d = new Date(app.U.startDate);
          d.setDate(d.getDate() + w * 7);
          const leido = app.blockOfWeek(app.planMap, d);
          if(leido !== seq[w]) malas.push('semana ' + (w+1) + ': plan=' + seq[w] + ' vista=' + leido);
        }
        if(malas.length) throw new Error('la vista contradice al plan → ' + malas.join(' | '));
      });
    });

    it('la secuencia BASE y la AJUSTADA difieren — por eso importaba', function(){
      /* Si algún día dejaran de diferir, este test perdería sentido y hay que
         saberlo: el bug existía justo porque el motor de objetivo mueve
         semanas y la vista leía la lista sin mover. */
      conPlan(function(){
        const prof = app.getLevelProfile();
        const base = (prof && prof.phaseSeq && prof.phaseSeq[app.U.plan]) || [];
        const real = app.getPlanSeq();
        expect(base.length).toBe(real.length);
        expect(JSON.stringify(base) === JSON.stringify(real)).toBe(false);
      });
    });

    it('una semana entera de descanso devuelve null, no una fase inventada', function(){
      expect(app.blockOfWeek({}, new Date(2026, 7, 3))).toBe(null);
      expect(app.blockOfWeek(null, new Date(2026, 7, 3))).toBe(null);
      expect(app.blockOfWeek({}, null)).toBe(null);
    });
  });

  describe('(R) el descanso nunca se pierde entre vistas', function(){

    it('todo ejercicio con descanso lo muestra en la tarjeta de Hoy', function(){
      /* `rest` en m:ss, o la cláusula en palabras dentro de `detail`. Que no
         quede en ninguno de los dos es el bug reportado. */
      const mudos = TODOS.filter(function(ex){
        if(!/descans/i.test(ex.nota || '')) return false;
        const d = app.splitDose(ex);
        return !d.rest && !/descans/i.test(d.detail || '');
      });
      if(mudos.length) throw new Error('Hoy perdería el descanso de: '
        + mudos.map(e => e.id + ' ("' + e.nota + '")').join(' | '));
    });

    it('el descanso relativo se dice en palabras, no se descarta', function(){
      const relativos = TODOS.filter(e => /1\s*:\s*1|el doble|el triple|=\s*tiempo/i.test(e.nota || ''));
      expect(relativos.length).toBeGreaterThan(3);
      relativos.forEach(function(ex){
        expect(app.parseRestSeconds(ex)).toBe(null);      /* no hay m:ss posible */
        const d = app.splitDose(ex);
        if(!/descans/i.test(d.detail || '')){
          throw new Error(ex.id + ' pierde su descanso relativo: "' + ex.nota + '"');
        }
      });
    });

    it('no se repite el descanso dos veces en la misma tarjeta', function(){
      const dobles = TODOS.filter(function(ex){
        const d = app.splitDose(ex);
        return (String(d.detail || '').match(/descans/gi) || []).length > 1;
      });
      if(dobles.length) throw new Error('descanso duplicado en: ' + dobles.map(e => e.id).join(', '));
    });

    it('no quedan fragmentos cortados como "3 min de"', function(){
      /* Al sacar la cláusula de descanso de la dosis, el orden de los
         reemplazos importaba: el patrón genérico se comía sólo la palabra
         "descanso" y dejaba el número colgando. */
      const rotos = TODOS.filter(function(ex){
        const d = app.splitDose(ex);
        return /\d+\s*(min|s)\s*de\s*$/i.test(String(d.detail || '').trim());
      });
      if(rotos.length) throw new Error('fragmentos colgando: '
        + rotos.map(e => e.id + ' → "' + app.splitDose(e).detail + '"').join(' | '));
    });

    it('la dosis nunca queda vacía', function(){
      const vacios = TODOS.filter(e => !app.splitDose(e).dose);
      if(vacios.length) throw new Error('sin dosis: ' + vacios.map(e => e.id).join(', '));
    });
  });

  /* (T) MÁS REPORTES DE LA MISMA TANDA. Todos comparten una raíz: la app
     sabía algo y no lo decía, o lo decía en un idioma que no es el del
     usuario. */
  describe('(T) el chip del sistema no pelea con la dosis', function(){

    it('los cuatro sistemas energéticos tienen nombre en castellano', function(){
      /* Sin entrada en SYS_CHIP el chip caía al valor crudo — "An Cap",
         "Aero Pow" — que es jerga de manual. Los cuatro faltaban, y son los
         que más aparecen. */
      ['An Cap', 'An Pow', 'Aero Cap', 'Aero Pow'].forEach(function(s){
        const chip = app.SYS_CHIP && app.SYS_CHIP[s];
        if(!chip) throw new Error('falta chip corto para ' + s + ' → se mostraría crudo');
        expect(chip === s).toBe(false);   /* no puede ser la sigla cruda */
      });
    });

    it('ningún chip trae rangos de movimientos', function(){
      /* Reporte: "está escrito aguantar 5 a 20 movimientos intensos… pero
         después en la descripción dice 4 a 8". Ese "5 a 20" describe el
         SISTEMA y venía de SYS_HUMAN; junto a la dosis del ejercicio parecían
         dos instrucciones peleadas. El chip dice qué se entrena; el rango del
         ejercicio vive en su nota. */
      Object.keys(app.SYS_CHIP || {}).forEach(function(k){
        const chip = app.SYS_CHIP[k];
        if(/\d+\s*(a|-|–)\s*\d+/.test(chip)){
          throw new Error('el chip "' + chip + '" trae un rango que puede contradecir la dosis');
        }
      });
    });

    it('el chip entra en la tarjeta (tope de ancho)', function(){
      Object.keys(app.SYS_CHIP || {}).forEach(function(k){
        expect(app.SYS_CHIP[k].length).toBeLessThanOrEqual(14);
      });
    });
  });

  describe('(T) el calentamiento no se pide dos veces', function(){

    it('ningún ejercicio arranca su guía mandando a calentar de cero', function(){
      /* La sesión YA tiene un bloque de Calentamiento propio. Repetir
         "Calentá 20 min progresivos" dentro de cada ejercicio hacía que el
         usuario —ya caliente— leyera que tiene que empezar de nuevo. Los que
         necesitan MÁS que el estándar (campus, min-edge) lo dicen como
         extensión: "sumá X al calentamiento de la sesión". */
      const desdeCero = TODOS.filter(function(e){
        const p = (e.how || [])[0] || '';
        return /^calent/i.test(p) && !/sum[áa]|adem[áa]s/i.test(p);
      });
      if(desdeCero.length) throw new Error('mandan a calentar de cero: '
        + desdeCero.map(e => e.id + ' → "' + (e.how[0] || '').slice(0, 50) + '…"').join(' | '));
    });

    it('los de máxima carga siguen advirtiendo sobre el calentamiento extra', function(){
      /* No se borró la información de seguridad: se reformuló. Campus y
         regletas mínimas necesitan más que el bloque estándar. */
      const criticos = TODOS.filter(e => (e.fatigue || 0) >= 5 && (e.cat === 'campus_board' || e.cat === 'finger_strength'));
      expect(criticos.length).toBeGreaterThan(2);
      criticos.forEach(function(ex){
        const texto = (ex.how || []).join(' ');
        if(!/calent/i.test(texto)) throw new Error(ex.id + ' perdió la advertencia de calentamiento');
      });
    });
  });

  describe('(R) la nota manda sobre el detalle', function(){

    it('str0b: 3 min en la nota, no los 2 del detalle', function(){
      /* El caso concreto que destapó el problema. */
      const ex = TODOS.filter(e => e.id === 'str0b')[0];
      expect(!!ex).toBe(true);
      expect(/3 min/.test(ex.nota)).toBe(true);
      expect(app.parseRestSeconds(ex)).toBe(180);
    });

    it('cuando la nota declara minutos, el parser los respeta', function(){
      const desacuerdos = [];
      TODOS.forEach(function(ex){
        const m = String(ex.nota || '').match(/(\d+)\s*(?:\+|(?:\s*-\s*\d+))?\s*min\s*(?:de\s+)?descanso|descanso\s*(\d+)\s*(?:\+|(?:\s*-\s*\d+))?\s*min/i);
        if(!m) return;
        const esperado = Number(m[1] || m[2]) * 60;
        const real = app.parseRestSeconds(ex);
        if(real !== esperado) desacuerdos.push(ex.id + ': nota=' + (esperado/60) + 'min parser=' + (real/60) + 'min');
      });
      if(desacuerdos.length) throw new Error('el parser ignora la nota en: ' + desacuerdos.join(' | '));
    });

    it('formatos que antes devolvían null ahora se entienden', function(){
      expect(app.parseRestSeconds({ nota:'4-6 series · 6-10 movs · descanso 3+ min' })).toBe(180);
      expect(app.parseRestSeconds({ nota:'3 series x 15 reps · 90 s de descanso' })).toBe(90);
      expect(app.parseRestSeconds({ nota:'5 cuelgues · 2 min de descanso' })).toBe(120);
      /* y los relativos siguen siendo null a propósito */
      expect(app.parseRestSeconds({ nota:'4-6 vías · descanso 1:1' })).toBe(null);
    });
  });
};
