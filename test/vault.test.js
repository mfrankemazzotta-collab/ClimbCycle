/* ====================================================
   vault.test.js -- cifrado en reposo

   La app se presenta como privada y offline, pero en reposo los datos vivían
   en texto plano: el "login" sólo cambiaba el prefijo de las claves. Este es
   el cambio de mayor riesgo del proyecto — un bug acá no rompe una pantalla,
   borra el historial de entrenamiento de alguien.

   Por eso los casos se concentran menos en "funciona" y más en "qué pasa
   cuando algo sale mal": clave equivocada, migración a medias, blob
   corrupto, vault bloqueado. Corren con WebCrypto real (el harness usa
   `nodeCrypto.webcrypto`), así que el cifrado ejercitado es el de verdad.

   ESTRUCTURA: cada bloque es UN `it` con awaits en secuencia, no varios `it`
   async sueltos. El harness los correría en PARALELO sobre el mismo sandbox
   y se pisarían el estado entre sí — la misma clase de fuga que estuvimos
   cazando en la app. (Mismo patrón que backup-crypto.test.)

   Lo que estos tests NO pueden ver, y por eso el flag sigue apagado:
   cuota de localStorage, timing real del navegador y recargas de página.
==================================================== */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  const USER = 'matias', PASS = 'unaClaveLarga123';
  /* KDF barato: acá se verifica corrección, no el factor de trabajo. */
  const ITERS = 1000;
  const crear = () => app.ccVaultCreate(USER, PASS, { iters: ITERS });

  /* Estado inicial conocido. El reset es duro a propósito: `ccVaultLock()`
     haría flush y reescribiría el blob con la clave del caso anterior. */
  function sembrar(){
    app._ccVaultKey = null;
    app._ccVaultUser = null;
    app.ccStorageUnmountMirror();
    app.localStorage.clear();
    app.ccRawSet('cc_' + USER + '_user',  JSON.stringify({ name:'Matías', weight:72, age:31 }));
    app.ccRawSet('cc_' + USER + '_logs',  JSON.stringify([{ ts:1, notes:'dolor en la polea' }]));
    app.ccRawSet('cc_' + USER + '_tests', JSON.stringify({ hang_max:[{ v:'60', ts:1 }] }));
    app.setStorageUserProvider(function(){ return USER; });
  }
  function cerrar(){
    app._ccVaultKey = null; app._ccVaultUser = null;
    app.ccStorageUnmountMirror();
  }
  const leer = k => app.localStorage.getItem(k);

  /* El harness lanza todos los `it` async a la vez y espera con Promise.all.
     Estos casos comparten un sandbox y se pisarían el estado entre sí, así
     que cada uno se encadena al anterior: se mantiene un ✓ por caso en el
     reporte, pero corren EN ORDEN. */
  let cadena = Promise.resolve();
  function seq(nombre, fn){
    it(nombre, function(){
      cadena = cadena.then(fn);
      return cadena;
    });
  }

  describe('vault — ciclo completo', function(){
    seq('cifra, sirve por espejo, bloquea y vuelve a abrir', async function(){
      sembrar();
      const res = await crear();
      expect(res.ok).toBe(true);

      /* En la app: lectura síncrona, como siempre. */
      expect(JSON.parse(leer('cc_user')).weight).toBe(72);

      /* En disco: nada legible… salvo la copia de rescate, que es texto
         plano A PROPÓSITO (su razón de ser es sobrevivir a un fallo del
         cifrado). Se borra al confirmar — ver el bloque de migración. */
      const dump = app.localStorage._dump();
      Object.keys(dump).forEach(k => { if(k.indexOf('ccvault_rescue') === 0) delete dump[k]; });
      const crudo = JSON.stringify(dump);
      expect(crudo.indexOf('polea')).toBe(-1);
      expect(crudo.indexOf('Matías')).toBe(-1);

      /* Bloqueado no se lee nada. */
      const antes = leer('cc_logs');
      cerrar();
      expect(app.ccVaultUnlocked()).toBe(false);
      expect(leer('cc_logs')).toBe(null);

      await app.ccVaultUnlock(USER, PASS);
      expect(leer('cc_logs')).toBe(antes);

      /* Los cambios con el vault abierto sobreviven al ciclo. */
      app.localStorage.setItem('cc_sl', JSON.stringify({ 'Mon Jan 05 2026':'done' }));
      await app.ccVaultFlush();
      cerrar();
      await app.ccVaultUnlock(USER, PASS);
      expect(JSON.parse(leer('cc_sl'))['Mon Jan 05 2026']).toBe('done');
    });

    seq('entrega una clave de recuperación legible a mano', async function(){
      sembrar();
      const res = await crear();
      expect(app.ccNormalizeRecoveryKey(res.recovery).length).toBe(24);
      /* Sin caracteres ambiguos: hay que poder copiarla de un papel. */
      expect(/[O0I1l]/.test(res.recovery)).toBe(false);
    });
  });

  describe('vault — cuando algo sale mal', function(){
    seq('rechaza contraseña incorrecta, recovery falsa y blob manipulado', async function(){
      sembrar();
      await crear();
      cerrar();

      let abrio = false;
      try { await app.ccVaultUnlock(USER, 'claveIncorrecta'); abrio = true; } catch(e){}
      expect(abrio).toBe(false);
      expect(app.ccVaultUnlocked()).toBe(false);

      abrio = false;
      try { await app.ccVaultUnlock(USER, 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF', true); abrio = true; } catch(e){}
      expect(abrio).toBe(false);

      /* Blob manipulado: AES-GCM tiene que detectarlo, no devolver basura. */
      const k = 'ccvault_blob_' + USER;
      const blob = JSON.parse(app.ccRawGet(k));
      blob.ct = blob.ct.slice(0, -2) + 'ff';
      app.ccRawSet(k, JSON.stringify(blob));
      abrio = false;
      try { await app.ccVaultUnlock(USER, PASS); abrio = true; } catch(e){}
      expect(abrio).toBe(false);
      expect(app.ccVaultUnlocked()).toBe(false);
    });

    seq('la clave de recuperación abre igual que la contraseña', async function(){
      sembrar();
      const res = await crear();
      cerrar();
      await app.ccVaultUnlock(USER, res.recovery, true);
      expect(JSON.parse(leer('cc_user')).weight).toBe(72);

      /* Y tolera cómo la tipee el usuario: minúsculas, otros separadores. */
      cerrar();
      await app.ccVaultUnlock(USER, res.recovery.toLowerCase().replace(/-/g, ' '), true);
      expect(app.ccVaultUnlocked()).toBe(true);
    });
  });

  describe('vault — la migración es reversible', function(){
    seq('se puede desactivar, rescatar, y el arranque nunca miente', async function(){
      /* 1. desactivar devuelve todo a texto plano */
      sembrar();
      await crear();
      await app.ccVaultDisable(USER);
      expect(app.ccVaultExists(USER)).toBe(false);
      expect(JSON.parse(app.ccRawGet('cc_' + USER + '_user')).weight).toBe(72);

      /* 2. la copia de rescate vive hasta que el usuario confirma */
      sembrar();
      await crear();
      expect(app.ccVaultRescuePending(USER)).toBe(true);
      app.ccVaultConfirm(USER);
      expect(app.ccVaultRescuePending(USER)).toBe(false);

      /* 3. el peor caso: el blob se perdió y nadie puede desbloquear */
      sembrar();
      await crear();
      app.ccRawRemove('ccvault_blob_' + USER);
      const r = app.ccVaultRescue(USER);
      expect(r.ok).toBe(true);
      expect(JSON.parse(app.ccRawGet('cc_' + USER + '_user')).weight).toBe(72);
      expect(app.ccVaultExists(USER)).toBe(false);

      /* 4. con datos cifrados el arranque NUNCA dice "sin vault": eso haría
            arrancar la app en blanco y el usuario creería que perdió todo */
      sembrar();
      await crear();
      cerrar();
      expect(app.ccVaultBootState(USER)).toBe('unlock');

      /* 5. …ni siquiera si alguien APAGA el feature flag teniendo datos ya
            cifrados. El flag decide si el vault se puede activar, no si se
            respeta uno existente. */
      const antesFlag = app.window.CC_VAULT_ENABLED;
      app.window.CC_VAULT_ENABLED = false;
      expect(app.ccVaultEnabled()).toBe(false);
      expect(app.ccVaultBootState(USER)).toBe('unlock');
      app.window.CC_VAULT_ENABLED = antesFlag;
    });

    /* El flag se leía con `var` al cargar vault.js (script nº 6), pero el
       usuario lo escribe en sync-config.js (script nº 40): la lectura pasaba
       34 archivos antes que la escritura y el flag valía false SIEMPRE.
       Encenderlo no hacía nada y la sección del Perfil no se renderizaba.
       Lo encontró el QA real, no la suite — de ahí estos casos. */
    it('el flag se lee cuando se usa, no cuando se carga el archivo', function(){
      const antes = app.window.CC_VAULT_ENABLED;
      app.window.CC_VAULT_ENABLED = false;
      expect(app.ccVaultEnabled()).toBe(false);
      /* encenderlo DESPUÉS de que vault.js ya se cargó tiene que surtir efecto */
      app.window.CC_VAULT_ENABLED = true;
      expect(app.ccVaultEnabled()).toBe(true);
      app.window.CC_VAULT_ENABLED = antes;
    });

    it('sólo `true` exacto enciende el vault', function(){
      const antes = app.window.CC_VAULT_ENABLED;
      [undefined, null, 0, '', 'true', 1].forEach(function(v){
        app.window.CC_VAULT_ENABLED = v;
        if(app.ccVaultEnabled() !== false){
          throw new Error('el flag se encendió con un valor ambiguo: ' + JSON.stringify(v));
        }
      });
      app.window.CC_VAULT_ENABLED = antes;
    });
  });

  describe('vault — cambiar la contraseña', function(){
    seq('re-envuelve la clave sin recifrar ni invalidar la recuperación', async function(){
      sembrar();
      const res = await crear();
      await app.ccVaultRewrapPassword(USER, 'otraClaveNueva456');

      cerrar();
      await app.ccVaultUnlock(USER, 'otraClaveNueva456');
      expect(JSON.parse(leer('cc_user')).weight).toBe(72);

      cerrar();
      let abrio = false;
      try { await app.ccVaultUnlock(USER, PASS); abrio = true; } catch(e){}
      expect(abrio).toBe(false);

      /* La clave de recuperación sigue sirviendo: los datos no se
         recifraron, sólo se re-envolvió la DEK. */
      cerrar();
      await app.ccVaultUnlock(USER, res.recovery, true);
      expect(JSON.parse(leer('cc_user')).weight).toBe(72);
    });
  });

  describe('vault — las claves de auth quedan fuera', function(){
    seq('cc_users sigue legible con el vault cerrado', async function(){
      /* Si entraran al vault no habría forma de loguearse para abrirlo. */
      sembrar();
      app.ccRawSet('cc_users', JSON.stringify({ matias:{ salt:'x' } }));
      await crear();
      cerrar();
      expect(leer('cc_users')).notToBe(null);
      /* Deja el sandbox sin usuario activo, como lo encontró. */
      app.setStorageUserProvider(null);
      app.localStorage.clear();
    });
  });
};
