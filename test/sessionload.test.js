/* ====================================================
   sessionload.test.js -- toda sesión hecha tiene que contar como carga

   Auditoría de la frontera plan ↔ motor de carga, con una sola pregunta:
   *¿la fecha del evento coincide con la fecha que se registra?*
   Aparecieron tres bugs, los tres en el camino MÁS usado de la app:

   (A) `markSess`, el auto-completar por ejercicios y "Entrené hoy" NO
       escribían en `cc_logs`. El único camino que lo hacía era el modal
       "Registrar con detalle". Medido: 10 sesiones completadas → `cc_logs`
       vacío → `computeACWR()` devolvía `ratio:null`, o sea que la alerta
       preventiva de lesión no se disparaba NUNCA para un usuario normal.

   (B) `saveSessionLog` guardaba `ts:Date.now()` en vez del día de la sesión:
       registrar hoy una sesión de hace 6 días la metía en la ventana aguda
       de hoy e inflaba el ACWR.

   (C) `saveSessionLog` guardaba `hoursAgo:0` sin mirar la fecha: registrar
       esa misma sesión vieja hundía la recuperación de 100% a 0%.
==================================================== */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  function setup(hoy){
    const inicio = new Date(2026, 6, 6); inicio.setHours(0,0,0,0);   /* lun 6-jul */
    Object.assign(app.U, {
      goal:'sport', level:'intermediate', plan:'10', days:4,
      weight:72, session:90, startDate:inicio,
      gymDays:[1,2,4,5], rockDays:[], rockWeekend:'never'
    });
    app.generatePlan();
    app.TODAY = hoy || new Date(2026, 7, 3);   /* lun 3-ago */
    app.TODAY.setHours(0,0,0,0);
    app.saveSLogs([]);
    app.sessionLog = {};
    app.recData = { sleep:8, sleepQ:4, sore:0, fat:0, rpe:0, dur:0, ts:0,
                    hoursAgo:72, stype:'none' };
  }

  /* Un día de entrenamiento ya pasado, para marcarlo como hecho. */
  function diaPasado(bloque){
    return Object.keys(app.planMap).find(function(k){
      const p = app.planMap[k];
      return p && p.block === (bloque || 'strength') && new Date(k) < app.TODAY;
    });
  }

  describe('(A) marcar una sesión la registra como carga', function(){

    it('markSess(done) escribe en el historial', function(){
      setup();
      const k = diaPasado();
      expect(app.loadSLogs().length).toBe(0);
      app.markSess(k, 'done');
      const logs = app.loadSLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].dateStr).toBe(k);
      expect(logs[0].auto).toBe(true);
    });

    it('un usuario que sólo usa el botón grande YA activa el ACWR', function(){
      /* Éste es el test que importa: antes daba ratio:null con 10 sesiones. */
      setup();
      let n = 0;
      Object.keys(app.planMap).forEach(function(k){
        const p = app.planMap[k];
        if(new Date(k) < app.TODAY && p && p.block !== 'rest' && p.block !== 'test'){
          app.markSess(k, 'done'); n++;
        }
      });
      expect(n).toBeGreaterThan(3);
      const acwr = app.computeACWR();
      /* `sessions` cuenta la ventana crónica de 28 días, así que puede ser
         menor que n si el plan arrancó antes; lo que importa es que el
         motor pasó de "sin datos" a operativo. */
      expect(acwr.sessions).toBeGreaterThanOrEqual(3);
      expect(acwr.ready).toBe(true);
      expect(acwr.ratio).notToBe(null);
    });

    it('completar todos los ejercicios también cuenta como carga', function(){
      setup();
      const k = diaPasado();
      app.TODAY = new Date(k); app.TODAY.setHours(0,0,0,0);
      app.exDone = {}; app.saveSLogs([]);
      const exs = app.getExercisesForDay(k, app.planMap[k].block);
      app._hoyExs = exs;
      exs.forEach(function(_, i){ app.hoyToggleEx(i); });
      expect(app.sessionLog[k]).toBe('done');
      expect(app.loadSLogs().length).toBe(1);
    });

    it('la carga estimada depende de la fase', function(){
      expect(app.estimateSessionLoad('power', 90).rpe)
        .toBeGreaterThan(app.estimateSessionLoad('deload', 90).rpe);
      expect(app.estimateSessionLoad('strength', 120).dur).toBe(120);
    });

    it('un día de descanso o de test no genera carga', function(){
      setup();
      const rest = Object.keys(app.planMap).find(function(k){
        return app.planMap[k] && app.planMap[k].block === 'rest' && new Date(k) < app.TODAY;
      });
      expect(app.logSessionDone(rest)).toBe(null);
      expect(app.loadSLogs().length).toBe(0);
    });

    it('una sesión FUTURA no genera carga: todavía no ocurrió', function(){
      setup();
      const futuro = Object.keys(app.planMap).find(function(k){
        const p = app.planMap[k];
        return p && p.block !== 'rest' && p.block !== 'test' && new Date(k) > app.TODAY;
      });
      expect(app.logSessionDone(futuro)).toBe(null);
      expect(app.loadSLogs().length).toBe(0);
    });

    it('deshacer una sesión quita su carga', function(){
      setup();
      const k = diaPasado();
      app.markSess(k, 'done');
      expect(app.loadSLogs().length).toBe(1);
      app.undoSess(k);
      expect(app.loadSLogs().length).toBe(0);
    });

    it('marcarla como no realizada también la quita', function(){
      setup();
      const k = diaPasado();
      app.markSess(k, 'done');
      app.markSess(k, 'fail');
      expect(app.loadSLogs().length).toBe(0);
    });

    it('la estimación NO pisa un registro detallado del usuario', function(){
      setup();
      const k = diaPasado();
      app.saveSLogs([{ ts:Date.now(), dateStr:k, block:'strength', rpe:10, dur:150 }]);
      app.markSess(k, 'done');
      const logs = app.loadSLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].rpe).toBe(10);    /* el dato real del usuario sobrevive */
    });

    it('...y deshacer tampoco borra ese registro manual', function(){
      setup();
      const k = diaPasado();
      app.saveSLogs([{ ts:Date.now(), dateStr:k, block:'strength', rpe:10, dur:150 }]);
      app.undoSess(k);
      expect(app.loadSLogs().length).toBe(1);
    });
  });

  describe('(B) el log usa la fecha de la sesión, no la de registro', function(){

    it('registrar hoy una sesión de hace 6 días la ubica hace 6 días', function(){
      setup();
      const vieja = new Date(2026, 6, 28); vieja.setHours(0,0,0,0);   /* 6 días antes */
      app.slState = { rpe:9, feel:2, pain:0, focus:'', dateStr:vieja.toDateString(), block:'strength' };
      app.document.getElementById('sl-dur').value = '120';
      app.document.getElementById('sl-notes').value = '';
      app.saveSessionLog();

      const log = app.loadSLogs()[0];
      const diasDeDesfase = Math.abs(log.ts - vieja.getTime()) / 86400000;
      expect(diasDeDesfase).toBeLessThan(1);   /* mismo día, no "hoy" */
    });

    it('una sesión vieja no infla la carga aguda (ventana de 7 días)', function(){
      setup();
      /* 20 días atrás: fuera de la ventana aguda, dentro de la crónica */
      const muyVieja = new Date(2026, 6, 14); muyVieja.setHours(0,0,0,0);
      app.slState = { rpe:9, feel:2, pain:0, focus:'', dateStr:muyVieja.toDateString(), block:'strength' };
      app.document.getElementById('sl-dur').value = '120';
      app.document.getElementById('sl-notes').value = '';
      app.saveSessionLog();
      expect(app.computeACWR().acute).toBe(0);
    });
  });

  describe('(C) registrar una sesión vieja no hunde la recuperación de hoy', function(){

    it('el score se mantiene al registrar una sesión de hace 6 días', function(){
      setup();
      const antes = app.calcRecovery().score;
      const vieja = new Date(2026, 6, 28); vieja.setHours(0,0,0,0);
      app.slState = { rpe:9, feel:2, pain:0, focus:'', dateStr:vieja.toDateString(), block:'strength' };
      app.document.getElementById('sl-dur').value = '120';
      app.document.getElementById('sl-notes').value = '';
      app.saveSessionLog();
      expect(Math.round(app.calcRecovery().score)).toBe(Math.round(antes));
    });

    it('pero registrar la sesión de HOY sí actualiza el check-in', function(){
      setup();
      const antes = app.calcRecovery().score;
      app.slState = { rpe:9, feel:2, pain:0, focus:'', dateStr:app.TODAY.toDateString(), block:'strength' };
      app.document.getElementById('sl-dur').value = '120';
      app.document.getElementById('sl-notes').value = '';
      app.saveSessionLog();
      expect(app.recData.hoursAgo).toBe(0);
      expect(app.calcRecovery().score).toBeLessThan(antes);
    });
  });
};
