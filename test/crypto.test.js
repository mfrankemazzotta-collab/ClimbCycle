/* Async tests for crypto.js (PBKDF2 + AES-GCM over Web Crypto).
   Runs in the isolated `secure` sandbox. Uses a low iteration count so the
   KDF stays fast — we're testing correctness, not tuning work factor. */
const { describe, it, expect } = require('./assert');
const ITERS = 1000;

module.exports = function(app){
  describe('ccDeriveHashHex()', function(){
    it('is deterministic for the same password+salt', function(){
      return Promise.all([
        app.ccDeriveHashHex('hunter2', 'a1b2', ITERS),
        app.ccDeriveHashHex('hunter2', 'a1b2', ITERS)
      ]).then(function(r){
        expect(r[0]).toBe(r[1]);
        expect(r[0].length).toBe(64);   /* 256 bits → 64 hex chars */
      });
    });
    it('changes when the salt changes', function(){
      return Promise.all([
        app.ccDeriveHashHex('hunter2', 'a1b2', ITERS),
        app.ccDeriveHashHex('hunter2', 'ffff', ITERS)
      ]).then(function(r){
        expect(r[0] === r[1]).toBe(false);
      });
    });
    it('changes when the password changes', function(){
      return Promise.all([
        app.ccDeriveHashHex('hunter2', 'a1b2', ITERS),
        app.ccDeriveHashHex('hunter3', 'a1b2', ITERS)
      ]).then(function(r){
        expect(r[0] === r[1]).toBe(false);
      });
    });
  });

  describe('ccEncryptJSON() / ccDecryptJSON()', function(){
    it('round-trips an object back to its original value', function(){
      const obj = { plan:'6-3-1', tests:[1,2,3], name:'Pedro' };
      return app.ccDeriveKey('pw', 'abcd', ITERS).then(function(key){
        return app.ccEncryptJSON(key, obj).then(function(payload){
          expect(payload.alg).toBe('AES-GCM');
          return app.ccDecryptJSON(key, payload).then(function(back){
            expect(back).toEqual(obj);
          });
        });
      });
    });

    it('rejects decryption with the wrong key', function(){
      return app.ccDeriveKey('right', 'abcd', ITERS).then(function(k1){
        return app.ccEncryptJSON(k1, { secret:42 }).then(function(payload){
          return app.ccDeriveKey('wrong', 'abcd', ITERS).then(function(k2){
            return app.ccDecryptJSON(k2, payload).then(
              function(){ throw new Error('expected decrypt to REJECT with wrong key'); },
              function(){ return true; }
            );
          });
        });
      });
    });

    it('rejects tampered ciphertext', function(){
      return app.ccDeriveKey('pw', 'abcd', ITERS).then(function(key){
        return app.ccEncryptJSON(key, { a:1 }).then(function(payload){
          /* flip a byte in the hex ciphertext */
          const c = payload.ct;
          const flipped = (c[0] === 'a' ? 'b' : 'a') + c.slice(1);
          const bad = { alg:payload.alg, iv:payload.iv, ct:flipped };
          return app.ccDecryptJSON(key, bad).then(
            function(){ throw new Error('expected decrypt to REJECT tampered ct'); },
            function(){ return true; }
          );
        });
      });
    });
  });

  describe('ccRandomHex()', function(){
    it('returns hex of the requested byte length', function(){
      expect(app.ccRandomHex(16).length).toBe(32);
      expect(app.ccRandomHex(8).length).toBe(16);
    });
    it('is different each call (astronomically)', function(){
      expect(app.ccRandomHex(16) === app.ccRandomHex(16)).toBe(false);
    });
  });
};
