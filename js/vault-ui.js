/* ====================================================
   vault-ui.js -- interfaz del cifrado en reposo
   ClimbCycle

   Dos piezas, y la primera es la que evita el desastre:

   1. ccVaultGate() — se llama en el arranque ANTES de leer datos. Si hay
      vault, toma la pantalla y pide la contraseña. Sin esto, `loadU()`
      leería null y la app mostraría el onboarding: el usuario vería su
      historial "borrado" cuando en realidad está cifrado y entero.

   2. La sección de Perfil para activar/desactivar y cambiar la contraseña
      del vault.

   Todo inerte mientras CC_VAULT_ENABLED sea false.
==================================================== */

/* ── 1. Puerta de arranque ───────────────────────────
   Devuelve true si la app puede seguir (no hay vault), false si tomó la
   pantalla. `onReady` se llama cuando los datos ya son legibles. */
function ccVaultGate(onReady){
  if(typeof ccVaultBootState !== 'function') return true;
  var user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  var estado = ccVaultBootState(user);

  if(estado === 'off') return true;

  if(estado === 'rescue'){
    /* Quedó una migración a medias: hay copia en claro pero no vault. */
    _ccVaultRenderPantalla(user, { modo:'rescue', onReady:onReady });
    return false;
  }
  _ccVaultRenderPantalla(user, { modo:'unlock', onReady:onReady });
  return false;
}

function _ccVaultRenderPantalla(user, opts){
  var vob = document.getElementById('vob');
  var vapp = document.getElementById('vapp');
  if(vob) vob.style.display = 'none';
  if(vapp) vapp.style.display = 'none';

  var host = document.getElementById('vault-gate');
  if(!host){
    host = document.createElement('div');
    host.id = 'vault-gate';
    document.body.appendChild(host);
  }
  host.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;'
    + 'justify-content:center;padding:20px;background:var(--bg-app,#0F1115)';

  var esRescate = opts.modo === 'rescue';
  host.innerHTML =
    '<div style="width:100%;max-width:360px">'
    + '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:26px;font-weight:800;color:var(--text-primary);line-height:1.1">'
    + (esRescate ? 'Recuperar tus datos' : 'Tus datos están cifrados') + '</div>'
    + '<div style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin:8px 0 18px">'
    + (esRescate
        ? 'Quedó una activación de cifrado a medio terminar. Podés restaurar todo a como estaba.'
        : 'Ingresá tu contraseña para desbloquearlos. Nada se lee hasta entonces.')
    + '</div>'
    + (esRescate ? '' :
        '<input id="vault-pass" type="password" autocomplete="current-password" placeholder="Contraseña" '
        + 'style="width:100%;padding:13px;border-radius:10px;border:1.5px solid var(--border-color);'
        + 'background:var(--bg-card);color:var(--text-primary);font-size:15px;outline:none">'
      + '<div id="vault-msg" style="font-size:11px;color:var(--accent-warning);min-height:16px;margin:6px 0"></div>'
      + '<button onclick="ccVaultUiUnlock()" style="width:100%;min-height:48px;padding:14px;margin-top:2px;'
        + 'background:var(--accent-primary);border:none;border-radius:12px;color:var(--accent-primary-on);'
        + 'font-family:\'Barlow Condensed\',sans-serif;font-size:17px;font-weight:800;cursor:pointer">Desbloquear</button>'
      + '<button onclick="ccVaultUiToggleRecovery()" id="vault-rec-btn" style="width:100%;min-height:44px;padding:11px;margin-top:8px;'
        + 'background:none;border:1px solid var(--border-color);border-radius:10px;color:var(--text-secondary);'
        + 'font-size:12px;cursor:pointer">Olvidé mi contraseña</button>')
    + (esRescate
        ? '<button onclick="ccVaultUiRescue()" style="width:100%;min-height:48px;padding:14px;'
          + 'background:var(--accent-primary);border:none;border-radius:12px;color:var(--accent-primary-on);'
          + 'font-family:\'Barlow Condensed\',sans-serif;font-size:17px;font-weight:800;cursor:pointer">Restaurar mis datos</button>'
        : '')
    + '</div>';

  _ccVaultGateUser = user;
  _ccVaultGateReady = opts.onReady;
  _ccVaultUsandoRecovery = false;
  var inp = document.getElementById('vault-pass');
  if(inp && typeof inp.focus === 'function') inp.focus();
}

var _ccVaultGateUser = null, _ccVaultGateReady = null, _ccVaultUsandoRecovery = false;

/* Alterna entre contraseña y clave de recuperación. */
function ccVaultUiToggleRecovery(){
  _ccVaultUsandoRecovery = !_ccVaultUsandoRecovery;
  var inp = document.getElementById('vault-pass');
  var btn = document.getElementById('vault-rec-btn');
  if(inp){
    inp.type = _ccVaultUsandoRecovery ? 'text' : 'password';
    inp.placeholder = _ccVaultUsandoRecovery ? 'ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2' : 'Contraseña';
    inp.value = '';
    if(typeof inp.focus === 'function') inp.focus();
  }
  if(btn) btn.textContent = _ccVaultUsandoRecovery ? 'Usar mi contraseña' : 'Olvidé mi contraseña';
}

function ccVaultUiUnlock(){
  var inp = document.getElementById('vault-pass');
  var msg = document.getElementById('vault-msg');
  var secreto = inp ? inp.value : '';
  if(!secreto){ if(msg) msg.textContent = 'Escribí tu ' + (_ccVaultUsandoRecovery ? 'clave de recuperación' : 'contraseña'); return; }
  if(msg) msg.textContent = 'Descifrando…';

  ccVaultUnlock(_ccVaultGateUser, secreto, _ccVaultUsandoRecovery).then(function(){
    /* Pudo entrar: la copia en claro de la migración ya no hace falta. */
    if(typeof ccVaultConfirm === 'function') ccVaultConfirm(_ccVaultGateUser);
    var host = document.getElementById('vault-gate');
    if(host && host.parentNode) host.parentNode.removeChild(host);
    if(typeof _ccVaultGateReady === 'function') _ccVaultGateReady();
  }).catch(function(){
    if(msg) msg.textContent = _ccVaultUsandoRecovery
      ? 'Esa clave de recuperación no es válida.'
      : 'Contraseña incorrecta.';
    if(inp) inp.value = '';
  });
}

function ccVaultUiRescue(){
  var r = ccVaultRescue(_ccVaultGateUser);
  if(!r.ok){ if(typeof showToast === 'function') showToast(r.err || 'No se pudo recuperar', 'var(--accent-warning)'); return; }
  var host = document.getElementById('vault-gate');
  if(host && host.parentNode) host.parentNode.removeChild(host);
  if(typeof showToast === 'function') showToast('Datos restaurados sin cifrar.', 'var(--accent-deload)');
  if(typeof _ccVaultGateReady === 'function') _ccVaultGateReady();
}

/* Diagnóstico para la consola: por qué el vault no aparece.
   Existe porque la sección se ocultaba en silencio y no había forma de
   distinguir "falta el flag" de "falta la cuenta" de "el build está viejo". */
function ccVaultDiag(){
  var user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  /* Qué pantalla está abierta: `.pg.on` es la página activa; su id es 'p'+nombre. */
  var activa = null;
  try {
    var on = document.querySelector('.pg.on');
    activa = on ? String(on.id || '').replace(/^p/, '') : null;
  } catch(e){ activa = null; }

  var d = {
    flagEnConfig: (typeof window !== 'undefined') ? window.CC_VAULT_ENABLED : undefined,
    ccVaultEnabled: ccVaultEnabled(),
    usuario: user,
    pantallaActual: activa,
    contenedorEnElDOM: !!document.getElementById('vault-section-wrap'),
    vaultYaCreado: user ? ccVaultExists(user) : false,
    bootState: user ? ccVaultBootState(user) : 'off'
  };

  /* Si el contenedor falta, la causa casi siempre es "no estás en Perfil".
     La primera versión decía "estás fuera de Perfil (o el HTML es viejo)" y
     dejaba al usuario adivinando cuál de las dos. Ahora se distingue mirando
     la pantalla activa, y —más útil— el diagnóstico se resuelve solo:
     navega a Perfil y vuelve a mirar. */
  if(d.ccVaultEnabled && d.usuario && !d.contenedorEnElDOM){
    if(activa !== 'profile' && typeof goPage === 'function'){
      goPage('profile');
      d.contenedorEnElDOM = !!document.getElementById('vault-section-wrap');
      d.pantallaActual = 'profile';
      d.navegadoAutomaticamente = true;
    }
  }

  d.porQueNoAparece = !d.ccVaultEnabled
      ? 'El flag no está tomando efecto. Poné el flag del vault en true dentro de js/sync-config.js y recargá con Ctrl+Shift+R.'
    : !d.usuario
      ? 'No hay sesión iniciada. El cifrado deriva la clave de tu contraseña: creá una cuenta o iniciá sesión.'
    : !d.contenedorEnElDOM
      ? 'Estoy en Perfil y el contenedor no existe: el index.html que estás viendo es de una versión anterior. Recargá con Ctrl+Shift+R.'
    : d.navegadoAutomaticamente
      ? 'Estabas en otra pantalla. Te llevé a Perfil: bajá hasta "Privacidad · Cifrado".'
      : 'Todo en orden: la sección tiene que estar visible en Perfil.';
  return d;
}

/* ── 2. Sección de Perfil ─────────────────────────── */
function renderVaultUI(){
  var wrap = document.getElementById('vault-section-wrap');
  if(!wrap) return;
  if(!ccVaultEnabled()){ wrap.innerHTML = ''; return; }

  /* SIN CUENTA NO HAY VAULT — pero hay que DECIRLO.

     El cifrado deriva la clave de la contraseña de la cuenta (PBKDF2), así
     que en modo local, sin login, no hay de dónde derivarla. Hasta acá,
     correcto. El problema era que la sección simplemente no se dibujaba: la
     guía de QA mandaba a Perfil → "Privacidad · Cifrado", no había nada, y
     no quedaba forma de saber si faltaba el flag, si el build estaba viejo
     o si el requisito era otro. Lo reportó el QA real.

     Mismo patrón que el resto de la sesión: la app tomaba una decisión
     correcta y no la comunicaba, así que por fuera era indistinguible de
     estar rota. */
  var user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  if(!user){
    wrap.innerHTML = '<div class="sec" style="margin-top:18px">Privacidad · Cifrado</div>'
      + '<div style="background:var(--bg-card);border:1px solid var(--border-color);'
      + 'border-radius:10px;padding:12px">'
      + '<div style="font-size:12px;color:var(--text-primary);font-weight:600">Necesitás una cuenta</div>'
      + '<div style="font-size:11px;color:var(--text-secondary);line-height:1.6;margin-top:4px">'
      + 'El cifrado usa tu contraseña para derivar la clave, así que hace falta iniciar sesión. '
      + 'Estás usando ClimbCycle en modo local: tus datos viven sólo en este dispositivo, pero '
      + 'sin cifrar.</div></div>';
    return;
  }

  var activo = ccVaultExists(user);
  var h = '<div class="sec" style="margin-top:18px">Privacidad · Cifrado</div>';

  if(activo){
    h += '<div style="background:var(--bg-card);border:1px solid var(--border-color);'
      + 'border-left:3px solid var(--accent-deload);border-radius:10px;padding:12px">'
      + '<div style="font-size:12px;color:var(--text-primary);font-weight:600">Tus datos están cifrados</div>'
      + '<div style="font-size:11px;color:var(--text-secondary);line-height:1.6;margin-top:4px">'
      + 'Se descifran sólo cuando ingresás tu contraseña. Si perdés la contraseña Y la clave de '
      + 'recuperación, no hay forma de recuperarlos.</div>'
      + '<button onclick="ccVaultUiDisable()" style="width:100%;min-height:44px;margin-top:10px;padding:11px;'
      + 'background:none;border:1.5px solid var(--border-color);border-radius:10px;'
      + 'color:var(--text-secondary);font-size:12px;cursor:pointer">Desactivar el cifrado</button>'
      + '</div>';
  } else {
    h += '<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:12px">'
      + '<div style="font-size:11px;color:var(--text-secondary);line-height:1.6">'
      + 'Hoy tus datos se guardan sin cifrar en este dispositivo: cualquiera que lo use puede leerlos. '
      + 'Al activarlo se te va a dar una <b>clave de recuperación</b> — guardala, es la única forma de '
      + 'entrar si olvidás la contraseña.</div>'
      + '<button onclick="ccVaultUiEnable()" style="width:100%;min-height:44px;margin-top:10px;padding:11px;'
      + 'background:var(--accent-primary);border:none;border-radius:10px;color:var(--accent-primary-on);'
      + 'font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:700;cursor:pointer">Cifrar mis datos</button>'
      + '</div>';
  }
  wrap.innerHTML = h;
}

/* Activar: pide la contraseña actual, cifra, y MUESTRA la clave de
   recuperación hasta que el usuario confirme que la guardó. */
function ccVaultUiEnable(){
  function avisar(msg){
    if(typeof showToast === 'function') showToast(msg, 'var(--accent-warning)');
    else alert(msg);
    if(typeof console !== 'undefined') console.warn('[vault] ' + msg);
  }

  var user = getCurrentUser();
  if(!user){ avisar('Necesitás iniciar sesión para cifrar tus datos.'); return; }

  var pass = prompt('Ingresá tu contraseña de ClimbCycle (será la que desbloquee tus datos):');
  /* `prompt` devuelve null si el usuario cancela… y TAMBIÉN si el navegador
     lo bloquea (Chrome lo hace en varios contextos). Antes se salía sin
     decir nada, así que las dos cosas se veían igual: no pasaba nada y no
     había forma de saber por qué. */
  if(pass === null){ avisar('Cancelado. Si no viste ningún cuadro de diálogo, tu navegador está bloqueando los prompts.'); return; }
  if(!pass){ avisar('La contraseña no puede estar vacía.'); return; }

  /* VERIFICAR LA CONTRASEÑA ANTES DE CIFRAR. Esto no estaba, y es el bug con
     peor consecuencia posible del flujo: `ccVaultCreate` acepta CUALQUIER
     texto y cifra con él. Si te equivocabas al tipear, el vault quedaba
     sellado con una contraseña que no era la que creías. Al recargar,
     ingresabas la de tu cuenta, no abría, y desde afuera era idéntico a
     "el cifrado corrompió mis datos".

     Con la copia de rescate se recuperaba, sí — pero el susto y la
     desconfianza no se recuperan, y es exactamente el escenario que esta
     feature no se puede permitir. */
  var seguir = function(){
    ccVaultCreate(user, pass).then(function(res){
      _ccVaultMostrarRecovery(res.recovery);
    }).catch(function(e){
      avisar(e && e.message ? e.message : 'No se pudo cifrar');
    });
  };

  if(typeof loginUser === 'function'){
    loginUser(user, pass).then(function(r){
      if(!r || !r.ok){
        avisar('Esa no es tu contraseña de ClimbCycle. Probá de nuevo — si ciframos con la contraseña equivocada, después no vas a poder abrir tus datos.');
        return;
      }
      seguir();
    }).catch(function(e){
      avisar(e && e.message ? e.message : 'No se pudo verificar la contraseña');
    });
  } else {
    seguir();
  }
}

/* La clave de recuperación se muestra UNA vez. No se puede volver a ver:
   está cifrada, no guardada. Por eso se insiste antes de cerrar. */
function _ccVaultMostrarRecovery(recovery){
  var host = document.createElement('div');
  host.id = 'vault-recovery';
  host.style.cssText = 'position:fixed;inset:0;z-index:9100;display:flex;align-items:center;'
    + 'justify-content:center;padding:20px;background:rgba(0,0,0,.75)';
  host.innerHTML = '<div style="width:100%;max-width:360px;background:var(--bg-card);'
    + 'border:1px solid var(--border-color);border-radius:14px;padding:18px">'
    + '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:22px;font-weight:800;color:var(--text-primary)">'
    + 'Guardá esta clave</div>'
    + '<div style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin:8px 0 12px">'
    + 'Es la <b>única</b> forma de entrar si olvidás tu contraseña. No se puede volver a mostrar. '
    + 'Anotala en papel o guardala en tu gestor de contraseñas.</div>'
    + '<div style="font-family:\'JetBrains Mono\',monospace;font-size:15px;font-weight:700;'
    + 'color:var(--accent-primary-d);background:var(--bg-card-alt);border:1px dashed var(--border-color);'
    + 'border-radius:10px;padding:14px;text-align:center;letter-spacing:1px;word-break:break-all">'
    + escapeHtml(recovery) + '</div>'
    + '<label style="display:flex;align-items:center;gap:8px;margin:14px 0;font-size:12px;color:var(--text-secondary);cursor:pointer">'
    + '<input type="checkbox" id="vault-rec-ok" style="width:18px;height:18px"> Ya la guardé en un lugar seguro</label>'
    + '<button onclick="ccVaultUiRecoveryDone()" style="width:100%;min-height:48px;padding:14px;'
    + 'background:var(--accent-primary);border:none;border-radius:12px;color:var(--accent-primary-on);'
    + 'font-family:\'Barlow Condensed\',sans-serif;font-size:16px;font-weight:800;cursor:pointer">Listo</button>'
    + '</div>';
  document.body.appendChild(host);
}

function ccVaultUiRecoveryDone(){
  var chk = document.getElementById('vault-rec-ok');
  if(chk && !chk.checked){
    if(typeof showToast === 'function') showToast('Confirmá que guardaste la clave', 'var(--accent-caution)');
    return;
  }
  var user = getCurrentUser();
  /* Recién acá se borra la copia en claro de la migración. */
  if(typeof ccVaultConfirm === 'function') ccVaultConfirm(user);
  var host = document.getElementById('vault-recovery');
  if(host && host.parentNode) host.parentNode.removeChild(host);
  if(typeof showToast === 'function') showToast('Datos cifrados.', 'var(--accent-deload)');
  renderVaultUI();
}

function ccVaultUiDisable(){
  var user = getCurrentUser();
  var seguir = function(ok){
    if(!ok) return;
    ccVaultDisable(user).then(function(){
      if(typeof showToast === 'function') showToast('Cifrado desactivado.', 'var(--text-secondary)');
      renderVaultUI();
    }).catch(function(e){
      if(typeof showToast === 'function') showToast(e.message || 'No se pudo desactivar', 'var(--accent-warning)');
    });
  };
  if(typeof confirmDialog === 'function'){
    confirmDialog({
      title:'¿Desactivar el cifrado?',
      message:'Tus datos vuelven a guardarse sin cifrar en este dispositivo.',
      confirm:'Desactivar', cancel:'Cancelar', danger:true
    }).then(seguir);
  } else { seguir(confirm('¿Desactivar el cifrado?')); }
}
