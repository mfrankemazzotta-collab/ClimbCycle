/* ====================================================
   render-profile.js -- Profile, nutrition, theme toggle
   - renderNutri: nutrition page (#nutric)
   - renderProfile: user profile + HR zones + tests + logout (#profc)
   - initThemeToggle / toggleTheme: light/dark theme button
==================================================== */


function renderNutri(){
  var cal=Math.round(U.weight*35),prot=Math.round(U.weight*1.3),carbs=Math.round(cal*0.65/4),fat=Math.round(cal*0.20/9),water=Math.round(U.weight*35+U.session/60*500);
  var meals=[
    {t:'2-3h antes',n:'Pre-Entreno',c:'#FFB800',d:'Carbos complejos + proteina moderada. Sin grasas ni fibra alta.'},
    {t:'30 min antes',n:'Snack rapido',c:'#CCFF00',d:'Carbos simples. Banana, datiles, barra de avena.'},
    {t:'<30 min post',n:'Ventana dorada',c:'#00C8FF',d:'Proteina rapida + carbos simples. Maxima absorcion.'},
    {t:'Todo el dia',n:'Hidratacion',c:'#00E5A0',d:water+'ml. Empieza 2h antes. Electrolitos si sesion >90 min.'}
  ];
  var h='<div class="card glow"><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:700;color:#CCFF00;margin-bottom:12px">Objetivos Diarios</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px"><div style="background:#131326;border-radius:10px;padding:10px;text-align:center"><div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;font-weight:700;color:#CCFF00">'+cal.toLocaleString()+'</div><div style="font-size:10px;color:#444466">kcal/dia</div></div><div style="background:#131326;border-radius:10px;padding:10px;text-align:center"><div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;font-weight:700;color:#00E5A0">'+(water/1000).toFixed(1)+'L</div><div style="font-size:10px;color:#444466">agua/dia</div></div></div>'+mbar('Proteina',0,prot,'#00C8FF','g')+mbar('Carbos',0,carbs,'#FFB800','g')+mbar('Grasas',0,fat,'#FF4D6A','g')+'</div>';
  h+='<div class="sec">Distribucion de Macros</div><div class="card" style="border-left:3px solid #CCFF00"><div style="display:flex;gap:8px;margin-bottom:10px"><div style="flex:1;background:#131326;border-radius:8px;padding:10px;text-align:center"><div style="font-family:\'JetBrains Mono\',monospace;font-size:20px;font-weight:700;color:#FFB800">65%</div><div style="font-size:9px;color:#444466">Carbos</div></div><div style="flex:1;background:#131326;border-radius:8px;padding:10px;text-align:center"><div style="font-family:\'JetBrains Mono\',monospace;font-size:20px;font-weight:700;color:#00C8FF">15%</div><div style="font-size:9px;color:#444466">Proteina</div></div><div style="flex:1;background:#131326;border-radius:8px;padding:10px;text-align:center"><div style="font-family:\'JetBrains Mono\',monospace;font-size:20px;font-weight:700;color:#FF4D6A">20%</div><div style="font-size:9px;color:#444466">Grasas</div></div></div><div style="font-size:11px;color:#444466">Horst (2008): distribucion optima para escaladores</div></div>';
  h+='<div class="sec">Timing de Comidas</div>'+meals.map(function(m){return '<div class="card" style="border-left:3px solid '+m.c+';padding:12px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-family:\'Barlow Condensed\',sans-serif;font-size:15px;font-weight:700;color:'+m.c+'">'+m.n+'</span><span style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:#444466">'+m.t+'</span></div><div style="font-size:12px;color:#7070AA;line-height:1.5">'+m.d+'</div></div>';}).join('');
  document.getElementById('nutric').innerHTML=h;
}
function renderProfile(){
  var maxHR=Math.round(202.5-0.53*U.age),res=maxHR-U.rhr;
  var arMin=Math.round(res*0.6+U.rhr),arMax=Math.round(res*0.7+U.rhr);
  var zones=[
    {z:1,n:'Recuperacion',    min:Math.round(res*.50+U.rhr),max:arMin-1,   c:'#666688'},
    {z:2,n:'Base Aerobica',   min:arMin,                    max:arMax,     c:'#CCFF00'},
    {z:3,n:'Aerobico',        min:arMax+1,                  max:Math.round(res*.80+U.rhr),c:'#84CC16'},
    {z:4,n:'Umbral',          min:Math.round(res*.80+U.rhr)+1,max:Math.round(res*.90+U.rhr),c:'#FFB800'},
    {z:5,n:'VO2 Max',         min:Math.round(res*.90+U.rhr)+1,max:maxHR,   c:'#FF4D6A'}
  ];
  var rows=[['Nombre',U.name||'--'],['Nivel',LLBL[U.level]||'--'],['Grado',U.grade||'--'],['Peso',U.weight+'kg'],['Edad',U.age+' anios'],['FC Reposo',U.rhr+' bpm']];
  var h='<div class="card glow"><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:700;color:#CCFF00;margin-bottom:12px">Mi Perfil</div>'+rows.map(function(r){return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1A1A32"><span style="font-size:13px;color:#7070AA">'+r[0]+'</span><span style="font-family:\'JetBrains Mono\',monospace;font-size:13px;color:#EDEDFF">'+r[1]+'</span></div>';}).join('')+'</div>';
  h+='<div class="sec">Zona Optima de Arousal</div><div class="card"><div style="font-size:10px;color:#444466;font-family:\'JetBrains Mono\',monospace;margin-bottom:12px">FCmax = '+maxHR+' bpm (Lach 2021)</div><div style="background:#182000;border:1.5px solid #CCFF00;border-radius:12px;padding:14px;margin-bottom:14px"><div style="font-size:10px;color:#CCFF00;font-family:\'JetBrains Mono\',monospace;margin-bottom:4px">ZONA OPTIMA</div><div style="font-family:\'JetBrains Mono\',monospace;font-size:28px;font-weight:700;color:#CCFF00">'+arMin+' - '+arMax+' bpm</div><div style="font-size:11px;color:#7070AA;margin-top:4px">60-70% FC Reserva - Karvonen - Arent & Landers (2003)</div></div>'+zones.map(function(z,i){return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:'+(i<zones.length-1?'1px solid #1A1A32':'none')+'"><div style="width:10px;height:10px;border-radius:50%;background:'+z.c+';flex-shrink:0"></div><div style="flex:1;font-size:12px;font-weight:600;color:'+(z.z===2?'#CCFF00':'#EDEDFF')+'">Z'+z.z+' '+z.n+(z.z===2?' [OPTIMA]':'')+'</div><div style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:#7070AA">'+z.min+'-'+z.max+'</div></div>';}).join('')+'</div>';
  if(U.tests.length){h+='<div class="sec">Tests Seleccionados</div><div class="card">'+U.tests.map(function(id){var t=TESTS.find(function(x){return x.id===id;});return t?'<div style="padding:9px 0;border-bottom:1px solid #1A1A32"><div style="font-size:13px;font-weight:600;color:#EDEDFF">'+t.title+'</div><div style="font-size:11px;color:#444466">'+t.mide+'</div></div>':'';}).join('')+'</div>';}
  h+='<div style="margin-top:14px"><button onclick="goPage(\'nutri\')" style="width:100%;padding:12px;background:#0F0F1E;border:1.5px solid #1E1E38;border-radius:10px;color:#EDEDFF;font-size:13px;cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;touch-action:manipulation">&#x1F966; Ver plan de nutricion</button></div>';
  h+='<div style="margin-top:8px"><button onclick="if(confirm(\'Reiniciar?\'))location.reload()" style="width:100%;padding:12px;background:none;border:1px solid #1E1E38;border-radius:10px;color:#444466;font-size:12px;cursor:pointer">Reiniciar y crear nuevo plan</button></div>';
  /* User info + logout */
  if(typeof currentUser !== 'undefined' && currentUser){
    h+='<div style="margin-top:24px;padding:14px;background:#0F0F1E;border:1px solid #1E1E38;border-radius:12px">'
      +'<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:#7070AA;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Sesion activa</div>'
      +'<div style="display:flex;justify-content:space-between;align-items:center">'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:18px;font-weight:700;color:#CCFF00">'+currentUser+'</div>'
        +'<button onclick="if(confirm(\'Cerrar sesion?\'))logoutUser()" style="padding:8px 14px;background:none;border:1px solid #FF4D6A55;border-radius:8px;color:#FF4D6A;font-size:11px;font-family:\'JetBrains Mono\',monospace;cursor:pointer;touch-action:manipulation">Cerrar sesion</button>'
      +'</div>'
      +'<div style="font-size:10px;color:#444466;margin-top:8px;line-height:1.5">Tus datos estan guardados localmente bajo este usuario.</div>'
    +'</div>';
  }
  document.getElementById('profc').innerHTML=h;
}
/* ──────────────────────────────────────────────────
   Theme toggle (light / dark)
────────────────────────────────────────────────── */


function initThemeToggle() {
  if (document.getElementById('theme-toggle-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'theme-toggle-btn';
  btn.className = 'theme-toggle';
  btn.innerHTML = '🌙';
  btn.onclick = toggleTheme;
  document.body.appendChild(btn);

  const savedTheme = localStorage.getItem('cc_theme');
  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    btn.innerHTML = '☀️';
  }
}

function toggleTheme() {
  const btn = document.getElementById('theme-toggle-btn');
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';

  if (isLight) {
    document.documentElement.removeAttribute('data-theme');
    btn.innerHTML = '🌙';
    localStorage.setItem('cc_theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    btn.innerHTML = '☀️';
    localStorage.setItem('cc_theme', 'light');
  }
}
