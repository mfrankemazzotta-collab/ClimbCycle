/* End-to-end test for the ENCRYPTED backup path (the gap left in Bloque A:
   we tested the crypto layer, but not importUserData() with a real .ccenc file).
   Main sandbox now loads crypto.js + state.js, so we can encrypt a bundle the
   way downloadEncryptedBackup does and feed it back through importUserData().
   Async: returns a Promise, awaited by flush(). */
const { describe, it, expect } = require('./assert');
const ITERS = 1000;   /* fast KDF — correctness, not work factor */

module.exports = function(app){
  const LS = app.localStorage;

  /* Encrypt the current bundle into the {enc,v,salt,iters,payload} wrapper that
     downloadEncryptedBackup writes, then run importUserData with `pass`.
     Resolves after the async decrypt + apply chain settles. */
  /* Espera activa hasta que `cond()` sea cierta, con tope.

     Antes había un `setTimeout(…, 120)` fijo. `importUserData` deriva la
     clave con PBKDF2 y aplica el bundle de forma asíncrona: con la máquina
     cargada eso pasa de 120 ms y el test fallaba solo, una vez cada ~20
     corridas. Un test que falla al azar se termina ignorando —y con él, la
     única cobertura del restore cifrado. Se espera al HECHO, no al reloj. */
  function hastaQue(cond, tope){
    const limite = Date.now() + (tope || 4000);
    return new Promise(function(resolve){
      (function mirar(){
        if(cond() || Date.now() > limite) return resolve();
        setTimeout(mirar, 5);
      })();
    });
  }

  const avisos = [];

  function encryptThenImport(pass, importPass, listo){
    avisos.length = 0;
    const bundle = app._collectBundle();
    const salt = app.ccRandomHex(16);
    return app.ccDeriveKey(pass, salt, ITERS)
      .then(function(key){ return app.ccEncryptJSON(key, bundle); })
      .then(function(payload){
        const json = JSON.stringify({ enc:true, v:1, salt:salt, iters:ITERS, payload:payload });
        LS.clear();   /* wipe, then restore from the encrypted backup */
        const cd = app.confirmDialog, st = app.showToast, loc = app.location, to = app.setTimeout;
        app.confirmDialog = function(){ return { then: function(cb){ cb(true); return this; } }; };
        app.showToast = function(){ avisos.push(1); };
        app.location = { reload: function(){} };
        app.setTimeout = function(){ return 0; };   /* swallow the internal reload timer */
        app.importUserData(json, importPass);
        return hastaQue(listo).then(function(){
          app.confirmDialog = cd; app.showToast = st; app.location = loc; app.setTimeout = to;
        });
      });
  }

  /* One sequential test: the two cases share the sandbox's localStorage, so
     running them as concurrent async `it`s would race. Await them in order. */
  describe('encrypted backup (.ccenc) end-to-end', function(){
    it('restores with the right password, and nothing with the wrong one', async function(){
      /* correct password → every key comes back */
      LS.clear();
      LS.setItem('cc_user', JSON.stringify({ goal:'boulder' }));
      LS.setItem('cc_plan', JSON.stringify({ d:{ block:'power', week:2 } }));
      /* Se espera al hecho: el bundle aplicado. */
      await encryptThenImport('secret6', 'secret6', function(){ return LS.getItem('cc_plan') != null; });
      expect(LS.getItem('cc_user')).toBe(JSON.stringify({ goal:'boulder' }));
      expect(LS.getItem('cc_plan')).toBe(JSON.stringify({ d:{ block:'power', week:2 } }));

      /* wrong password → decrypt rejects → nothing is applied */
      LS.clear();
      LS.setItem('cc_user', JSON.stringify({ goal:'boulder' }));
      /* Acá el hecho esperado es el AVISO de error, no la ausencia de datos:
         esperar "que no pase nada" es lo que obliga a dormir un rato fijo. */
      await encryptThenImport('secret6', 'WRONGpass', function(){ return avisos.length > 0; });
      expect(avisos.length).toBeGreaterThan(0);
      expect(LS.getItem('cc_user')).toBe(null);
    });
  });
};
