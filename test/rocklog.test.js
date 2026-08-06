/* Salidas de roca ↔ motor de carga.

   Dos bugs reales que estos tests fijan:

   (1) Marcar una salida FUTURA aplicaba `hoursAgo:0` al check-in, o sea
       "acabás de escalar 4 horas". Planificar el sábado desde el miércoles
       hundía la recuperación de 100% a 8% por algo que no había pasado.

   (2) Las salidas de roca nunca entraban en `cc_logs`, que es lo que lee
       computeACWR(). Para un escalador de roca ésa es la carga MÁS alta de
       la semana: el ratio agudo:crónico salía bajo y la app recomendaba
       progresar justo cuando más carga acumulaba. El ACWR es la alerta
       preventiva de lesión (Gabbett 2016), así que el fallo iba en la
       dirección peligrosa. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  const D = s => new Date(s + 'T00:00:00').toDateString();
  const MIE = '2026-08-05';   /* miércoles */

  function hoyEsMiercoles(){
    app.TODAY = new Date(2026, 7, 5); app.TODAY.setHours(0,0,0,0);
  }
  function limpiar(){
    app.saveSLogs([]);
    app.recData = { sleep:8, sleepQ:4, sore:0, fat:0, rpe:0, dur:0, ts:0,
                    hoursAgo:72, stype:'none' };
  }

  describe('resolveRockLogging() — pasado, hoy y futuro son distintos', function(){

    it('una salida futura NO registra carga ni toca la recuperación', function(){
      hoyEsMiercoles();
      const w = app.resolveRockLogging(D('2026-08-08'), app.TODAY);   /* sábado */
      expect(w.when).toBe('future');
      expect(w.log).toBe(false);
      expect(w.touchRecovery).toBe(false);
    });

    it('una salida de hoy registra carga y actualiza el check-in', function(){
      hoyEsMiercoles();
      const w = app.resolveRockLogging(D(MIE), app.TODAY);
      expect(w.when).toBe('today');
      expect(w.log).toBe(true);
      expect(w.touchRecovery).toBe(true);
      expect(w.hoursAgo).toBe(0);
    });

    it('una salida pasada registra carga con las horas correctas', function(){
      hoyEsMiercoles();
      const w = app.resolveRockLogging(D('2026-08-04'), app.TODAY);   /* ayer */
      expect(w.when).toBe('past');
      expect(w.log).toBe(true);
      expect(w.hoursAgo).toBe(24);
    });

    it('una salida vieja no pisa el check-in de hoy', function(){
      hoyEsMiercoles();
      const w = app.resolveRockLogging(D('2026-07-25'), app.TODAY);   /* 11 días */
      expect(w.log).toBe(true);            /* la carga sí cuenta para el ACWR */
      expect(w.touchRecovery).toBe(false); /* pero no es "tu última sesión" */
    });
  });

  describe('planificar una salida futura no hunde la recuperación', function(){

    it('el score se mantiene tras agendar el sábado desde el miércoles', function(){
      hoyEsMiercoles(); limpiar();
      const antes = app.calcRecovery().score;
      app.applyRockSideEffects(D('2026-08-08'));
      const despues = app.calcRecovery().score;
      expect(Math.round(despues)).toBe(Math.round(antes));
    });

    it('en cambio, marcar que saliste HOY sí baja el score', function(){
      hoyEsMiercoles(); limpiar();
      const antes = app.calcRecovery().score;
      app.applyRockSideEffects(D(MIE));
      expect(app.calcRecovery().score).toBeLessThan(antes);
    });
  });

  describe('las salidas de roca alimentan el ACWR', function(){

    it('marcar una salida pasada la registra en el historial', function(){
      hoyEsMiercoles(); limpiar();
      expect(app.loadSLogs().length).toBe(0);
      app.applyRockSideEffects(D('2026-08-03'));
      const logs = app.loadSLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].block).toBe('outdoor');
      expect(logs[0].dateStr).toBe(D('2026-08-03'));
    });

    it('una salida futura NO ensucia el historial', function(){
      hoyEsMiercoles(); limpiar();
      app.applyRockSideEffects(D('2026-08-08'));
      expect(app.loadSLogs().length).toBe(0);
    });

    it('varios findes de roca producen un ACWR calculable (antes daba null)', function(){
      hoyEsMiercoles(); limpiar();
      /* 5 semanas de findes hacia atrás desde el miércoles */
      for(let s = 1; s <= 5; s++){
        const sab = new Date(2026, 7, 5); sab.setDate(sab.getDate() - (s * 7) - 3);
        const dom = new Date(sab); dom.setDate(dom.getDate() + 1);
        app.applyRockSideEffects(sab.toDateString());
        app.applyRockSideEffects(dom.toDateString());
      }
      const acwr = app.computeACWR();
      expect(acwr.sessions).toBeGreaterThan(0);
      expect(acwr.chronic).toBeGreaterThan(0);
    });

    it('remarcar el mismo día no duplica la entrada', function(){
      hoyEsMiercoles(); limpiar();
      app.applyRockSideEffects(D('2026-08-03'));
      app.applyRockSideEffects(D('2026-08-03'));
      expect(app.loadSLogs().length).toBe(1);
    });

    it('la carga de roca usa su propio multiplicador, no el de resistencia', function(){
      /* blockToStype('outdoor') caía en el fallback 'endurance' (0.7)
         en lugar de 'outdoor' (0.9): subestimaba cada salida un 22%. */
      expect(app.blockToStype('outdoor')).toBe('outdoor');
    });
  });

  describe('desmarcar una salida limpia su carga', function(){

    it('quita del historial la entrada que puso la app', function(){
      hoyEsMiercoles(); limpiar();
      app.applyRockSideEffects(D('2026-08-03'));
      expect(app.loadSLogs().length).toBe(1);
      expect(app.unlogRockOuting(D('2026-08-03'))).toBe(true);
      expect(app.loadSLogs().length).toBe(0);
    });

    it('NO borra una sesión que el usuario registró a mano', function(){
      hoyEsMiercoles(); limpiar();
      /* sin `auto`: es un log propio del usuario, con su RPE real */
      app.saveSLogs([{ ts:Date.now(), dateStr:D('2026-08-03'), block:'outdoor', rpe:9, dur:300 }]);
      expect(app.unlogRockOuting(D('2026-08-03'))).toBe(false);
      expect(app.loadSLogs().length).toBe(1);
    });
  });
};
