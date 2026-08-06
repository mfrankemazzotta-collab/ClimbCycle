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
  function encryptThenImport(pass, importPass){
    const bundle = app._collectBundle();
    const salt = app.ccRandomHex(16);
    return app.ccDeriveKey(pass, salt, ITERS)
      .then(function(key){ return app.ccEncryptJSON(key, bundle); })
      .then(function(payload){
        const json = JSON.stringify({ enc:true, v:1, salt:salt, iters:ITERS, payload:payload });
        LS.clear();   /* wipe, then restore from the encrypted backup */
        const cd = app.confirmDialog, st = app.showToast, loc = app.location, to = app.setTimeout;
        app.confirmDialog = function(){ return { then: function(cb){ cb(true); return this; } }; };
        app.showToast = function(){};
        app.location = { reload: function(){} };
        app.setTimeout = function(){ return 0; };   /* swallow the internal reload timer */
        app.importUserData(json, importPass);
        return new Promise(function(resolve){
          setTimeout(function(){   /* Node timer (test scope) — waits for decrypt+apply */
            app.confirmDialog = cd; app.showToast = st; app.location = loc; app.setTimeout = to;
            resolve();
          }, 120);
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
      await encryptThenImport('secret6', 'secret6');
      expect(LS.getItem('cc_user')).toBe(JSON.stringify({ goal:'boulder' }));
      expect(LS.getItem('cc_plan')).toBe(JSON.stringify({ d:{ block:'power', week:2 } }));

      /* wrong password → decrypt rejects → nothing is applied */
      LS.clear();
      LS.setItem('cc_user', JSON.stringify({ goal:'boulder' }));
      await encryptThenImport('secret6', 'WRONGpass');
      expect(LS.getItem('cc_user')).toBe(null);
    });
  });
};
