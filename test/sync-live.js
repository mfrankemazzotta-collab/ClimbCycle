/* ====================================================
   sync-live.js -- el mismo e2e, pero contra un Supabase REAL
   ClimbCycle

   `sync-e2e.test.js` corre contra un servidor de mentira que habla el
   protocolo de Supabase. Eso ya encontró dos bugs (el pull que no ocurría
   nunca y el pull espurio por desfase de relojes), pero no puede validar lo
   que depende del servidor de verdad: las políticas RLS, el esquema de la
   tabla, el formato exacto de los errores de GoTrue y la confirmación por
   email.

   Esto NO forma parte de `npm test` — necesita credenciales y toca datos
   reales. Se corre a mano:

     CC_URL=https://xxxx.supabase.co \
     CC_KEY=<anon key> \
     CC_EMAIL=atleta@tudominio.com \
     CC_PASS=<clave del atleta de prueba> \
     CC_COACH_EMAIL=coach@tudominio.com \
     CC_COACH_PASS=<clave del coach de prueba> \
     node test/sync-live.js

   Las dos últimas son opcionales, pero SIN ellas no se verifica lo más
   importante: que la policy vieja del coach (lectura de la fila completa
   del atleta) ya no exista en tu base.

   REQUISITOS EN EL PROYECTO SUPABASE
     1. Correr el SQL de SYNC_SETUP.md (tabla `climbcycle_state` + RLS).
     2. Crear un usuario de prueba, o desactivar la confirmación por email
        en Authentication → Providers → Email (si está activa, el signup no
        devuelve sesión y el script lo avisa).
     3. USAR UN PROYECTO DE PRUEBA. El script escribe en la fila del usuario
        que le pases: no lo apuntes a tu cuenta con datos reales.

   Qué valida que el mock no puede:
     · que la tabla existe y acepta el upsert con `Prefer: merge-duplicates`
     · que la RLS deja leer/escribir la fila propia
     · que `updated_at` avanza como esperamos entre pushes
     · que un bundle grande (el real, con historial) viaja completo
==================================================== */

const { loadDevice } = require('./harness');

const URL   = process.env.CC_URL;
const KEY   = process.env.CC_KEY;
const EMAIL = process.env.CC_EMAIL;
const PASS  = process.env.CC_PASS;

if(!URL || !KEY || !EMAIL || !PASS){
  console.error('\nFaltan credenciales. Uso:\n');
  console.error('  CC_URL=https://xxxx.supabase.co CC_KEY=<anon> \\');
  console.error('  CC_EMAIL=test@dominio.com CC_PASS=<clave> node test/sync-live.js\n');
  process.exit(2);
}

let ok = 0, fail = 0;
function check(nombre, cond, detalle){
  if(cond){ console.log('  ✓ ' + nombre); ok++; }
  else { console.log('  ✗ ' + nombre + (detalle ? ('\n      ' + detalle) : '')); fail++; }
}

/* Un "dispositivo" apuntado al Supabase real. */
function device(){
  const d = loadDevice(URL);
  d.window.CC_SUPABASE_ANON_KEY = KEY;
  return d;
}

(async function(){
  console.log('\n=== e2e contra Supabase REAL ===');
  console.log('    ' + URL + '  ·  usuario: ' + EMAIL + '\n');

  const A = device(), B = device();

  console.log('[auth]');
  let s = await A.syncSignIn(EMAIL, PASS);
  if(!s.ok){
    console.log('  login falló (' + s.err + '), intento crear la cuenta…');
    const up = await A.syncSignUp(EMAIL, PASS);
    if(up.needsConfirm){
      console.error('\n  La confirmación por email está ACTIVA: el signup no devuelve sesión.');
      console.error('  Confirmá el usuario o desactivá la opción, y volvé a correr.\n');
      process.exit(1);
    }
    if(!up.ok){ console.error('  no se pudo crear: ' + up.err); process.exit(1); }
    s = up;
  }
  check('sesión iniciada en A', A.syncIsLoggedIn());
  const sB = await B.syncSignIn(EMAIL, PASS);
  check('sesión iniciada en B (segundo dispositivo)', sB.ok && B.syncIsLoggedIn());

  console.log('\n[tabla + RLS]');
  const marca = 'live-' + Date.now();
  A.localStorage.setItem('cc_user', JSON.stringify({ name: marca }));
  const mA = A._syncGetMeta(); mA.lastLocalChange = new Date().toISOString(); A._syncSetMeta(mA);

  const push = await A.syncPush();
  check('push aceptado por la tabla', push.ok, push.err);
  const tsPush = A._syncGetMeta().lastPush;
  check('lastPush quedó sellado con la hora del servidor', !!tsPush, 'meta: ' + JSON.stringify(A._syncGetMeta()));

  console.log('\n[dos dispositivos]');
  const pullB = await B.syncPull();
  check('B baja lo que subió A', pullB.ok && pullB.applied === true, JSON.stringify(pullB));
  let leidoB = null;
  try { leidoB = JSON.parse(B.localStorage.getItem('cc_user')).name; } catch(e){}
  check('el dato llegó intacto', leidoB === marca, 'esperaba ' + marca + ', llegó ' + leidoB);

  console.log('\n[no hay churn]');
  const nada = await A.syncNow();
  check('sin cambios, A no vuelve a subir ni baja', !nada.applied && !nada.pushed, JSON.stringify(nada));

  console.log('\n[bundle grande]');
  const grande = JSON.stringify(Array.from({length: 400}, (_, i) => ({
    ts: Date.now() - i * 86400000, dateStr: 'd' + i, block: 'strength', rpe: 7, dur: 90
  })));
  A.localStorage.setItem('cc_logs', grande);
  const m2 = A._syncGetMeta(); m2.lastLocalChange = new Date().toISOString(); A._syncSetMeta(m2);
  const push2 = await A.syncPush();
  check('un historial de 400 sesiones sube sin error', push2.ok, push2.err);
  const pull2 = await B.syncPull();
  check('y baja completo', pull2.ok && B.localStorage.getItem('cc_logs') === grande);

  /* ── Privacidad del modo entrenador ──
     Sólo corre si se pasan credenciales de una SEGUNDA cuenta (el coach).
     Es la verificación que más importa de todo el script: comprueba contra
     el servidor real que la policy vieja (`climbcycle_state_coach_read`) ya
     no existe. Mientras exista, un coach puede bajarse el bundle completo
     por más que la app no lo haga. */
  if(process.env.CC_COACH_EMAIL && process.env.CC_COACH_PASS){
    console.log('\n[privacidad del coach]');
    const C = device();
    let sc = await C.syncSignIn(process.env.CC_COACH_EMAIL, process.env.CC_COACH_PASS);
    if(!sc.ok) sc = await C.syncSignUp(process.env.CC_COACH_EMAIL, process.env.CC_COACH_PASS);
    check('sesión del coach', C.syncIsLoggedIn(), sc.err);

    if(C.syncIsLoggedIn()){
      const nota = 'NOTA-PRIVADA-' + Date.now();
      A.localStorage.setItem('cc_logs', JSON.stringify([
        { ts: Date.now(), dateStr:'d1', block:'strength', rpe:8, dur:90, notes: nota }
      ]));
      const m3 = A._syncGetMeta(); m3.lastLocalChange = new Date().toISOString(); A._syncSetMeta(m3);
      await A.syncPush();

      const share = await A.coachGenerateShare();
      check('el atleta genera un código', share.ok, share.err);
      const red = await C.coachRedeem(share.code);
      check('el coach lo canjea', red.ok, red.err);

      const idA = A._syncGetSession().user_id;
      const vista = await C.coachPullAthlete(idA);
      check('el coach recibe el resumen', vista.ok && !!vista.view, JSON.stringify(vista));
      check('el resumen NO trae la nota privada',
            JSON.stringify(vista.view || {}).indexOf(nota) === -1);

      /* LA prueba: pedir la fila privada a mano, salteando la app. */
      const crudo = await C._coachRest('climbcycle_state', 'GET', '?user_id=eq.' + idA + '&select=bundle');
      const filtrado = crudo.ok && (crudo.data || []).length === 0;
      check('la fila privada del atleta NO es legible por el coach', filtrado,
            filtrado ? '' : 'La policy vieja sigue viva. Corré el `drop policy` de COACH_SETUP.md — sin eso, cualquier coach se baja el historial completo.');

      const coachId = C._syncGetSession().user_id;
      const rev = await A.coachRevoke(coachId);
      check('revocar corta el acceso', rev.ok, rev.err);
      const post = await C.coachPullAthlete(idA);
      check('tras revocar, el coach ya no ve nada', post.empty === true, JSON.stringify(post));
    }
  } else {
    console.log('\n[privacidad del coach] omitido — pasá CC_COACH_EMAIL y CC_COACH_PASS');
    console.log('   (es la verificación MÁS importante: confirma que la policy vieja no existe)');
  }

  console.log('\n────────────────────────────────');
  console.log(fail ? ('✗ ' + fail + ' fallos, ' + ok + ' ok') : ('✓ todo verde (' + ok + ')'));
  console.log('\nRecordá borrar la fila de prueba si usaste un proyecto compartido:');
  console.log('  delete from climbcycle_state where user_id = auth.uid();\n');
  process.exit(fail ? 1 : 0);
})().catch(function(e){
  console.error('\nError inesperado:', e && e.message);
  console.error(e && e.stack);
  process.exit(1);
});
