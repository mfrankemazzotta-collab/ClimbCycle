/* Unit tests for timer.js — the pure interval engine (buildTimerPlan/fmtMMSS). */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  /* ── Mini-player sticky (rediseño) ──────────────────
     La cuenta tiene que seguir viva al minimizar: ese es todo el punto. */
  describe('mini-player del temporizador', function(){
    /* DOM mínimo que distingue overlay de mini */
    function setupDom(){
      const els = {};
      const mk = function(id){
        if(!els[id]) els[id] = { id, style:{display:'none'}, innerHTML:'', textContent:'',
          classList:{add(){},remove(){},contains(){return false;}}, querySelectorAll(){return [];},
          appendChild(){}, setAttribute(){}, getAttribute(){return null;} };
        return els[id];
      };
      app.document.getElementById = mk;
      return els;
    }

    it('minimizar oculta el overlay pero NO detiene la cuenta', function(){
      const els = setupDom();
      app.openTimer({ sets:1, reps:1, work:0, restRep:180, prep:0, label:'Descanso' });
      app.tmrStart();
      expect(app.Tmr.running).toBe(true);
      app.tmrMinimize();
      expect(els['tmr-overlay'].style.display).toBe('none');
      expect(els['tmr-mini'].style.display).toBe('flex');
      expect(app.Tmr.running).toBe(true);          /* sigue corriendo */
      app.tmrClose();
    });

    it('la mini muestra tiempo y controles, y permite volver a pantalla completa', function(){
      const els = setupDom();
      app.openTimer({ sets:1, reps:1, work:0, restRep:120, prep:0, label:'Descanso' });
      app.tmrStart(); app.tmrMinimize();
      const html = els['tmr-mini'].innerHTML;
      expect(/\d+:\d\d/.test(html)).toBe(true);            /* m:ss */
      expect(html.indexOf('tmrOpenFull')).toBeGreaterThan(-1);
      expect(html.indexOf('tmrPauseResume')).toBeGreaterThan(-1);
      expect(html.indexOf('tmrMiniPlus')).toBeGreaterThan(-1);
      app.tmrOpenFull();
      expect(els['tmr-mini'].style.display).toBe('none');  /* no duplica UI */
      app.tmrClose();
    });

    it('+30s suma a la fase en curso', function(){
      setupDom();
      app.openTimer({ sets:1, reps:1, work:0, restRep:60, prep:0, label:'x' });
      app.tmrStart(); app.tmrMinimize();
      const antes = app.Tmr.remaining;
      app.tmrMiniPlus();
      expect(app.Tmr.remaining).toBe(antes + 30);
      app.tmrClose();
    });

    it('cerrar no deja la mini colgada', function(){
      const els = setupDom();
      app.openTimer({ sets:1, reps:1, work:0, restRep:60, prep:0, label:'x' });
      app.tmrStart(); app.tmrMinimize();
      app.tmrClose();
      expect(app.tmrActivo()).toBe(false);
      expect(els['tmr-mini'].style.display).toBe('none');
    });
  });

  describe('buildTimerPlan()', function(){
    it('image case: 1 set × 6 reps, 10s work, 125s rest → 11:25 total, 11 phases', function(){
      const p = app.buildTimerPlan({ sets:1, reps:6, work:10, restRep:125, restSet:0 });
      expect(p.total).toBe(685);          /* 6×10 + 5×125 */
      expect(p.phases.length).toBe(11);   /* 6 work + 5 rest-between-reps */
    });
    it('max-hangs: 6 sets × 1 rep, 10s, 120s between sets → 660 total, 11 phases', function(){
      const p = app.buildTimerPlan({ sets:6, reps:1, work:10, restRep:0, restSet:120 });
      expect(p.total).toBe(660);
      expect(p.phases.length).toBe(11);   /* 6 work + 5 rest-between-sets */
    });
    it('never appends a trailing rest after the final rep/set', function(){
      const p = app.buildTimerPlan({ sets:2, reps:2, work:5, restRep:3, restSet:10 });
      expect(p.phases.length).toBe(7);
      expect(p.total).toBe(36);
      expect(p.phases[p.phases.length-1].type).toBe('work');
    });
    it('clamps to at least 1 set / 1 rep (0 work falls back to the 10s default)', function(){
      const p = app.buildTimerPlan({ sets:0, reps:0, work:0 });
      expect(p.sets).toBe(1);
      expect(p.reps).toBe(1);
      expect(p.phases.length).toBe(1);
      expect(p.total).toBe(10);
    });
    it('prepends a "prep" lead-in phase, excluded from the series total', function(){
      const p = app.buildTimerPlan({ sets:1, reps:2, work:10, restRep:0, prep:10 });
      expect(p.phases[0].type).toBe('prep');
      expect(p.phases[0].secs).toBe(10);
      expect(p.total).toBe(20);        /* 2×10 work; prep not counted */
      expect(p.runTotal).toBe(30);     /* prep counts toward the progress bar */
    });
    it('has no prep phase when prep is 0 (runTotal === total)', function(){
      const p = app.buildTimerPlan({ sets:1, reps:2, work:10, restRep:0, prep:0 });
      expect(p.phases[0].type).toBe('work');
      expect(p.runTotal).toBe(p.total);
    });
  });

  describe('fmtMMSS()', function(){
    it('formats seconds as M:SS', function(){
      expect(app.fmtMMSS(685)).toBe('11:25');
      expect(app.fmtMMSS(9)).toBe('0:09');
      expect(app.fmtMMSS(60)).toBe('1:00');
      expect(app.fmtMMSS(0)).toBe('0:00');
    });
  });

  /* (S) EL TEMPORIZADOR LEE LA NOTA DEL EJERCICIO — y eso lo hace frágil.

     Reporte de la beta: "el temporizador de descanso no se activa bien, para
     descanso de 3 minutos veo 10 segundos".

     La causa fue una regresión propia. `parseWorkProtocol` reconocía las
     series por las palabras "series", "sets" y "x". Al reescribir las notas
     de la jerga de planilla al castellano —"5 x 10s :2min" pasó a "5
     cuelgues de 10s · 2 min de descanso"— la palabra dejó de estar en la
     lista, `sets` cayó al default de 1, y el timer mostraba una única cuenta
     de 10 segundos en vez de 5 series con 2 minutos entre medio.

     Lo grave no es el regex: es que **cambiar un texto rompió una función y
     ningún test lo vio**, porque nada ataba el protocolo a la nota que lo
     alimenta. Estos casos son ese vínculo. */
  describe('(S) el protocolo del timer no contradice a la nota', function(){

    const TODOS = [];
    Object.keys(app.EX_POOL || {}).forEach(function(b){
      (app.EX_POOL[b] || []).forEach(function(e){ TODOS.push(e); });
    });

    it('las series del protocolo son las que dice la nota', function(){
      const malos = [];
      TODOS.forEach(function(ex){
        const p = app.parseWorkProtocol(ex);
        if(!p) return;                              /* va por repeticiones */
        const m = String(ex.nota || '').match(/^(\d+)/);
        if(m && p.sets !== Number(m[1])){
          malos.push(ex.id + ': la nota empieza en ' + m[1] + ' y el timer arma ' + p.sets + ' → "' + ex.nota + '"');
        }
      });
      if(malos.length) throw new Error('el timer contradice la nota → ' + malos.join(' | '));
    });

    it('ningún ejercicio con series cae al default de 1', function(){
      /* Ese default silencioso es exactamente lo que produjo el bug: en vez
         de fallar, el timer mostraba algo plausible y equivocado. */
      const sospechosos = TODOS.filter(function(ex){
        const p = app.parseWorkProtocol(ex);
        if(!p || p.sets !== 1) return false;
        return /^\d+\s*(-\s*\d+)?\s*(series|sets|cuelgues|intentos|rondas|circuitos|vueltas|ciclos|bloques|x)\b/i.test(ex.nota || '');
      });
      if(sospechosos.length) throw new Error('sets=1 con la nota pidiendo más: '
        + sospechosos.map(e => e.id + ' → "' + e.nota + '"').join(' | '));
    });

    it('reconoce las unidades en castellano, no sólo "series" y "x"', function(){
      /* El vocabulario que rompió el timer la primera vez. */
      expect(app.parseWorkProtocol({ nota:'5 cuelgues de 10s · 2 min de descanso' }).sets).toBe(5);
      expect(app.parseWorkProtocol({ nota:'6 intentos de 8s · 3 min de descanso' }).sets).toBe(6);
      expect(app.parseWorkProtocol({ nota:'4 rondas de 12s · 2 min de descanso' }).sets).toBe(4);
      /* y sigue entendiendo el formato viejo */
      expect(app.parseWorkProtocol({ nota:'5 x 7-10s · descanso 3 min' }).sets).toBe(5);
    });

    it('las repeticiones dentro de la serie también', function(){
      const p = app.parseWorkProtocol({ nota:'4 series x 3 bloqueos de 5s · 3 min de descanso' });
      expect(p.sets).toBe(4);
      expect(p.reps).toBe(3);
      expect(p.work).toBe(5);
      expect(p.restSet).toBe(180);
    });

    it('el descanso del timer es el de la nota, en segundos', function(){
      const malos = [];
      TODOS.forEach(function(ex){
        const p = app.parseWorkProtocol(ex);
        if(!p || !p.restSet) return;
        const esperado = app.parseRestSeconds(ex);
        if(esperado && p.restSet !== esperado) malos.push(ex.id);
      });
      if(malos.length) throw new Error('descanso distinto al de la nota en: ' + malos.join(', '));
    });
  });
};
