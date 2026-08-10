/* ====================================================
   acwr-gaps.test.js -- el ACWR con datos incompletos

   (K) LA ALERTA DE LESIÓN DECÍA LO CONTRARIO DE LA VERDAD.

   `computeACWR` sumaba `loadForLog(l)` de cada sesión, y `loadForLog`
   devuelve 0 cuando falta el RPE o la duración. Una sesión registrada sin
   esos datos entraba como carga cero — o sea, el motor la trataba como si
   no hubiera existido.

   Medido antes de tocar nada, sobre una semana de pico real:

       con RPE completo → ratio 3.09 → "Carga en pico"  (−20 de readiness)
       sin los RPE      → ratio 0.00 → "Carga baja: si venís de un parón,
                                        retomá de forma progresiva"

   La alerta que existe para prevenir lesiones por sobreuso no sólo se
   apagaba: le decía a alguien que venía de su semana más dura que entrenara
   más. Y es alcanzable sin tocar el código — `cc_logs` viaja entero por
   import de backup y por sync, sin validación, así que basta un backup de
   una versión anterior o un dispositivo desactualizado.

   LA REGLA ASIMÉTRICA. No se descarta el cálculo, porque un ratio
   subestimado sigue informando en una dirección: si YA con huecos sale
   alto, la carga real es al menos esa y la alerta vale. Lo que no se puede
   es tranquilizar con datos incompletos.

   Es la misma familia que el bug de goal.js de esta sesión: tratar "no
   tengo el dato" como "no hay problema".
==================================================== */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  const D = 86400000;
  /* Un único instante de referencia (misma disciplina que syncmerge.test:
     dos lecturas de reloj donde va una sola es cómo nacen los tests flaky). */
  const AHORA = Date.now();
  const ses = (dias, extra) => Object.assign(
    { ts: AHORA - dias*D, dateStr:'d'+dias, block:'strength', rpe:7, dur:90 }, extra || {});

  /* 4 semanas parejas: la línea base sana. */
  function historialParejo(){
    const out = [];
    for(let d = 27; d >= 1; d -= 2) out.push(ses(d));
    return out;
  }
  /* 3 semanas suaves + una semana durísima: un pico real. */
  function historialConPico(){
    const out = [];
    for(let d = 27; d > 7; d -= 2) out.push(ses(d, { rpe:4, dur:60 }));
    for(let d = 6; d >= 1; d--)    out.push(ses(d, { rpe:9, dur:150 }));
    return out;
  }
  const sinRpeEstaSemana = logs => logs.map(l =>
    (AHORA - l.ts)/D <= 7 ? Object.assign({}, l, { rpe:0 }) : l);

  function evaluar(logs){
    app.saveSLogs(logs);
    const a = app.computeACWR();
    return { acwr:a, ev:app.acwrAssessment(a) };
  }

  describe('(K) una sesión sin datos no es una sesión sin carga', function(){

    it('el historial completo da el aviso correcto (control)', function(){
      const { ev } = evaluar(historialParejo());
      expect(ev.level).toBe('optimal');
    });

    it('EL BUG: un pico real sin RPE ya no se reporta como "carga baja"', function(){
      const completo = evaluar(historialConPico());
      expect(completo.ev.level).toBe('high');
      expect(completo.ev.penalty).toBe(20);

      const conHuecos = evaluar(sinRpeEstaSemana(historialConPico()));
      /* Antes: level 'detrain', mensaje "retomá de forma progresiva". */
      expect(conHuecos.ev.level).toBe('incomplete');
      expect(/retom|progresiv/i.test(conHuecos.ev.msg)).toBe(false);
    });

    it('la asimetría: con huecos, una alerta ALTA se mantiene', function(){
      /* Si el ratio ya sale alto pese a subestimar, la carga real es al
         menos esa. Silenciar la alerta por prolijidad de datos sería
         cambiar un error por el opuesto, y este es el que lesiona. */
      const logs = historialConPico();
      logs[logs.length - 1] = Object.assign({}, logs[logs.length - 1], { rpe:0 });
      const { acwr, ev } = evaluar(logs);
      expect(acwr.partial).toBe(true);
      expect(ev.level).toBe('high');
      expect(ev.penalty).toBe(20);
    });

    it('los huecos se cuentan y se reportan', function(){
      const { acwr } = evaluar(sinRpeEstaSemana(historialParejo()));
      expect(acwr.partial).toBe(true);
      expect(acwr.mudasAgudas).toBeGreaterThan(0);
      expect(acwr.mudasCronicas).toBeGreaterThanOrEqual(acwr.mudasAgudas);
    });

    it('el mensaje dice cuántas faltan y qué hacer', function(){
      const { ev } = evaluar(sinRpeEstaSemana(historialParejo()));
      expect(/\d+ sesion/i.test(ev.msg)).toBe(true);
      expect(/RPE/.test(ev.msg)).toBe(true);
      /* y no promete un número que no puede calcular */
      expect(ev.msg.indexOf('0.00')).toBe(-1);
    });

    it('falta la duración: mismo problema, mismo trato', function(){
      /* `loadForLog` es dur × RPE: falta cualquiera de los dos y da 0. */
      const logs = historialParejo().map(l =>
        (AHORA - l.ts)/D <= 7 ? Object.assign({}, l, { dur:0 }) : l);
      const { acwr, ev } = evaluar(logs);
      expect(acwr.partial).toBe(true);
      expect(ev.level).toBe('incomplete');
    });

    it('sin huecos, `partial` es false y nada cambia', function(){
      /* Regresión: el arreglo no puede ensuciar el camino feliz. */
      const { acwr, ev } = evaluar(historialParejo());
      expect(acwr.partial).toBe(false);
      expect(acwr.mudasAgudas).toBe(0);
      expect(ev.level).toBe('optimal');
      expect(typeof acwr.ratio).toBe('number');
    });

    it('sin historial suficiente sigue sin haber aviso', function(){
      /* Un usuario nuevo no puede recibir "faltan datos": todavía no
         registró nada, y no es lo mismo un hueco que un comienzo. */
      app.saveSLogs([]);
      const a = app.computeACWR();
      expect(a.ratio).toBe(null);
      expect(app.acwrAssessment(a).level).toBe('none');
      expect(app.acwrAssessment(a).label).toBe('');
    });

    it('tolera logs basura sin romper el cálculo', function(){
      const logs = historialParejo().concat([null, {}, { ts:null, rpe:7 }, { ts:AHORA - D }]);
      const { acwr } = evaluar(logs);
      expect(typeof acwr.acute).toBe('number');
      expect(isNaN(acwr.acute)).toBe(false);
    });
  });

  describe('(K) la tira de carga no pinta de verde un dato que falta', function(){

    it('acwrAssessment expone un nivel propio, no reutiliza "optimal"', function(){
      /* El render coloreaba por `level` con un default verde: sin un nivel
         propio, "faltan datos" se habría pintado igual que "carga óptima". */
      const { ev } = evaluar(sinRpeEstaSemana(historialParejo()));
      expect(ev.level).toBe('incomplete');
      expect(ev.level === 'optimal').toBe(false);
      expect(ev.level === 'detrain').toBe(false);
      expect(ev.label).toBe('Faltan datos');
    });

    it('no cuesta puntos de readiness: es un hueco, no un pico', function(){
      const { ev } = evaluar(sinRpeEstaSemana(historialParejo()));
      expect(ev.penalty).toBe(0);
    });
  });
};
