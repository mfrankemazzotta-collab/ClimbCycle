/* ====================================================
   push.test.js -- qué avisos se programan y cuándo

   La agenda se arma en el teléfono y se sube al servidor: lo que diga
   buildPushSchedule es exactamente lo que va a sonar en el bolsillo. Un
   aviso de "hoy toca entrenar" el día que ya entrenaste, o a las 3 de la
   mañana, es la forma más rápida de que alguien desactive los avisos.
==================================================== */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  const lunes = new Date(2026, 9, 19); lunes.setHours(0,0,0,0);   /* lunes 19/10/2026 */
  const dia = function(n){ const d = new Date(lunes); d.setDate(d.getDate() + n); return d.toDateString(); };
  const antesDeTodo = new Date(lunes).setHours(6, 0, 0, 0);

  describe('buildPushSchedule — contenido', function(){
    it('día de entrenamiento: título claro y el bloque en el cuerpo', function(){
      const s = app.buildPushSchedule([{ dateStr:dia(0), block:'strength', label:'Fuerza' }], { hour:8, now:antesDeTodo });
      expect(s.length).toBe(1);
      expect(s[0].title).toBe('Hoy toca entrenar');
      expect(s[0].body).toContainText('Fuerza');
    });
    it('suma hombros/core y Abrahangs cuando tocan', function(){
      const s = app.buildPushSchedule([{ dateStr:dia(0), block:'endurance', label:'Resistencia', hombros:true, abrahangs:true }], { hour:8, now:antesDeTodo });
      expect(s[0].body).toContainText('hombros y core');
      expect(s[0].body).toContainText('Abrahangs');
    });
    it('descanso con Abrahangs: aviso propio; descanso sin nada: silencio', function(){
      const s = app.buildPushSchedule([
        { dateStr:dia(0), block:'rest', abrahangs:true },
        { dateStr:dia(1), block:'rest', abrahangs:false }
      ], { hour:8, now:antesDeTodo });
      expect(s.length).toBe(1);
      expect(s[0].title).toBe('Tus Abrahangs de hoy');
    });
    it('día de roca: no avisa (ya sabés que vas a la roca)', function(){
      const s = app.buildPushSchedule([{ dateStr:dia(0), block:'rest', outdoor:true }], { hour:8, now:antesDeTodo });
      expect(s.length).toBe(0);
    });
    it('día de tests', function(){
      const s = app.buildPushSchedule([{ dateStr:dia(0), block:'test' }], { hour:8, now:antesDeTodo });
      expect(s[0].title).toBe('Hoy: día de tests');
    });
    it('una sesión ya hecha no se recuerda', function(){
      const s = app.buildPushSchedule([{ dateStr:dia(0), block:'strength', label:'Fuerza', done:true }], { hour:8, now:antesDeTodo });
      expect(s.length).toBe(0);
    });
  });

  describe('buildPushSchedule — horario', function(){
    it('a la hora elegida, en hora LOCAL', function(){
      const s = app.buildPushSchedule([{ dateStr:dia(2), block:'power', label:'Potencia' }], { hour:19, now:antesDeTodo });
      const at = new Date(s[0].send_at);
      expect(at.getHours()).toBe(19);
      expect(at.toDateString()).toBe(dia(2));
    });
    it('si la hora de hoy ya pasó, hoy no se programa (no llega tarde)', function(){
      const mediodia = new Date(lunes).setHours(12, 0, 0, 0);
      const s = app.buildPushSchedule([
        { dateStr:dia(0), block:'strength', label:'Fuerza' },
        { dateStr:dia(1), block:'strength', label:'Fuerza' }
      ], { hour:8, now:mediodia });
      expect(s.length).toBe(1);
      expect(new Date(s[0].send_at).toDateString()).toBe(dia(1));
    });
    it('una hora inválida cae al default de las 8', function(){
      const s = app.buildPushSchedule([{ dateStr:dia(1), block:'strength' }], { hour:99, now:antesDeTodo });
      expect(new Date(s[0].send_at).getHours()).toBe(8);
    });
    it('cada día tiene su tag (el aviso nuevo reemplaza al viejo del mismo día)', function(){
      const s = app.buildPushSchedule([
        { dateStr:dia(1), block:'strength' }, { dateStr:dia(2), block:'strength' }
      ], { hour:8, now:antesDeTodo });
      expect(s[0].tag === s[1].tag).toBe(false);
    });
    it('tolera basura sin romper', function(){
      expect(app.buildPushSchedule(null).length).toBe(0);
      expect(app.buildPushSchedule([null, {}, { dateStr:'no es fecha', block:'strength' }], { now:antesDeTodo }).length).toBe(0);
    });
  });

  describe('pushDaysFromPlan — desde el plan real', function(){
    it('14 días, con lo hecho marcado y los complementos calculados', function(){
      Object.assign(app.U, { goal:'sport', level:'intermediate', plan:'4-3-2-1', days:4, session:90,
        startDate:lunes, gymDays:[1,2,4,5], rockDays:[], gear:null });
      app.generatePlan();
      const primero = Object.keys(app.planMap).filter(k => { const p = app.planMap[k]; return p && p.block !== 'rest' && p.block !== 'test'; })
        .sort((a, b) => new Date(a) - new Date(b))[0];
      app.sessionLog[primero] = 'done';
      const days = app.pushDaysFromPlan(lunes, 14);
      expect(days.length).toBe(14);
      expect(days.filter(d => d.dateStr === primero)[0].done).toBe(true);
      expect(days.some(d => d.hombros)).toBe(true);
      const sched = app.buildPushSchedule(days, { hour:8, now:antesDeTodo });
      expect(sched.some(r => r.send_at.slice(0, 10) === new Date(new Date(primero).setHours(8)).toISOString().slice(0, 10) && r.title === 'Hoy toca entrenar')).toBe(false);
      delete app.sessionLog[primero];
    });
  });

  describe('pushActive — sin nube no hay push', function(){
    it('sin sesión de nube es false aunque esté marcado', function(){
      app.localStorage.setItem('cc_push', 'on');
      expect(app.pushActive()).toBe(false);
      app.localStorage.removeItem('cc_push');
    });
    it('pushUploadSchedule no toca la red si no está activo', async function(){
      const r = await app.pushUploadSchedule(true);
      expect(r).toBe(false);
    });
  });
};
