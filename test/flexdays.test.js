/* Tests for the flexible availability-window logic (planner.js):
   - hasTightSpacing(): warns about back-to-back sessions
   - mergePreservePast(): re-schedule the future without rewriting history */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  describe('hasTightSpacing()', function(){
    it('true when two training days are consecutive (Mon+Tue)', function(){
      expect(app.hasTightSpacing([1, 2, 4])).toBe(true);
    });
    it('false when days are spaced (Mon/Wed/Fri)', function(){
      expect(app.hasTightSpacing([1, 3, 5])).toBe(false);
    });
    it('false for zero or one day', function(){
      expect(app.hasTightSpacing([])).toBe(false);
      expect(app.hasTightSpacing([3])).toBe(false);
    });
    it('detects adjacency regardless of input order', function(){
      expect(app.hasTightSpacing([5, 1, 2])).toBe(true);
    });
  });

  describe('mergePreservePast()', function(){
    const today = new Date('2026-01-15T12:00:00');
    function ds(y, m, d){ return new Date(y, m, d).toDateString(); }

    it('keeps the past and takes the new schedule for the future', function(){
      const past = ds(2026, 0, 5), futA = ds(2026, 0, 20), futB = ds(2026, 0, 21);
      const oldMap = {}; oldMap[past] = { block:'strength', week:1 }; oldMap[futA] = { block:'strength', week:3 };
      const newMap = {}; newMap[past] = { block:'endurance', week:1 }; newMap[futA] = { block:'endurance', week:3 }; newMap[futB] = { block:'power', week:3 };
      const m = app.mergePreservePast(oldMap, newMap, today, {});
      expect(m[past].block).toBe('strength');   /* history not rewritten */
      expect(m[futA].block).toBe('endurance');  /* future re-scheduled */
      expect(m[futB].block).toBe('power');      /* new future day added */
    });

    it('preserves a logged session even in the future window', function(){
      const fut = ds(2026, 0, 20);
      const oldMap = {}; oldMap[fut] = { block:'strength', week:3 };
      const newMap = {}; newMap[fut] = { block:'endurance', week:3 };
      const sl = {}; sl[fut] = 'done';
      expect(app.mergePreservePast(oldMap, newMap, today, sl)[fut].block).toBe('strength');
    });

    it('preserves a manual tweak (outdoor rock / forced)', function(){
      const fut = ds(2026, 0, 22);
      const oldMap = {}; oldMap[fut] = { block:'rest', week:3, outdoor:true, note:'roca' };
      const newMap = {}; newMap[fut] = { block:'power', week:3 };
      expect(app.mergePreservePast(oldMap, newMap, today, {})[fut].outdoor).toBe(true);
    });

    it('drops a future training day the new window no longer includes (→ rest)', function(){
      const fut = ds(2026, 0, 25);
      const oldMap = {}; oldMap[fut] = { block:'power', week:3 };
      expect(app.mergePreservePast(oldMap, {}, today, {})[fut]).toBe(undefined);
    });
  });

  describe('resolveTrainedToday()  ("Entrené hoy")', function(){
    function day(date, isTraining, done, isToday){ return { date, isTraining, done, isToday }; }

    it('marks today when today is a pending training day', function(){
      const wk = [ day('Mon', true, false, false), day('Tue', true, false, true) ];
      expect(app.resolveTrainedToday(wk).action).toBe('markToday');
    });
    it('reports alreadyDone when today is already completed', function(){
      expect(app.resolveTrainedToday([ day('Tue', true, true, true) ]).action).toBe('alreadyDone');
    });
    it('anchors a pending (missed) session onto today when today is rest', function(){
      const wk = [ day('Mon', true, false, false), day('Tue', false, false, true) ];
      const r = app.resolveTrainedToday(wk);
      expect(r.action).toBe('moveHere');
      expect(r.from).toBe('Mon');
    });
    it('logs a bonus when today is rest and nothing is pending', function(){
      const wk = [ day('Mon', true, true, false), day('Tue', false, false, true) ];
      expect(app.resolveTrainedToday(wk).action).toBe('bonus');
    });
    it('prioritizes marking today over catching up an earlier miss', function(){
      const wk = [ day('Mon', true, false, false), day('Wed', true, false, true) ];
      expect(app.resolveTrainedToday(wk).action).toBe('markToday');
    });
  });

  describe('parseRestSeconds() — preloads the rest timer in "Hoy"', function(){
    it('parses "descanso 3 min"', function(){
      expect(app.parseRestSeconds({ nota:'5 series · descanso 3 min' })).toBe(180);
    });
    it('parses the compact ":4min" form', function(){
      expect(app.parseRestSeconds({ nota:'5 x 3-5rep @RPE8-9 :4min' })).toBe(240);
    });
    it('takes the LOW end of a range ("descanso 2-3 min")', function(){
      expect(app.parseRestSeconds({ nota:'4-5 series · descanso 2-3 min' })).toBe(120);
    });
    it('parses seconds (":90s")', function(){
      expect(app.parseRestSeconds({ nota:'3 x 15 reps :90s' })).toBe(90);
    });
    it('returns null for relative rest (1:1 / rest=work) — timer cannot be preset', function(){
      expect(app.parseRestSeconds({ nota:'4-6 series · descanso 1:1' })).toBe(null);
      expect(app.parseRestSeconds({ nota:'8 x 30 movs, rest=work' })).toBe(null);
    });
    it('returns null for a null exercise or unparseable text', function(){
      expect(app.parseRestSeconds(null)).toBe(null);
      expect(app.parseRestSeconds({ nota:'sin datos de descanso' })).toBe(null);
    });
  });

  describe('splitDose() / formatRest() — dosis grande vs. descanso secundario', function(){
    it('formatRest da m:ss', function(){
      expect(app.formatRest(180)).toBe('3:00');
      expect(app.formatRest(90)).toBe('1:30');
      expect(app.formatRest(0)).toBe('');
    });
    it('deja la dosis COMPACTA y baja el resto a detalle', function(){
      const r = app.splitDose({ nota:'5 series · 10s con buffer 3s · descanso 3 min' });
      expect(r.dose).toBe('5 series');            /* lo que va en grande */
      expect(r.detail).toBe('10s con buffer 3s'); /* lo que va chico */
      expect(r.rest).toBe('3:00');
    });
    it('separa la forma compacta ":4min"', function(){
      const r = app.splitDose({ nota:'5 x 3-5rep @RPE8-9 :4min' });
      expect(r.dose).toBe('5 x 3-5rep');
      expect(r.rest).toBe('4:00');
    });
    it('recorta una frase larga hasta la palabra-unidad', function(){
      const r = app.splitDose({ nota:'6-10 intentos de 1-2 movimientos máximos · descanso 3 min' });
      expect(r.dose).toBe('6-10 intentos');
      expect(r.detail).toBe('de 1-2 movimientos máximos');
    });
    it('nunca corta dejando un paréntesis abierto', function(){
      const r = app.splitDose({ nota:'8-12 x (30s on / 30s off)' });
      expect(r.dose.split('(').length).toBe(r.dose.split(')').length);
    });
    it('con descanso relativo deja la dosis y rest vacío', function(){
      const r = app.splitDose({ nota:'8 x 30 movs, rest=work' });
      expect(r.dose).toBe('8 x 30 movs');
      expect(r.rest).toBe('');
    });
    it('nunca devuelve una dosis vacía', function(){
      expect(app.splitDose({ nota:'descanso 3 min' }).dose.length).toBeGreaterThan(0);
      expect(app.splitDose(null).dose).toBe('');
    });
  });

  describe('parseWorkProtocol() — temporizador contextual', function(){
    it('los cuelgues a tiempo devuelven protocolo (series × trabajo)', function(){
      const p = app.parseWorkProtocol({ nota:'5 series · 10s con buffer 3s · descanso 3 min' });
      expect(p.sets).toBe(5);
      expect(p.work).toBe(10);
      expect(p.restSet).toBe(180);
    });
    it('los repeaters incluyen reps y descanso entre reps', function(){
      const p = app.parseWorkProtocol({ nota:'3-4 series · (7s on / 3s off) x6 · descanso 3 min' });
      expect(p.sets).toBe(3);
      expect(p.reps).toBe(6);
      expect(p.work).toBe(7);
      expect(p.restRep).toBe(3);
    });
    it('los ejercicios por REPETICIONES no llevan protocolo (solo descanso)', function(){
      expect(app.parseWorkProtocol({ nota:'5 x 3-5rep @RPE8-9 :4min' })).toBe(null);
      expect(app.parseWorkProtocol({ nota:'4-6 bloques límite (4-8 movs) · descanso 3-4 min' })).toBe(null);
    });
    /* Regresión: ":90s" es DESCANSO y "cada 60s" es CADENCIA — ninguno es
       tiempo de trabajo. Antes se colaban y disparaban un protocolo falso. */
    it('no confunde el descanso ni la cadencia con tiempo de trabajo', function(){
      expect(app.parseWorkProtocol({ nota:'3 x 15 reps :90s' })).toBe(null);
      expect(app.parseWorkProtocol({ nota:'8-12 x 6-8 movs cada 60s' })).toBe(null);
    });
    it('toma el extremo bajo de los rangos', function(){
      const p = app.parseWorkProtocol({ nota:'4-5 series · 20-40s a intensidad moderada · descanso 2-3 min' });
      expect(p.sets).toBe(4);
      expect(p.work).toBe(20);
      expect(p.restSet).toBe(120);
    });
    it('todo el pool se clasifica sin romper', function(){
      const P = app.EX_POOL;
      const all = [].concat(P.strength, P.power, P.endurance, P.deload);
      let conProto = 0;
      all.forEach(function(e){
        const p = app.parseWorkProtocol(e);
        if(p){ conProto++;
          expect(p.sets).toBeGreaterThan(0);
          expect(p.work).toBeGreaterThan(0);
        }
      });
      expect(conProto).toBeGreaterThan(0);
    });
  });

  describe('TODAY normalized to midnight (start-date picker allows "today")', function(){
    it('TODAY has no time component', function(){
      expect(app.TODAY.getHours()).toBe(0);
      expect(app.TODAY.getMinutes()).toBe(0);
      expect(app.TODAY.getSeconds()).toBe(0);
    });
    it('today is NOT treated as a past day and IS recognized as today', function(){
      const today = new Date(app.TODAY.getFullYear(), app.TODAY.getMonth(), app.TODAY.getDate());
      expect(today < app.TODAY).toBe(false);                       /* not past → selectable */
      expect(today.getTime() === app.TODAY.getTime()).toBe(true);  /* matched as today */
    });
  });

  describe('applyRockDayToPlan() — rock weekend does not deload the week', function(){
    const D = function(s){ return new Date(s).toDateString(); };
    function setStart(){ app.U.startDate = new Date('2026-01-05'); }   /* Monday */

    it('a Sat+Sun rock block gives ONE rest day, never a week of deload', function(){
      setStart();
      const sat = D('2026-01-10'), sun = D('2026-01-11');
      const mon = D('2026-01-12'), tue = D('2026-01-13'), wed = D('2026-01-14'), thu = D('2026-01-15');
      app.planMap = {};
      [mon, tue, wed, thu].forEach(function(k){ app.planMap[k] = { block:'endurance', week:1 }; });
      app.applyRockDayToPlan(sat);
      app.applyRockDayToPlan(sun);
      /* the whole following week must contain ZERO deload days */
      const deloads = [mon, tue, wed, thu].filter(function(k){ return app.planMap[k].block === 'deload'; });
      expect(deloads.length).toBe(0);
      expect(app.planMap[mon].block).toBe('rest');       /* one recovery day */
      expect(app.planMap[tue].block).toBe('endurance');  /* the rest stay as-is */
    });

    it('removing the rock weekend restores the plan exactly', function(){
      setStart();
      const sat = D('2026-01-10'), sun = D('2026-01-11');
      const days = ['2026-01-12','2026-01-13','2026-01-14','2026-01-15'].map(D);
      app.planMap = {};
      days.forEach(function(k){ app.planMap[k] = { block:'endurance', week:1 }; });
      const before = days.map(function(k){ return app.planMap[k].block; }).join(',');
      app.applyRockDayToPlan(sat); app.applyRockDayToPlan(sun);
      app.removeRockDayFromPlan(sat); app.removeRockDayFromPlan(sun);
      const after = days.map(function(k){ return app.planMap[k] ? app.planMap[k].block : 'rest'; }).join(',');
      expect(after).toBe(before);
    });

    it('a SINGLE rock day still eases the next hard (strength) session', function(){
      setStart();
      const fri = D('2026-01-09');            /* rock Friday */
      const mon = D('2026-01-12');            /* next strength day (Fri+3) */
      app.planMap = {};
      app.planMap[mon] = { block:'strength', week:1 };
      app.applyRockDayToPlan(fri);
      expect(app.planMap[mon].note).toBe('reducido-post-roca');
      expect(app.planMap[mon].block).toBe('endurance');   /* strength → eased, NOT deload */
    });
  });
};
