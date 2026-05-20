?/* ====================================================
   render-profile.js -- Profile, nutrition, theme toggle
   - renderNutri: nutrition page (#nutric)
   - renderProfile: user profile + HR zones + tests + logout (#profc)
   - initThemeToggle / toggleTheme: light/dark theme button
==================================================== */


function renderNutri(){
  var cal=Math.round(U.weight*35),prot=Math.round(U.weight*1.3),carbs=Math.round(cal*0.65/4),fat=Math.round(cal*0.20/9),water=Math.round(U.weight*35+U.session/60*500);
  var meals=[
    {t:'2-3h antes',n:'Pre-Entreno',c:'var(--accent-caution)',d:'Carbos complejos + proteina moderada. Sin grasas ni fibra alta.'},
    {t:'30 min antes',n:'Snack rapido',c:'var(--accent-primary)',d:'Carbos simples. Banana, datiles, barra de avena.'},
    {t:'<30 min post',n:'Ventana dorada',c:'var(--accent-info)',d:'Proteina rapida + carbos simples. Máxima absorción.'},
    {t:'Todo el día',n:'Hidratacion',c:'var(--accent-deload)',d:water+'ml. Empieza 2h antes. Electrolitos si sesión >90 min.'}
  ];
  var h='<div class="card glow"><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:700;color:var(--accent-primary-d);margin-bottom:12px">Objetivos Diarios</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px"><div style="background:var(--bg-card-alt);border-radius:10px;padding:10px;text-align:center"><div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;font-weight:700;color:var(--accent-primary-d)">'+cal.toLocaleString()+'</div><div style="font-size:10px;color:var(--text-muted)">kcal/día</div></div><div style="background:var(--bg-card-alt);border-radius:10px;padding:10px;text-align:center"><div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;font-weight:700;color:#00E5A0">'+(water/1000).toFixed(1)+'L</div><div style="font-size:10px;color:var(--text-muted)">agua/día</div></div></div>'+mbar('Proteina',0,prot,'var(--accent-info)','g')+mbar('Carbos',0,carbs,'var(--accent-caution)','g')+mbar('Grasas',0,fat,'var(--accent-warning)','g')+'</div>';
  h+='<div class="sec">Distribución de Macros</div><div class="card" style="border-left:3px solid #CCFF00"><div style="display:flex;gap:8px;margin-bottom:10px"><div style="flex:1;background:var(--bg-card-alt);border-radius:8px;padding:10px;text-align:center"><div style="font-family:\'JetBrains Mono\',monospace;font-size:20px;font-weight:700;color:#FFB800">65%</div><div style="font-size:9px;color:var(--text-muted)">Carbos</div></div><div style="flex:1;background:var(--bg-card-alt);border-radius:8px;padding:10px;text-align:center"><div style="font-family:\'JetBrains Mono\',monospace;font-size:20px;font-weight:700;color:#00C8FF">15%</div><div style="font-size:9px;color:var(--text-muted)">Proteina</div></div><div style="flex:1;background:var(--bg-card-alt);border-radius:8px;padding:10px;text-align:center"><div style="font-family:\'JetBrains Mono\',monospace;font-size:20px;font-weight:700;color:#FF4D6A">20%</div><div style="font-size:9px;color:var(--text-muted)">Grasas</div></div></div><div style="font-size:11px;color:var(--text-muted)">Horst (2008): distribución óptima para escaladores</div></div>';
  h+='<div class="sec">Timing de Comidas</div>'+meals.map(function(m){return '<div class="card" style="border-left:3px solid '+m.c+';padding:12px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-family:\'Barlow Condensed\',sans-serif;font-size:15px;font-weight:700;color:'+m.c+'">'+m.n+'</span><span style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:var(--text-muted)">'+m.t+'</span></div><div style="font-size:12px;color:var(--text-secondary);line-height:1.5">'+m.d+'</div></div>';}).join('');
  document.getElementById('nutric').innerHTML=h;
}
function renderProfile(){
  var maxHR=Math.round(202.5-0.53*U.age),res=maxHR-U.rhr;
  var arMin=Math.round(res*0.6+U.rhr),arMax=Math.round(res*0.7+U.rhr);
  var zones=[
    {z:1,n:'Recuperación',    min:Math.round(res*.50+U.rhr),max:arMin-1,   c:'var(--text-muted)'},
    {z:2,n:'Base Aeróbica',   min:arMin,                    max:arMax,     c:'var(--accent-primary)'},
    {z:3,n:'Aeróbico',        min:arMax+1,                  max:Math.round(res*.80+U.rhr),c:'#84CC16'},
    {z:4,n:'Umbral',          min:Math.round(res*.80+U.rhr)+1,max:Math.round(res*.90+U.rhr),c:'var(--accent-caution)'},
    {z:5,n:'VO2 Max',         min:Math.round(res*.90+U.rhr)+1,max:maxHR,   c:'var(--accent-warning)'}
  ];
  var rows=[['Nombre',U.name||'--'],['Nivel',LLBL[U.level]||'--'],['Grado',U.grade||'--'],['Peso',U.weight+'kg'],['Edad',U.age+' anios'],['FC Reposo',U.rhr+' bpm']];
  var h='<div class="card glow"><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:700;color:var(--accent-primary-d);margin-bottom:12px">Mi Perfil</div>'+rows.map(function(r){return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color)"><span style="font-size:13px;color:var(--text-secondary)">'+r[0]+'</span><span style="font-family:\'JetBrains Mono\',monospace;font-size:13px;color:var(--text-primary)">'+r[1]+'</span></div>';}).join('')+'</div>';
  h+='<div class="sec">Zona Óptima de Arousal</div><div class="card"><div style="font-size:10px;color:var(--text-muted);font-family:\'JetBrains Mono\',monospace;margin-bottom:12px">FCmax = '+maxHR+' bpm (Lach 2021)</div><div style="background:var(--accent-primary-bg);border:1.5px solid #CCFF00;border-radius:12px;padding:14px;margin-bottom:14px"><div style="font-size:10px;color:var(--accent-primary-d);font-family:\'JetBrains Mono\',monospace;margin-bottom:4px">ZONA ÓPTIMA</div><div style="font-family:\'JetBrains Mono\',monospace;font-size:28px;font-weight:700;color:var(--accent-primary-d)">'+arMin+' - '+arMax+' bpm</div><div style="font-size:11px;color:var(--text-secondary);margin-top:4px">60-70% FC Reserva - Karvonen - Arent & Landers (2003)</div></div>'+zones.map(function(z,i){return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:'+(i<zones.length-1?'1px solid var(--border-color)':'none')+'"><div style="width:10px;height:10px;border-radius:50%;background:'+z.c+';flex-shrink:0"></div><div style="flex:1;font-size:12px;font-weight:600;color:'+(z.z===2?'var(--accent-primary)':'var(--text-primary)')+'">Z'+z.z+' '+z.n+(z.z===2?' [ÓPTIMA]':'')+'</div><div style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:var(--text-secondary)">'+z.min+'-'+z.max+'</div></div>';}).join('')+'</div>';
  if(U.tests.length){h+='<div class="sec">Tests Seleccionados</div><div class="card">'+U.tests.map(function(id){var t=TESTS.find(function(x){return x.id===id;});return t?'<div style="padding:9px 0;border-bottom:1px solid var(--border-color)"><div style="font-size:13px;font-weight:600;color:var(--text-primary)">'+t.title+'</div><div style="font-size:11px;color:var(--text-muted)">'+t.mide+'</div></div>':'';}).join('')+'</div>';}
  h+='<div style="margin-top:14px"><button onclick="goPage(\'nutri\')" style="width:100%;padding:12px;background:var(--bg-card);border:1.5px solid var(--border-color);border-radius:10px;color:var(--text-primary);font-size:13px;cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;touch-action:manipulation">&#x1F966; Ver plan de nutrición</button></div>';

  /* Appearance / Theme switch */
  h+='<div class="sec" style="margin-top:18px">Apariencia</div>';
  h+='<div class="theme-row">'
    +'<div>'
      +'<div class="theme-row-label">Tema</div>'
      +'<div class="theme-row-sub">Cambia entre claro y oscuro</div>'
    +'</div>'
    +'<div class="theme-switch" role="group" aria-label="Selector de tema">'
      +'<button class="theme-switch-btn" data-mode="light" onclick="setTheme(\'light\')" aria-label="Tema claro">☀ Claro</button>'
      +'<button class="theme-switch-btn" data-mode="dark"  onclick="setTheme(\'dark\')"  aria-label="Tema oscuro">☾ Oscuro</button>'
    +'</div>'
  +'</div>';

  /* Backup / Restore section */
  h+='<div class="sec" style="margin-top:18px">Tus datos</div>';
  h+='<div class="card" style="padding:14px">'
    +'<div style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:12px">Hacé una copia de seguridad o restaurá tu historial. El backup incluye plan, sesiones, tests y check-ins.</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:8px">'
      +'<button onclick="downloadBackup()" style="flex:1;padding:11px;background:var(--accent-primary);border:none;border-radius:10px;color:var(--accent-primary-on);font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;cursor:pointer;touch-action:manipulation">&#x2B07; Exportar backup</button>'
      +'<button onclick="document.getElementById(\'backup-restore-input\').click()" style="flex:1;padding:11px;background:var(--bg-card);border:1.5px solid var(--border-color);border-radius:10px;color:var(--text-primary);font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:700;cursor:pointer;touch-action:manipulation">&#x2B06; Importar</button>'
    +'</div>'
    +'<input type="file" id="backup-restore-input" accept=".json,application/json" style="display:none" onchange="handleBackupFile(this)">'
    +'<div style="font-size:10px;color:var(--text-muted);line-height:1.5">Importar reemplaza todos tus datos actuales.</div>'
  +'</div>';

  h+='<div style="margin-top:16px"><button onclick="confirmReset()" style="width:100%;padding:12px;background:none;border:1px solid var(--border-color);border-radius:10px;color:var(--text-muted);font-size:12px;cursor:pointer">Reiniciar y crear nuevo plan</button></div>';
  /* User info + logout */
  if(typeof currentUser !== 'undefined' && currentUser){
    h+='<div style="margin-top:24px;padding:14px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px">'
      +'<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Sesión activa</div>'
      +'<div style="display:flex;justify-content:space-between;align-items:center">'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:18px;font-weight:700;color:var(--accent-primary-d)">'+currentUser+'</div>'
        +'<button onclick="confirmLogout()" style="padding:8px 14px;background:none;border:1px solid #FF4D6A55;border-radius:8px;color:#FF4D6A;font-size:11px;font-family:\'JetBrains Mono\',monospace;cursor:pointer;touch-action:manipulation">Cerrar sesión</button>'
      +'</div>'
      +'<div style="font-size:10px;color:var(--text-muted);margin-top:8px;line-height:1.5">Tus datos estan guardados localmente bajo este usuario.</div>'
    +'</div>';
  }
  document.getElementById('profc').innerHTML=h;
  if(typeof syncThemeSwitch === 'function') syncThemeSwitch();
}
/* ──────────────────────────────────────────────────
   Theme toggle (light / dark)
────────────────────────────────────────────────── */


/* Confirmations for destructive profile actions */
function confirmReset(){
  confirmDialog({
    title: 'Reiniciar plan?',
    message: 'Vas a borrar tu plan actual, sesiones registradas y check-ins. Esta acción no se puede deshacer. ¿Querés seguir?',
    confirm: 'Sí, reiniciar',
    cancel:  'Cancelar',
    danger:  true
  }).then(function(ok){ if(ok) location.reload(); });
}
function confirmLogout(){
  confirmDialog({
    title: 'Cerrar sesión?',
    message: 'Vas a volver a la pantalla de inicio de sesión. Tus datos quedan guardados en este dispositivo.',
    confirm: 'Cerrar sesión',
    cancel:  'Cancelar'
  }).then(function(ok){ if(ok) logoutUser(); });
}

/* Light theme is the default. Toggle adds [data-theme="dark"] to opt-in.
   Theme is bootstrapped in <head> to avoid FOUC; this function is a no-op
   kept for backwards compatibility with app.js's init call. */
function initThemeToggle() {
  /* Remove the legacy floating FAB if present */
  var legacy = document.getElementById('theme-toggle-btn');
  if (legacy) legacy.remove();
}

/* Set theme explicitly. mode: 'light' | 'dark' */
function setTheme(mode){
  if(mode === 'dark') document.documentElement.setAttribute('data-theme','dark');
  else document.documentElement.removeAttribute('data-theme');
  try { localStorage.setItem('cc_theme', mode); } catch(e){}
  syncThemeSwitch();
}

/* Sync visual state of any rendered .theme-switch on the page */
function syncThemeSwitch(){
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.querySelectorAll('.theme-switch-btn').forEach(function(b){
    var m = b.getAttribute('data-mode');
    if((m==='dark') === isDark) b.classList.add('on');
    else b.classList.remove('on');
  });
}

function toggleTheme() {
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  setTheme(isDark ? 'light' : 'dark');
  return false;
}
