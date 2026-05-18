/* ====================================================
   render.js -- All UI rendering functions
   ClimbCycle v5
==================================================== */


/* ──────────────────────────────────────────────────
   Utilities
────────────────────────────────────────────────── */


function makeRing(val,col,sz){
  var st=10,r=(sz-st)/2,cx=sz/2,circ=2*Math.PI*r,p=Math.max(0,Math.min(100,val)),dash=p/100*circ;
  return '<div style="position:relative;width:'+sz+'px;height:'+sz+'px;display:inline-flex;align-items:center;justify-content:center"><svg width="'+sz+'" height="'+sz+'" style="position:absolute"><circle cx="'+cx+'" cy="'+cx+'" r="'+r+'" stroke="#1A1A32" stroke-width="'+st+'" fill="none"/><circle cx="'+cx+'" cy="'+cx+'" r="'+r+'" stroke="'+col+'" stroke-width="'+st+'" fill="none" stroke-dasharray="'+dash+' '+(circ-dash)+'" stroke-linecap="round" transform="rotate(-90 '+cx+' '+cx+')"/></svg><div style="position:absolute;display:flex;flex-direction:column;align-items:center"><span style="font-family:\'JetBrains Mono\',monospace;font-size:20px;font-weight:700;color:'+col+'">'+Math.round(p)+'%</span><span style="font-size:9px;color:#7070AA">recovery</span></div></div>';
}
function mbar(lbl,cur,tgt,col,unit){
  var p=Math.min(100,Math.round(cur/Math.max(tgt,1)*100));
  return '<div class="mr"><div class="mh"><span class="ml">'+lbl+'</span><span class="mv">'+cur+'<span style="color:#444466">/'+tgt+unit+'</span></span></div><div class="mtr"><div class="mf" style="width:'+p+'%;background:'+col+'"></div></div></div>';
}
function r2(l,v){return '<div><div style="font-size:10px;color:#444466">'+l+'</div><div style="font-family:\'JetBrains Mono\',monospace;font-size:13px;color:#EDEDFF">'+v+'</div></div>';}
function showToast(msg,col){
  var t=document.getElementById('toast');if(!t)return;
  t.textContent=msg;t.style.borderColor=col||'#2A2A48';t.style.color=col||'#EDEDFF';t.style.display='block';
  if(toastTmr)clearTimeout(toastTmr);
  toastTmr=setTimeout(function(){t.style.display='none';},3000);
}
function showErr(msg){
  document.querySelectorAll('.emsg').forEach(function(e){e.remove();});
  var e=document.createElement('div');e.className='emsg';e.textContent=msg;
  var f=document.querySelector('#s'+curStep+' .sfoot');
  if(f)f.insertBefore(e,f.firstChild);
  setTimeout(function(){if(e.parentNode)e.remove();},2500);
}
function showDD(date,plan){
  var bt=BLOCKS[plan.block],exs=EX[plan.block]||[],dd=document.getElementById('ddtl');
  var opts={weekday:'long',day:'numeric',month:'long'};
  dd.innerHTML='<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:20px;font-weight:700;margin-bottom:4px;color:'+bt.col+'">'+bt.label+' <span style="color:#444466;font-size:14px">S'+plan.week+'</span></div>'+'<div style="font-size:12px;color:#7070AA;margin-bottom:12px">'+date.toLocaleDateString('es-ES',opts)+'</div>'+(plan.block==='rest'?'<div style="font-size:13px;color:#7070AA">Dia de descanso. Prioriza sueno, hidratacion y nutricion.</div>':plan.block==='test'?'<div style="font-size:13px;color:#7070AA">Tests programados: '+(U.tests.length?U.tests.join(', '):'ninguno seleccionado')+'</div>':exs.map(function(e){return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #1A1A32"><span style="font-size:13px;color:#EDEDFF">'+e.n+'</span><span style="font-size:11px;font-family:\'JetBrains Mono\',monospace;color:#444466">'+e.d+'</span></div>';}).join(''));
  dd.classList.add('on');dd.scrollIntoView({behavior:'smooth',block:'nearest'});
}
/* ──────────────────────────────────────────────────
   Onboarding UI
────────────────────────────────────────────────── */


function redrawDots(){
  var c=document.getElementById('odots'); c.innerHTML='';
  for(var i=1;i<=NSTEPS;i++){var d=document.createElement('div');d.className='dot'+(i<curStep?' done':i===curStep?' active':'');c.appendChild(d);}
  var b=document.getElementById('obk');b.style.opacity=curStep===1?'0.3':'1';b.style.pointerEvents=curStep===1?'none':'auto';
}
function showStep(n){
  for(var i=1;i<=NSTEPS;i++){var e=document.getElementById('s'+i);if(e)e.className='step'+(i===n?' on':'');}
  curStep=n; redrawDots();
  if(n===7){renderMiniCal();buildSummary();}
  if(n===4){renderSchedPreview();}
}
function goBack(){if(curStep>1)showStep(curStep-1);}
function goNext(){
  if(curStep===1&&!U.goal){showErr('Selecciona tu objetivo para continuar');return;}
  if(curStep===2&&!U.level){showErr('Selecciona tu nivel para continuar');return;}
  if(curStep===3&&!U.plan){showErr('Selecciona un tipo de plan');return;}
  if(curStep===4){
    var picked=document.querySelectorAll('#gym-day-grid .dp-btn.on');
    U.gymDays=[];
    if(picked.length===0){
      /* no days picked - use smart defaults from Horst (2016) */
      U.gymDays=smartDefaultDays(U.days,U.rockWeekend);
      /* visually select them */
      U.gymDays.forEach(function(dow){
        var btn=document.querySelector('#gym-day-grid .dp-btn[data-dow="'+dow+'"]');
        if(btn)btn.classList.add('on');
      });
    } else {
      picked.forEach(function(b){U.gymDays.push(parseInt(b.getAttribute('data-dow')));});
    }
    /* if more days than sessions, adjust sessions down silently */
    if(U.gymDays.length>U.days) U.days=U.gymDays.length;
    /* if fewer days than sessions, adjust sessions to match */
    if(U.gymDays.length<U.days) U.days=U.gymDays.length;
    renderSchedPreview();
  }
  if(curStep<NSTEPS)showStep(curStep+1);
}
function pick(el,key,val){
  var parent=el.parentElement;
  parent.querySelectorAll('.cc').forEach(function(c){c.classList.remove('on');});
  el.classList.add('on');
  U[key]=val;
  if(key==='level')buildGradeChips(val);
  if(key==='rockWeekend'||key==='trainTime')renderSchedPreview();
}
function adj(key,d,min,max){
  U[key]=Math.max(min,Math.min(max,U[key]+d));
  var id={days:'vdays',weight:'vweight',age:'vage',rhr:'vrhr',session:'vsession'}[key];
  var el=document.getElementById(id);if(el)el.textContent=U[key];
}
function buildGradeChips(level){
  var c=document.getElementById('gchips');if(!c)return;
  c.innerHTML='';
  (GRADES[level]||[]).forEach(function(g){
    var btn=document.createElement('button');
    btn.className='gch';btn.textContent=g;
    btn.onclick=function(){
      c.querySelectorAll('.gch').forEach(function(b){b.classList.remove('on');});
      btn.classList.add('on');U.grade=g;
    };
    c.appendChild(btn);
  });
}
function buildTests(){
  var c=document.getElementById('tlist');if(!c)return;
  c.innerHTML='';
  TESTS.forEach(function(t){
    var div=document.createElement('div');div.className='tc';
    div.innerHTML='<div class="thd"><div class="ttt">'+t.title+'</div><span class="tbg" style="color:'+t.col+';border-color:'+t.col+'">'+t.diff+'</span></div><div class="tbody"><strong style="color:#EDEDFF">Como hacerlo:</strong><br>'+t.how+'<br><br><strong style="color:#EDEDFF">Mide:</strong> '+t.mide+'</div>';
    var body=div.querySelector('.tbody');body.style.display='none';
    div.onclick=function(){
      var isSel=div.classList.toggle('on');
      body.style.display=isSel?'block':'none';
      div.style.borderColor=isSel?'#CCFF00':'#1E1E38';
      div.style.background=isSel?'#182000':'#0F0F1E';
      var idx=U.tests.indexOf(t.id);
      if(isSel&&idx===-1)U.tests.push(t.id);
      else if(!isSel&&idx!==-1)U.tests.splice(idx,1);
    };
    c.appendChild(div);
  });
}
function buildSummary(){
  var maxHR=Math.round(202.5-0.53*U.age),res=maxHR-U.rhr;
  var arMin=Math.round(res*0.6+U.rhr),arMax=Math.round(res*0.7+U.rhr);
  var wks=U.plan==='4-3-2-1'?4:U.plan==='3-2-1'?3:0;
  var endD=U.startDate&&wks?new Date(U.startDate.getTime()+wks*7*86400000):null;
  var rows=[
    ['Objetivo',GLBL[U.goal]||'--'],['Nivel',LLBL[U.level]||'--'],['Grado',U.grade||'--'],
    ['Plan',U.plan||'--'],['Dias/semana',U.days],
    ['Inicio',U.startDate?U.startDate.toLocaleDateString('es-ES',{day:'numeric',month:'short'}):'--'],
    ['Fin',endD?endD.toLocaleDateString('es-ES',{day:'numeric',month:'short'}):'--'],
    ['FC Optima',arMin+'-'+arMax+' bpm'],
    ['Proteina',Math.round(U.weight*1.3)+'g/dia'],['Tests',U.tests.length]
  ];
  document.getElementById('summ').innerHTML=rows.map(function(r){
    return '<div class="sr"><span class="sl">'+r[0]+'</span><span class="sv2">'+r[1]+'</span></div>';
  }).join('');
}
function renderSchedPreview(){
  var p=document.getElementById('sched-preview');if(!p)return;
  if(U.gymDays.length===0){
    p.innerHTML='<div style="font-size:11px;color:#444466;text-align:center">Selecciona tus dias para ver el plan</div>';
    return;
  }
  var days=['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];
  /* pick which days would actually be used */
  var chosen=scoreAndPickDays(U.gymDays,BLOCK_FATIGUE['strength']||'HIGH',U.gymDays.length,U.rockWeekend);
  var html='';
  [1,2,3,4,5,6,0].forEach(function(dow){
    var isGym=chosen.indexOf(dow)!==-1;
    var isRock=(U.rockWeekend==='always'&&(dow===6||dow===0))||(U.rockWeekend==='sometimes'&&dow===6);
    var lbl=isRock?'Roca':isGym?'Entreno':'Descanso';
    var col=isRock?'#FFB800':isGym?'#CCFF00':'#333355';
    var bg=isRock?'#FFB80020':isGym?'#CCFF0015':'transparent';
    html+='<div class="sched-row">'
      +'<div class="sched-day">'+days[dow]+'</div>'
      +'<div class="sched-pill" style="background:'+bg+';color:'+col+'">'+lbl+'</div>'
      +(isGym?'<div class="sched-reason">Sesion de gimnasio</div>':'')
      +(isRock?'<div class="sched-reason">Escalar en roca (Bechtel: reservar energia)</div>':'')
      +'</div>';
  });
  p.innerHTML=html;
}
function toggleGymDay(btn){
  btn.classList.toggle('on');
  /* sync U.gymDays live */
  U.gymDays=[];
  document.querySelectorAll('#gym-day-grid .dp-btn.on').forEach(function(b){
    U.gymDays.push(parseInt(b.getAttribute('data-dow')));
  });
  renderSchedPreview();
}
/* ──────────────────────────────────────────────────
   Calendar & home
────────────────────────────────────────────────── */


function toggleRockDay(btn){
  btn.classList.toggle('on');
  /* Update U.rockDays array */
  U.rockDays = [];
  document.querySelectorAll('#rock-day-grid .dp-btn.on').forEach(function(b){
    U.rockDays.push(parseInt(b.getAttribute('data-dow')));
  });
  /* Trigger preview update if it exists */
  if(typeof renderSchedPreview === 'function') renderSchedPreview();
}

function calNav(d){calDate.setMonth(calDate.getMonth()+d);renderMiniCal();}
function renderMiniCal(){
  var y=calDate.getFullYear(),m=calDate.getMonth();
  document.getElementById('cmonth').textContent=MONTHS[m]+' '+y;
  var first=new Date(y,m,1),dow=first.getDay();if(dow===0)dow=7;dow--;
  var dim=new Date(y,m+1,0).getDate();
  var g=document.getElementById('cdays');g.innerHTML='';
  for(var i=0;i<dow;i++){var e=document.createElement('div');e.className='cd emp';g.appendChild(e);}
  for(var d=1;d<=dim;d++){
    var date=new Date(y,m,d);
    var btn=document.createElement('button');btn.textContent=d;btn.className='cd';
    if(date<TODAY){btn.classList.add('ps');}
    else{
      if(date.getTime()===TODAY.getTime())btn.classList.add('tod');
      if(U.startDate&&date.getTime()===U.startDate.getTime())btn.classList.add('pk');
      (function(dt){
        btn.onclick=function(){
          U.startDate=dt;renderMiniCal();
          document.getElementById('slbl').textContent=dt.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
          buildSummary();
        };
      })(date);
    }
    g.appendChild(btn);
  }
}
function bigNav(d){bigDate.setMonth(bigDate.getMonth()+d);renderBigCal();}
function renderBigCal(){
  var y=bigDate.getFullYear(),m=bigDate.getMonth();
  document.getElementById('bigmonth').textContent=MONTHS[m]+' '+y;
  var first=new Date(y,m,1),dow=first.getDay();if(dow===0)dow=7;dow--;
  var dim=new Date(y,m+1,0).getDate();
  var g=document.getElementById('bigdays');g.innerHTML='';
  for(var i=0;i<dow;i++){var e=document.createElement('div');e.className='bd emp';g.appendChild(e);}
  for(var d=1;d<=dim;d++){
    var date=new Date(y,m,d),key=date.toDateString(),plan=planMap[key];
    var isToday=date.toDateString()===TODAY.toDateString();
    var div=document.createElement('div');
    div.className='bd'+(isToday?' tod':'');
    div.innerHTML='<div class="bdn2">'+d+'</div>';
    if(plan){
      var bt=BLOCKS[plan.block];
      if(plan.block!=='rest'){
        var pill=document.createElement('div');pill.className='pill';
        pill.style.background=bt.col+'25';pill.style.color=bt.col;
        pill.textContent=bt.emo;div.appendChild(pill);
      }
      (function(dt,pl){div.onclick=function(){showDD(dt,pl);};})(date,plan);
    }
    g.appendChild(div);
  }
}
function renderTodayCard(){
  var tp=planMap[TODAY.toDateString()],tc=document.getElementById('atoday');if(!tc)return;
  var sH=document.getElementById('sec-hoy');
  if(tp&&tp.block!=='rest'){
    var bt=BLOCKS[tp.block],logSt=sessionLog[TODAY.toDateString()];
    tc.innerHTML='<div class="card" style="border-left:3px solid '+bt.col+';margin-bottom:0">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">'
      +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:16px;font-weight:700;color:'+bt.col+'">'+bt.label+'</div>'
      +(logSt?'<span style="font-size:11px;font-weight:700;color:'+(logSt==='done'?'#00E5A0':'#FF4D6A')+'">'+(logSt==='done'?'Completada':'No realizada')+'</span>':'<span style="font-size:10px;color:#444466">S'+tp.week+'</span>')
      +'</div>'
      +'<div style="font-size:11px;color:#7070AA;margin-bottom:8px">Toca el calendario para ver ejercicios y ciencia</div>'
      +(!logSt?'<div style="display:flex;gap:6px">'
        +'<button class="sa-btn" style="border-color:#00E5A0;background:#00E5A020;color:#00E5A0" onclick="markSess(\''+TODAY.toDateString()+'\',\'done\')">Hecho</button>'
        +'<button class="sa-btn" style="border-color:#FF4D6A;background:#FF4D6A20;color:#FF4D6A" onclick="markSess(\''+TODAY.toDateString()+'\',\'fail\')">No hice</button>'
        +'<button class="sa-btn" style="border-color:#FFB800;background:#FFB80020;color:#FFB800" onclick="openMvM(\''+TODAY.toDateString()+'\',\''+tp.block+'\')">Mover</button>'
        +'</div>'
        :'<button onclick="undoSess(\''+TODAY.toDateString()+'\')" style="padding:6px 14px;background:none;border:1px solid #1E1E38;border-radius:8px;color:#7070AA;font-size:11px;cursor:pointer">Deshacer</button>')
      +'</div>';
    if(sH)sH.style.display='block';
  } else {
    tc.innerHTML='<div class="card" style="text-align:center;padding:14px;margin-bottom:0;border-left:3px solid #444466"><div style="font-size:11px;color:#7070AA">Dia de descanso. Recuperate y come bien.</div></div>';
    if(sH)sH.style.display='block';
  }
}
function hcNav(d){hcDate.setMonth(hcDate.getMonth()+d);renderHC();}
function renderHC(){
  var y=hcDate.getFullYear(),m=hcDate.getMonth();
  var el=document.getElementById('hcal-mo');if(el)el.textContent=MONTHS[m]+' '+y;
  var first=new Date(y,m,1),dow=first.getDay();if(dow===0)dow=7;dow--;
  var dim=new Date(y,m+1,0).getDate();
  var g=document.getElementById('hcal-grid');if(!g)return;
  g.innerHTML='';
  for(var i=0;i<dow;i++){var e=document.createElement('div');e.className='hmcal-day emp';g.appendChild(e);}
  for(var d=1;d<=dim;d++){
    var date=new Date(y,m,d),key=date.toDateString();
    var plan=planMap[key];
    var isT=date.toDateString()===TODAY.toDateString();
    var isSel=hcSel&&date.toDateString()===hcSel.toDateString();
    var logSt=sessionLog[key];
    var div=document.createElement('div');
    div.className='hmcal-day'+(isT?' tod':'')+(isSel?' sel':'');
    var dn=document.createElement('div');dn.className='hmcal-dn';dn.textContent=d;div.appendChild(dn);
    if(plan&&plan.block!=='rest'){
      var bt=BLOCKS[plan.block];
      var state2=getSessionState(key,plan);
      var pc=state2==='completed'?'#00E5A0':state2==='missed'?'#FF4D6A':state2==='rescheduled'?'#FFB800':state2==='locked'?'#333355':bt.col;
      var pt=state2==='completed'?'OK':state2==='missed'?'NO':state2==='rescheduled'?'MV':state2==='locked'?'--':(bt.short||bt.emo||bt.label.slice(0,3));
      var pill=document.createElement('div');pill.className='hmcal-pill';
      pill.style.background=pc+'22';pill.style.color=pc;pill.textContent=pt;div.appendChild(pill);
    }
    (function(dt,pl,k){div.onclick=function(){hcSel=dt;renderHC();showDayPanel(dt,pl,k);};})(date,plan,key);
    g.appendChild(div);
  }
}
/* ──────────────────────────────────────────────────
   Day panel
────────────────────────────────────────────────── */


function showDayPanel(date,plan,key){
  var p=document.getElementById('home-daypanel');if(!p)return;
  if(!plan||plan.block==='rest'){
    var gapNote  = plan && plan.note === 'gap-forzado';
    var rockNote = plan && plan.outdoor;
    var restSci  = gapNote
      ? 'Horst (2016) + Guia Maestra: sesiones HIGH requieren 48h de recuperacion. El algoritmo omitio este dia para proteger tendones y SNC.'
      : rockNote
        ? 'Bechtel (Logical Progression): la roca exterior genera mayor carga sobre tendones y SNC que el gimnasio. Las sesiones posteriores se adaptan automaticamente.'
        : 'Horst (2016): la supercompensacion ocurre en el reposo. El descanso es parte activa del plan.';
    var restTitle = gapNote ? 'Buffer de recuperacion' : rockNote ? 'Dia de roca exterior' : 'Dia de descanso';
    var restCol   = gapNote ? '#FFB800' : rockNote ? '#9B6EFF' : '#444466';

    var rockBtn = rockNote
      ? '<button onclick="unmarkRockDay(\''+key+'\');" style="margin-top:8px;width:100%;padding:9px;background:#9B6EFF18;border:1.5px solid #9B6EFF;border-radius:10px;color:#9B6EFF;font-size:12px;font-family:\'JetBrains Mono\',monospace;cursor:pointer">Quitar dia de roca</button>'
      : '<button onclick="markRockDay(\''+key+'\');" style="margin-top:8px;width:100%;padding:9px;background:none;border:1.5px solid #9B6EFF55;border-radius:10px;color:#9B6EFF;font-size:12px;font-family:\'JetBrains Mono\',monospace;cursor:pointer">+ Marcar como roca exterior</button>'
        +'<div style="font-size:10px;color:#444466;margin-top:4px;text-align:center">El plan se ajusta automaticamente</div>';
    var overrideBtn = gapNote
      ? '<button onclick="forceSession(\''+key+'\');" style="margin-top:6px;width:100%;padding:9px;background:none;border:1.5px solid #FFB800;border-radius:10px;color:#FFB800;font-size:12px;font-family:\'JetBrains Mono\',monospace;cursor:pointer">Forzar sesion de todas formas</button>'
        +'<div style="font-size:10px;color:#444466;margin-top:4px;text-align:center">No recomendado</div>'
      : '';
    p.innerHTML='<div class="daypanel" style="border-left:3px solid '+restCol+'">'
      +'<div class="dp-title" style="color:#7070AA">'+ds+'</div>'
      +'<div class="dp-sub">'+restTitle+'</div>'
      +(gapNote?'<div style="background:#FFB80015;border:1px solid #FFB80044;border-radius:8px;padding:8px 12px;font-size:12px;color:#FFB800;margin-bottom:8px;display:flex;align-items:flex-start;gap:8px"><span>&#x26A0;</span><span>Dia omitido - menos de 48h desde sesion anterior.</span></div>':'')
      +(rockNote?'<div style="background:#9B6EFF15;border:1px solid #9B6EFF44;border-radius:8px;padding:8px 12px;font-size:12px;color:#9B6EFF;margin-bottom:8px">Escalada exterior registrada. Las sesiones posteriores estan ajustadas.</div>':'')
      +'<div class="sci-box"><div class="sci-tag">'+(gapNote?'Horst 2016':rockNote?'Bechtel 2019':'Horst 2016')+'</div><div class="sci-txt">'+restSci+'</div></div>'
      + rockBtn + overrideBtn
      +'</div>';
    return;
  }

  if(!plan||plan.block==='rest'){
    /* Check if this rest was forced by spacing guard  -  show explanation */
    var gapNote = plan && plan.note === 'gap-forzado';
    var rockNote = plan && plan.note === 'roca';
    var restSci = gapNote
      ? 'Horst (2016) + RCTM: sesiones HIGH requieren 48h de recuperacion entre ellas. El algoritmo omitio este dia para proteger tu sistema nervioso central y los tendones digitales.'
      : rockNote
        ? 'Bechtel (Logical Progression): reservar energia para escalar en roca maximiza el rendimiento en exterior. No entrenamiento de alta intensidad el dia antes.'
        : 'Horst (2008): el descanso es parte integral del entrenamiento. Sintesis proteica y reparacion neural ocurren en el reposo.';
    var restTitle = gapNote ? 'Buffer de recuperacion' : rockNote ? 'Dia de roca exterior' : 'Dia de descanso';
    var overrideBtn = gapNote
      ? '<button onclick="forceSession(\''+key+'\')" style="margin-top:10px;width:100%;padding:9px;background:none;border:1.5px solid #FFB800;border-radius:10px;color:#FFB800;font-size:12px;font-family:\'JetBrains Mono\',monospace;cursor:pointer">Forzar sesion de todas formas</button>'
        +'<div style="font-size:10px;color:#444466;margin-top:6px;text-align:center">No recomendado  -  riesgo de sobreentrenamiento</div>'
      : '';
    p.innerHTML='<div class="daypanel" style="border-left:3px solid '+(gapNote?'#FFB800':rockNote?'#9B6EFF':'#444466')+'">'
      +'<div class="dp-title" style="color:#7070AA">'+ds+'</div>'
      +'<div class="dp-sub">'+restTitle+'</div>'
      +(gapNote?'<div style="background:#FFB80015;border:1px solid #FFB80044;border-radius:8px;padding:8px 12px;font-size:12px;color:#FFB800;margin-bottom:10px;display:flex;align-items:flex-start;gap:8px"><span>&#x26A0;</span><span>Dia omitido por el planificador  -  menos de 48h desde la sesion anterior.</span></div>':'')
      +'<div class="sci-box"><div class="sci-tag">'+(gapNote?'Horst 2016 / RCTM':rockNote?'Bechtel':'Barrows 2013')+'</div><div class="sci-txt">'+restSci+'</div></div>'
      +overrideBtn
      +'</div>';
    return;
  }

  /* -- Session state -- */
  var state = getSessionState(key, plan);
  var sm    = SS_META[state] || SS_META.locked;
  var bt    = BLOCKS[plan.block];
  /* Human-readable date string: "Lunes 18/05/2026" */
  var ds = DLG[date.getDay()] + ' ' + date.getDate() + '/' + ('0'+(date.getMonth()+1)).slice(-2) + '/' + date.getFullYear();

  /* -- Session type badge (Go Hard / Do More / Explore) -- */
  var stypeBadge = '';
  if(bt.sessionType && bt.sessionType!=='Rest' && bt.sessionType!=='Test'){
    var stypeCol = bt.sessionType==='Go Hard'?'#FF4D6A':bt.sessionType==='Do More'?'#00C8FF':'#00E5A0';
    stypeBadge = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap">'
      +'<span style="font-size:9px;font-family:\'JetBrains Mono\',monospace;padding:3px 10px;border-radius:99px;'
        +'border:1px solid '+stypeCol+'44;background:'+stypeCol+'15;color:'+stypeCol+';font-weight:700">'
        +bt.sessionType.toUpperCase()+'</span>'
      +(bt.dial?'<span style="font-size:9px;color:#444466;font-family:\'JetBrains Mono\',monospace">Dial: '+bt.dial+'</span>':'')
      +(bt.faderRange?'<span style="font-size:9px;color:#444466;font-family:\'JetBrains Mono\',monospace">Fader: '+bt.faderRange+'/10</span>':'')
    +'</div>'
    +(bt.faderDesc?'<div style="font-size:10px;color:#7070AA;margin-bottom:8px;line-height:1.5">'+bt.faderDesc+'</div>':'');
  }

  /* -- Goal-specific focus (SAID principle) -- */
  var goalFocusHtml = '';
  if(bt.goalFocus && U.goal && bt.goalFocus[U.goal]){
    goalFocusHtml = '<div style="background:#131326;border-left:2px solid '+bt.col+'66;border-radius:0 6px 6px 0;padding:6px 10px;margin-bottom:10px">'
      +'<div style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:#444466;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Enfoque SAID para tu objetivo</div>'
      +'<div style="font-size:11px;color:#EDEDFF;line-height:1.5">'+bt.goalFocus[U.goal]+'</div>'
    +'</div>';
  }

  /* Level-aware safety warning */
  var safetyWarn = getSafetyWarning(plan.block, U.level);
  var safetyHtml = safetyWarn
    ? '<div style="background:#FFB80015;border:1px solid #FFB80044;border-radius:8px;padding:8px 12px;font-size:11px;color:#FFB800;margin-bottom:10px;display:flex;align-items:flex-start;gap:8px"><span style="flex-shrink:0">&#x26A0;</span><span>'+safetyWarn+'</span></div>'
    : '';
  var isT   = date.toDateString()===TODAY.toDateString();
  var isPast = date < TODAY;

  /* -- Week lock check -- */
  var wkIdx = plan.week ? plan.week-1 : 0;
  var locked = isWeekLocked(wkIdx);
  var lockBanner = '';
  if(locked && state==='locked'){
    var prevComp = getWeekCompletion(wkIdx-1);
    lockBanner = '<div class="wk-lock-banner"><div class="wk-lock-icon">&#x1F512;</div><div class="wk-lock-txt">Semana bloqueada. La semana anterior tuvo '+prevComp.pct+'% de completado (minimo: 70%). Completa las sesiones pendientes para desbloquear.</div></div>';
  }

  /* -- Status banner -- */
  var stBan = '';
  if(state!=='locked'&&state!=='available'){
    var banBg  = sm.col+'20', banBd = sm.col+'55';
    stBan = '<div style="background:'+banBg+';border:1px solid '+banBd+';border-radius:8px;padding:8px 12px;font-size:12px;color:'+sm.col+';margin-bottom:10px;display:flex;align-items:center;gap:8px">'
      +'<span>'+sm.icon+'</span><span>'+sm.lbl+'</span>'
      +'</div>';
  }
  if(state==='available'&&isT){
    stBan = '<div style="background:#CCFF0015;border:1px solid #CCFF0033;border-radius:8px;padding:8px 12px;font-size:12px;color:#CCFF00;margin-bottom:10px;display:flex;align-items:center;gap:8px">'
      +'<span>'+sm.icon+'</span><span>Sesion de hoy  -  lista para comenzar</span>'
      +'</div>';
  }

  /* -- Exercises with variation engine -- */
  var exs = getExercisesForDay(key, plan.block);
  /* Universal warm-up — same template for all blocks.
     Based on Horst (2016) / Anderson (RCTM): warm-up must NOT be training modality. */
  var warmupExs = (typeof UNIVERSAL_WARMUP !== 'undefined') ? UNIVERSAL_WARMUP : [];

  /* -- Week progress bar -- */
  var wkComp = getWeekCompletion(wkIdx);
  var progCol = wkComp.pct>=70?'#00E5A0':wkComp.pct>=40?'#FFB800':'#FF4D6A';
  var progBar = '<div style="margin-bottom:12px">'
    +'<div style="display:flex;justify-content:space-between;margin-bottom:4px">'
      +'<span style="font-size:10px;color:#7070AA;font-family:\'JetBrains Mono\',monospace">Semana '+plan.week+'</span>'
      +'<span style="font-size:10px;font-family:\'JetBrains Mono\',monospace;color:'+progCol+'">'+wkComp.done+'/'+wkComp.total+' ('+wkComp.pct+'%)</span>'
    +'</div>'
    +'<div class="mtr"><div class="mf" style="width:'+wkComp.pct+'%;background:'+progCol+'"></div></div>'
    +(wkComp.pct<70&&wkComp.total>0?'<div style="font-size:10px;color:#FFB800;margin-top:3px">Completa el 70% para avanzar de semana</div>':'')
    +'</div>';

  /* -- Action buttons  -  depends on state -- */
  var actHtml = '';
  if(state==='available'||state==='missed'){
    actHtml = '<div style="display:flex;gap:6px;margin-top:10px">'
      +'<button class="sa-btn" style="border-color:#00E5A0;background:#00E5A020;color:#00E5A0" onclick="markSess(\''+key+'\',\'done\')">Hecho</button>'
      +'<button class="sa-btn" style="border-color:#FF4D6A;background:#FF4D6A20;color:#FF4D6A" onclick="markSess(\''+key+'\',\'fail\')">No hice</button>'
      +(state==='available'&&!isPast?'<button class="sa-btn" style="border-color:#FFB800;background:#FFB80020;color:#FFB800" onclick="openMvM(\''+key+'\',\''+plan.block+'\')">Mover</button>':'')
      +'</div>'
      /* Always-visible rock button — user can convert any day to outdoor */
      +'<button onclick="markRockDay(\''+key+'\')" style="margin-top:8px;width:100%;padding:8px;background:none;border:1.5px solid #9B6EFF55;border-radius:10px;color:#9B6EFF;font-size:11px;font-family:\'JetBrains Mono\',monospace;cursor:pointer;touch-action:manipulation">Convertir a dia de roca</button>'
      +'<div style="font-size:9px;color:#444466;margin-top:3px;text-align:center">El plan se ajusta automaticamente</div>';
  } else if(state==='completed'||state==='rescheduled'){
    actHtml = '<button onclick="undoSess(\''+key+'\')" style="margin-top:8px;padding:6px 14px;background:none;border:1px solid #1E1E38;border-radius:8px;color:#7070AA;font-size:11px;cursor:pointer">Deshacer</button>';
  } else if(state==='locked'){
    actHtml = '<div style="margin-top:8px;font-size:11px;color:#444466;font-family:\'JetBrains Mono\',monospace">Sesion futura  -  pendiente de desbloqueo</div>';
  }

  /* -- Build exercise cards -- */
  var dk = date.getDate()+'x'+date.getMonth();
  var exHtml = '';

  /* ────────────────────────────────────────────────────
     STRUCTURED SESSION RENDERER — 5 phases with timing
     Based on Lattice / Anderson session anatomy
     Duration scales with U.session (from onboarding)
  ──────────────────────────────────────────────────── */
  var sessionMin = U.session || 90;
  var phases = (typeof getSessionPhases === 'function')
    ? getSessionPhases(plan.block, sessionMin, U.goal)
    : [];

  if(phases.length > 0){
    /* Session header with total duration */
    var totalMin = phases.reduce(function(s,p){return s + p.minutes;}, 0);
    exHtml += '<div style="margin-top:14px;margin-bottom:10px;padding:12px;background:#0F0F1E;border-radius:10px;border:1px solid #1A1A32">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:15px;font-weight:700;color:#EDEDFF">Estructura de sesion</div>'
        +'<div style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:#CCFF00;background:#182000;padding:3px 10px;border-radius:99px">'+totalMin+' min</div>'
      +'</div>'
      +'<div style="font-size:11px;color:#7070AA;line-height:1.5">Adaptada a tus '+sessionMin+' min de sesion configurados en el perfil.</div>'
    +'</div>';

    /* Render each phase */
    phases.forEach(function(ph, pi){
      var pid = 'ph'+dk+pi;
      var phEx = [];
      if(ph.id === 'warmup'){
        phEx = warmupExs;
      } else if(ph.id === 'main'){
        phEx = exs;
      }

      /* Phase header */
      exHtml += '<div style="margin-top:14px;margin-bottom:8px;display:flex;align-items:center;gap:8px;padding:8px 10px;background:'+ph.col+'12;border-left:3px solid '+ph.col+';border-radius:0 8px 8px 0">'
        +'<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:'+ph.col+';font-weight:700;background:'+ph.col+'22;padding:2px 8px;border-radius:99px">'+(pi+1)+'</div>'
        +'<div style="flex:1">'
          +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:700;color:'+ph.col+';line-height:1.1">'+ph.label+'</div>'
          +'<div style="font-size:10px;color:#7070AA;margin-top:1px">'+ph.desc+'</div>'
        +'</div>'
        +'<div style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:'+ph.col+';font-weight:700;flex-shrink:0">'+ph.minutes+' min</div>'
      +'</div>';

      /* Phase content */
      if(phEx.length > 0){
        /* Render the exercises in this phase */
        phEx.forEach(function(ex, ei){
          var eid = 'e'+pid+ei;
          var exCol = (ph.id === 'warmup') ? '#FFB800' : (ex.col || bt.col);
          var humanSys = SYS_HUMAN[ex.sys] || ex.sys || '';
          var det = (getLevelTier()===0 && ex.simple) ? ex.simple : (ex.det || '');
          var nota = ex.nota || '';
          var sci = ex.sci || '';
          exHtml += '<div class="ex-card" style="border-left-color:'+exCol+';background:'+exCol+'08;margin-left:10px">'
            +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px">'
              +'<div class="ex-name" style="color:'+exCol+'">'+ex.n+'</div>'
              +(humanSys?'<span class="ex-var-badge" style="background:'+exCol+'18;color:'+exCol+'">'+humanSys+'</span>':'')
            +'</div>'
            +(nota?'<div class="ex-nota" style="background:'+exCol+'15;color:'+exCol+'">'+nota+'</div>':'')
            +(det?'<div class="ex-det" style="font-size:12px;color:#7070AA;line-height:1.5;margin-top:4px">'+det+'</div>':'')
            +(sci?'<div style="margin-top:4px"><button id="btn'+eid+'" onclick="tgSci(\''+eid+'\')" style="background:none;border:none;color:#7070AA;font-size:10px;font-family:\'JetBrains Mono\',monospace;cursor:pointer;padding:0">+ ciencia</button>'
              +'<div id="sci'+eid+'" style="display:none;font-size:10px;color:#444466;margin-top:4px;line-height:1.5;border-top:1px solid #1A1A32;padding-top:4px">'+sci+'</div></div>':'')
          +'</div>';
        });
      } else if(ph.content){
        /* Phase has goal-specific content suggestion (supplementary) */
        exHtml += '<div style="margin-left:10px;padding:10px 12px;background:'+ph.col+'08;border:1px dashed '+ph.col+'33;border-radius:8px;margin-bottom:6px">'
          +'<div style="font-size:12px;color:#EDEDFF;line-height:1.5">'+ph.content+'</div>'
        +'</div>';
      } else {
        /* Generic guidance for phases without specific exercises */
        var genericGuide = {
          warmup:  'Movilidad de munecas, codos y hombros (3-5 min). Escalada facil progresiva V0-V2 (10 min). Activacion suave de dedos.',
          condi:   'Trabajo de antagonistas: push-ups, rotaciones externas con banda, face-pulls. Core: planchas, L-sit, dragon flag.',
          cooldown:'Cuelgues pasivos en jugs (2-3 min). Estiramiento de antebrazos. Movilidad de hombros y muneca. Respiracion profunda.'
        };
        var gen = genericGuide[ph.id] || '';
        if(gen){
          exHtml += '<div style="margin-left:10px;padding:10px 12px;background:'+ph.col+'08;border:1px dashed '+ph.col+'33;border-radius:8px;margin-bottom:6px">'
            +'<div style="font-size:12px;color:#7070AA;line-height:1.5">'+gen+'</div>'
          +'</div>';
        }
      }
    });
  } else {
    /* Fallback: legacy rendering if SESSION_STRUCTURE doesnt cover this block */
    if(warmupExs.length > 0){
      exHtml += '<div style="margin-top:14px;margin-bottom:8px;display:flex;align-items:center;gap:8px"><div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:#FFB800;text-transform:uppercase;letter-spacing:1.5px;font-weight:700">Calentamiento</div></div>';
      warmupExs.forEach(function(ex){
        exHtml += '<div class="ex-card" style="border-left-color:#FFB800"><div class="ex-name" style="color:#FFB800">'+ex.n+'</div></div>';
      });
    }
    exs.forEach(function(ex){
      exHtml += '<div class="ex-card" style="border-left-color:'+(ex.col||bt.col)+'"><div class="ex-name">'+ex.n+'</div></div>';
    });
  }

  p.innerHTML = '<div class="daypanel" style="border-left:3px solid '+bt.col+'">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">'
      +'<div class="dp-title" style="color:'+bt.col+'">'+bt.label+' S'+plan.week+'</div>'
      +(isT?'<span style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#CCFF00;background:#182000;padding:3px 8px;border-radius:99px">HOY</span>':'')
    +'</div>'
    + stypeBadge
    +'<div class="dp-sub">'+ds+'</div>'
    + safetyHtml
    + goalFocusHtml
    + lockBanner
    + stBan
    + progBar
    +'<div class="sci-box"><div class="sci-tag">Metodologia de fase</div><div class="sci-txt">'+(BSCI[plan.block]||'')+'</div></div>'
    + exHtml
    + actHtml
    +'</div>';

  p.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function tgSci(eid){
  var el=document.getElementById('sci'+eid),btn=document.getElementById('btn'+eid);
  if(!el||!btn)return;
  var open=el.style.display!=='none';
  el.style.display=open?'none':'block';
  btn.textContent=open?'+ ciencia':'- ocultar';
  btn.style.color=open?'#7070AA':'#CCFF00';
}
/* ──────────────────────────────────────────────────
   Session actions
────────────────────────────────────────────────── */


function markSess(dstr,status){
  sessionLog[dstr]=status;saveSL();
  renderHC();renderBigCal();renderWk();renderTodayCard();
  if(hcSel&&hcSel.toDateString()===dstr)showDayPanel(hcSel,planMap[dstr],dstr);
  showToast(status==='done'?'Sesion completada!':'Registrado.',status==='done'?'#00E5A0':'#FF4D6A');
}
function undoSess(dstr){
  delete sessionLog[dstr];saveSL();
  renderHC();renderBigCal();renderWk();renderTodayCard();
  if(hcSel&&hcSel.toDateString()===dstr)showDayPanel(hcSel,planMap[dstr],dstr);
  showToast('Deshecho','#7070AA');
}
function openMvM(dstr,btype){
  var orig=new Date(dstr);
  var ti=document.getElementById('mv-title'),sb=document.getElementById('mv-sub');
  if(ti)ti.textContent='Mover sesion de '+DLG[orig.getDay()];
  if(sb)sb.textContent='Elegir nuevo dia para '+BLOCKS[btype].label;
  var opts=document.getElementById('mv-opts');if(!opts)return;
  opts.innerHTML='';
  for(var i=1;i<=7;i++){
    var date=new Date(orig);date.setDate(date.getDate()+i);
    var key=date.toDateString();
    var ex=planMap[key],busy=ex&&ex.block!=='rest'&&!sessionLog[key];
    var btn=document.createElement('button');
    btn.style.cssText='width:100%;padding:12px 16px;background:#131326;border:1px solid #1E1E38;border-radius:12px;color:#EDEDFF;font-size:13px;text-align:left;cursor:pointer;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center';
    btn.innerHTML='<span>'+DLG[date.getDay()]+' '+date.getDate()+'/'+('0'+(date.getMonth()+1)).slice(-2)+'</span>'
      +(busy?'<span style="font-size:10px;color:#FFB800">sesion existente</span>':'<span style="font-size:10px;color:#444466">libre</span>');
    (function(tk,td,b,os,ot){btn.onclick=function(){doMv(os,ot,tk,td,b);};})(key,date,busy,dstr,btype);
    opts.appendChild(btn);
  }
  document.getElementById('mv-modal').classList.add('on');
}
function closeMvModal(){
  document.getElementById('mv-modal').classList.remove('on');
  if(document.activeElement)document.activeElement.blur();
}
function doMv(fromK,btype,toK,toDate,busy){
  closeMvModal();
  planMap[toK]={block:btype,week:planMap[fromK]?planMap[fromK].week:1,moved:true};
  if(planMap[fromK])planMap[fromK].movedTo=toK;
  moveLog[fromK]=toK;sessionLog[fromK]='moved';saveSL();
  renderHC();renderBigCal();renderWk();renderTodayCard();
  var msg='Sesion movida al '+DLG[toDate.getDay()]+' '+toDate.getDate()+'.';
  if(busy)msg+=' Ese dia ya tenia sesion - recuperacion puede verse afectada (Barrows 2013).';
  showToast(msg,'#FFB800');
}
/* ──────────────────────────────────────────────────
   Week view
────────────────────────────────────────────────── */


function wkNav(d){
  var seqLen=U.plan==='4-3-2-1'?4:3;
  var n=wkOff+d;
  if(n<0){showToast('Primera semana del plan','#7070AA');return;}
  if(n>=seqLen){showToast('Ultima semana del ciclo','#7070AA');return;}
  wkOff=n;renderWk();
}
function renderWk(){
  if(!U.startDate)return;
  var seqs={'4-3-2-1':['strength','power','endurance','deload'],'3-2-1':['strength','power','deload']};
  var seq=seqs[U.plan]||seqs['4-3-2-1'];
  var totalWks=seq.length;
  var wkStart=new Date(U.startDate);wkStart.setDate(wkStart.getDate()+wkOff*7);
  var curBlock=seq[wkOff]||'rest';
  var bt=BLOCKS[curBlock]||BLOCKS.rest;
  var nextBlock=wkOff+1<seq.length?BLOCKS[seq[wkOff+1]]:null;

  /* ── WEEK LABEL ── */
  var lbl=document.getElementById('wk-lbl');
  if(lbl)lbl.textContent='Semana '+(wkOff+1)+' de '+totalWks;

  /* ── PHASE CONTEXT HEADER ── */
  var daysToEnd=(totalWks-(wkOff+1))*7;
  var nextTxt=nextBlock?' A continuacion: '+nextBlock.label+'.':'Ultima semana del ciclo.';
  var phaseCtx='<div style="background:'+bt.col+'18;border:1px solid '+bt.col+'33;border-radius:10px;padding:10px 12px;margin-bottom:12px">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'
      +'<div style="width:8px;height:8px;border-radius:50%;background:'+bt.col+';flex-shrink:0"></div>'
      +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:17px;font-weight:700;color:'+bt.col+'">Fase '+bt.label+'</div>'
      +'<div style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:'+bt.col+';background:'+bt.col+'22;padding:2px 8px;border-radius:99px">S'+(wkOff+1)+'/'+totalWks+'</div>'
    +'</div>'
    +'<div style="font-size:11px;color:#7070AA;line-height:1.5">'
      +(daysToEnd>0?'Faltan '+daysToEnd+' dias para terminar el ciclo. ':'')
      +nextTxt
    +'</div>'
  +'</div>';

  /* ── WEEKLY FATIGUE LOAD (uses EX_POOL directly, no DOM deps) ── */
  var totalFat=0,trainDays=0;
  for(var di=0;di<7;di++){
    var dd=new Date(wkStart);dd.setDate(dd.getDate()+di);
    var pp=planMap[dd.toDateString()];
    if(pp&&pp.block!=='rest'&&pp.block!=='test'){
      trainDays++;
      var poolEx=EX_POOL[pp.block]||[];
      var tier2=getLevelTier();
      var filtered=poolEx.filter(function(e){return (e.minLevel||0)<=tier2;});
      var sample=filtered.slice(0,4);
      sample.forEach(function(e){totalFat+=(e.fatigue||3);});
    }
  }
  var avgFat=trainDays>0?Math.round(totalFat/trainDays*10)/10:0;
  var fatCol=avgFat<=2?'#00E5A0':avgFat<=3.5?'#FFB800':'#FF4D6A';
  var fatLbl=avgFat<=2?'Carga ligera':avgFat<=3.5?'Carga moderada':'Carga alta';
  var fatLoad='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">'
    +'<div style="background:#0F0F1E;border:1px solid #1A1A32;border-radius:10px;padding:10px;text-align:center">'
      +'<div style="font-family:\'JetBrains Mono\',monospace;font-size:20px;font-weight:700;color:'+fatCol+'">'+avgFat+'</div>'
      +'<div style="font-size:9px;color:#444466">Fatiga media/sesion</div>'
      +'<div style="font-size:9px;color:'+fatCol+';margin-top:2px">'+fatLbl+'</div>'
    +'</div>'
    +'<div style="background:#0F0F1E;border:1px solid #1A1A32;border-radius:10px;padding:10px;text-align:center">'
      +'<div style="font-family:\'JetBrains Mono\',monospace;font-size:20px;font-weight:700;color:#CCFF00">'+trainDays+'</div>'
      +'<div style="font-size:9px;color:#444466">Sesiones esta semana</div>'
      +'<div style="font-size:9px;color:#7070AA;margin-top:2px">'+totalWks+' sem totales</div>'
    +'</div>'
  +'</div>';

  var cont=document.getElementById('wk-days');if(!cont)return;

  /* week lock banner */
  var wkLocked=isWeekLocked(wkOff);
  var lockHtml='';
  if(wkLocked){
    var prevComp2=getWeekCompletion(wkOff-1);
    lockHtml='<div class="wk-lock-banner"><div class="wk-lock-icon">&#x1F512;</div><div class="wk-lock-txt">Semana bloqueada: semana anterior con '+prevComp2.pct+'% completado (minimo 70%). Registra las sesiones pendientes.</div></div>';
  }
  cont.innerHTML=phaseCtx+fatLoad+lockHtml;

  var trainN=0,doneN=0;
  for(var di=0;di<7;di++){
    var date=new Date(wkStart);date.setDate(date.getDate()+di);
    var key=date.toDateString(),plan=planMap[key];
    var isT=date.toDateString()===TODAY.toDateString();
    var state3=plan?getSessionState(key,plan):'rest';
    var sm3=SS_META[state3]||SS_META.locked;
    if(plan&&plan.block!=='rest')trainN++;
    if(state3==='completed')doneN++;

    var div=document.createElement('div');
    div.className='week-day'+(isT?' hl':'');

    var hd='<div class="wd-hd">'
      +'<span class="wd-name">'+DLG[date.getDay()]+(isT?' <span style="font-size:9px;color:#CCFF00">HOY</span>':'')+'</span>'
      +'<div style="display:flex;align-items:center;gap:6px">'
        +(state3!=='rest'?'<span class="badge '+sm3.css+'" style="font-size:8px;padding:2px 7px">'+sm3.lbl+'</span>':'')
        +'<span style="font-size:10px;color:#444466;font-family:\'JetBrains Mono\',monospace">'+date.getDate()+'/'+('0'+(date.getMonth()+1)).slice(-2)+'</span>'
      +'</div></div>';

    if(!plan||plan.block==='rest'){
      var restNote=plan&&plan.note==='gap-forzado'
        ?'<div style="font-size:10px;color:#FFB800;margin-top:4px">Buffer de recuperacion - espaciado fisiologico</div>':
        plan&&plan.note==='roca'
        ?'<div style="font-size:10px;color:#9B6EFF;margin-top:4px">Dia reservado para escalar en roca</div>':'';
      div.innerHTML=hd+'<div style="font-size:12px;color:#444466">Descanso'+restNote+'</div>';
    } else {
      var pbt=BLOCKS[plan.block];
      var bordCol=state3==='completed'?'#00E5A0':state3==='missed'?'#FF4D6A':state3==='rescheduled'?'#FFB800':pbt.col;

      /* ── EXERCISES — expandable ── */
      var dayExs=getExercisesForDay(key,plan.block);
      var exCardId='wkex'+di;

      /* fatigue dots for this session */
      var sessLoad=0;dayExs.forEach(function(e){sessLoad+=(e.fatigue||3);});
      var sessLoadCol=sessLoad<=8?'#00E5A0':sessLoad<=12?'#FFB800':'#FF4D6A';

            /* preview: ALL exercise names as compact pills */
      var exPreview = '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px">';
      dayExs.forEach(function(e){
        var eCol = e.col || pbt.col;
        exPreview += '<span style="font-size:10px;font-family:\'JetBrains Mono\',monospace;'
          +'background:#0F0F1E;border:1px solid '+eCol+'33;border-radius:6px;'
          +'padding:3px 7px;color:#EDEDFF;line-height:1.4">'+e.n+'</span>';
      });
      exPreview += '</div>';

      /* full list: organized by Calentamiento / Entrenamiento principal */
      var dayWarmups = (typeof UNIVERSAL_WARMUP !== 'undefined') ? UNIVERSAL_WARMUP : [];
      var renderExCard = function(e, isWarmup){
        var eCol = isWarmup ? '#FFB800' : (e.col || pbt.col);
        var notaTxt = e.nota
          ? '<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:'+eCol+';background:'+eCol+'18;border-radius:4px;padding:3px 7px;margin:3px 0">'+e.nota+'</div>'
          : '';
        var detTxt = '<div style="font-size:11px;color:#7070AA;line-height:1.5;margin-bottom:4px">'+(getLevelTier()===0&&e.simple?e.simple:e.det)+'</div>';
        var badge = isWarmup
          ? '<span style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:#FFB800;background:#FFB80018;padding:1px 7px;border-radius:99px">warm-up</span>'
          : '<span style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:'+eCol+';background:'+eCol+'18;padding:1px 7px;border-radius:99px">'+(SYS_HUMAN[e.sys]||e.sys)+'</span>';
        return '<div style="background:#0C0C1A;border-radius:8px;padding:10px;border-left:2px solid '+eCol+';margin-bottom:6px">'
          +'<div style="font-size:12px;font-weight:600;color:#EDEDFF;margin-bottom:2px">'+e.n+'</div>'
          + badge + notaTxt + detTxt
          + makeFatigueDots(e.fatigue||3, eCol)
          +'</div>';
      };

      var exFull = '';
      if(dayWarmups.length > 0){
        exFull += '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#FFB800;text-transform:uppercase;letter-spacing:1.2px;margin:4px 0 6px;font-weight:700">Calentamiento</div>';
        dayWarmups.forEach(function(e){ exFull += renderExCard(e, true); });
      }
      if(dayExs.length > 0){
        exFull += '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:'+pbt.col+';text-transform:uppercase;letter-spacing:1.2px;margin:10px 0 6px;font-weight:700">Entrenamiento principal</div>';
        dayExs.forEach(function(e){ exFull += renderExCard(e, false); });
      }

      /* action buttons */
      var acts='';
      if(state3==='available'||state3==='missed'){
        var isPast2=date<TODAY;
        acts='<div class="sc-acts">'
          +'<button class="sc-btn" style="border-color:#00E5A0;background:#00E5A020;color:#00E5A0" onclick="markSess(\''+key+'\',\'done\')">Hecho</button>'
          +'<button class="sc-btn" style="border-color:#FF4D6A;background:#FF4D6A20;color:#FF4D6A" onclick="markSess(\''+key+'\',\'fail\')">No</button>'
          +(!isPast2?'<button class="sc-btn" style="border-color:#FFB800;background:#FFB80020;color:#FFB800" onclick="openMvM(\''+key+'\',\''+plan.block+'\')">Mover</button>':'')
          +'</div>';
      } else if(state3==='completed'||state3==='rescheduled'){
        acts='<button onclick="undoSess(\''+key+'\')" style="margin-top:6px;padding:5px 10px;background:none;border:1px solid #1E1E38;border-radius:6px;color:#7070AA;font-size:10px;cursor:pointer">Deshacer</button>';
      } else if(state3==='locked'){
        acts='<div style="font-size:10px;color:#333355;margin-top:6px;font-family:\'JetBrains Mono\',monospace">&#x1F512; sesion futura</div>';
      }

      div.innerHTML=hd
        +'<div class="sess-card" style="border-left:3px solid '+bordCol+'">'
          +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
            +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:700;color:'+pbt.col+'">'+pbt.label+'</div>'
            +'<div style="display:flex;align-items:center;gap:6px">'
              +'<span style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:'+sessLoadCol+'">carga '+sessLoad+'</span>'
              +'<button id="'+exCardId+'-btn" onclick="toggleWkEx(\''+exCardId+'\')" style="font-size:10px;color:#7070AA;background:#131326;border:1px solid #1E1E38;border-radius:6px;padding:3px 8px;cursor:pointer">+ ver</button>'
            +'</div>'
          +'</div>'
          +exPreview
          +'<div id="'+exCardId+'" style="display:none;margin-top:8px;border-top:1px solid #1A1A32;padding-top:8px">'+exFull+'</div>'
          +acts
        +'</div>';
    }
    cont.appendChild(div);
  }

  var pct=trainN>0?Math.round(doneN/trainN*100):0;
  var pctCol=pct>=70?'#00E5A0':pct>=40?'#FFB800':'#FF4D6A';
  var pl=document.getElementById('wk-prog-lbl'),pb=document.getElementById('wk-prog-bar');
  if(pl)pl.textContent=doneN+'/'+trainN+' ('+pct+'%)';
  if(pb){pb.style.width=pct+'%';pb.style.background=pctCol;}
}
function toggleWkEx(id){
  var el=document.getElementById(id);
  var btn=document.getElementById(id+'-btn');
  if(!el||!btn)return;
  var open=el.style.display!=='none';
  el.style.display=open?'none':'block';
  btn.textContent=open?'+ ver':'- ocultar';
  btn.style.color=open?'#7070AA':'#CCFF00';
  btn.style.borderColor=open?'#1E1E38':'#CCFF0044';
}
/* ──────────────────────────────────────────────────
   Plan page tabs
────────────────────────────────────────────────── */


function renderPlanPage(){
  var c=document.getElementById('planc');if(!c)return;
  c.innerHTML='<div class="ptabs"><button class="ptab on" onclick="swPT(this,\'ptej\')">Ejercicios</button><button class="ptab" onclick="swPT(this,\'pthb\')">Hangboard</button><button class="ptab" onclick="swPT(this,\'ptts\')">Tests</button></div><div class="ptabc on" id="ptej"></div><div class="ptabc" id="pthb"></div><div class="ptabc" id="ptts"></div>';
  buildExTab();buildHBTab();buildTsTab();
}
function swPT(el,tid){el.parentElement.querySelectorAll('.ptab').forEach(function(t){t.classList.remove('on');});document.querySelectorAll('.ptabc').forEach(function(t){t.classList.remove('on');});el.classList.add('on');var t=document.getElementById(tid);if(t)t.classList.add('on');}
function buildExTab(){
  var c=document.getElementById('ptej');if(!c)return;
  var tier=getLevelTier();

  /* ─────────────────────────────────────────────────────
     CATEGORY METADATA — new professional taxonomy
     ───────────────────────────────────────────────────── */
  var CAT_META={
    finger_strength:    {label:'Fuerza de dedos',     icon:'&#x270A;', col:'#38BDF8',
                         desc:'Hangboard, max hangs, one-arm hangs'},
    pull_strength:      {label:'Fuerza de traccion',  icon:'&#x1F4AA;', col:'#60A5FA',
                         desc:'Dominadas, lock-offs, pull-ups con lastre'},
    power:              {label:'Potencia',            icon:'&#x26A1;',  col:'#9B6EFF',
                         desc:'Movimientos explosivos, dinamicos al limite'},
    campus_board:       {label:'Campus Board',        icon:'&#x1FA9C;', col:'#A855F7',
                         desc:'Potencia reactiva sin pies'},
    wall_training:      {label:'Muro de entrenamiento',icon:'&#x1F9D7;', col:'#EC4899',
                         desc:'Boulder al limite, 4x4, system board'},
    power_endurance:    {label:'Power endurance',     icon:'&#x1F525;', col:'#F472B6',
                         desc:'Circuitos intensos, on/off, intervalos'},
    aerobic_endurance:  {label:'Resistencia aerobica',icon:'&#x1F30A;', col:'#06B6D4',
                         desc:'ARC, escalada continua, base aerobica'},
    technique:          {label:'Tecnica',             icon:'&#x1F3AF;', col:'#10B981',
                         desc:'Skill work, travesias tecnicas'},
    mobility:           {label:'Movilidad y prevencion',icon:'&#x1F9D8;',col:'#00E5A0',
                         desc:'Movilidad, antagonistas, recuperacion activa'}
  };

  /* ─────────────────────────────────────────────────────
     COLLECT ALL EXERCISES from EX_POOL (across all blocks)
     ───────────────────────────────────────────────────── */
  var allExercises=[];
  ['strength','power','endurance','deload'].forEach(function(block){
    var pool=EX_POOL[block]||[];
    pool.forEach(function(ex){
      if((ex.minLevel||0)<=tier){
        allExercises.push({ex:ex,block:block});
      }
    });
  });

  /* current phase */
  var seqs={'4-3-2-1':['strength','power','endurance','deload'],'3-2-1':['strength','power','deload']};
  var seq=seqs[U.plan]||seqs['4-3-2-1'];
  var curWkIdx=getCurrentWeekIndex();
  var curBlock=seq[Math.min(curWkIdx,seq.length-1)]||'strength';
  var curBt=BLOCKS[curBlock]||BLOCKS.strength;

  /* ─────────────────────────────────────────────────────
     SECTION 1: Ejercicios de hoy
     ───────────────────────────────────────────────────── */
  var todayKey=TODAY.toDateString();
  var todayPlan=planMap[todayKey];
  var todayHtml='';
  if(todayPlan && todayPlan.block!=='rest' && todayPlan.block!=='test'){
    var todayExs=getExercisesForDay(todayKey,todayPlan.block);
    var todayWarmups = (typeof UNIVERSAL_WARMUP !== 'undefined') ? UNIVERSAL_WARMUP : [];
    var todayBt=BLOCKS[todayPlan.block];
    todayHtml='<div style="margin-bottom:18px">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
        +'<div style="font-size:14px">&#x1F4C5;</div>'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:17px;font-weight:700;color:#CCFF00">Ejercicios de hoy</div>'
        +'<span style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:'+todayBt.col+'">'+todayBt.label+'</span>'
      +'</div>';
    todayWarmups.forEach(function(ex){todayHtml+=renderExCard(ex,'#FFB800',true);});
    todayExs.forEach(function(ex){todayHtml+=renderExCard(ex,ex.col||todayBt.col,false);});
    todayHtml+='</div>';
  }

  /* ─────────────────────────────────────────────────────
     SECTION 2: Esta semana — todos los ejercicios planificados
     ───────────────────────────────────────────────────── */
  var weekHtml='';
  var weekStart=new Date(TODAY);
  var weekDow=weekStart.getDay();if(weekDow===0)weekDow=7;
  weekStart.setDate(weekStart.getDate()-(weekDow-1));
  var weekExIds={};
  for(var di=0;di<7;di++){
    var d=new Date(weekStart);d.setDate(d.getDate()+di);
    var dk=d.toDateString();
    if(dk===todayKey)continue; /* already shown */
    var pp=planMap[dk];
    if(!pp||pp.block==='rest'||pp.block==='test')continue;
    var dexs=getExercisesForDay(dk,pp.block);
    dexs.forEach(function(ex){
      if(!weekExIds[ex.id]){
        weekExIds[ex.id]={ex:ex,block:pp.block,day:DLG[d.getDay()]};
      }
    });
  }
  var weekKeys=Object.keys(weekExIds);
  if(weekKeys.length>0){
    weekHtml='<div style="margin-bottom:18px">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
        +'<div style="font-size:14px">&#x1F4C6;</div>'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:17px;font-weight:700;color:#7070AA">Esta semana</div>'
        +'<span style="font-size:9px;color:#444466">'+weekKeys.length+' ejercicios</span>'
      +'</div>';
    weekKeys.forEach(function(id){
      var item=weekExIds[id];
      var ec=item.ex.col||(BLOCKS[item.block]?BLOCKS[item.block].col:'#7070AA');
      weekHtml+=renderExCard(item.ex,ec,false,item.day);
    });
    weekHtml+='</div>';
  }

  /* ─────────────────────────────────────────────────────
     SECTION 3: Recomendados para tu fase actual
     ───────────────────────────────────────────────────── */
  var phaseHtml='<div style="margin-bottom:18px">'
    +'<div style="background:'+curBt.col+'15;border:1px solid '+curBt.col+'40;border-radius:12px;padding:12px;margin-bottom:10px">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'
        +'<div style="width:8px;height:8px;border-radius:50%;background:'+curBt.col+'"></div>'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:700;color:'+curBt.col+'">Fase actual: '+curBt.label+'</div>'
      +'</div>'
      +'<div style="font-size:11px;color:#7070AA;line-height:1.4">Recomendados para esta fase del plan, respetando tu nivel</div>'
    +'</div>';
  var phasePool=(EX_POOL[curBlock]||[]).filter(function(ex){
    return (ex.minLevel||0)<=tier && ex.phase!=='warmup';
  });
  phasePool.slice(0,5).forEach(function(ex){
    phaseHtml+=renderExCard(ex,ex.col||curBt.col,false);
  });
  phaseHtml+='</div>';

  /* ─────────────────────────────────────────────────────
     SECTION 4: Catalogo completo — filtros por categoria
     ───────────────────────────────────────────────────── */
  var activeCat=c._activeCat||'all';
  var presentCats={};
  allExercises.forEach(function(item){if(item.ex.cat)presentCats[item.ex.cat]=true;});
  var filterBar='<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:12px;-webkit-overflow-scrolling:touch">';
  filterBar+='<button onclick="exFilter(\'all\')" '
    +'style="flex-shrink:0;padding:6px 12px;border-radius:99px;border:1.5px solid '+(activeCat==='all'?'#CCFF00':'#1E1E38')+';'
    +'background:'+(activeCat==='all'?'#182000':'#0F0F1E')+';color:'+(activeCat==='all'?'#CCFF00':'#7070AA')+';'
    +'font-family:\'JetBrains Mono\',monospace;font-size:10px;cursor:pointer;touch-action:manipulation">Todos</button>';
  Object.keys(CAT_META).forEach(function(cat){
    if(!presentCats[cat])return;
    var meta=CAT_META[cat];
    var isOn=cat===activeCat;
    filterBar+='<button onclick="exFilter(\''+cat+'\')" '
      +'style="flex-shrink:0;padding:6px 12px;border-radius:99px;border:1.5px solid '+(isOn?meta.col:'#1E1E38')+';'
      +'background:'+(isOn?meta.col+'18':'#0F0F1E')+';color:'+(isOn?meta.col:'#7070AA')+';'
      +'font-family:\'JetBrains Mono\',monospace;font-size:10px;cursor:pointer;touch-action:manipulation;white-space:nowrap">'
      +meta.icon+' '+meta.label+'</button>';
  });
  filterBar+='</div>';

  var catalogHtml='<div style="margin-bottom:18px">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
      +'<div style="font-size:14px">&#x1F4DA;</div>'
      +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:17px;font-weight:700;color:#7070AA">Catalogo completo</div>'
    +'</div>'
    + filterBar;

  /* Group filtered exercises by category */
  var filtered=allExercises.filter(function(item){
    if(activeCat==='all')return true;
    return item.ex.cat===activeCat;
  });

  if(filtered.length===0){
    catalogHtml+='<div style="text-align:center;padding:24px;color:#444466;font-size:13px">Sin ejercicios en esta categoria para tu nivel actual.</div>';
  } else {
    /* Group by category */
    var byCat={};
    filtered.forEach(function(item){
      var k=item.ex.cat||'other';
      if(!byCat[k])byCat[k]=[];
      byCat[k].push(item);
    });
    Object.keys(CAT_META).forEach(function(cat){
      if(!byCat[cat])return;
      var meta=CAT_META[cat];
      catalogHtml+='<div style="margin-bottom:14px">'
        +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:6px 0;border-bottom:1px solid '+meta.col+'33">'
          +'<div style="font-size:14px">'+meta.icon+'</div>'
          +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:15px;font-weight:700;color:'+meta.col+'">'+meta.label+'</div>'
          +'<span style="font-size:9px;color:#444466">'+byCat[cat].length+'</span>'
        +'</div>'
        +'<div style="font-size:10px;color:#444466;margin-bottom:8px;padding-left:22px">'+meta.desc+'</div>';
      byCat[cat].forEach(function(item){
        var ec=item.ex.col||meta.col;
        catalogHtml+=renderExCard(item.ex,ec,item.ex.phase==='warmup');
      });
      catalogHtml+='</div>';
    });
  }
  catalogHtml+='</div>';

  /* ─────────────────────────────────────────────────────
     ASSEMBLE FINAL HTML
     ───────────────────────────────────────────────────── */
  c.innerHTML = todayHtml + weekHtml + phaseHtml + catalogHtml;
}

/* Render a single exercise card — shared helper for buildExTab */
function renderExCard(ex,col,isWarmup,dayLabel){
  var humanSys=(typeof SYS_HUMAN!=='undefined'&&SYS_HUMAN[ex.sys])?SYS_HUMAN[ex.sys]:(ex.sys||'');
  var tier=getLevelTier();
  var det=(tier===0&&ex.simple)?ex.simple:(ex.det||ex.d||'');
  var nota=ex.nota||'';
  var sci=ex.sci||'';
  var bgCol=isWarmup?'#FFB80008':'#0F0F1E';
  var borderCol=isWarmup?'#FFB800':col;
  var html='<div style="background:'+bgCol+';border:1px solid #1A1A32;border-radius:10px;padding:11px;margin-bottom:6px;border-left:3px solid '+borderCol+'">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:3px;gap:8px">'
      +'<div style="font-size:13px;font-weight:600;color:#EDEDFF;flex:1">'+ex.n+'</div>'
      +'<div style="display:flex;gap:4px;align-items:center;flex-shrink:0">';
  if(isWarmup) html+='<span style="font-size:8px;color:#FFB800;background:#FFB80018;padding:2px 6px;border-radius:4px;font-family:\'JetBrains Mono\',monospace">warm-up</span>';
  if(dayLabel) html+='<span style="font-size:8px;color:'+col+';background:'+col+'18;padding:2px 6px;border-radius:4px;font-family:\'JetBrains Mono\',monospace">'+dayLabel.slice(0,3)+'</span>';
  html+='</div></div>';
  if(humanSys) html+='<div style="font-size:10px;color:'+col+';margin-bottom:4px">'+humanSys+'</div>';
  if(nota) html+='<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:#CCFF00;background:#182000;border-radius:5px;padding:4px 8px;margin-bottom:6px">'+nota+'</div>';
  if(det) html+='<div style="font-size:12px;color:#7070AA;line-height:1.5;margin-bottom:4px">'+det+'</div>';
  if(typeof makeFatigueDots==='function') html+=makeFatigueDots(ex.fatigue||3,col);
  if(sci) html+='<div style="font-size:10px;color:#444466;margin-top:6px;line-height:1.5;border-top:1px solid #1A1A32;padding-top:6px">'+sci+'</div>';
  html+='</div>';
  return html;
}

function exFilter(cat){
  var c=document.getElementById('ptej');
  if(c)c._activeCat=cat;
  buildExTab();
}
function buildHBTab(){
  var c=document.getElementById('pthb');if(!c)return;
  var h='<div style="font-size:12px;color:#7070AA;margin-bottom:12px;line-height:1.6">Notacion Eva Lopez: Sets x HangTime(Buffer) x Reps :SetRest/RepRest. Buffer = segundos que sobran antes del fallo.</div>';
  HBP.forEach(function(p){
    h+='<div class="proto" style="border-left:3px solid '+p.col+'"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:15px;font-weight:700;color:#EDEDFF">'+p.t+'</div><span style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:'+p.col+'">'+p.ph+'</span></div><div class="proto-nota">'+p.nota+'</div><div style="font-size:12px;color:#7070AA;line-height:1.6;margin-bottom:8px">'+p.desc+'</div><div style="margin-bottom:8px">';
    p.prog.forEach(function(pr,i){h+='<div style="font-size:11px;color:#7070AA;padding:3px 0;padding-left:10px;border-left:2px solid #2A2A48;margin-bottom:3px">'+(i+1)+'. '+pr+'</div>';});
    h+='</div><div class="proto-warn">'+p.warn+'</div></div>';
  });
  c.innerHTML=h;
}
/* ──────────────────────────────────────────────────
   Profile & nutrition
────────────────────────────────────────────────── */


function renderPlan(){
  var seqs={'4-3-2-1':['strength','power','endurance','deload'],'3-2-1':['strength','power','deload']};
  var seq=seqs[U.plan]||seqs['4-3-2-1'],ints=U.plan==='4-3-2-1'?[70,85,95,45]:[75,90,45];
  var wks=seq.length,endD=new Date(U.startDate.getTime()+wks*7*86400000);
  var h='<div class="card" style="border-left:4px solid #CCFF00"><div style="display:flex;justify-content:space-between;margin-bottom:10px"><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:16px;font-weight:700;color:#CCFF00">Plan '+U.plan+'</div><span class="badge" style="color:#00E5A0;border-color:#00E5A055">ACTIVO</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  h+=r2('Objetivo',GLBL[U.goal]||'--')+r2('Nivel',LLBL[U.level]||'--')+r2('Inicio',U.startDate.toLocaleDateString('es-ES',{day:'numeric',month:'short'}))+r2('Fin',endD.toLocaleDateString('es-ES',{day:'numeric',month:'short'}))+'</div></div>';
  h+='<div class="sec">Semanas del Ciclo</div>';
  seq.forEach(function(block,i){
    var bt=BLOCKS[block],ws=new Date(U.startDate);ws.setDate(ws.getDate()+i*7);var we=new Date(ws);we.setDate(we.getDate()+6);
    var isCur=TODAY>=ws&&TODAY<=we;
    h+='<div style="background:#0F0F1E;border:1.5px solid '+(isCur?bt.col:'#1A1A32')+';border-left:4px solid '+bt.col+';border-radius:14px;padding:14px;margin-bottom:10px;opacity:'+(TODAY>we?'.5':'1')+'"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:18px;font-weight:700;color:'+(isCur?bt.col:'#EDEDFF')+'">S'+(i+1)+' '+bt.label+'</div>'+(isCur?'<span class="badge" style="color:'+bt.col+';border-color:'+bt.col+'55">AHORA</span>':'<span style="font-size:11px;color:#444466">'+ws.toLocaleDateString('es-ES',{day:'numeric',month:'short'})+'</span>')+'</div><div style="font-size:12px;color:#7070AA;margin-bottom:8px">'+ints[i]+'% intensidad - '+U.days+' sesiones</div><div style="height:4px;background:#1A1A32;border-radius:99px;overflow:hidden"><div style="width:'+ints[i]+'%;height:100%;background:'+bt.col+';border-radius:99px"></div></div></div>';
  });
  if(U.tests.length){h+='<div class="sec">Tests Programados</div><div class="card" style="border-left:3px solid #FFB800">'+U.tests.map(function(id){var t=TESTS.find(function(x){return x.id===id;});return t?'<div style="padding:8px 0;border-bottom:1px solid #1A1A32"><div style="font-size:13px;font-weight:600;color:#EDEDFF">'+t.title+'</div><div style="font-size:11px;color:#444466">'+t.mide+'</div></div>':'';}).join('')+'</div>';}
  document.getElementById('planc').innerHTML=h;
}
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
  h+='<div style="margin-top:12px"><button onclick="if(confirm(\'Reiniciar?\'))location.reload()" style="width:100%;padding:12px;background:none;border:1px solid #1E1E38;border-radius:10px;color:#444466;font-size:12px;cursor:pointer">Reiniciar y crear nuevo plan</button></div>';
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
