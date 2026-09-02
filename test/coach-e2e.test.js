/* ====================================================
   coach-e2e.test.js -- modo entrenador de punta a punta

   EL HALLAZGO: el recorte a "resumen" corría en el navegador del COACH.
   `coachPullAthlete` pedía `climbcycle_state?select=bundle` y recién ahí
   `buildCoachView` se quedaba con unos pocos campos — pero el bundle
   completo (peso, edad, pulsaciones y **las notas libres de cada sesión**)
   ya había viajado y quedaba en la pestaña Network del coach.

   La UI prometía "solo lectura, un resumen". El sistema entregaba el
   historial entero. Nada de esto es visible mirando la pantalla: sólo se ve
   mirando el tráfico, que es justo lo que este arnés puede hacer.

   Ahora el resumen lo calcula el dispositivo del ATLETA y se publica en
   `coach_summaries`; la fila privada deja de ser legible para el coach.
==================================================== */
const { describe, it, expect } = require('./assert');
const { loadDevice } = require('./harness');
const { makeFakeSupabase } = require('./fake-supabase');

module.exports = function(){
  const ATLETA = { email:'atleta@test.local', pass:'claveDelAtleta1' };
  const COACH  = { email:'coach@test.local',  pass:'claveDelCoach1'  };

  /* Datos sensibles con los que se verifica que NO se filtran. */
  const NOTA_PRIVADA = 'Dolor en la polea A2. No se lo conté a nadie.';

  async function escenario(opts){
    const nube = makeFakeSupabase(Object.assign({ skewMs: 0 }, opts || {}));
    const url = await nube.listen();
    const atleta = loadDevice(url), coach = loadDevice(url);

    let r = await atleta.syncSignUp(ATLETA.email, ATLETA.pass);
    if(!r.ok) throw new Error('alta atleta: ' + r.err);
    r = await coach.syncSignUp(COACH.email, COACH.pass);
    if(!r.ok) throw new Error('alta coach: ' + r.err);

    /* El atleta carga datos reales, incluidos los sensibles. */
    atleta.localStorage.setItem('cc_user', JSON.stringify({
      name:'Matías', level:'intermediate', goal:'sport', grade:'7a', targetGrade:'7c',
      weight:72, age:31, rhr:48
    }));
    atleta.localStorage.setItem('cc_logs', JSON.stringify([
      { ts:Date.now() - 86400000, dateStr:'d1', block:'strength', rpe:8, dur:90, notes:NOTA_PRIVADA }
    ]));
    const m = atleta._syncGetMeta(); m.lastLocalChange = new Date().toISOString(); atleta._syncSetMeta(m);
    await atleta.syncPush();

    return { nube, atleta, coach };
  }

  function conEscenario(fn, opts){
    return async function(){
      const e = await escenario(opts);
      try { await fn(e); }
      finally { await e.nube.close(); }
    };
  }

  /* Enlaza coach y atleta vía el código de un solo uso. */
  async function enlazar(atleta, coach){
    const share = await atleta.coachGenerateShare();
    if(!share.ok) throw new Error('share: ' + share.err);
    const red = await coach.coachRedeem(share.code);
    if(!red.ok) throw new Error('redeem: ' + red.err);
    return share;
  }

  describe('coach e2e — el enlace por código', function(){

    it('el coach canjea el código y ve al atleta en su lista', conEscenario(async function({ atleta, coach }){
      await enlazar(atleta, coach);
      const lst = await coach.coachListAthletes();
      expect(lst.ok).toBe(true);
      expect(lst.data.length).toBe(1);
    }));

    it('el código es de UN SOLO USO', conEscenario(async function({ atleta, coach }){
      const share = await enlazar(atleta, coach);
      const otra = await coach.coachRedeem(share.code);
      expect(otra.ok).toBe(false);
    }));

    it('un código inventado no enlaza a nadie', conEscenario(async function({ coach }){
      const r = await coach.coachRedeem('ABCD-1234-EF56-7890');
      expect(r.ok).toBe(false);
      const lst = await coach.coachListAthletes();
      expect(lst.data.length).toBe(0);
    }));
  });

  describe('coach e2e — QUÉ datos cruzan la red (el bug)', function(){

    it('el coach recibe el resumen y NADA más', conEscenario(async function({ atleta, coach }){
      await enlazar(atleta, coach);
      const id = atleta._syncGetSession().user_id;
      const r = await coach.coachPullAthlete(id);
      expect(r.ok).toBe(true);

      /* Lo que sí debe ver */
      expect(r.view.name).toBe('Matías');
      expect(r.view.grade).toBe('7a');
      expect(r.view.totalLogged).toBe(1);

      /* Lo que NO debe ver.

         La verificación es ESTRUCTURAL: se compara el conjunto de claves
         contra una whitelist. Antes esto buscaba la subcadena "72" (el peso)
         dentro del JSON — y fallaba de forma intermitente, porque el view
         incluye `lastSession`, un timestamp de 13 dígitos donde "72" aparece
         por puro azar según la hora. Un test que depende de qué dígitos tenga
         el reloj no prueba nada.

         La whitelist además es MÁS fuerte: detecta cualquier campo nuevo que
         alguien agregue a buildCoachView sin pensar en privacidad, no sólo
         los tres que se me ocurrieron a mí. */
      const PERMITIDAS = ['name','level','goal','grade','targetGrade',
                          'sessions7','sessions30','totalLogged','lastSession',
                          'tests','projects'];
      const declaradas = Object.keys(r.view).sort();
      const demas = declaradas.filter(k => PERMITIDAS.indexOf(k) === -1);
      if(demas.length) throw new Error('el resumen expone campos no previstos: ' + demas.join(', '));

      /* y explícitamente, los sensibles */
      expect(r.view.weight).toBe(undefined);
      expect(r.view.age).toBe(undefined);
      expect(r.view.rhr).toBe(undefined);
      expect(r.view.notes).toBe(undefined);
      /* la nota privada es un string único: buscarla sí es fiable */
      expect(JSON.stringify(r.view).indexOf('polea')).toBe(-1);
    }));

    it('los datos privados NO viajan por la red en ningún momento', conEscenario(async function({ nube, atleta, coach }){
      /* Ésta es la aserción que importa: no alcanza con que la UI no los
         muestre — no tienen que salir del servidor. Se mira el tráfico. */
      await enlazar(atleta, coach);
      const id = atleta._syncGetSession().user_id;
      const antes = nube.log.length;
      await coach.coachPullAthlete(id);

      const respuestas = nube.log.slice(antes);
      const todo = JSON.stringify(respuestas);
      expect(todo.indexOf('polea')).toBe(-1);
    }));

    it('el coach NO puede bajarse la fila privada del atleta', conEscenario(async function({ atleta, coach }){
      /* Aunque lo pida a mano, salteando la app. */
      await enlazar(atleta, coach);
      const id = atleta._syncGetSession().user_id;
      const r = await coach._coachRest('climbcycle_state', 'GET', '?user_id=eq.' + id + '&select=bundle');
      expect(r.ok).toBe(true);
      expect((r.data || []).length).toBe(0);
    }));

    it('DEMOSTRACIÓN del bug viejo: con la policy anterior se filtraba todo', conEscenario(async function({ nube, atleta, coach }){
      /* Con la policy que traía COACH_SETUP.md antes del fix, el mismo
         pedido devuelve el bundle entero. Por eso el `drop policy` del SQL
         no es opcional: sin él, cambiar la app no alcanza. */
      nube.permitirLecturaDirectaDelCoach();
      await enlazar(atleta, coach);
      const id = atleta._syncGetSession().user_id;
      const r = await coach._coachRest('climbcycle_state', 'GET', '?user_id=eq.' + id + '&select=bundle');
      expect(r.data.length).toBe(1);
      expect(JSON.stringify(r.data[0]).indexOf('polea')).toBeGreaterThan(-1);
    }));

    it('un coach sin enlace no ve el resumen de nadie', conEscenario(async function({ atleta, coach }){
      const id = atleta._syncGetSession().user_id;   /* sin enlazar */
      const r = await coach.coachPullAthlete(id);
      expect(r.ok).toBe(true);
      expect(r.empty).toBe(true);
    }));
  });

  describe('coach e2e — el resumen se mantiene al día y se revoca', function(){

    it('el resumen se republica al sincronizar', conEscenario(async function({ atleta, coach }){
      await enlazar(atleta, coach);
      const id = atleta._syncGetSession().user_id;

      /* El atleta entrena más y sincroniza. */
      atleta.localStorage.setItem('cc_logs', JSON.stringify([
        { ts:Date.now(), dateStr:'d1', block:'strength', rpe:8, dur:90, notes:NOTA_PRIVADA },
        { ts:Date.now(), dateStr:'d2', block:'power',    rpe:9, dur:90, notes:'otra nota privada' }
      ]));
      const m = atleta._syncGetMeta(); m.lastLocalChange = new Date().toISOString(); atleta._syncSetMeta(m);
      await atleta.syncPush();

      const r = await coach.coachPullAthlete(id);
      expect(r.view.totalLogged).toBe(2);
      expect(JSON.stringify(r.view).indexOf('nota privada')).toBe(-1);
    }));

    it('syncPush no termina hasta que el resumen quedó publicado', conEscenario(async function({ atleta, coach }){
      /* LA CARRERA. `syncPush` disparaba `coachPublishSummary()` y seguía de
         largo: la promesa resolvía con el resumen todavía viajando. Quien
         sincronizaba y miraba enseguida veía el resumen ANTERIOR.

         El síntoma era un test que fallaba una vez cada ~15 corridas, que es
         la peor forma de tener un bug: parece ruido, se ignora, y tapa una
         carrera que el usuario también corre. Acá se hace determinista
         demorando 60 ms la respuesta de `coach_summaries`: si `syncPush` no
         espera, este test falla SIEMPRE. */
      await enlazar(atleta, coach);
      const id = atleta._syncGetSession().user_id;

      atleta.localStorage.setItem('cc_logs', JSON.stringify([
        { ts:Date.now(), dateStr:'d1', block:'strength', rpe:8, dur:90 },
        { ts:Date.now(), dateStr:'d2', block:'power',    rpe:9, dur:90 },
        { ts:Date.now(), dateStr:'d3', block:'endurance',rpe:6, dur:60 }
      ]));
      const m = atleta._syncGetMeta(); m.lastLocalChange = new Date().toISOString(); atleta._syncSetMeta(m);
      await atleta.syncPush();

      const r = await coach.coachPullAthlete(id);
      expect(r.view.totalLogged).toBe(3);
    }, { demoras: { 'POST /rest/v1/coach_summaries': 120 } }));

    it('revocar corta el acceso y borra el resumen publicado', conEscenario(async function({ nube, atleta, coach }){
      await enlazar(atleta, coach);
      const id = atleta._syncGetSession().user_id;
      const coachId = coach._syncGetSession().user_id;

      expect((await coach.coachPullAthlete(id)).ok).toBe(true);

      const rev = await atleta.coachRevoke(coachId);
      expect(rev.ok).toBe(true);

      /* Ya no lo ve… */
      const despues = await coach.coachPullAthlete(id);
      expect(despues.empty).toBe(true);
      /* …y el resumen dejó de existir en el servidor. */
      expect(nube.resumenes[id]).toBe(undefined);
    }));

    it('quien no tiene entrenadores no publica resumen', conEscenario(async function({ nube, atleta }){
      /* No se crean filas para usuarios que nunca usaron el modo coach. */
      const id = atleta._syncGetSession().user_id;
      expect(nube.resumenes[id]).toBe(undefined);
      expect(atleta.coachHasCoaches()).toBe(false);
    }));
  });
};
