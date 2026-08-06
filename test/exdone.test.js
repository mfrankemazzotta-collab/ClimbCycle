/* Progreso DENTRO de la sesión (exDone): qué ejercicios marcaste.
   Es dato persistido y va en los backups, así que se testea como tal. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  const LS = app.localStorage;
  const D = 'Mon Jan 05 2026';

  describe('exDone — progreso por ejercicio', function(){
    it('marca y desmarca por ID de ejercicio', function(){
      app.exDone = {};
      expect(app.isExDone(D, 'str1')).toBe(false);
      expect(app.toggleExDone(D, 'str1')).toBe(true);
      expect(app.isExDone(D, 'str1')).toBe(true);
      expect(app.toggleExDone(D, 'str1')).toBe(false);
      expect(app.isExDone(D, 'str1')).toBe(false);
    });

    it('no deja días vacíos colgando al desmarcar el último', function(){
      app.exDone = {};
      app.toggleExDone(D, 'str1');
      app.toggleExDone(D, 'str1');
      expect(app.exDone[D]).toBe(undefined);
    });

    it('cuenta cuántos de la sesión están hechos', function(){
      app.exDone = {};
      const exs = [{id:'a'},{id:'b'},{id:'c'}];
      expect(app.countExDone(D, exs)).toBe(0);
      app.toggleExDone(D, 'a'); app.toggleExDone(D, 'c');
      expect(app.countExDone(D, exs)).toBe(2);
    });

    it('el progreso es independiente por día', function(){
      app.exDone = {};
      app.toggleExDone(D, 'str1');
      expect(app.isExDone('Tue Jan 06 2026', 'str1')).toBe(false);
    });

    it('ignora entradas inválidas sin romper', function(){
      app.exDone = {};
      expect(app.toggleExDone(null, 'str1')).toBe(false);
      expect(app.toggleExDone(D, null)).toBe(false);
      expect(app.countExDone(D, null)).toBe(0);
    });

    it('sobrevive a guardar y recargar (persistencia)', function(){
      LS.clear();
      app.exDone = {};
      app.toggleExDone(D, 'str1'); app.toggleExDone(D, 'str3');
      app.saveExDone();
      app.exDone = {};                 /* simula recargar la app */
      app.loadExDone();
      expect(app.isExDone(D, 'str1')).toBe(true);
      expect(app.isExDone(D, 'str3')).toBe(true);
      expect(app.isExDone(D, 'str9')).toBe(false);
    });

    it('queda incluido en el backup (no se pierde al exportar)', function(){
      LS.clear();
      app.exDone = {}; app.toggleExDone(D, 'str1'); app.saveExDone();
      const b = app._collectBundle();
      expect(b.data.cc_exdone).toBeTruthy();
      expect(b.data.cc_exdone.indexOf('str1')).toBeGreaterThan(-1);
    });
  });
};
