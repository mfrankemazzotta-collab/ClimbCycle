/* ====================================================
   auth.js -- Local authentication & per-user storage
   ClimbCycle v5
   
   Architecture:
   - Each user has hashed password (SHA-256 + salt)
   - User data isolated vía key prefix: cc_USERNAME_xxx
   - All works offline, no server needed
   - Sets foundation for future cloud sync
==================================================== */

/* Current logged-in user (null if not logged in) */
var currentUser = null;

/* ── HASHING (Web Crypto API, no libraries) ── */
async function hashPassword(password, salt){
  var msgBuffer = new TextEncoder().encode(password + ':' + salt);
  var hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  var hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(function(b){return b.toString(16).padStart(2,'0');}).join('');
}

function generateSalt(){
  var arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
}

/* ── USER REGISTRY ── */
function loadUsers(){
  try{
    var s = localStorage.getItem('cc_users');
    return s ? JSON.parse(s) : {};
  }catch(e){ return {}; }
}

function saveUsers(users){
  try{ localStorage.setItem('cc_users', JSON.stringify(users)); }
  catch(e){ if(typeof logError === 'function') logError(e, 'saveUsers', { notify:true, userMessage:'No se pudo guardar la cuenta en este dispositivo' }); }
}

function getCurrentUser(){
  try{ return localStorage.getItem('cc_current_user') || null; }catch(e){ return null; }
}

function setCurrentUser(username){
  try{
    if(username) localStorage.setItem('cc_current_user', username);
    else localStorage.removeItem('cc_current_user');
    currentUser = username;
  }catch(e){}
}

/* ── REGISTRATION ── */
async function registerUser(username, password){
  username = (username || '').trim().toLowerCase();
  if(username.length < 3) return {ok:false, err:'Usuario debe tener al menos 3 caracteres'};
  if(!/^[a-z0-9_]+$/.test(username)) return {ok:false, err:'Solo letras, números y _'};
  if(password.length < 6) return {ok:false, err:'Password debe tener al menos 6 caracteres'};

  var users = loadUsers();
  if(users[username]) return {ok:false, err:'Usuario ya existe'};

  var salt = generateSalt();
  /* Prefer PBKDF2 (slow KDF); fall back to legacy SHA-256 if crypto.js is
     unavailable so registration never hard-fails. */
  var usePbkdf2 = (typeof ccDeriveHashHex === 'function');
  var iters = (typeof CC_PBKDF2_ITERS !== 'undefined') ? CC_PBKDF2_ITERS : 150000;
  var hash = usePbkdf2 ? await ccDeriveHashHex(password, salt, iters) : await hashPassword(password, salt);
  users[username] = usePbkdf2
    ? { hash:hash, salt:salt, kdf:'pbkdf2', iters:iters, createdAt:Date.now() }
    : { hash:hash, salt:salt, createdAt:Date.now() };
  saveUsers(users);
  return {ok:true};
}

/* ── LOGIN ── */
async function loginUser(username, password){
  username = (username || '').trim().toLowerCase();
  var users = loadUsers();
  var user = users[username];
  if(!user) return {ok:false, err:'Usuario no existe'};

  var ok = false;
  if(user.kdf === 'pbkdf2' && typeof ccDeriveHashHex === 'function'){
    var h = await ccDeriveHashHex(password, user.salt, user.iters || CC_PBKDF2_ITERS);
    ok = (h === user.hash);
  } else {
    /* Legacy single-SHA-256 record (or crypto.js unavailable). Verify the old
       way, then transparently upgrade the stored hash to PBKDF2 on success. */
    var lh = await hashPassword(password, user.salt);
    ok = (lh === user.hash);
    if(ok && typeof ccDeriveHashHex === 'function'){
      try {
        var iters = (typeof CC_PBKDF2_ITERS !== 'undefined') ? CC_PBKDF2_ITERS : 150000;
        var nh = await ccDeriveHashHex(password, user.salt, iters);
        var u2 = loadUsers();
        if(u2[username]){ u2[username].hash = nh; u2[username].kdf = 'pbkdf2'; u2[username].iters = iters; saveUsers(u2); }
      } catch(e){ if(typeof logError === 'function') logError(e, 'auth.migrateHash'); }
    }
  }
  if(!ok) return {ok:false, err:'Password incorrecto'};

  setCurrentUser(username);
  return {ok:true};
}

/* ── LOGOUT ── */
function logoutUser(){
  setCurrentUser(null);
  /* Reload to clear in-memory state */
  location.reload();
}

/* ── KEY PREFIX ── 
   Wraps localStorage so each user has isolated data.
   cc_plan -> cc_USERNAME_plan
*/
var _origGetItem = localStorage.getItem.bind(localStorage);
var _origSetItem = localStorage.setItem.bind(localStorage);
var _origRemoveItem = localStorage.removeItem.bind(localStorage);

function getUserKey(key){
  /* Don't prefix auth-related keys */
  if(key === 'cc_users' || key === 'cc_current_user') return key;
  /* Only prefix cc_* keys */
  if(key.indexOf('cc_') !== 0) return key;
  var user = getCurrentUser();
  if(!user) return key;
  return 'cc_' + user + '_' + key.substring(3);
}

/* Override localStorage methods for cc_* keys */
localStorage.getItem = function(key){
  return _origGetItem(getUserKey(key));
};
localStorage.setItem = function(key, value){
  return _origSetItem(getUserKey(key), value);
};
localStorage.removeItem = function(key){
  return _origRemoveItem(getUserKey(key));
};

/* ── LOGIN MODAL UI ── */
function showAuthModal(){
  var modal = document.getElementById('auth-modal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.innerHTML = ''
      +'<div style="position:fixed;inset:0;background:var(--bg-primary);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px">'
      +'  <div style="max-width:380px;width:100%;background:var(--bg-card);border:1px solid var(--border-color);border-radius:16px;padding:24px">'
      +'    <div style="text-align:center;margin-bottom:20px">'
      +'      <div style="font-family:\'Barlow Condensed\',sans-serif;font-size:28px;font-weight:800;color:var(--accent-primary-d);letter-spacing:1px">ClimbCycle</div>'
      +'      <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">Tu plan de entrenamiento personalizado</div>'
      +'    </div>'
      +'    <div style="display:flex;gap:6px;margin-bottom:16px">'
      +'      <button id="auth-tab-login"  class="auth-tab on" onclick="authTab(\'login\')">Iniciar sesión</button>'
      +'      <button id="auth-tab-signup" class="auth-tab" onclick="authTab(\'signup\')">Crear cuenta</button>'
      +'    </div>'
      +'    <div style="margin-bottom:12px">'
      +'      <div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Usuario</div>'
      +'      <input id="auth-user" type="text" placeholder="ej: pedro_v" autocomplete="username" style="width:100%;padding:10px 12px;background:var(--bg-card-alt);border:1.5px solid var(--border-color);border-radius:10px;color:var(--text-primary);font-family:\'JetBrains Mono\',monospace;font-size:13px;outline:none;box-sizing:border-box">'
      +'    </div>'
      +'    <div style="margin-bottom:16px">'
      +'      <div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Contraseña</div>'
      +'      <input id="auth-pass" type="password" placeholder="mínimo 6 caracteres" autocomplete="current-password" style="width:100%;padding:10px 12px;background:var(--bg-card-alt);border:1.5px solid var(--border-color);border-radius:10px;color:var(--text-primary);font-family:\'JetBrains Mono\',monospace;font-size:13px;outline:none;box-sizing:border-box">'
      +'    </div>'
      +'    <div id="auth-err" style="display:none;background:#FF4D6A18;border:1px solid #FF4D6A44;color:#FF4D6A;font-size:11px;padding:8px 12px;border-radius:8px;margin-bottom:12px"></div>'
      +'    <button id="auth-submit" onclick="authSubmit()" style="width:100%;padding:13px;background:#CCFF00;color:var(--accent-primary-on);font-family:\'Barlow Condensed\',sans-serif;font-size:16px;font-weight:800;border:none;border-radius:12px;cursor:pointer;touch-action:manipulation">Iniciar sesión</button>'
      +'    <div style="text-align:center;margin-top:16px;font-size:10px;color:var(--text-muted);line-height:1.5">Tus datos se guardan en este dispositivo.<br>Sin servidor, sin tracking, 100% offline.</div>'
      +'  </div>'
      +'</div>';
    document.body.appendChild(modal);

    /* Add CSS for auth tabs */
    var style = document.createElement('style');
    style.textContent = '.auth-tab{flex:1;padding:10px;background:var(--bg-card-alt);border:1.5px solid var(--border-color);border-radius:10px;color:var(--text-secondary);font-family:\'JetBrains Mono\',monospace;font-size:11px;cursor:pointer;touch-action:manipulation;font-weight:700}.auth-tab.on{border-color:var(--accent-primary);background:var(--accent-primary-bg);color:var(--accent-primary-d)}';
    document.head.appendChild(style);
  }
  modal.style.display = 'block';
}

function hideAuthModal(){
  var modal = document.getElementById('auth-modal');
  if(modal) modal.style.display = 'none';
}

var _authMode = 'login';

function authTab(mode){
  _authMode = mode;
  document.getElementById('auth-tab-login').classList[mode==='login'?'add':'remove']('on');
  document.getElementById('auth-tab-signup').classList[mode==='signup'?'add':'remove']('on');
  document.getElementById('auth-submit').textContent = mode==='login' ? 'Iniciar sesión' : 'Crear cuenta';
  document.getElementById('auth-err').style.display = 'none';
}

async function authSubmit(){
  var username = document.getElementById('auth-user').value;
  var password = document.getElementById('auth-pass').value;
  var errEl = document.getElementById('auth-err');
  errEl.style.display = 'none';

  var result;
  if(_authMode === 'signup'){
    result = await registerUser(username, password);
    if(result.ok){
      /* Auto-login after registration */
      result = await loginUser(username, password);
    }
  } else {
    result = await loginUser(username, password);
  }

  if(!result.ok){
    errEl.textContent = result.err;
    errEl.style.display = 'block';
    return;
  }

  /* Success: hide modal and reload */
  hideAuthModal();
  location.reload();
}

/* ── INIT — check auth state on load ── */
function initAuth(){
  currentUser = getCurrentUser();
  if(!currentUser){
    /* Hide main UI and show login */
    var vob = document.getElementById('vob');
    var vapp = document.getElementById('vapp');
    if(vob) vob.style.display = 'none';
    if(vapp) vapp.style.display = 'none';
    showAuthModal();
    return false;
  }
  return true;
}
