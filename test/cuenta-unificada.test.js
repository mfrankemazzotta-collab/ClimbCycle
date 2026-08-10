/* ====================================================
   cuenta-unificada.test.js -- una sola cuenta, local + nube

   (O) DOS CUENTAS ERA UN PROBLEMA DE PRODUCTO, NO DE CÓDIGO.

   La app tenía dos altas independientes:
     · local — usuario tipo `pedro_v` + contraseña, en el navegador;
     · nube  — email + contraseña, en Supabase, escondida en Perfil.

   Distinto identificador, distinta contraseña, y la segunda no aparecía en
   ningún momento del onboarding. Para el dueño del proyecto era un detalle
   conocido; para cualquier otra persona significaba crear la primera,
   entrenar durante semanas, y no enterarse jamás de que sus datos NO se
   estaban respaldando. Con el sync funcionando perfecto del otro lado.

   Ahora el email es el identificador y un alta crea las dos cosas.

   LO QUE ESTOS TESTS PROTEGEN, que es lo delicado de unificar:

   1. **Lo local manda.** Si la nube falla —sin red, Supabase caído, email ya
      registrado— el usuario ENTRA IGUAL. La app funciona offline por diseño;
      la nube es respaldo, no requisito. Bloquear el acceso por un problema
      de red sería cambiar un mal por otro peor.

   2. **Pero no se miente sobre el respaldo.** Si la nube falló, se avisa.
      Callarlo dejaría a alguien entrenando meses creyendo que tiene backup —
      la misma familia de bug que el ACWR diciendo "carga baja".

   3. **Dispositivo nuevo.** Me registré en el celu, abro la app en la compu:
      la cuenta local no existe ahí, la de nube sí. Sin esto vería "Usuario no
      existe" teniendo cuenta, que es la peor forma posible de romper la
      promesa de que sus datos están a salvo.
==================================================== */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  const LS = app.localStorage;

  /* Reemplaza la capa de nube por una controlable. Se restaura siempre. */
  function conNube(stubs, fn){
    const orig = {
      cfg: app.syncIsConfigured, up: app.syncSignUp, in: app.syncSignIn
    };
    app.syncIsConfigured = () => stubs.configurado !== false;
    app.syncSignUp = stubs.signUp || (() => Promise.resolve({ ok:true }));
    app.syncSignIn = stubs.signIn || (() => Promise.resolve({ ok:true }));
    return Promise.resolve()
      .then(fn)
      .then(
        v => { app.syncIsConfigured = orig.cfg; app.syncSignUp = orig.up; app.syncSignIn = orig.in; return v; },
        e => { app.syncIsConfigured = orig.cfg; app.syncSignUp = orig.up; app.syncSignIn = orig.in; throw e; }
      );
  }
  function limpiar(){ LS.clear(); app.setCurrentUser(null); }

  /* EN SERIE, NO EN PARALELO. El harness lanza todos los `it` async a la vez
     y espera con Promise.all. Estos casos comparten el registro `cc_users` Y
     reemplazan la capa de nube global: corriendo juntos se pisan los stubs
     entre sí y fallan de formas que no tienen nada que ver con lo que prueban
     (lo comprobé: 5 rojos por contaminación, ninguno real).

     Mismo patrón que vault.test y backup-crypto.test: se mantiene un ✓ por
     caso en el reporte, pero se ejecutan encadenados. */
  let cadena = Promise.resolve();
  function seq(nombre, fn){
    it(nombre, function(){
      cadena = cadena.then(fn);
      return cadena;
    });
  }

  describe('(O) alta unificada', function(){

    seq('un solo registro crea la cuenta local Y la de nube', async function(){
      limpiar();
      let llamado = null;
      await conNube({ signUp: (e,p) => { llamado = { e, p }; return Promise.resolve({ ok:true }); } },
        async function(){
          const r = await app.authRegistrarCompleto('nuevo@test.local', 'clave123');
          expect(r.ok).toBe(true);
          expect(r.local).toBe(true);
          expect(r.nube).toBe(true);
        });
      /* la nube recibe LAS MISMAS credenciales: una sola contraseña */
      expect(llamado.e).toBe('nuevo@test.local');
      expect(llamado.p).toBe('clave123');
      limpiar();
    });

    seq('queda con la sesión local iniciada, sin pedir login de nuevo', async function(){
      limpiar();
      await conNube({}, async function(){
        await app.authRegistrarCompleto('auto@test.local', 'clave123');
        expect(app.getCurrentUser()).toBe('auto@test.local');
      });
      limpiar();
    });

    seq('si la nube falla, el usuario ENTRA IGUAL', async function(){
      /* Sin red en el gimnasio no puede significar "no podés entrenar". */
      limpiar();
      await conNube({
        signUp: () => Promise.reject(new Error('sin red')),
        signIn: () => Promise.reject(new Error('sin red'))
      }, async function(){
        const r = await app.authRegistrarCompleto('offline@test.local', 'clave123');
        expect(r.ok).toBe(true);
        expect(r.local).toBe(true);
        expect(r.nube).toBe(false);
      });
      expect(app.getCurrentUser()).toBe('offline@test.local');
      limpiar();
    });

    seq('…pero lo dice: no finge que hay respaldo', async function(){
      limpiar();
      await conNube({
        signUp: () => Promise.resolve({ ok:false, err:'Supabase caído' }),
        signIn: () => Promise.resolve({ ok:false })
      }, async function(){
        const r = await app.authRegistrarCompleto('avisa@test.local', 'clave123');
        expect(r.ok).toBe(true);
        expect(r.nube).toBe(false);
        expect(typeof r.errNube).toBe('string');
        expect(r.errNube.length).toBeGreaterThan(3);
      });
      limpiar();
    });

    seq('email ya registrado en la nube: entra en vez de fallar', async function(){
      /* Caso real: reinstaló la app o se registró antes en otro dispositivo.
         Su email "ya existe" en Supabase — pero es SUYO. */
      limpiar();
      await conNube({
        signUp: () => Promise.resolve({ ok:false, err:'User already registered' }),
        signIn: () => Promise.resolve({ ok:true })
      }, async function(){
        const r = await app.authRegistrarCompleto('vuelve@test.local', 'clave123');
        expect(r.ok).toBe(true);
        expect(r.nube).toBe(true);
        expect(r.yaExistiaEnLaNube).toBe(true);
      });
      limpiar();
    });

    seq('propaga que hay que confirmar el email', async function(){
      limpiar();
      await conNube({ signUp: () => Promise.resolve({ ok:true, needsConfirm:true }) }, async function(){
        const r = await app.authRegistrarCompleto('confirma@test.local', 'clave123');
        expect(r.ok).toBe(true);
        expect(r.needsConfirm).toBe(true);
      });
      limpiar();
    });

    seq('sin nube configurada, el alta local funciona sola', async function(){
      limpiar();
      await conNube({ configurado:false }, async function(){
        const r = await app.authRegistrarCompleto('solo@test.local', 'clave123');
        expect(r.ok).toBe(true);
        expect(r.local).toBe(true);
        expect(r.nube).toBe(false);
        expect(r.errNube).toBe(undefined);   /* no hay nube: no es un error */
      });
      limpiar();
    });

    seq('un email inválido se rechaza antes de tocar la nube', async function(){
      limpiar();
      let tocada = false;
      await conNube({ signUp: () => { tocada = true; return Promise.resolve({ ok:true }); } },
        async function(){
          const r = await app.authRegistrarCompleto('pedro_v', 'clave123');
          expect(r.ok).toBe(false);
        });
      expect(tocada).toBe(false);
      limpiar();
    });
  });

  describe('(O) ingreso, incluido el dispositivo nuevo', function(){

    seq('con cuenta local entra y engancha la nube', async function(){
      limpiar();
      await conNube({}, async function(){
        await app.authRegistrarCompleto('vuelvo@test.local', 'clave123');
        app.setCurrentUser(null);
        const r = await app.authIngresarCompleto('vuelvo@test.local', 'clave123');
        expect(r.ok).toBe(true);
        expect(r.nube).toBe(true);
      });
      limpiar();
    });

    seq('DISPOSITIVO NUEVO: sin cuenta local pero con cuenta en la nube, entra', async function(){
      /* Éste es el caso que hace verdadera la promesa de "una sola cuenta".
         Sin él, abrir la app en la compu diría "Usuario no existe" a alguien
         que tiene su historial a salvo en la nube. */
      limpiar();
      await conNube({ signIn: () => Promise.resolve({ ok:true }) }, async function(){
        expect(app.loadUsers()['nuevo-disp@test.local']).toBe(undefined);
        const r = await app.authIngresarCompleto('nuevo-disp@test.local', 'clave123');
        expect(r.ok).toBe(true);
        expect(r.dispositivoNuevo).toBe(true);
        /* y queda con cuenta local creada, para poder usar la app offline */
        expect(app.getCurrentUser()).toBe('nuevo-disp@test.local');
        expect(!!app.loadUsers()['nuevo-disp@test.local']).toBe(true);
      });
      limpiar();
    });

    seq('contraseña incorrecta sigue fallando, también contra la nube', async function(){
      limpiar();
      await conNube({ signIn: () => Promise.resolve({ ok:false, err:'Invalid login credentials' }) },
        async function(){
          const r = await app.authIngresarCompleto('fantasma@test.local', 'malaClave');
          expect(r.ok).toBe(false);
        });
      limpiar();
    });

    seq('sin red y sin cuenta local, el error es el local (no uno de red)', async function(){
      limpiar();
      await conNube({ signIn: () => Promise.reject(new Error('sin red')) }, async function(){
        const r = await app.authIngresarCompleto('nadie@test.local', 'clave123');
        expect(r.ok).toBe(false);
        expect(typeof r.err).toBe('string');
      });
      limpiar();
    });

    seq('con cuenta local y sin red, entra offline', async function(){
      limpiar();
      await conNube({ configurado:false }, async function(){
        await app.authRegistrarCompleto('offline2@test.local', 'clave123');
      });
      app.setCurrentUser(null);
      await conNube({ signIn: () => Promise.reject(new Error('sin red')) }, async function(){
        const r = await app.authIngresarCompleto('offline2@test.local', 'clave123');
        expect(r.ok).toBe(true);
        expect(r.local).toBe(true);
        expect(r.nube).toBe(false);
      });
      limpiar();
    });
  });
};
