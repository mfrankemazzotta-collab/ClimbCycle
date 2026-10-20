/* ====================================================
   complement.test.js -- Abrahangs diarios + hombros y core

   Lo que se protege acá:
   - Los Abrahangs NO aparecen el día que los dedos ya reciben carga fuerte
     (cuelgues máximos, campus, potencia, test, roca): un hábito "suave"
     sumado a un día de max hangs deja de ser suave.
   - Principiantes no los ven: todavía no cuelgan de regleta (minLevel 1).
   - Hombros y core caen 2 veces por semana, separados, y no en descanso.
   - El tilde del complemento vive aparte de exDone: los Abrahangs de un día
     de descanso no se borran cuando se poda exDone.
==================================================== */
const { describe, it, expect } = require('./assert');

module.exports = function(app, R){
  const ids = function(list){ return (list || []).map(function(e){ return e.id; }); };
  const fuerza = [{ id:'str1', cat:'finger_strength' }, { id:'str3', cat:'pull_strength' }];
  const resistencia = [{ id:'end2', cat:'aerobic_endurance' }];

  describe('complementsForDay — Abrahangs', function(){
    it('un intermedio en día de resistencia los tiene', function(){
      const c = app.complementsForDay({ block:'endurance', exercises:resistencia, level:'intermediate' });
      expect(c.daily && c.daily.id).toBe('cmp1');
      expect(c.dailyWhy).toBe('');
    });
    it('en un día de descanso también (es cuando más sentido tienen)', function(){
      const c = app.complementsForDay({ block:'rest', level:'advanced' });
      expect(c.daily && c.daily.id).toBe('cmp1');
    });
    it('NO con cuelgues máximos en la sesión', function(){
      const c = app.complementsForDay({ block:'strength', exercises:fuerza, level:'intermediate' });
      expect(c.daily).toBe(null);
      expect(c.dailyWhy).toBe('dedos');
    });
    it('NO en potencia, test ni día de roca', function(){
      expect(app.complementsForDay({ block:'power', level:'advanced' }).daily).toBe(null);
      expect(app.complementsForDay({ block:'test', level:'advanced' }).daily).toBe(null);
      expect(app.complementsForDay({ block:'rest', outdoor:true, level:'advanced' }).daily).toBe(null);
    });
    it('NO con campus en la sesión aunque el bloque sea otro', function(){
      const c = app.complementsForDay({ block:'endurance', exercises:[{ id:'pow1', cat:'campus_board' }], level:'elite' });
      expect(c.daily).toBe(null);
    });
    it('principiante: no, y dice por qué', function(){
      const c = app.complementsForDay({ block:'rest', level:'beginner' });
      expect(c.daily).toBe(null);
      expect(c.dailyWhy).toBe('principiante');
    });
    it('sin colgador usa presas del muro; sin muro tampoco, avisa', function(){
      const sinColgador = { boulder:true, rope:false, board:false, campus:false, spray:false, hangboard:false, pullup:false };
      const c = app.complementsForDay({ block:'rest', level:'intermediate', gear:sinColgador });
      expect(c.daily && c.daily.n).toBe('Cuelgues suaves en presas del muro');
      const nada = { boulder:false, rope:true, board:false, campus:false, spray:false, hangboard:false, pullup:false };
      const c2 = app.complementsForDay({ block:'rest', level:'intermediate', gear:nada });
      expect(c2.daily).toBe(null);
      expect(c2.dailyWhy).toBe('material');
    });
    it('el timer arma 20 cuelgues de 10s con 20s de pausa', function(){
      const ex = app.EX_POOL.complement.filter(e => e.id === 'cmp1')[0];
      const p = app.parseWorkProtocol(ex);
      expect(p.sets).toBe(20);
      expect(p.work).toBe(10);
      expect(p.restSet).toBe(20);
    });
    it('la ciencia no promete de más (estudio retrospectivo, suma y no reemplaza)', function(){
      const ex = app.EX_POOL.complement.filter(e => e.id === 'cmp1')[0];
      expect(/retrospectivo/i.test(ex.sci)).toBe(true);
      expect(/no reemplaza|suma/i.test(ex.simple)).toBe(true);
    });
  });

  describe('complementsForDay — hombros y core', function(){
    it('el día que toca trae 3 de hombros y 3 de core', function(){
      const c = app.complementsForDay({ block:'endurance', exercises:resistencia, level:'intermediate', prehabDay:true });
      expect(ids(c.prehab).join()).toBe('cmp2,cmp3,cmp4');
      expect(ids(c.core).join()).toBe('cmp5,cmp6,cmp7');
    });
    it('el día que no toca, nada', function(){
      const c = app.complementsForDay({ block:'endurance', level:'intermediate', prehabDay:false });
      expect(c.prehab.length + c.core.length).toBe(0);
    });
    it('nunca en descanso ni roca', function(){
      expect(app.complementsForDay({ block:'rest', level:'intermediate', prehabDay:true }).core.length).toBe(0);
      expect(app.complementsForDay({ block:'rest', outdoor:true, level:'intermediate', prehabDay:true }).core.length).toBe(0);
    });
    it('principiante: sin elevaciones colgado (piden nivel 1)', function(){
      const c = app.complementsForDay({ block:'strength', level:'beginner', prehabDay:true });
      expect(ids(c.core)).notToContain('cmp6');
      expect(c.core.length).toBe(2);
    });
    it('en descarga con el circuito de antagonistas no repite los de hombro', function(){
      const c = app.complementsForDay({ block:'deload', exercises:[{ id:'del2', cat:'mobility' }], level:'intermediate', prehabDay:true });
      expect(c.prehab.length).toBe(0);
      expect(c.core.length).toBe(3);
    });
    it('sin barra, las elevaciones pasan al suelo', function(){
      const sinBarra = { boulder:false, rope:true, board:false, campus:false, spray:false, hangboard:false, pullup:false };
      const c = app.complementsForDay({ block:'endurance', level:'intermediate', prehabDay:true, gear:sinBarra });
      const e = c.core.filter(x => x.id === 'cmp6')[0];
      expect(e && /suelo/.test(e.n)).toBe(true);
    });
  });

  describe('prehabDayIndexes — 2 por semana, separados', function(){
    it('reparte según la cantidad de días', function(){
      expect(app.prehabDayIndexes(0).join()).toBe('');
      expect(app.prehabDayIndexes(1).join()).toBe('0');
      expect(app.prehabDayIndexes(2).join()).toBe('0,1');
      expect(app.prehabDayIndexes(3).join()).toBe('0,2');
      expect(app.prehabDayIndexes(4).join()).toBe('0,2');
      expect(app.prehabDayIndexes(5).join()).toBe('0,3');
    });
    it('con un plan real: exactamente 2 días por semana con 2+ sesiones', function(){
      const lunes = new Date(2026, 7, 3); lunes.setHours(0,0,0,0);
      Object.assign(app.U, { goal:'sport', level:'intermediate', plan:'10', days:4, session:90,
        startDate:lunes, gymDays:[1,2,4,5], rockDays:[], gear:null });
      app.generatePlan();
      const porSemana = {};
      Object.keys(app.planMap).forEach(function(k){
        const p = app.planMap[k];
        if(!p || p.block === 'rest' || p.block === 'test' || p.outdoor) return;
        porSemana[p.week] = porSemana[p.week] || { dias:0, prehab:0 };
        porSemana[p.week].dias++;
        if(app.getComplementsForDay(k).core.length) porSemana[p.week].prehab++;
      });
      const malas = Object.keys(porSemana).filter(function(w){
        const s = porSemana[w];
        return s.prehab !== Math.min(2, s.dias);
      });
      if(malas.length) throw new Error('semanas con prehab mal repartido: ' + malas.map(w => w + ' → ' + JSON.stringify(porSemana[w])).join(', '));
      expect(Object.keys(porSemana).length).toBeGreaterThan(2);
    });
  });

  describe('dailyDone — registro aparte de exDone', function(){
    const D = 'Mon Jan 05 2026';
    it('tilda y destilda sin dejar días vacíos', function(){
      app.dailyDone = {};
      expect(app.toggleDailyDone(D, 'cmp1')).toBe(true);
      expect(app.isDailyDone(D, 'cmp1')).toBe(true);
      expect(app.toggleDailyDone(D, 'cmp1')).toBe(false);
      expect(app.dailyDone[D]).toBe(undefined);
    });
    it('podar exDone no toca los Abrahangs de un día de descanso', function(){
      app.dailyDone = {}; app.exDone = {};
      app.toggleDailyDone(D, 'cmp1');
      app.pruneExDone();
      expect(app.isDailyDone(D, 'cmp1')).toBe(true);
    });
    it('cuenta la constancia de los últimos 7 días', function(){
      const hoy = new Date(2026, 0, 10);
      const map = {};
      [0, 1, 3, 9].forEach(function(n){
        const d = new Date(hoy); d.setDate(d.getDate() - n);
        map[d.toDateString()] = { cmp1:true };
      });
      expect(app.dailyCountLastDays(map, hoy, 'cmp1', 7)).toBe(3);   /* el de hace 9 días no cuenta */
    });
    it('poda lo viejo y lo ilegible, conserva lo reciente', function(){
      const now = Date.parse('2026-03-01T12:00:00');
      const viejas = app.staleDailyKeys({ 'Thu Jan 01 2026':{}, 'Fri Feb 27 2026':{}, 'basura':{} }, now, 30);
      expect(viejas).toContain('Thu Jan 01 2026');
      expect(viejas).toContain('basura');
      expect(viejas).notToContain('Fri Feb 27 2026');
    });
    it('viaja en el backup', function(){
      app.dailyDone = {}; app.toggleDailyDone(D, 'cmp1'); app.saveDaily();
      const b = app._collectBundle();
      expect(String(b.data.cc_daily || '').indexOf('cmp1')).toBeGreaterThan(-1);
    });
  });

  describe('dailyWidgetState — lo que dice el widget', function(){
    it('toca / hecho / pausa / nivel', function(){
      const ex = { id:'cmp1' };
      expect(app.dailyWidgetState({ daily:ex }, false, 3).estado).toBe('toca');
      expect(app.dailyWidgetState({ daily:ex }, true, 4).estado).toBe('hecho');
      expect(app.dailyWidgetState({ daily:null, dailyWhy:'dedos' }, false, 2).estado).toBe('pausa');
      expect(app.dailyWidgetState({ daily:null, dailyWhy:'principiante' }, false, 0).estado).toBe('nivel');
    });
    it('si ya lo hiciste, gana "hecho" aunque hoy no tocara', function(){
      expect(app.dailyWidgetState({ daily:null, dailyWhy:'dedos' }, true, 5).estado).toBe('hecho');
    });
  });

  if(R) describe('pantalla Hoy — sección Complemento', function(){
    const r = R.app;
    function preparar(level){
      const lunes = new Date(2026, 7, 3); lunes.setHours(0,0,0,0);
      Object.assign(r.U, { goal:'sport', level:level, plan:'10', days:4, session:90, name:'Test',
        startDate:lunes, gymDays:[1,2,4,5], rockDays:[], gear:null });
      r.generatePlan();
    }
    function hoyEn(pred){
      const k = Object.keys(r.planMap).find(function(k){ return pred(r.planMap[k], k); });
      r.TODAY = new Date(k); r.TODAY.setHours(0,0,0,0);
      return R.capture(function(){ r.renderHoy(); });
    }
    it('día de descanso de un intermedio: aparecen los Abrahangs', function(){
      preparar('intermediate');
      const html = hoyEn(function(p){ return p && p.block === 'rest' && !p.outdoor; });
      expect(html.indexOf('Abrahangs')).toBeGreaterThan(-1);
      expect(html.indexOf('hoyToggleCmp(0)')).toBeGreaterThan(-1);
    });
    it('día con cuelgues máximos: no aparecen', function(){
      preparar('intermediate');
      const html = hoyEn(function(p, k){
        return p && p.block === 'strength' && r.getExercisesForDay(k, 'strength').some(e => e.cat === 'finger_strength');
      });
      expect(html.indexOf('Abrahangs')).toBe(-1);
    });
    it('el día de hombros y core muestra el desplegable', function(){
      preparar('intermediate');
      const html = hoyEn(function(p, k){ return p && p.block !== 'rest' && p.block !== 'test' && r.getComplementsForDay(k).core.length; });
      expect(html.indexOf('Hombros y core')).toBeGreaterThan(-1);
    });
  });
};
