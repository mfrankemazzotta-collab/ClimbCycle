/* ====================================================
   pwa.js -- PWA install (service worker) + local reminders
   ClimbCycle

   - registerPWA(): registers sw.js so the app is installable + works offline.
   - Notifications: opt-in. buildReminder() is PURE (unit-tested) and decides
     WHAT to remind; maybeNotifyToday() shows it (once/day) when the app opens.

   Con cuenta en la nube + el servidor instalado (PUSH_SETUP.md), los avisos
   llegan con la app CERRADA vía push.js. Sin eso, se cae al aviso local que
   aparece al abrir la app.
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

/* ── INSTALAR LA APP ───────────────────────────────────────────────
   POR QUÉ NO SALÍA SOLO. Chrome dejó de mostrar el mini-banner de
   instalación por su cuenta: dispara `beforeinstallprompt` y espera que la
   página lo capture y ofrezca el botón. Como nadie lo escuchaba, el evento
   se disparaba y se perdía — la app era perfectamente instalable y no había
   forma de enterarse.

   iOS es otro caso: Safari NO dispara ese evento y no hay API para pedir la
   instalación. Lo único posible es explicar el gesto manual (Compartir →
   Añadir a inicio). No es un detalle cosmético: en iOS las notificaciones
   web SÓLO funcionan con la PWA instalada, así que sin esa instrucción esa
   puerta queda cerrada para siempre.

   El evento llega temprano, antes de que se pinte Inicio, así que se
   engancha al cargar el script y se guarda para usarlo cuando el usuario
   toque el botón. */
var _ccInstallEvt = null;

if(typeof window !== 'undefined' && window.addEventListener){
  window.addEventListener('beforeinstallprompt', function(e){
    /* Sin esto Chrome puede mostrar su propio banner y perdemos el control
       de CUÁNDO se ofrece (en medio del onboarding, por ejemplo). */
    if(e && typeof e.preventDefault === 'function') e.preventDefault();
    _ccInstallEvt = e;
    if(typeof renderInstallPrompt === 'function'){ try { renderInstallPrompt(); } catch(err){} }
  });
  window.addEventListener('appinstalled', function(){
    _ccInstallEvt = null;
    try { localStorage.setItem('cc_install_off', '1'); } catch(e){}
    if(typeof renderInstallPrompt === 'function'){ try { renderInstallPrompt(); } catch(err){} }
  });
}

function esIOS(){
  if(typeof navigator === 'undefined') return false;
  var ua = navigator.userAgent || '';
  /* iPadOS 13+ se hace pasar por Mac: se lo detecta por el táctil. */
  return /iPad|iPhone|iPod/.test(ua) ||
         (/Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document);
}
function appYaInstalada(){
  try {
    if(typeof navigator !== 'undefined' && navigator.standalone) return true;   /* iOS */
    if(typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) return true;
  } catch(e){}
  return false;
}
function installPromptDismissed(){
  try { return localStorage.getItem('cc_install_off') === '1'; } catch(e){ return false; }
}
function installPromptDismiss(){
  try { localStorage.setItem('cc_install_off', '1'); } catch(e){}
  renderInstallPrompt();
}

/* PURA: qué ofrecer, si es que hay algo que ofrecer.
   'chrome' → hay evento y se puede instalar con un toque
   'ios'    → hay que explicar el gesto manual
   null     → ya instalada, descartado, o no aplica */
function installPromptMode(hayEvento, iOS, instalada, descartado){
  if(instalada || descartado) return null;
  if(hayEvento) return 'chrome';
  if(iOS) return 'ios';
  return null;
}

function renderInstallPrompt(){
  var wrap = (typeof document !== 'undefined') ? document.getElementById('install-prompt-wrap') : null;
  if(!wrap) return;
  var modo = installPromptMode(!!_ccInstallEvt, esIOS(), appYaInstalada(), installPromptDismissed());
  if(!modo){ wrap.innerHTML = ''; return; }

  var cuerpo = (modo === 'chrome')
    ? 'Instalala en tu celu: se abre como una app, anda sin internet y entrás de una.'
    : 'Para instalarla: tocá <strong>Compartir</strong> abajo y después <strong>Añadir a pantalla de inicio</strong>. Así se abre como app y puede mandarte recordatorios.';

  var boton = (modo === 'chrome')
    ? '<button onclick="installAppGo()" style="flex:1;min-height:44px;padding:11px;'
      + 'background:var(--accent-primary);border:none;border-radius:10px;color:var(--accent-primary-on);'
      + 'font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;cursor:pointer;'
      + 'touch-action:manipulation">Instalar app</button>'
    : '';

  wrap.innerHTML =
    '<div style="background:var(--bg-card);border:1px solid var(--border-color);'
    + 'border-left:3px solid var(--accent-primary);border-radius:12px;padding:14px;margin-bottom:14px">'
      + '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:18px;font-weight:800;'
      + 'color:var(--text-primary)">Tené ClimbCycle a mano</div>'
      + '<div style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin:6px 0 12px">'
      + cuerpo + '</div>'
      + '<div style="display:flex;gap:8px">'
        + boton
        + '<button onclick="installPromptDismiss()" style="' + (boton ? 'padding:11px 14px;' : 'flex:1;padding:11px;')
        + 'min-height:44px;background:none;border:1px solid var(--border-color);border-radius:10px;'
        + 'color:var(--text-muted);font-size:12px;cursor:pointer;touch-action:manipulation">'
        + (boton ? 'Ahora no' : 'Entendido') + '</button>'
      + '</div>'
    + '</div>';
}

function installAppGo(){
  if(!_ccInstallEvt) return;
  var e = _ccInstallEvt;
  _ccInstallEvt = null;          /* el evento es de un solo uso */
  try {
    e.prompt();
    if(e.userChoice && e.userChoice.then){
      e.userChoice.then(function(){ renderInstallPrompt(); });
    } else renderInstallPrompt();
  } catch(err){ renderInstallPrompt(); }
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
    if(perm !== 'granted'){
      if(typeof showToast === 'function') showToast('Permiso de notificaciones denegado','var(--accent-caution)');
      if(typeof renderNotifSettings === 'function') renderNotifSettings();
      return;
    }
    try { localStorage.setItem('cc_notif', 'on'); } catch(e){}
    /* Si se puede, push de verdad; si no, quedan los avisos al abrir. */
    var conPush = (typeof pushEnable === 'function') ? pushEnable() : Promise.resolve({ ok:false, err:'unsupported' });
    return conPush.then(function(res){
      var msg = res.ok ? 'Avisos activados: llegan aunque la app esté cerrada'
              : res.err === 'login' ? 'Avisos activados al abrir la app. Iniciá sesión en la nube para recibirlos con la app cerrada'
              : 'Avisos activados al abrir la app';
      if(typeof showToast === 'function') showToast(msg, 'var(--accent-deload)');
      showLocalNotification('Recordatorios activados', 'Te avisamos cuando toque entrenar.', 'welcome');
      if(typeof renderNotifSettings === 'function') renderNotifSettings();
    });
  }).catch(function(){});
}
function disableNotif(){
  try { localStorage.setItem('cc_notif', 'off'); } catch(e){}
  if(typeof pushDisable === 'function') pushDisable();
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
  /* con push activo el aviso ya llegó (o llega) por el servidor: no duplicar */
  if(typeof pushActive === 'function' && pushActive()) return;
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
  /* Acá el requisito no es configurable: el navegador no las soporta y no
     hay nada que el usuario pueda hacer. Aun así se dice, para que no
     parezca que la sección se rompió. */
  if(!notifSupported()){
    renderSeccionBloqueada(wrap, 'Recordatorios',
      'Tu navegador no soporta notificaciones',
      esIOS()
        ? 'En iPhone sólo funcionan con la app instalada: tocá Compartir → "Añadir a pantalla de inicio" y abrila desde ese ícono (iOS 16.4 o más nuevo).'
        : 'Instalando ClimbCycle como app (menú del navegador → "Instalar" o "Agregar a inicio") suelen habilitarse.');
    return;
  }
  var on = notifEnabled();
  var denied = (typeof Notification !== 'undefined' && Notification.permission === 'denied');
  var push = on && typeof pushActive === 'function' && pushActive();
  var logueado = typeof syncIsLoggedIn === 'function' && syncIsLoggedIn();
  /* UNA línea de estado que dice qué pasa de verdad, no qué podría pasar */
  var estado = !on ? 'Te avisamos el día que toca entrenar y el de tus Abrahangs.'
    : push ? '&#x2713; Activados en este dispositivo. Llegan aunque la app esté cerrada.'
    : logueado ? 'Activados, pero sólo al abrir la app.'
    : 'Activados sólo al abrir la app. Para recibirlos con la app cerrada, iniciá sesión en la nube (arriba).';
  var hora = (typeof pushHour === 'function') ? pushHour() : 8;
  var opciones = '';
  for(var hh = 6; hh <= 22; hh++) opciones += '<option value="'+hh+'"'+(hh===hora?' selected':'')+'>'+(hh<10?'0':'')+hh+':00</option>';
  var selectorHora = push
    ? '<label style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;font-size:12px;color:var(--text-primary)">Hora del aviso'
      + '<select onchange="pushSetHour(this.value)" style="min-height:40px;padding:6px 10px;background:var(--bg-card-alt);border:1px solid var(--border-color);border-radius:8px;color:var(--text-primary);font-family:\'JetBrains Mono\',monospace;font-size:13px">'+opciones+'</select></label>'
    : '';
  wrap.innerHTML =
    '<div class="sec" style="margin-top:18px">Recordatorios</div>'
    + '<div class="card" style="padding:14px">'
      + '<div style="font-size:12px;color:'+(push?'var(--accent-deload)':'var(--text-secondary)')+';line-height:1.5;margin-bottom:12px">'+estado+'</div>'
      + selectorHora
      + (on && !push && logueado && typeof pushSupported === 'function' && pushSupported()
          ? '<button onclick="pushUpgrade()" style="width:100%;margin-bottom:8px;padding:11px;background:var(--accent-primary);border:none;border-radius:10px;color:var(--accent-primary-on);font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;cursor:pointer;touch-action:manipulation">Recibirlos con la app cerrada</button>'
          : '')
      + (denied
          ? '<div style="font-size:11px;color:var(--accent-caution);line-height:1.5">Bloqueaste las notificaciones para este sitio. Habilitalas desde los permisos del navegador.</div>'
          : (on
              ? '<button onclick="disableNotif()" style="width:100%;padding:11px;background:var(--bg-card);border:1.5px solid var(--border-color);border-radius:10px;color:var(--text-secondary);font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:700;cursor:pointer;touch-action:manipulation">Desactivar recordatorios</button>'
              : '<button onclick="requestNotif()" style="width:100%;padding:11px;background:var(--accent-primary);border:none;border-radius:10px;color:var(--accent-primary-on);font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;cursor:pointer;touch-action:manipulation">Activar recordatorios</button>'))
    + '</div>';
}

/* Quien ya tenía avisos locales y después inició sesión: pasa a push sin
   tener que desactivar y volver a activar. */
function pushUpgrade(){
  if(typeof pushEnable !== 'function') return;
  pushEnable().then(function(res){
    if(typeof showToast === 'function'){
      showToast(res.ok ? 'Listo: los avisos llegan aunque la app esté cerrada'
        : res.err === 'server' ? 'El servidor de avisos todavía no está instalado (ver PUSH_SETUP.md)'
        : 'No se pudo activar. Probá de nuevo en un rato', res.ok ? 'var(--accent-deload)' : 'var(--accent-caution)');
    }
    renderNotifSettings();
  });
}
