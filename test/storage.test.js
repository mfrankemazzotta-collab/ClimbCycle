/* Tests for storage.js — the single localStorage layer. Runs in the `secure`
   sandbox (storage.js + auth.js), where auth has registered getCurrentUser as
   the prefix provider, so this exercises the real end-to-end override.
   NOTE: clear() before setCurrentUser() — clear() wipes cc_current_user too. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  const LS = app.localStorage;

  describe('storage.js — user-prefixed override', function(){
    it('stores cc_ keys under the active user prefix and reads them back', function(){
      LS.clear();
      app.setCurrentUser('ana');
      LS.setItem('cc_plan', 'PLANDATA');
      expect(app.ccRawGet('cc_ana_plan')).toBe('PLANDATA');  /* physical key is prefixed */
      expect(LS.getItem('cc_plan')).toBe('PLANDATA');        /* logical read works */
      expect(app.ccRawGet('cc_plan')).toBe(null);            /* unprefixed key is empty */
      app.setCurrentUser(null); LS.clear();
    });

    it('isolates data between two users', function(){
      LS.clear();
      app.setCurrentUser('u1'); LS.setItem('cc_plan', 'ONE');
      app.setCurrentUser('u2'); LS.setItem('cc_plan', 'TWO');
      expect(LS.getItem('cc_plan')).toBe('TWO');
      app.setCurrentUser('u1');
      expect(LS.getItem('cc_plan')).toBe('ONE');
      app.setCurrentUser(null); LS.clear();
    });

    it('does not prefix when nobody is logged in', function(){
      LS.clear();
      app.setCurrentUser(null);
      LS.setItem('cc_plan', 'ANON');
      expect(app.ccRawGet('cc_plan')).toBe('ANON');
      LS.clear();
    });

    it('never prefixes cc_users / cc_current_user (shared across users)', function(){
      LS.clear();
      app.setCurrentUser('ana');
      LS.setItem('cc_users', 'REGISTRY');
      expect(app.ccRawGet('cc_users')).toBe('REGISTRY');
      app.setCurrentUser(null); LS.clear();
    });
  });

  describe('storage.js — raw (device-global) access', function(){
    it('ccRawSet/ccRawGet bypass the user prefix', function(){
      LS.clear();
      app.setCurrentUser('ana');
      app.ccRawSet('ccsync_session', 'TOKEN');
      expect(app.ccRawGet('ccsync_session')).toBe('TOKEN');   /* not prefixed despite active user */
      app.ccRawRemove('ccsync_session');
      expect(app.ccRawGet('ccsync_session')).toBe(null);
      app.setCurrentUser(null); LS.clear();
    });
  });
};
