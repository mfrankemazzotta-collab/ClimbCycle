/* Tests for auth.js. getUserKey() isolation is pure/sync; the register/login/
   migration lifecycle is async (Web Crypto) and kept in ONE sequential chain
   so the shared cc_users registry isn't raced by concurrent async tests. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  const LS = app.localStorage;

  describe('ccUserKey() — per-user data isolation (storage.js, driven by auth)', function(){
    it('does not prefix when nobody is logged in', function(){
      app.setCurrentUser(null);
      expect(app.ccUserKey('cc_plan')).toBe('cc_plan');
    });
    it('prefixes cc_* keys with the current user', function(){
      app.setCurrentUser('pedro');
      expect(app.ccUserKey('cc_plan')).toBe('cc_pedro_plan');
      expect(app.ccUserKey('cc_tests')).toBe('cc_pedro_tests');
    });
    it('never prefixes the auth keys (shared across users)', function(){
      app.setCurrentUser('pedro');
      expect(app.ccUserKey('cc_users')).toBe('cc_users');
      expect(app.ccUserKey('cc_current_user')).toBe('cc_current_user');
    });
    it('leaves non-cc_ keys untouched', function(){
      app.setCurrentUser('pedro');
      expect(app.ccUserKey('theme')).toBe('theme');
      app.setCurrentUser(null);
      LS.clear();
    });
  });

  /* EL IDENTIFICADOR PASÓ A SER EL EMAIL (2026-08-07). Antes el alta pedía
     un usuario tipo `pedro_v` y la cuenta de nube —email + contraseña— se
     creaba aparte, escondida en Perfil. Dos cuentas, dos contraseñas: quien
     no descubriera la segunda entrenaba semanas sin respaldo. */
  describe('registerUser() — el identificador es el email', function(){
    it('rechaza lo que no es un email', function(){
      return Promise.all([
        app.registerUser('ab', 'secret6').then(r => expect(r.ok).toBe(false)),
        app.registerUser('pedro_v', 'secret6').then(r => expect(r.ok).toBe(false)),
        app.registerUser('bad name!', 'secret6').then(r => expect(r.ok).toBe(false)),
        app.registerUser('sin@arroba', 'secret6').then(r => expect(r.ok).toBe(false))
      ]);
    });
    it('rejects a password shorter than 6 chars', function(){
      return app.registerUser('valido@test.local', '123').then(function(r){ expect(r.ok).toBe(false); });
    });
    it('esEmailValido es laxa a propósito (PURA)', function(){
      /* Validar emails con precisión es imposible; rechazar uno válido es
         peor que aceptar uno raro, porque el error se descubre al confirmar. */
      expect(app.esEmailValido('a@b.co')).toBe(true);
      expect(app.esEmailValido('nombre.apellido+tag@sub.dominio.com')).toBe(true);
      expect(app.esEmailValido('')).toBe(false);
      expect(app.esEmailValido('pedro')).toBe(false);
      expect(app.esEmailValido('a@b')).toBe(false);
      expect(app.esEmailValido('con espacio@b.com')).toBe(false);
    });
  });

  describe('password lifecycle (register → login → migration)', function(){
    it('registers as PBKDF2, blocks duplicates, verifies logins, upgrades legacy hashes', async function(){
      LS.clear();
      app.setCurrentUser(null);

      /* register → stored as PBKDF2 */
      let r = await app.registerUser('pedro@test.local', 'secret6');
      expect(r.ok).toBe(true);
      let users = app.loadUsers();
      expect(users['pedro@test.local'].kdf).toBe('pbkdf2');
      expect(users['pedro@test.local'].hash.length).toBe(64);
      expect(users['pedro@test.local'].iters).toBeGreaterThan(0);

      /* duplicate registration is refused */
      r = await app.registerUser('pedro@test.local', 'another6');
      expect(r.ok).toBe(false);

      /* login: right password OK, wrong password + unknown user refused */
      expect((await app.loginUser('pedro@test.local', 'secret6')).ok).toBe(true);
      expect((await app.loginUser('pedro@test.local', 'nope123')).ok).toBe(false);
      expect((await app.loginUser('ghost@test.local', 'whatever')).ok).toBe(false);

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
