/* ====================================================
   sync-e2e.test.js -- sync de punta a punta, sobre HTTP real

   `sync.js` era la única capa sin probar de punta a punta, y ahí estaba el
   peor bug de la auditoría: el pull no ocurría NUNCA porque `syncPull`
   comparaba el remoto contra `Date.now()`. La lógica pura tenía tests en
   verde — el fallo vivía en la costura entre la lógica y la red, que
   ningún unit test podía ver.

   Estos tests levantan un servidor que habla el protocolo real de Supabase
   (test/fake-supabase.js) y corren DOS dispositivos independientes contra
   él, cada uno con su propio localStorage. Es el escenario que perdía
   datos: A entrena, B abre la app con datos viejos, y el trabajo de A
   desaparecía de la nube.

   Async: el harness los espera con flush() antes de reportar.
==================================================== */
const { describe, it, expect } = require('./assert');
const { loadDevice } = require('./harness');
const { makeFakeSupabase } = require('./fake-supabase');

module.exports = function(){
  const EMAIL = 'climber@test.local', PASS = 'unaClaveLarga123';

  /* Levanta servidor + dispositivos ya logueados y con datos propios.
     `skewMs` por defecto: el reloj del servidor va 1,5 s adelantado, como
     pasa en la vida real. El cliente NO puede fiarse del `updated_at` que
     él mismo mandó — si lo hace, cada sync dispara un pull espurio. */
  async function escenario(n, opts){
    const nube = makeFakeSupabase(Object.assign({ skewMs: 1500 }, opts || {}));
    const url = await nube.listen();
    const devs = [];
    for(let i = 0; i < (n || 2); i++) devs.push(loadDevice(url));

    /* El primero crea la cuenta; los demás inician sesión. */
    const alta = await devs[0].syncSignUp(EMAIL, PASS);
    if(!alta.ok) throw new Error('alta falló: ' + alta.err);
    for(let i = 1; i < devs.length; i++){
      const r = await devs[i].syncSignIn(EMAIL, PASS);
      if(!r.ok) throw new Error('login falló: ' + r.err);
    }
    return { nube, url, devs };
  }

  /* Corre un test con servidor propio y GARANTIZA el cierre. Sin el finally,
     una aserción que falla deja el server escuchando y el proceso de test
     nunca termina (fue exactamente lo que pasó la primera vez). */
  function conEscenario(n, fn){
    return async function(){
      const e = await escenario(n);
      try { await fn(e); }
      finally { await e.nube.close(); }
    };
  }

  /* Escribe un dato reconocible en el estado local de un dispositivo. */
  function marcarDato(dev, valor){
    dev.localStorage.setItem('cc_user', JSON.stringify({ name: valor }));
  }
  function leerDato(dev){
    try { return JSON.parse(dev.localStorage.getItem('cc_user') || '{}').name; }
    catch(e){ return null; }
  }
  /* Sella la meta como si el cambio local acabara de ocurrir. */
  function tocarLocal(dev, cuando){
    const m = dev._syncGetMeta();
    m.lastLocalChange = cuando || new Date().toISOString();
    dev._syncSetMeta(m);
  }

  describe('sync e2e — auth y transporte', function(){

    it('alta, login y refresh de token funcionan sobre HTTP', conEscenario(1, async function({ devs }){
      
      expect(devs[0].syncIsLoggedIn()).toBe(true);
      expect(devs[0].syncCurrentEmail()).toBe(EMAIL);
    }));

    it('un token vencido se renueva solo y la operación se completa', conEscenario(1, async function({ nube, devs }){
      /* Ejercita el retry con refresh de _syncRest, que nunca se había
         probado: el 401 sólo ocurre contra un servidor real. */
      
      marcarDato(devs[0], 'antes-de-expirar');
      const p1 = await devs[0].syncPush();
      expect(p1.ok).toBe(true);

      nube.expirarTokens();
      marcarDato(devs[0], 'despues-de-expirar');
      const p2 = await devs[0].syncPush();
      expect(p2.ok).toBe(true);      /* se recuperó solo */

      const refrescos = nube.log.filter(r => /grant_type=refresh_token/.test(r.query || ''));
      expect(refrescos.length).toBeGreaterThan(0);
    }));

    it('el servidor sella updated_at, no el cliente', conEscenario(1, async function({ nube, devs }){
      /* §10 lo pedía: con relojes desfasados, la hora del cliente corrompe
         la resolución de conflictos. */
      
      marcarDato(devs[0], 'x');
      await devs[0].syncPush();
      const id = nube.idDe(EMAIL);
      expect(typeof nube.filas[id].updated_at).toBe('string');
    }));

    it('RLS: un dispositivo no puede leer la fila de otro usuario', conEscenario(1, async function({ nube, devs }){
      
      nube.sembrarRemoto('user_de_otra_persona', { data:{ cc_user:'{"name":"ajeno"}' } });
      const r = await devs[0].syncPull();
      expect(r.ok).toBe(true);
      expect(r.empty).toBe(true);        /* no ve nada ajeno */
    }));
  });

  describe('sync e2e — DOS dispositivos (el escenario que perdía datos)', function(){

    it('B baja lo que subió A (antes el pull no ocurría nunca)', conEscenario(2, async function({ devs }){
      
      const [A, B] = devs;

      /* A entrena y sube. */
      marcarDato(A, 'trabajo-de-A');
      tocarLocal(A);
      const pushA = await A.syncPush();
      expect(pushA.ok).toBe(true);

      /* B abre la app: su último push es viejo (o inexistente) y el remoto
         cambió después → tiene que BAJAR. */
      const pullB = await B.syncPull();
      expect(pullB.applied).toBe(true);
      expect(leerDato(B)).toBe('trabajo-de-A');
    }));

    it('B NO pisa en la nube el trabajo de A al sincronizar', conEscenario(2, async function({ nube, devs }){
      /* Éste es el bug exacto: B tenía datos viejos, nunca bajaba, y su
         auto-push sobrescribía el remoto. */
      
      const [A, B] = devs;

      marcarDato(A, 'trabajo-de-A');
      tocarLocal(A);
      await A.syncPush();

      marcarDato(B, 'estado-viejo-de-B');   /* sin tocarLocal: B no cambió nada desde su alta */
      await B.syncNow();

      const id = nube.idDe(EMAIL);
      const enLaNube = JSON.parse(nube.filas[id].bundle.data.cc_user).name;
      expect(enLaNube).toBe('trabajo-de-A');
    }));

    it('si los dos cambiaron, hay conflicto y no se pisa nada', conEscenario(2, async function({ nube, devs }){
      
      const [A, B] = devs;

      marcarDato(A, 'trabajo-de-A');
      tocarLocal(A);
      await A.syncPush();

      /* B también trabajó, después de su propio último push. */
      marcarDato(B, 'trabajo-de-B');
      const metaB = B._syncGetMeta();
      metaB.lastPush = new Date(Date.now() - 3600000).toISOString();
      metaB.lastLocalChange = new Date().toISOString();
      B._syncSetMeta(metaB);

      const r = await B.syncNow();
      expect(r.conflict).toBe(true);
      /* Nada se tocó, ni acá ni allá. */
      expect(leerDato(B)).toBe('trabajo-de-B');
      const id = nube.idDe(EMAIL);
      expect(JSON.parse(nube.filas[id].bundle.data.cc_user).name).toBe('trabajo-de-A');
    }));

    it('aplicar un bundle remoto deja copia de rescate', conEscenario(2, async function({ devs }){
      
      const [A, B] = devs;

      marcarDato(A, 'trabajo-de-A');
      tocarLocal(A);
      await A.syncPush();

      marcarDato(B, 'lo-que-B-tenia');
      await B.syncPull();

      expect(leerDato(B)).toBe('trabajo-de-A');
      const rescate = B.ccRawGet('ccsync_prepull');
      expect(typeof rescate).toBe('string');
      const previo = JSON.parse(rescate);
      expect(JSON.parse(previo.data.cc_user).name).toBe('lo-que-B-tenia');
    }));

    it('ida y vuelta completa: A → B → A conserva los dos aportes', conEscenario(2, async function({ devs }){
      
      const [A, B] = devs;

      marcarDato(A, 'sesion-1');
      tocarLocal(A);
      await A.syncPush();

      await B.syncPull();                  /* B se pone al día */
      expect(leerDato(B)).toBe('sesion-1');

      marcarDato(B, 'sesion-2');           /* B entrena encima */
      tocarLocal(B);
      await B.syncPush();

      await A.syncPull();                  /* A se pone al día */
      expect(leerDato(A)).toBe('sesion-2');
    }));

    it('el reloj adelantado del servidor no dispara un pull espurio', conEscenario(1, async function({ nube, devs }){
      /* Regresión del bug que encontró este arnés: `syncPush` sellaba
         `lastPush` con la hora que mandaba el CLIENTE, pero el servidor
         guardaba la suya. Con el reloj del server 1,5 s adelantado, la fila
         remota parecía más nueva que mi propio push y el siguiente sync
         bajaba datos (con recarga de página) sin que nadie hubiera cambiado
         nada. En local jamás se hubiera visto. */
      const A = devs[0];
      marcarDato(A, 'x');
      tocarLocal(A);
      await A.syncPush();

      const meta = A._syncGetMeta();
      const id = nube.idDe(EMAIL);
      expect(meta.lastPush).toBe(nube.filas[id].updated_at);   /* la hora del server */

      const r = await A.syncNow();
      expect(r.applied).notToBe(true);   /* no baja nada: nadie cambió */
    }));

    it('sin cambios de ningún lado, no se sube nada de más', conEscenario(1, async function({ nube, devs }){
      
      const A = devs[0];
      marcarDato(A, 'x');
      tocarLocal(A);
      await A.syncPush();

      const antes = nube.log.filter(r => r.method === 'POST' && r.path === '/rest/v1/climbcycle_state').length;
      const r = await A.syncNow();
      expect(r.pushed === true || r.applied === true).toBe(false);   /* insync */
      const despues = nube.log.filter(r => r.method === 'POST' && r.path === '/rest/v1/climbcycle_state').length;
      expect(despues).toBe(antes);
    }));
  });

  describe('sync e2e — el bundle viaja entero', function(){

    it('todas las claves de datos sobreviven el viaje', conEscenario(2, async function({ devs }){
      
      const [A, B] = devs;
      const claves = ['cc_user','cc_plan','cc_sl','cc_logs','cc_tests','cc_rec','cc_projects','cc_exdone'];
      claves.forEach(function(k, i){ A.localStorage.setItem(k, JSON.stringify({ marca: k + '-' + i })); });
      tocarLocal(A);
      await A.syncPush();

      await B.syncPull();
      claves.forEach(function(k, i){
        expect(JSON.parse(B.localStorage.getItem(k)).marca).toBe(k + '-' + i);
      });
    }));
  });
};
