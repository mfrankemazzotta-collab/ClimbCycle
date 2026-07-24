/* Tests for auth.js. getUserKey() isolation is pure/sync; the register/login/
   migration lifecycle is async (Web Crypto) and kept in ONE sequential chain
   so the shared cc_users registry isn't raced by concurrent async tests. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  const LS = app.localStorage;

  describe('getUserKey() — per-user data isolation', function(){
    it('does not prefix when nobody is logged in', function(){
      app.setCurrentUser(null);
      expect(app.getUserKey('cc_plan')).toBe('cc_plan');
    });
    it('prefixes cc_* keys with the current user', function(){
      app.setCurrentUser('pedro');
      expect(app.getUserKey('cc_plan')).toBe('cc_pedro_plan');
      expect(app.getUserKey('cc_tests')).toBe('cc_pedro_tests');
    });
    it('never prefixes the auth keys (shared across users)', function(){
      app.setCurrentUser('pedro');
      expect(app.getUserKey('cc_users')).toBe('cc_users');
      expect(app.getUserKey('cc_current_user')).toBe('cc_current_user');
    });
    it('leaves non-cc_ keys untouched', function(){
      app.setCurrentUser('pedro');
      expect(app.getUserKey('theme')).toBe('theme');
      app.setCurrentUser(null);
      LS.clear();
    });
  });

  describe('registerUser() — input validation', function(){
    it('rejects a username shorter than 3 chars', function(){
      return app.registerUser('ab', 'secret6').then(function(r){ expect(r.ok).toBe(false); });
    });
    it('rejects illegal username characters', function(){
      return app.registerUser('bad name!', 'secret6').then(function(r){ expect(r.ok).toBe(false); });
    });
    it('rejects a password shorter than 6 chars', function(){
      return app.registerUser('validname', '123').then(function(r){ expect(r.ok).toBe(false); });
    });
  });

  describe('password lifecycle (register → login → migration)', function(){
    it('registers as PBKDF2, blocks duplicates, verifies logins, upgrades legacy hashes', async function(){
      LS.clear();
      app.setCurrentUser(null);

      /* register → stored as PBKDF2 */
      let r = await app.registerUser('pedro', 'secret6');
      expect(r.ok).toBe(true);
      let users = app.loadUsers();
      expect(users.pedro.kdf).toBe('pbkdf2');
      expect(users.pedro.hash.length).toBe(64);
      expect(users.pedro.iters).toBeGreaterThan(0);

      /* duplicate registration is refused */
      r = await app.registerUser('pedro', 'another6');
      expect(r.ok).toBe(false);

      /* login: right password OK, wrong password + unknown user refused */
      expect((await app.loginUser('pedro', 'secret6')).ok).toBe(true);
      expect((await app.loginUser('pedro', 'nope123')).ok).toBe(false);
      expect((await app.loginUser('ghost', 'whatever')).ok).toBe(false);

      /* migration: seed a legacy single-SHA-256 record (no kdf field) and
         confirm a successful login transparently upgrades it to PBKDF2. */
      const salt = 'deadbeefcafebabe';
      const legacyHash = await app.hashPassword('legacypw', salt);
      users = app.loadUsers();
      users.legacy = { hash: legacyHash, salt: salt, createdAt: 1 };
      app.saveUsers(users);

      const lr = await app.loginUser('legacy', 'legacypw');
      expect(lr.ok).toBe(true);
      const upgraded = app.loadUsers().legacy;
      expect(upgraded.kdf).toBe('pbkdf2');
      expect(upgraded.hash.length).toBe(64);
      expect(upgraded.hash === legacyHash).toBe(false);   /* hash actually changed */

      /* and the upgraded record still authenticates */
      expect((await app.loginUser('legacy', 'legacypw')).ok).toBe(true);

      app.setCurrentUser(null);
      LS.clear();
    });
  });
};
