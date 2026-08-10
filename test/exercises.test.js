/* ====================================================
   exercises.test.js -- las guías de ejercicios como contrato

   El pool de ejercicios es la única parte de la app que le dice al usuario
   QUÉ hacer con su cuerpo. Un ejercicio de campus sin la advertencia de
   "no arquees" no es una guía incompleta: es una polea rota.

   Por eso acá el contrato no es "el objeto tiene los campos", sino:

     · todo ejercicio tiene paso a paso Y errores comunes;
     · los de riesgo articular alto (campus, dedos, fatiga ≥ 3) tienen
       además una advertencia explícita sobre agarre o recuperación;
     · nada en el pool puede romper el HTML de la tarjeta.

   El último punto importa porque `renderExerciseGuide` interpola estos
   strings directamente. Hoy son constantes del repo, pero si algún día se
   permiten ejercicios propios, el escape tiene que estar puesto de antes.
==================================================== */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  /* Aplanar el pool una sola vez. */
  const TODOS = [];
  Object.keys(app.EX_POOL).forEach(function(block){
    (app.EX_POOL[block] || []).forEach(function(ex){
      TODOS.push(Object.assign({ _block: block }, ex));
    });
  });

  /* Riesgo articular: lo que puede lesionar si se hace mal. */
  const CATS_RIESGO = { campus_board:1, finger_strength:1, system_board:1 };
  const esRiesgo = ex => (ex.fatigue || 0) >= 3 || !!CATS_RIESGO[ex.cat];

  describe('pool de ejercicios — integridad', function(){

    it('el pool no está vacío y no tiene ids repetidos', function(){
      expect(TODOS.length).toBeGreaterThan(40);
      const vistos = {};
      const dup = [];
      TODOS.forEach(function(ex){
        if(vistos[ex.id]) dup.push(ex.id);
        vistos[ex.id] = 1;
      });
      if(dup.length) throw new Error('ids duplicados: ' + dup.join(', '));
    });

    it('todos tienen los campos que la tarjeta necesita para renderizar', function(){
      const rotos = TODOS.filter(function(ex){
        return !ex.id || !ex.n || !ex.cat || !ex.sys || !ex.col;
      });
      if(rotos.length) throw new Error('ejercicios incompletos: '
        + rotos.map(e => e.id || '(sin id)').join(', '));
    });

    it('fatigue y skill están dentro de la escala 1-5', function(){
      TODOS.forEach(function(ex){
        expect(ex.fatigue).toBeGreaterThan(0);
        expect(ex.fatigue).toBeLessThanOrEqual(5);
        expect(ex.skill).toBeGreaterThan(0);
        expect(ex.skill).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('pool de ejercicios — cobertura de las guías', function(){

    it('TODOS tienen paso a paso y errores comunes', function(){
      const sin = TODOS.filter(function(ex){
        return !(ex.how && ex.how.length) || !(ex.errors && ex.errors.length);
      });
      if(sin.length) throw new Error('sin guía completa (' + sin.length + '): '
        + sin.map(e => e.id).join(', '));
      expect(sin.length).toBe(0);
    });

    it('los de riesgo articular tienen guía Y tips', function(){
      /* Los tips son la capa de "lo que un entrenador te diría al oído".
         En un campus board no son opcionales. */
      const riesgo = TODOS.filter(esRiesgo);
      expect(riesgo.length).toBeGreaterThan(20);
      const flojos = riesgo.filter(function(ex){
        return !(ex.tips && ex.tips.length) || ex.how.length < 3 || ex.errors.length < 3;
      });
      if(flojos.length) throw new Error('guía insuficiente para ejercicios de riesgo: '
        + flojos.map(e => e.id).join(', '));
    });

    it('campus y dedos advierten explícitamente sobre el agarre', function(){
      /* El arqueo completo es EL error que rompe poleas A2. Si la guía no lo
         nombra, la guía no sirve.

         Cuando escribí este test por primera vez encontró CINCO ejercicios
         —los dos de campus, los dos one-arm y los density hangs— que
         hablaban de hombro, de listones y de descanso, pero no del agarre.
         Eran las guías de mayor carga por dedo del pool. */
      const VOCAB = ['arque', 'agarre', 'crimp'];   /* el pool mezcla es/en */
      const criticos = TODOS.filter(ex => ex.cat === 'campus_board' || ex.cat === 'finger_strength');
      expect(criticos.length).toBeGreaterThan(3);
      const sinAviso = criticos.filter(function(ex){
        const texto = [].concat(ex.how || [], ex.tips || [], ex.errors || []).join(' ').toLowerCase();
        return !VOCAB.some(v => texto.indexOf(v) > -1);
      });
      if(sinAviso.length) throw new Error('no advierten sobre el agarre: '
        + sinAviso.map(e => e.id).join(', '));
    });

    it('los de fatiga máxima hablan del descanso entre series', function(){
      /* Potencia sin descanso completo deja de ser potencia: es el error que
         convierte una sesión de fuerza en una de fatiga. */
      const maximos = TODOS.filter(ex => (ex.fatigue || 0) >= 5);
      expect(maximos.length).toBeGreaterThan(2);
      const sinDescanso = maximos.filter(function(ex){
        const texto = [].concat(ex.how || [], ex.tips || [], ex.errors || []).join(' ').toLowerCase();
        return texto.indexOf('descans') === -1;
      });
      if(sinDescanso.length) throw new Error('no mencionan descanso: '
        + sinDescanso.map(e => e.id).join(', '));
    });

    it('ningún paso está vacío ni es un placeholder', function(){
      const malos = [];
      TODOS.forEach(function(ex){
        ['how','tips','errors'].forEach(function(k){
          (ex[k] || []).forEach(function(t){
            if(typeof t !== 'string' || t.trim().length < 15) malos.push(ex.id + '.' + k);
            else if(/^(TODO|TBD|xxx)/i.test(t.trim())) malos.push(ex.id + '.' + k + ' (placeholder)');
          });
        });
      });
      if(malos.length) throw new Error('entradas vacías o placeholder: ' + malos.join(', '));
    });
  });

  describe('pool de ejercicios — nada rompe el HTML de la tarjeta', function(){

    it('el render escapa el contenido de la guía', function(){
      /* Se inyecta un ejercicio hostil: si el render interpolara crudo, el
         `<img onerror>` saldría como etiqueta viva dentro de la tarjeta. */
      if(typeof app.renderExerciseGuide !== 'function'){
        throw new Error('renderExerciseGuide no está expuesto — el test no puede verificar el escape');
      }
      const hostil = {
        id: 'xss',
        how:    ['<img src=x onerror=alert(1)>'],
        tips:   ['<script>robar()</script>'],
        errors: ['" onclick="pwn()']
      };
      const html = app.renderExerciseGuide(hostil, 'xss', '#fff');
      expect(html.indexOf('<img src=x')).toBe(-1);
      expect(html.indexOf('<script>robar')).toBe(-1);
      expect(html.indexOf('&lt;img')).toBeGreaterThan(-1);
    });

    it('el pool real no contiene HTML crudo', function(){
      /* Defensa en profundidad: aunque el render escape, el contenido del
         repo tiene que ser texto plano. Un `<` acá sería un descuido. */
      const conHtml = [];
      TODOS.forEach(function(ex){
        ['how','tips','errors','det','simple','nota'].forEach(function(k){
          const v = ex[k];
          const arr = Array.isArray(v) ? v : (typeof v === 'string' ? [v] : []);
          arr.forEach(function(t){ if(/[<>]/.test(t)) conHtml.push(ex.id + '.' + k); });
        });
      });
      if(conHtml.length) throw new Error('HTML crudo en el pool: ' + conHtml.join(', '));
    });

    it('la guía se omite entera cuando el ejercicio no tiene contenido', function(){
      expect(app.renderExerciseGuide(null, 'x', '#fff')).toBe('');
      expect(app.renderExerciseGuide({ id:'vacio' }, 'x', '#fff')).toBe('');
    });
  });
};
