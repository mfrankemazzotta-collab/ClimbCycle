/* ====================================================
   fake-supabase.js -- servidor que habla el protocolo real de Supabase
   ClimbCycle · sólo para tests

   Por qué existe: `sync.js` era la única capa sin probar de punta a punta, y
   ahí apareció el peor bug de la auditoría — el pull no ocurría nunca. Ese
   fallo NO estaba en la lógica pura (que tenía tests en verde), sino en la
   costura entre la lógica y la red. Testear esa costura exige hablar HTTP.

   Este servidor implementa los endpoints que sync.js realmente usa:
     POST /auth/v1/signup                     → alta + sesión
     POST /auth/v1/token?grant_type=password  → login
     POST /auth/v1/token?grant_type=refresh_token → refresh
     GET  /rest/v1/climbcycle_state?user_id=eq.<id>&select=...
     POST /rest/v1/climbcycle_state           → upsert (Prefer: merge-duplicates)

   Emula además lo que importa del comportamiento real:
     · RLS: cada usuario sólo ve su propia fila (se valida el token)
     · 401 cuando el access_token caducó → ejercita el retry con refresh
     · `updated_at` lo escribe el SERVIDOR, no el cliente

   NO pretende ser Supabase. Pretende ser suficiente para que un bug de
   costura no pase desapercibido.
==================================================== */

const http = require('http');

function makeFakeSupabase(opts){
  opts = opts || {};
  const usuarios = {};      /* email → {id, password, ...} */
  const filas    = {};      /* user_id → {user_id, bundle, updated_at} */
  const shares   = {};      /* token → {token, athlete_id, expires_at} */
  const links    = [];      /* [{coach_id, athlete_id, coach_email, status}] */
  const resumenes= {};      /* athlete_id → {athlete_id, summary, updated_at} */
  const tokens   = {};      /* access_token → {user_id, expired} */
  const refresh  = {};      /* refresh_token → user_id */
  const log      = [];      /* toda request, para poder afirmar sobre el tráfico */

  let contador = 0;
  const nuevoId = p => p + (++contador) + '-' + Math.random().toString(36).slice(2, 8);

  function emitirSesion(u){
    const at = nuevoId('at_'), rt = nuevoId('rt_');
    tokens[at] = { user_id: u.id, expired: false };
    refresh[rt] = u.id;
    return { access_token: at, refresh_token: rt, token_type:'bearer', expires_in: 3600,
             user: { id: u.id, email: u.email } };
  }

  function usuarioDe(req){
    const auth = req.headers['authorization'] || '';
    const m = /^Bearer (.+)$/.exec(auth);
    if(!m) return { err: 401 };
    const t = tokens[m[1]];
    if(!t) return { err: 401 };
    if(t.expired) return { err: 401 };
    return { user_id: t.user_id };
  }

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      const u = new URL(req.url, 'http://localhost');
      const ruta = u.pathname;

      /* `demoras` retrasa a propósito una ruta ('POST /rest/v1/x' o '/rest/v1/x').
         Sirve para volver DETERMINISTA una carrera: si el código dispara una
         request y sigue de largo sin esperarla, con la red lenta falla siempre
         en vez de fallar una vez cada veinte corridas. Se demora el
         PROCESAMIENTO, no sólo la respuesta: demorar sólo la respuesta deja la
         fila ya escrita y la carrera no se reproduce. */
      const _demora = opts.demoras && (opts.demoras[req.method + ' ' + ruta] || opts.demoras[ruta]);
      if(_demora) return setTimeout(procesar, _demora);
      return procesar();

      function procesar(){
      let payload = null;
      try { payload = body ? JSON.parse(body) : null; } catch(e){}
      log.push({ method:req.method, path:ruta, query:u.search, body:payload });

      const responder = (code, obj) => {
        res.writeHead(code, { 'Content-Type':'application/json' });
        res.end(JSON.stringify(obj === undefined ? {} : obj));
      };

      /* La anon key tiene que viajar siempre, como en Supabase real. */
      if(!req.headers['apikey']) return responder(401, { message:'No API key found in request' });

      /* ── GoTrue ── */
      if(ruta === '/auth/v1/signup'){
        const { email, password } = payload || {};
        if(usuarios[email]) return responder(400, { msg:'User already registered' });
        const nuevo = { id: nuevoId('user_'), email, password };
        usuarios[email] = nuevo;
        if(opts.requireConfirm) return responder(200, { user:{ id:nuevo.id, email } });  /* sin sesión */
        return responder(200, emitirSesion(nuevo));
      }

      if(ruta === '/auth/v1/token'){
        const grant = u.searchParams.get('grant_type');
        if(grant === 'password'){
          const { email, password } = payload || {};
          const usr = usuarios[email];
          if(!usr || usr.password !== password) return responder(400, { error_description:'Invalid login credentials' });
          return responder(200, emitirSesion(usr));
        }
        if(grant === 'refresh_token'){
          const uid = refresh[(payload || {}).refresh_token];
          if(!uid) return responder(400, { error_description:'Invalid Refresh Token' });
          const usr = Object.values(usuarios).find(x => x.id === uid);
          return responder(200, emitirSesion(usr));
        }
        return responder(400, { error_description:'unsupported grant' });
      }

      /* ── PostgREST ── */
      if(ruta === '/rest/v1/climbcycle_state'){
        const who = usuarioDe(req);
        if(who.err) return responder(401, { message:'JWT expired' });

        if(req.method === 'GET'){
          const filtro = u.searchParams.get('user_id') || '';
          const pedido = filtro.replace(/^eq\./, '');
          /* RLS: sólo la fila propia.
             `legacyCoachRead` reproduce la policy vieja —el coach podía leer
             la fila COMPLETA del atleta— para poder demostrar en un test qué
             quedaba expuesto antes del fix. */
          if(pedido && pedido !== who.user_id){
            const permitido = opts.legacyCoachRead &&
              links.some(l => l.coach_id === who.user_id && l.athlete_id === pedido && l.status === 'accepted');
            if(!permitido) return responder(200, []);
            const ajena = filas[pedido];
            return responder(200, ajena ? [ajena] : []);
          }
          const fila = filas[who.user_id];
          return responder(200, fila ? [fila] : []);
        }

        if(req.method === 'POST'){
          const row = payload || {};
          if(row.user_id && row.user_id !== who.user_id){
            return responder(403, { message:'new row violates row-level security policy' });
          }
          /* El servidor sella updated_at: el cliente no decide la hora.
             `skewMs` simula que el reloj del servidor va adelantado — así el
             test expone que el cliente no puede fiarse del timestamp que él
             mismo mandó (fue justamente el bug que encontró este arnés). */
          const ahora = opts.now ? opts.now() : new Date(Date.now() + (opts.skewMs || 0)).toISOString();
          const fila = {
            user_id: who.user_id,
            bundle: row.bundle,
            updated_at: ahora
          };
          filas[who.user_id] = fila;
          return responder(201, [fila]);
        }
      }

      /* ── Modo entrenador ──
         La RLS se emula de verdad: es lo único que separa "el coach ve un
         resumen" de "el coach se baja el historial entero". */
      if(ruta.indexOf('/rest/v1/coach_') === 0 || ruta === '/rest/v1/rpc/redeem_coach_share'){
        const who = usuarioDe(req);
        if(who.err) return responder(401, { message:'JWT expired' });
        const yo = who.user_id;
        const emailDe = id => (Object.values(usuarios).find(u => u.id === id) || {}).email || null;
        const enlazado = (coach, atleta) =>
          links.some(l => l.coach_id === coach && l.athlete_id === atleta && l.status === 'accepted');

        if(ruta === '/rest/v1/rpc/redeem_coach_share'){
          const tok = (payload || {}).p_token;
          const sh = shares[tok];
          if(!sh) return responder(400, { message:'Código inválido' });
          if(new Date(sh.expires_at) < new Date()) return responder(400, { message:'Código expirado' });
          if(sh.athlete_id === yo) return responder(400, { message:'No podés seguirte a vos mismo' });
          links.push({ coach_id: yo, athlete_id: sh.athlete_id,
                       coach_email: emailDe(yo), athlete_email: sh.athlete_email, status:'accepted' });
          delete shares[tok];                 /* un solo uso */
          return responder(200, {});
        }

        if(ruta === '/rest/v1/coach_shares'){
          if(req.method === 'POST'){
            const row = payload || {};
            if(row.athlete_id !== yo) return responder(403, { message:'RLS' });
            shares[row.token] = row;
            return responder(201, [row]);
          }
          return responder(200, Object.values(shares).filter(x => x.athlete_id === yo));
        }

        if(ruta === '/rest/v1/coach_links'){
          if(req.method === 'GET'){
            const q = u.searchParams;
            const comoCoach   = (q.get('coach_id')   || '').replace(/^eq\./, '');
            const comoAtleta  = (q.get('athlete_id') || '').replace(/^eq\./, '');
            /* Sólo se ven los enlaces propios, de cualquiera de los dos lados. */
            let out = links.filter(l => l.coach_id === yo || l.athlete_id === yo);
            if(comoCoach)  out = out.filter(l => l.coach_id === comoCoach && l.coach_id === yo);
            if(comoAtleta) out = out.filter(l => l.athlete_id === comoAtleta && l.athlete_id === yo);
            return responder(200, out);
          }
          if(req.method === 'DELETE'){
            const cid = (u.searchParams.get('coach_id') || '').replace(/^eq\./, '');
            for(let i = links.length - 1; i >= 0; i--){
              if(links[i].athlete_id === yo && (!cid || links[i].coach_id === cid)) links.splice(i, 1);
            }
            return responder(200, []);
          }
        }

        if(ruta === '/rest/v1/coach_summaries'){
          if(req.method === 'POST'){
            const row = payload || {};
            if(row.athlete_id !== yo) return responder(403, { message:'RLS' });
            resumenes[yo] = { athlete_id: yo, summary: row.summary,
                              updated_at: new Date().toISOString() };
            return responder(201, [resumenes[yo]]);
          }
          if(req.method === 'DELETE'){
            delete resumenes[yo];
            return responder(200, []);
          }
          if(req.method === 'GET'){
            const pedido = (u.searchParams.get('athlete_id') || '').replace(/^eq\./, '');
            const id = pedido || yo;
            /* propio, o de un atleta enlazado; nada más */
            if(id !== yo && !enlazado(yo, id)) return responder(200, []);
            return responder(200, resumenes[id] ? [resumenes[id]] : []);
          }
        }
      }

      responder(404, { message:'not found' });
      }
    });
  });

  return {
    server,
    listen(){
      return new Promise(resolve => {
        server.listen(0, '127.0.0.1', () => resolve('http://127.0.0.1:' + server.address().port));
      });
    },
    close(){
      /* `fetch` de Node usa keep-alive: sin cortar las conexiones vivas,
         server.close() no resuelve nunca y el proceso de test queda colgado. */
      if(typeof server.closeAllConnections === 'function') server.closeAllConnections();
      return new Promise(r => server.close(() => r()));
    },
    /* Ganchos para los tests */
    log,
    filas, shares, links, resumenes,
    /* Reinstala la policy VIEJA (coach lee la fila completa del atleta) para
       poder demostrar en un test qué pasaba antes del fix. */
    permitirLecturaDirectaDelCoach(){ opts.legacyCoachRead = true; },
    expirarTokens(){ Object.keys(tokens).forEach(t => { tokens[t].expired = true; }); },
    /* Simula que OTRO dispositivo subió un bundle (sin pasar por el cliente). */
    sembrarRemoto(user_id, bundle, updated_at){
      filas[user_id] = { user_id, bundle, updated_at: updated_at || new Date().toISOString() };
    },
    idDe(email){ return usuarios[email] ? usuarios[email].id : null; }
  };
}

module.exports = { makeFakeSupabase };
