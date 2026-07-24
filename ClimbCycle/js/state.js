/* ====================================================
   state.js -- Global mutable state + persistence
   ClimbCycle v5
==================================================== */


/* ──────────────────────────────────────────────────
   Global state variables
────────────────────────────────────────────────── */

var U={
  goal:'',level:'',plan:'',days:4,
  weight:70,age:25,rhr:55,session:90,
  name:'',grade:'',targetGrade:'',tests:[],startDate:null,
  /* Quick-baseline diagnostic (kg totales): feed the goal engine so the plan
     focuses on the weakest capacity relative to the target grade. */
  baseFinger:'', basePull:'', baseDate:'',   /* baseDate: when the baseline test was actually done (YYYY-MM-DD) */
  /* NEW: smart scheduler fields */
  gymDays:[],
  rockDays:[],    /* array of DOW ints the user CAN go to gym — default Mon/Wed/Thu/Fri */
  rockWeekend:'never',  /* never | sometimes | always */
  trainTime:'evening'   /* morning | afternoon | evening */
};
var TODAY=new Date();
var MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
var curStep=1,NSTEPS=7;
var calDate=new Date(), bigDate=new Date();  // <-- LÍNEA CORREGIDA: bigDate estaba sin declarar
var hcDate=new Date();
var hcSel=null;
var wkOff=0;
var planMap={};
var sessionLog={};
var recData={sleep:7,sleepQ:3,sore:0,fat:0,rpe:0,dur:0,ts:0,
  hoursAgo:24,   /* hours since last session — KEY FIX */
  stype:'none'   /* session type: none|recovery|endurance|strength|power|outdoor */
};
var ciState={sleepq:3,sore:0,fat:0,rpe:0,ago:24,stype:'none'};
var slState={rpe:0,feel:2,pain:0,focus:'',dateStr:'',block:''};
var lastExUsed = {};
var toastTmr = null;
/* Exercise detail mode: false = simple (solo lo accionable), true = con la
   ciencia (sci + notas largas). Toggled in the Ejercicios tab, persisted. */
var exShowSci = false;

/* ──────────────────────────────────────────────────
   Persistence functions
────────────────────────────────────────────────── */


function saveU(){
  try{
    var toSave=JSON.parse(JSON.stringify(U));
    if(toSave.startDate)toSave.startDate=toSave.startDate instanceof Date
      ?toSave.startDate.toISOString():toSave.startDate;
    localStorage.setItem('cc_user',JSON.stringify(toSave));
  }catch(e){}
}
function loadU(){
  try{
    var s=localStorage.getItem('cc_user');
    if(!s)return false;
    var saved=JSON.parse(s);
    Object.keys(saved).forEach(function(k){U[k]=saved[k];});
    if(U.startDate)U.startDate=new Date(U.startDate);
    return !!(U.goal&&U.plan&&U.startDate);
  }catch(e){return false;}
}
function savePlan(){
  try{
    /* planMap keys are dateStrings, values are plain objects — safe to JSON */
    /* but exercises arrays contain objects from EX_POOL — strip them to just ids */
    var slim={};
    Object.keys(planMap).forEach(function(k){
      var p=planMap[k];
      slim[k]={block:p.block,week:p.week};
      if(p.note)slim[k].note=p.note;
      if(p.moved)slim[k].moved=true;
      if(p.forced)slim[k].forced=true;
    });
    localStorage.setItem('cc_plan',JSON.stringify(slim));
  }catch(e){}
}
function loadPlan(){
  try{
    var s=localStorage.getItem('cc_plan');
    if(!s)return false;
    planMap=JSON.parse(s);
    return Object.keys(planMap).length>0;
  }catch(e){return false;}
}
function saveSL(){try{localStorage.setItem('cc_sl',JSON.stringify(sessionLog));}catch(e){}}
function loadSL(){try{var s=localStorage.getItem('cc_sl');if(s)sessionLog=JSON.parse(s);}catch(e){}}
function loadSLogs(){try{var s=localStorage.getItem('cc_logs');return s?JSON.parse(s):[];}catch(e){return [];}}
function saveSLogs(logs){try{localStorage.setItem('cc_logs',JSON.stringify(logs));}catch(e){}}
function loadAllTestResults(){
  try{var s=localStorage.getItem('cc_tests');return s?JSON.parse(s):{};}catch(e){return {};}
}
function saveAllTestResults(data){
  try{localStorage.setItem('cc_tests',JSON.stringify(data));}catch(e){}
}
function loadTestHistory(resultKey){
  var all=loadAllTestResults();
  return all[resultKey]||[];
}
function saveTestResult(resultKey, value, ts){
  var all=loadAllTestResults();
  if(!all[resultKey])all[resultKey]=[];
  all[resultKey].push({v:value, ts: ts || Date.now()});
  /* keep last 20 entries, ordered by time (a back-dated entry may arrive late) */
  all[resultKey].sort(function(a,b){ return (a.ts||0)-(b.ts||0); });
  if(all[resultKey].length>20)all[resultKey]=all[resultKey].slice(-20);
  saveAllTestResults(all);
}
function loadRec(){
  try{var s=localStorage.getItem('cc_rec');if(s)recData=JSON.parse(s);}catch(e){}
}
function saveRec(){
  try{localStorage.setItem('cc_rec',JSON.stringify(recData));}catch(e){}
}

/* ──────────────────────────────────────────────────
   Backup: Export & Import
   Bundles ALL user data into a single JSON file.
   Tests, plan, logs, recovery, user prefs — everything.
────────────────────────────────────────────────── */

/* Build a JSON backup of all user data. Returns Blob URL ready to download. */
/* Collect all exportable user data into a bundle object. Don't include
   cc_users (other users' password hashes). */
function _collectBundle(){
  var bundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    user: (typeof currentUser !== 'undefined' && currentUser) ? currentUser : 'unknown',
    data: {}
  };
  var keys = ['cc_user','cc_plan','cc_sl','cc_logs','cc_tests','cc_rec','cc_lastex','cc_theme','cc_projects','cc_widgets'];
  keys.forEach(function(k){
    try { var v = localStorage.getItem(k); if(v !== null) bundle.data[k] = v; } catch(e){}
  });
  return bundle;
}
function exportUserData(){
  var json = JSON.stringify(_collectBundle(), null, 2);
  var blob = new Blob([json], {type:'application/json'});
  return URL.createObjectURL(blob);
}

/* Encrypted backup: AES-GCM over the bundle, key derived from `pass` via
   PBKDF2 (crypto.js). Self-describing wrapper {enc, salt, iters, payload}. */
function downloadEncryptedBackup(pass){
  if(typeof ccDeriveKey !== 'function'){
    if(typeof showToast === 'function') showToast('Cifrado no disponible en este navegador','#E5404B'); return;
  }
  if(!pass || pass.length < 6){
    if(typeof showToast === 'function') showToast('Contraseña del backup: mínimo 6 caracteres','#E5404B'); return;
  }
  var salt = ccRandomHex(16);
  ccDeriveKey(pass, salt).then(function(key){ return ccEncryptJSON(key, _collectBundle()); }).then(function(payload){
    var enc = { enc:true, v:1, salt:salt, iters:CC_PBKDF2_ITERS, payload:payload };
    var url = URL.createObjectURL(new Blob([JSON.stringify(enc)], {type:'application/json'}));
    var a = document.createElement('a');
    var stamp = new Date().toISOString().slice(0,10);
    var uname = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : 'user';
    a.href = url; a.download = 'climbcycle_' + uname + '_' + stamp + '.ccenc.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 0);
    if(typeof showToast === 'function') showToast('Backup cifrado descargado','#00B884');
  }).catch(function(e){ if(typeof logError === 'function') logError(e, 'downloadEncryptedBackup', { notify:true, userMessage:'Error al cifrar el backup: ' + e.message }); else if(typeof showToast === 'function') showToast('Error al cifrar: ' + e.message,'#E5404B'); });
}

/* Trigger a browser download of the backup. */
function downloadBackup(){
  try {
    var url = exportUserData();
    var a = document.createElement('a');
    var stamp = new Date().toISOString().slice(0,10);
    var uname = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : 'user';
    a.href = url;
    a.download = 'climbcycle_'+uname+'_'+stamp+'.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 0);
    if(typeof showToast === 'function') showToast('Backup descargado','#00B884');
  } catch(e) {
    if(typeof logError === 'function') logError(e, 'downloadBackup', { notify:true, userMessage:'No se pudo exportar el backup: '+e.message });
    else if(typeof showToast === 'function') showToast('Error: '+e.message,'#E5404B');
  }
}

/* Restore data from a JSON file. Validates structure first.
   Uses custom confirmDialog (Promise-based) instead of native confirm(). */
/* Validate + confirm + apply a decrypted/plain bundle {version, data}. */
function _applyImportBundle(bundle){
  if(!bundle || !bundle.data || typeof bundle.data !== 'object'){
    if(typeof showToast === 'function') showToast('Error: estructura incorrecta','#E5404B'); return;
  }
  if(bundle.version !== 1){
    if(typeof showToast === 'function') showToast('Error: versión de backup no soportada','#E5404B'); return;
  }
  var doImport = function(){
    var n = 0;
    var failed = 0;
    Object.keys(bundle.data).forEach(function(k){
      try { localStorage.setItem(k, bundle.data[k]); n++; } catch(e){ failed++; if(typeof logError === 'function') logError(e, 'importUserData.setItem:'+k); }
    });
    if(failed > 0 && typeof showToast === 'function'){
      showToast('Importadas '+n+' claves, '+failed+' fallaron','#E5A400');
    } else if(typeof showToast === 'function'){
      showToast('Importadas '+n+' claves. Recargando...','#00B884');
    }
    setTimeout(function(){ location.reload(); }, 800);
  };
  if(typeof confirmDialog === 'function'){
    confirmDialog({
      title: 'Restaurar backup?',
      message: 'Vas a reemplazar tu plan, sesiones y tests actuales con los del archivo. ¿Continuar?',
      confirm: 'Sí, restaurar', cancel: 'Cancelar', danger: true
    }).then(function(ok){ if(ok) doImport(); });
  } else {
    if(confirm('Esto reemplazará todos tus datos actuales con los del backup. ¿Continuar?')) doImport();
  }
}

/* Import a backup. Handles both plaintext and encrypted (.ccenc) bundles;
   `pass` is only needed for encrypted files. */
function importUserData(jsonStr, pass){
  var bundle;
  try { bundle = JSON.parse(jsonStr); }
  catch(e){ if(typeof showToast === 'function') showToast('Error: archivo inválido','#E5404B'); return; }

  if(bundle && bundle.enc){
    if(typeof ccDeriveKey !== 'function'){
      if(typeof showToast === 'function') showToast('Cifrado no disponible en este navegador','#E5404B'); return;
    }
    if(!pass){
      if(typeof showToast === 'function') showToast('Ingresá la contraseña del backup cifrado','#E5404B'); return;
    }
    ccDeriveKey(pass, bundle.salt, bundle.iters).then(function(key){ return ccDecryptJSON(key, bundle.payload); })
      .then(function(inner){ _applyImportBundle(inner); })
      .catch(function(e){ if(typeof logError === 'function') logError(e, 'importUserData.decrypt', { notify:true, userMessage:'Contraseña incorrecta o archivo dañado' }); else if(typeof showToast === 'function') showToast('Contraseña incorrecta o archivo dañado','#E5404B'); });
    return;
  }
  _applyImportBundle(bundle);
}

/* File input handler. Reads selected JSON file and calls importUserData. */
function handleBackupFile(input){
  var file = input.files && input.files[0];
  if(!file) return;
  var reader = new FileReader();
  reader.onload = function(e){
    var passEl = document.getElementById('backup-pass');
    importUserData(e.target.result, passEl ? passEl.value : '');
  };
  reader.onerror = function(){
    if(typeof showToast === 'function') showToast('No se pudo leer el archivo','#E5404B');
  };
  reader.readAsText(file);
}
