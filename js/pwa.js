/* ====================================================
   pwa.js -- PWA install (service worker) + local reminders
   ClimbCycle

   - registerPWA(): registers sw.js so the app is installable + works offline.
   - Notifications: opt-in. buildReminder() is PURE (unit-tested) and decides
     WHAT to remind; maybeNotifyToday() shows it (once/day) when the app opens.

   Honest limitation: with no push server, reminders fire when the app is
   OPENED, not truly in the background. Real background delivery needs the
   installed PWA + Periodic Background Sync or a push server (future work).
==================================================== */

/* ── Pure: decide the reminder for today, or null. ── */
function buildReminder(todayPlan, todayLog, lastCheckinTs, now, blocksMeta){
  now = now || Date.now();
  var isTrain = todayPlan && todayPlan.block && todayPlan.block !== 'rest' && todayPlan.block !== 'test';
  if(isTrain && todayLog !== 'done'){
    var bt = (blocksMeta && blocksMeta[todayPlan.block]) || { label: todayPlan.block };
    return { tag:'today', title:'Hoy toca entrenar', body:'Sesión de ' + (bt.label || todayPlan.block) + '. Cuando puedas, dale.' };
  }
  if(todayPlan && todayPlan.block === 'test' && todayLog !== 'done'){
    return { tag:'today', title:'Hoy: día de tests', body:'Hacelos fresco al inicio y registrá los resultados.' };
  }
  var hrs = (lastCheckinTs && lastCheckinTs > 0) ? (now - lastCheckinTs) / 3600000 : 999;
  if(hrs > 20){
    return { tag:'checkin', title:'Check-in de recuperación', body:'30 segundos para calibrar la intensidad de hoy.' };
  }
  return null;
}

/* ── Service worker registration ── */
function registerPWA(){
  try {
    if(typeof navigator !== 'undefined' && 'serviceWorker' in navigator){
      navigator.serviceWorker.register('sw.js').catch(function(e){
        if(typeof console !== 'undefined') console.warn('SW register failed', e);
      });
    }
  } catch(e){}
}

/* ── Notifications ── */
function notifSupported(){
  return typeof Notification !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}
function notifEnabled(){
  try {
    return localStorage.getItem('cc_notif') === 'on'
        && typeof Notification !== 'undefined' && Notification.permission === 'granted';
  } catch(e){ return false; }
}
function requestNotif(){
  if(!notifSupported()){ if(typeof showToast === 'function') showToast('Tu navegador no soporta notificaciones','var(--accent-caution)'); return; }
  Notification.requestPermission().then(function(perm){
    if(perm === 'granted'){
      try { localStorage.setItem('cc_notif', 'on'); } catch(e){}
      if(typeof showToast === 'function') showToast('Recordatorios activados','var(--accent-deload)');
      showLocalNotification('Recordatorios activados', 'Te avisaremos cuando toque entrenar o hacer check-in.', 'welcome');
    } else {
      if(typeof showToast === 'function') showToast('Permiso de notificaciones denegado','var(--accent-caution)');
    }
    if(typeof renderNotifSettings === 'function') renderNotifSettings();
  }).catch(function(){});
}
function disableNotif(){
  try { localStorage.setItem('cc_notif', 'off'); } catch(e){}
  if(typeof showToast === 'function') showToast('Recordatorios desactivados','var(--text-muted)');
  if(typeof renderNotifSettings === 'function') renderNotifSettings();
}
function showLocalNotification(title, body, tag){
  try {
    var opts = { body: body, tag: tag, icon: 'icon.svg', badge: 'icon.svg' };
    if('serviceWorker' in navigator && navigator.serviceWorker.ready){
      navigator.serviceWorker.ready.then(function(reg){ if(reg && reg.showNotification) reg.showNotification(title, opts); });
    } else if(typeof Notification !== 'undefined'){
      new Notification(title, opts);
    }
  } catch(e){}
}
/* Show today's reminder at most once per day, when the app opens. */
function maybeNotifyToday(){
  if(!notifEnabled()) return;
  var today = (typeof TODAY !== 'undefined' ? TODAY : new Date()).toDateString();
  try { if(localStorage.getItem('cc_notif_last') === today) return; } catch(e){}
  var key  = today;
  var plan = (typeof planMap !== 'undefined') ? planMap[key] : null;
  var log  = (typeof sessionLog !== 'undefined') ? sessionLog[key] : null;
  var recTs = (typeof recData !== 'undefined') ? recData.ts : 0;
  var r = buildReminder(plan, log, recTs, Date.now(), typeof BLOCKS !== 'undefined' ? BLOCKS : {});
  if(!r) return;
  try { localStorage.setItem('cc_notif_last', today); } catch(e){}
  showLocalNotification(r.title, r.body, r.tag);
}

/* ── Settings UI (renders into #notif-section-wrap in Perfil) ── */
function renderNotifSettings(){
  var wrap = document.getElementById('notif-section-wrap');
  if(!wrap) return;
  if(!notifSupported()){ wrap.innerHTML = ''; return; }
  var on = notifEnabled();
  var denied = (typeof Notification !== 'undefined' && Notification.permission === 'denied');
  wrap.innerHTML =
    '<div class="sec" style="margin-top:18px">Recordatorios</div>'
    + '<div class="card" style="padding:14px">'
      + '<div style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:12px">Avisos locales cuando toca entrenar o hacer check-in. Se muestran al abrir la app (para avisos en segundo plano, instalá ClimbCycle como app).</div>'
      + (denied
          ? '<div style="font-size:11px;color:var(--accent-caution);line-height:1.5">Bloqueaste las notificaciones para este sitio. Habilitalas desde los permisos del navegador.</div>'
          : (on
              ? '<button onclick="disableNotif()" style="width:100%;padding:11px;background:var(--bg-card);border:1.5px solid var(--border-color);border-radius:10px;color:var(--text-secondary);font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:700;cursor:pointer;touch-action:manipulation">Desactivar recordatorios</button>'
              : '<button onclick="requestNotif()" style="width:100%;padding:11px;background:var(--accent-primary);border:none;border-radius:10px;color:var(--accent-primary-on);font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;cursor:pointer;touch-action:manipulation">Activar recordatorios</button>'))
    + '</div>';
}
