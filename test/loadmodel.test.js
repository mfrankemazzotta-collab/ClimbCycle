/* ====================================================
   loadmodel.test.js -- el modelo de carga interna, contra la literatura

   Dos cosas distintas que estaban mezcladas:

   (I) LA FÓRMULA. `loadForLog` hacía `dur × RPE × factor_de_tipo`. El método
       session-RPE de Foster (2001) —el estándar de carga interna, validado
       en escalada con r = 0.83 frente a métodos de frecuencia cardíaca— es
       `dur × RPE` y nada más. El factor extra es doble conteo: si la sesión
       se sintió más dura, eso YA está en el RPE. Y cuando el usuario
       registraba "resistencia, RPE 8", el factor 0.7 lo rebajaba a 5.6:
       el sistema contradecía a quien había estado ahí.

       Ojo: el factor SÍ se conserva en `calcRecovery`, que modela otra cosa
       (cuánto tarda el tejido en recuperarse, no cuánto costó el esfuerzo).

   (II) LOS VALORES. `SESSION_RPE` estaba puesto a ojo y comprimido hacia el
       medio (endurance 6, deload 4 sobre 10). Los rangos publicados por
       Lattice para escalada son bastante más bajos en las fases suaves, así
       que la carga crónica se inflaba y los picos del ACWR quedaban
       subestimados — la dirección peligrosa.
==================================================== */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  describe('(I) la carga sigue el método session-RPE de Foster', function(){

    it('carga = duración × RPE, sin factores extra', function(){
      expect(app.loadForLog({ dur:90, rpe:7, block:'strength' })).toBe(630);
      expect(app.loadForLog({ dur:120, rpe:9, block:'power' })).toBe(1080);
    });

    it('el tipo de sesión ya NO altera la carga', function(){
      /* Misma duración y mismo RPE ⇒ misma carga, sea la fase que sea.
         Antes `power` valía 1.2× y `endurance` 0.7× sobre lo mismo. */
      const base = { dur:90, rpe:8 };
      const bloques = ['strength','power','endurance','deload','outdoor','project','test'];
      const cargas = bloques.map(b => app.loadForLog(Object.assign({ block:b }, base)));
      cargas.forEach(function(c){ expect(c).toBe(720); });
    });

    it('el sistema no contradice el RPE que reportó el usuario', function(){
      /* Éste es el caso que motivó el cambio: una sesión de resistencia que
         el usuario vivió como muy dura tiene que contar como muy dura. */
      const dura  = app.loadForLog({ dur:90, rpe:8, block:'endurance' });
      const suave = app.loadForLog({ dur:90, rpe:3, block:'endurance' });
      expect(dura).toBeGreaterThan(suave);
      expect(dura).toBe(90 * 8);
    });

    it('sin RPE o sin duración no hay carga', function(){
      expect(app.loadForLog({ dur:0, rpe:8, block:'strength' })).toBe(0);
      expect(app.loadForLog({ dur:90, rpe:0, block:'strength' })).toBe(0);
      expect(app.loadForLog(null)).toBe(0);
    });
  });

  describe('(II) los RPE estimados siguen los rangos de la literatura', function(){

    it('un max hang se estima en RPE 7 (Lattice)', function(){
      expect(app.estimateSessionLoad('strength', 90).rpe).toBe(7);
    });

    it('la resistencia es MUCHO más suave que la fuerza', function(){
      /* Lattice: intervalos 4/10, ARC 2/10. Antes acá había un 6, que
         inflaba la carga crónica de las semanas de resistencia. */
      const end = app.estimateSessionLoad('endurance', 90).rpe;
      expect(end).toBe(4);
      expect(end).toBeLessThan(app.estimateSessionLoad('strength', 90).rpe);
    });

    it('el deload es lo más suave de todo', function(){
      const dl = app.estimateSessionLoad('deload', 90).rpe;
      expect(dl).toBe(2);
      expect(dl).toBeLessThan(app.estimateSessionLoad('endurance', 90).rpe);
    });

    it('proyectar y la potencia son lo más duro (limit climbing, RPE 9-10)', function(){
      expect(app.estimateSessionLoad('project').rpe).toBe(9);
      expect(app.estimateSessionLoad('power', 90).rpe).toBe(9);
    });

    it('el orden de intensidad es coherente de punta a punta', function(){
      const r = b => app.estimateSessionLoad(b, 90).rpe;
      expect(r('deload')).toBeLessThan(r('endurance'));
      expect(r('endurance')).toBeLessThan(r('strength'));
      expect(r('strength')).toBeLessThan(r('power'));
    });

    it('todos los valores caen dentro de la escala CR-10', function(){
      ['strength','power','endurance','deload','test','outdoor','project'].forEach(function(b){
        const rpe = app.estimateSessionLoad(b, 90).rpe;
        expect(rpe).toBeGreaterThan(0);
        expect(rpe).toBeLessThanOrEqual(10);
      });
    });

    it('una salida de roca dura más que una sesión de gym', function(){
      /* La duración es lo que hace pesada la jornada de roca, no el RPE. */
      const roca = app.estimateSessionLoad('outdoor');
      expect(roca.dur).toBeGreaterThan(app.estimateSessionLoad('strength', 90).dur);
    });
  });

  describe('(II) efecto sobre el ACWR', function(){

    it('una semana dura sobre un fondo suave produce un pico visible', function(){
      /* Con los valores viejos (deload 4 y endurance 6 sobre 10) las fases
         suaves inflaban la media de 4 semanas y el pico se diluía. */
      app.saveSLogs([]);
      const hoy = Date.now(), DIA = 86400000;
      const logs = [];
      /* 3 semanas de resistencia suave */
      for(let d = 28; d > 7; d -= 2){
        const e = app.estimateSessionLoad('endurance', 90);
        logs.push({ ts: hoy - d*DIA, dateStr:'e'+d, block:'endurance', rpe:e.rpe, dur:e.dur });
      }
      /* la última semana, potencia */
      for(let d = 6; d >= 1; d -= 2){
        const p = app.estimateSessionLoad('power', 90);
        logs.push({ ts: hoy - d*DIA, dateStr:'p'+d, block:'power', rpe:p.rpe, dur:p.dur });
      }
      app.saveSLogs(logs);
      const acwr = app.computeACWR();
      expect(acwr.ready).toBe(true);
      expect(acwr.ratio).toBeGreaterThan(1.3);   /* el pico se ve */
    });

    it('entrenar parejo mantiene el ratio en zona segura', function(){
      app.saveSLogs([]);
      const hoy = Date.now(), DIA = 86400000;
      const logs = [];
      for(let d = 28; d >= 1; d -= 2){
        const s = app.estimateSessionLoad('strength', 90);
        logs.push({ ts: hoy - d*DIA, dateStr:'s'+d, block:'strength', rpe:s.rpe, dur:s.dur });
      }
      app.saveSLogs(logs);
      const r = app.computeACWR().ratio;
      expect(r).toBeGreaterThan(0.8);
      expect(r).toBeLessThan(1.3);
    });
  });
};
