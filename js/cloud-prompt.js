/* ====================================================
   cloud-prompt.js -- invitación a respaldar en la nube
   ClimbCycle

   POR QUÉ EXISTE.

   El sync estaba implementado, testeado end-to-end y verificado contra un
   Supabase real… y en la práctica no lo iba a usar nadie. La única forma de
   crear la cuenta era entrar a Perfil → Nube · Sync a mano, y el onboarding
   —7 pasos— no la mencionaba ni una vez (verificado: 0 referencias).

   Consecuencia concreta para la beta: alguien instala la app, carga diez
   semanas de entrenamiento, limpia la caché del navegador o cambia de
   teléfono, y pierde todo. Con el respaldo funcionando perfectamente del
   otro lado, sin usar.

   Es la misma familia de problema que veníamos cazando, pero un escalón más
   arriba: no es que el código haga algo mal, es que una capacidad que existe
   no llega al usuario. Un feature que nadie descubre no está terminado.

   DISEÑO. Aparece en Inicio, después del onboarding, sólo si:
     · hay credenciales de Supabase (si no, no hay nube que ofrecer),
     · no hay sesión iniciada,
     · el usuario no lo descartó antes.

   Se puede descartar y no vuelve — pero la sección de Perfil sigue estando.
   No se bloquea nada ni se interrumpe: la app funciona 100% offline y eso
   es una decisión de producto, no una carencia.
==================================================== */

var CC_CLOUD_PROMPT_KEY = 'cc_cloud_prompt_off';

function cloudPromptDismissed(){
  try { return localStorage.getItem(CC_CLOUD_PROMPT_KEY) === '1'; }
  catch(e){ return false; }
}
function cloudPromptDismiss(){
  try { localStorage.setItem(CC_CLOUD_PROMPT_KEY, '1'); } catch(e){}
  renderCloudPrompt();
}

/* PURA: decide si corresponde mostrar la invitación. Separada del render
   para poder testear la regla sin DOM. */
function shouldShowCloudPrompt(configurado, logueado, descartado){
  return !!configurado && !logueado && !descartado;
}

function renderCloudPrompt(){
  var wrap = document.getElementById('cloud-prompt-wrap');
  if(!wrap) return;

  var configurado = (typeof syncIsConfigured === 'function') && syncIsConfigured();
  var logueado    = (typeof syncIsLoggedIn === 'function') && syncIsLoggedIn();

  if(!shouldShowCloudPrompt(configurado, logueado, cloudPromptDismissed())){
    wrap.innerHTML = '';
    return;
  }

  wrap.innerHTML =
    '<div style="background:var(--bg-card);border:1px solid var(--border-color);'
    + 'border-left:3px solid var(--accent-primary);border-radius:12px;padding:14px;margin-bottom:14px">'
      + '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:18px;font-weight:800;'
      + 'color:var(--text-primary)">Guardá tu progreso</div>'
      + '<div style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin:6px 0 12px">'
      + 'Ahora mismo tu historial vive sólo en este dispositivo: si limpiás el navegador o '
      + 'cambiás de teléfono, se pierde. Con una cuenta gratis queda respaldado y podés '
      + 'entrenar desde el celu y la compu con los mismos datos.</div>'
      + '<div style="display:flex;gap:8px">'
        + '<button onclick="cloudPromptGo()" style="flex:1;min-height:44px;padding:11px;'
        + 'background:var(--accent-primary);border:none;border-radius:10px;color:var(--accent-primary-on);'
        + 'font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;cursor:pointer;'
        + 'touch-action:manipulation">Crear cuenta</button>'
        + '<button onclick="cloudPromptDismiss()" style="padding:11px 14px;min-height:44px;'
        + 'background:none;border:1px solid var(--border-color);border-radius:10px;'
        + 'color:var(--text-muted);font-size:12px;cursor:pointer;touch-action:manipulation">Ahora no</button>'
      + '</div>'
    + '</div>';
}

/* Lleva a la sección de nube en Perfil. No abre un formulario propio: sería
   una segunda copia del alta que tarde o temprano se desincroniza de la de
   sync.js — el patrón que más bugs generó en este proyecto. */
function cloudPromptGo(){
  if(typeof goPage === 'function') goPage('profile');
  setTimeout(function(){
    var el = document.getElementById('sync-section-wrap');
    if(el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior:'smooth', block:'center' });
    var input = document.getElementById('sync-email');
    if(input && typeof input.focus === 'function') input.focus();
  }, 120);
}
