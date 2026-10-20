/* ====================================================
   push.js -- recordatorios push con la app CERRADA
   ClimbCycle

   Hasta ahora los recordatorios eran locales: aparecían recién al ABRIR la
   app, que es justo cuando ya no hacen falta. Esto los vuelve reales:

   1. El teléfono se suscribe al servicio de push del navegador (FCM en
      Android, Apple en iPhone) con la clave pública del servidor.
   2. La app arma los avisos de los próximos 14 días (buildPushSchedule,
      PURA) y los sube a `push_reminders`. Se rehace cuando cambia el plan o
      marcás una sesión, así un día ya entrenado no te avisa.
   3. Cada 10 minutos la Edge Function `send-reminders` manda los que
      vencieron (supabase/functions/send-reminders, sql/push.sql).

   Requisitos: cuenta en la nube (los avisos se guardan por usuario) y, en
   iPhone, la app instalada en la pantalla de inicio (iOS 16.4+). Sin eso
   se cae al modo anterior: aviso al abrir la app.

   Preferencias de ESTE dispositivo (no viajan en el sync): cc_push
   ('on'|'off') y cc_notif_hour (hora del aviso, 0-23).
==================================================== */

var PUSH_DAYS_AHEAD = 14;
var PUSH_DEFAULT_HOUR = 8;

/* ── PURA: qué avisos mandar y cuándo ─────────────────
   days: [{ dateStr, block, label, done, outdoor, abrahangs, hombros }]
   opts: { hour, now }
   Devuelve [{ send_at (ISO), tag, title, body }] — sólo los futuros. */
function buildPushSchedule(days, opts){
  opts = opts || {};
  var hour = (opts.hour >= 0 && opts.hour <= 23) ? opts.hour : PUSH_DEFAULT_HOUR;
  var now = opts.now || Date.now();
  var out = [];
  (days || []).forEach(function(d){
    if(!d || !d.dateStr || d.done) return;
    var at = new Date(d.dateStr); at.setHours(hour, 0, 0, 0);
    if(isNaN(at.getTime()) || at.getTime() <= now) return;
    var block = d.block || 'rest';
    var title = '', body = '';
    if(block === 'test'){
      title = 'Hoy: día de tests';
      body = 'Hacelos frescos, al principio de la sesión, y anotá los resultados.';
    } else if(block !== 'rest' && !d.outdoor){
      title = 'Hoy toca entrenar';
      body = 'Sesión de ' + (d.label || block) + '.'
        + (d.hombros ? ' Incluye hombros y core.' : '')
        + (d.abrahangs ? ' Y tus 10 min de Abrahangs.' : '');
    } else if(d.abrahangs){
      title = 'Tus Abrahangs de hoy';
      body = '10 minutos de cuelgues suaves. Fácil, sin llegar a cansarte.';
    } else {
      return;   /* descanso o roca: no hay nada que recordar */
    }
    out.push({ send_at: at.toISOString(), tag: 'cc-' + at.toISOString().slice(0, 10), title: title, body: body });
  });
  return out;
}

/* Arma los `days` desde el estado de la app. */
function pushDaysFromPlan(from, n){
  var out = [];
  var d0 = new Date(from || (typeof TODAY !== 'undefined' ? TODAY : new Date()));
  d0.setHours(0, 0, 0, 0);
  for(var i = 0; i < (n || PUSH_DAYS_AHEAD); i++){
    var d = new Date(d0); d.setDate(d.getDate() + i);
    var k = d.toDateString();
    var plan = (typeof planMap !== 'undefined') ? planMap[k] : null;
    var cmp = (typeof getComplementsForDay === 'function') ? getComplementsForDay(k) : null;
    var bt = (plan && typeof BLOCKS !== 'undefined' && BLOCKS[plan.block]) ? BLOCKS[plan.block] : null;
    out.push({
      dateStr: k,
      block: plan ? plan.block : 'rest',
      label: bt ? bt.label : '',
      done: (typeof sessionLog !== 'undefined') && sessionLog[k] === 'done',
      outdoor: !!(plan && plan.outdoor),
      abrahangs: !!(cmp && cmp.daily) && !((typeof isDailyDone === 'function') && isDailyDone(k, 'cmp1')),
      hombros: !!(cmp && cmp.core && cmp.core.length)
    });
  }
  return out;
}

/* ── Preferencias del dispositivo ── */
function pushHour(){
  try {
    var h = parseInt(localStorage.getItem('cc_notif_hour'), 10);
    return (h >= 0 && h <= 23) ? h : PUSH_DEFAULT_HOUR;
  } catch(e){ return PUSH_DEFAULT_HOUR; }
}
function pushSetHour(h){
  h = parseInt(h, 10);
  if(!(h >= 0 && h <= 23)) return;
  try { localStorage.setItem('cc_notif_hour', String(h)); } catch(e){}
  pushUploadSchedule(true);
}
function pushSupported(){
  return typeof window !== 'undefined' && 'PushManager' in window
    && typeof navigator !== 'undefined' && 'serviceWorker' in navigator
    && typeof Notification !== 'undefined';
}
/* Push de verdad funcionando en este dispositivo. */
function pushActive(){
  try {
    return localStorage.getItem('cc_push') === 'on'
      && typeof syncIsLoggedIn === 'function' && syncIsLoggedIn()
      && typeof Notification !== 'undefined' && Notification.permission === 'granted';
  } catch(e){ return false; }
}

/* ── Red ── */
function pushFnUrl(){
  return (typeof syncConfig === 'function' ? syncConfig().url : '') + '/functions/v1/send-reminders';
}
function _pushB64uToBytes(s){
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while(s.length % 4) s += '=';
  var bin = atob(s), out = new Uint8Array(bin.length);
  for(var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
/* PostgREST con el token del usuario; un reintento tras refrescar en 401. */
function _pushRest(method, pathQuery, body, prefer){
  var c = syncConfig();
  var go = function(){
    var h = _syncHeaders(true);
    if(prefer) h['Prefer'] = prefer;
    return fetch(c.url + '/rest/v1/' + pathQuery, { method:method, headers:h, body: body ? JSON.stringify(body) : undefined });
  };
  return go().then(function(r){
    if(r.status === 401 && typeof _syncRefresh === 'function'){
      return _syncRefresh().then(function(rf){ return rf.ok ? go() : r; });
    }
    return r;
  }).then(function(r){
    if(!r.ok) return r.text().then(function(t){ throw new Error('HTTP ' + r.status + ' ' + t.slice(0, 120)); });
    return true;
  });
}
function _pushFetchKey(){
  var c = syncConfig();
  return fetch(pushFnUrl() + '?action=key', { headers:{ apikey:c.key, Authorization:'Bearer ' + c.key } })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(j){ if(!j || !j.publicKey) throw new Error('sin clave'); return j.publicKey; });
}

/* Suscribe ESTE dispositivo. Resuelve { ok, err } — err:'login' si falta
   la cuenta de nube, 'server' si la función no está instalada. */
function pushEnable(){
  if(!pushSupported()) return Promise.resolve({ ok:false, err:'unsupported' });
  if(typeof syncIsLoggedIn !== 'function' || !syncIsLoggedIn()) return Promise.resolve({ ok:false, err:'login' });
  var s = _syncGetSession();
  return _pushFetchKey().catch(function(){ throw { code:'server' }; }).then(function(key){
    return navigator.serviceWorker.ready.then(function(reg){
      return reg.pushManager.getSubscription().then(function(sub){
        return sub || reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:_pushB64uToBytes(key) });
      });
    });
  }).then(function(sub){
    var j = sub.toJSON();
    return _pushRest('POST', 'push_subscriptions?on_conflict=user_id,endpoint', {
      user_id: s.user_id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth,
      updated_at: new Date().toISOString()
    }, 'resolution=merge-duplicates');
  }).then(function(){
    try { localStorage.setItem('cc_push', 'on'); } catch(e){}
    return pushUploadSchedule(true).then(function(){ return { ok:true }; });
  }).catch(function(e){
    if(typeof logError === 'function' && !(e && e.code)) logError(e, 'pushEnable');
    return { ok:false, err:(e && e.code) || 'error' };
  });
}

/* Da de baja ESTE dispositivo. Los avisos programados quedan (otro
   dispositivo tuyo puede seguir usándolos); sin suscripción no llegan. */
function pushDisable(){
  try { localStorage.setItem('cc_push', 'off'); } catch(e){}
  if(!pushSupported()) return Promise.resolve();
  return navigator.serviceWorker.ready.then(function(reg){ return reg.pushManager.getSubscription(); })
    .then(function(sub){
      if(!sub) return null;
      var ep = sub.endpoint;
      var borrar = (typeof syncIsLoggedIn === 'function' && syncIsLoggedIn())
        ? _pushRest('DELETE', 'push_subscriptions?endpoint=eq.' + encodeURIComponent(ep)).catch(function(){})
        : Promise.resolve();
      return borrar.then(function(){ return sub.unsubscribe(); });
    }).catch(function(e){ if(typeof logError === 'function') logError(e, 'pushDisable'); });
}

/* Reemplaza los avisos pendientes por los de ahora. Si no cambió nada
   desde la última subida (y fue hace menos de 12 h) no toca la red. */
var _pushUploadTimer = null;
function pushUploadSchedule(force){
  if(!pushActive()) return Promise.resolve(false);
  var s = _syncGetSession();
  var sched = buildPushSchedule(pushDaysFromPlan(), { hour:pushHour(), now:Date.now() });
  var firma = JSON.stringify(sched);
  try {
    var last = JSON.parse(localStorage.getItem('cc_push_last') || 'null');
    if(!force && last && last.firma === firma && Date.now() - last.ts < 12 * 3600000) return Promise.resolve(false);
  } catch(e){}
  var filas = sched.map(function(r){ return Object.assign({ user_id:s.user_id }, r); });
  return _pushRest('DELETE', 'push_reminders?user_id=eq.' + s.user_id + '&sent_at=is.null')
    .then(function(){ return filas.length ? _pushRest('POST', 'push_reminders', filas) : true; })
    .then(function(){
      try { localStorage.setItem('cc_push_last', JSON.stringify({ firma:firma, ts:Date.now() })); } catch(e){}
      return true;
    })
    .catch(function(e){ if(typeof logError === 'function') logError(e, 'pushUploadSchedule'); return false; });
}
function pushScheduleSoon(){
  if(!pushActive()) return;
  if(_pushUploadTimer) clearTimeout(_pushUploadTimer);
  _pushUploadTimer = setTimeout(function(){ _pushUploadTimer = null; pushUploadSchedule(false); }, 4000);
}

/* Al abrir la app: re-sincroniza la agenda y escucha los cambios de plan. */
var _pushWired = false;
function pushInit(){
  if(!_pushWired && typeof Bus !== 'undefined'){
    _pushWired = true;
    Bus.on('cc:planChanged', pushScheduleSoon);
    Bus.on('cc:sessionChanged', pushScheduleSoon);
  }
  pushScheduleSoon();
}
