/* ====================================================
   render-onboarding.js -- 7-step onboarding wizard
   Step transitions, picker UI, gym/rock day toggles,
   schedule preview, summary screen, quickstart shortcut.
==================================================== */


/* QUICKSTART - skip the 7-step wizard with sensible defaults.
   User only needs to pick a start date in step 7. */
function useQuickstart(){
  /* Defaults based on most common user (Tkacz p.38: intermediate v6-v9) */
  U.goal       = 'sport';
  U.level      = 'intermediate';
  U.plan       = '4-3-2-1';
  U.days       = 4;
  U.gymDays    = [1,3,5,6];        /* Mon/Wed/Fri/Sat - Horst canonical */
  U.rockDays   = [];
  U.rockWeekend= 'never';
  U.trainTime  = 'evening';
  U.weight     = 70;
  U.age        = 30;
  U.rhr        = 60;
  U.session    = 90;
  U.grade      = '6c';
  /* Tests are intentionally OFF by default — they're opt-in.
     Quickstart users are typically beginners/intermediates for whom
     numeric tests don't drive plan changes anyway. */
  U.tests      = [];
  showStep(7);
  if(typeof showToast === 'function'){
    showToast('Plan rápido cargado — elegí fecha de inicio','#5A8A00');
  }
}

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
  /* Re-render the tests step so level-aware guidance reflects the
     current U.level (handles "Editar" jumps back to step 5). */
  if(n===5 && typeof buildTests === 'function'){buildTests();}
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
      U.gymDays.forEach(function(dow){
        var btn=document.querySelector('#gym-day-grid .dp-btn[data-dow="'+dow+'"]');
        if(btn)btn.classList.add('on');
      });
    } else {
      picked.forEach(function(b){U.gymDays.push(parseInt(b.getAttribute('data-dow')));});
    }
    if(U.gymDays.length>U.days) U.days=U.gymDays.length;
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
  var c = document.getElementById('tlist');
  if(!c) return;
  c.innerHTML = '';

  /* Level-aware guidance: for beginners and intermediates the tests
     don't drive plan changes meaningfully, so we explicitly invite
     skipping the step. Advanced and elite get a stronger recommendation. */
  var lvl = U.level || 'beginner';
  var guidanceByLevel = {
    beginner: {
      tone: 'skip',
      title: '¿Tests? Probablemente no los necesites todavía',
      body: 'A tu nivel tu progreso se mide mejor subiendo de grado y por consistencia. '
          + 'Los tests numéricos (max hang, repeaters) suman cuando tenés base de fingerboard — '
          + 'eso llega en unos meses. Te recomiendo saltar este paso.'
    },
    intermediate: {
      tone: 'optional',
      title: 'Opcionales — sumá los que te interesen',
      body: 'Algunos intermedios encuentran útil medir 1-2 tests para tener referencia objetiva del progreso. '
          + 'Si no te copa la idea de numerar tu entrenamiento, podés saltarlo sin perder nada del plan.'
    },
    advanced: {
      tone: 'recommended',
      title: 'Recomendados',
      body: 'A tu nivel los tests valen la pena: el plan ajusta la intensidad según resultados '
          + '(max hang, 3RM pull-ups, repeaters). 2-3 tests dan suficiente data para tomar decisiones.'
    },
    elite: {
      tone: 'recommended',
      title: 'Muy recomendados',
      body: 'Tu margen de mejora es chico y necesita medición. Critical Force, repeaters y max hangs '
          + 'son las métricas que mueven el plan. Sin números, autorregular se vuelve muy intuitivo.'
    }
  };
  var guide = guidanceByLevel[lvl] || guidanceByLevel.intermediate;

  /* Update the step's subtitle dynamically based on level */
  var subEl = document.querySelector('#s5 .sub');
  if(subEl){
    subEl.textContent = guide.tone === 'skip'
      ? 'Opcionales. A tu nivel solemos sugerir saltarlos.'
      : (guide.tone === 'optional'
          ? 'Opcionales. Elegí los que te sirvan o saltalos.'
          : 'Recomendados a tu nivel. Toca cada uno para ver cómo hacerlo.');
  }

  /* Guidance card at the top */
  var bannerClass = guide.tone === 'recommended' ? 'banner-primary'
                   : guide.tone === 'skip'        ? 'banner-deload'
                   :                                'banner-caution';
  var guideCard = document.createElement('div');
  guideCard.className = 'tests-guide';
  guideCard.innerHTML = '<div class="banner ' + bannerClass + '" style="display:block;margin-bottom:8px">'
    + '<div class="tests-guide-title">' + guide.title + '</div>'
    + '<div class="tests-guide-body">' + guide.body + '</div>'
    + '</div>';
  c.appendChild(guideCard);

  /* Skip-tests CTA (clears U.tests and jumps to next step).
     Always available, but visually emphasised for skip/optional levels. */
  var skipBtn = document.createElement('button');
  skipBtn.type = 'button';
  skipBtn.className = 'tests-skip-btn' + (guide.tone === 'skip' ? ' tests-skip-btn--recommended' : '');
  skipBtn.innerHTML = (guide.tone === 'skip' ? '✓ ' : '') + 'Saltar este paso (sin tests)';
  skipBtn.onclick = function(){
    /* Clear any selected tests and advance */
    U.tests = [];
    /* Visually deselect all cards just in case */
    c.querySelectorAll('.tc.on').forEach(function(card){
      card.classList.remove('on');
      card.style.borderColor = 'var(--border-color)';
      card.style.background  = 'var(--bg-card)';
      var b = card.querySelector('.tbody'); if(b) b.style.display = 'none';
    });
    if(typeof goNext === 'function') goNext();
  };
  c.appendChild(skipBtn);

  /* Section title for the test list */
  var listTitle = document.createElement('div');
  listTitle.className = 'tests-list-title';
  listTitle.textContent = 'O elegí tests específicos';
  c.appendChild(listTitle);

  TESTS.forEach(function(t){
    var div = document.createElement('div');
    div.className = 'tc';
    /* Restore visual selection state if this test is already in U.tests
       (e.g. user came back to this step) */
    var preSelected = U.tests && U.tests.indexOf(t.id) !== -1;
    if(preSelected){
      div.classList.add('on');
      div.style.borderColor = 'var(--accent-primary)';
      div.style.background  = 'var(--accent-primary-bg)';
    }
    div.innerHTML = '<div class="thd"><div class="ttt">' + t.title + '</div><span class="tbg" style="color:' + t.col + ';border-color:' + t.col + '">' + t.diff + '</span></div><div class="tbody"><strong style="color:var(--text-primary)">Cómo hacerlo:</strong><br>' + t.how + '<br><br><strong style="color:var(--text-primary)">Mide:</strong> ' + t.mide + '</div>';

    var body = div.querySelector('.tbody');
    body.style.display = preSelected ? 'block' : 'none';

    div.onclick = function(){
      var isSel = div.classList.toggle('on');
      body.style.display = isSel ? 'block' : 'none';
      div.style.borderColor = isSel ? 'var(--accent-primary)' : 'var(--border-color)';
      div.style.background = isSel ? 'var(--accent-primary-bg)' : 'var(--bg-card)';

      var idx = U.tests.indexOf(t.id);
      if(isSel && idx === -1) {
        U.tests.push(t.id);
      } else if(!isSel && idx !== -1) {
        U.tests.splice(idx, 1);
      }
    };

    c.appendChild(div);
  });
}
function buildSummary(){
  var maxHR=Math.round(202.5-0.53*U.age),res=maxHR-U.rhr;
  var arMin=Math.round(res*0.6+U.rhr),arMax=Math.round(res*0.7+U.rhr);
  /* Get total weeks from the user's level profile - source of truth */
  var wks=0;
  if(U.level&&U.plan&&typeof LEVEL_PROFILES!=='undefined'){
    var prof=LEVEL_PROFILES[U.level]||LEVEL_PROFILES.intermediate;
    if(prof&&prof.phaseSeq&&prof.phaseSeq[U.plan])wks=prof.phaseSeq[U.plan].length;
  }
  if(!wks)wks=U.plan==='4-3-2-1'?10:U.plan==='3-2-1'?6:0;
  var endD=U.startDate&&wks?new Date(U.startDate.getTime()+wks*7*86400000):null;
  var rows=[
    ['Objetivo',GLBL[U.goal]||'--'],['Nivel',LLBL[U.level]||'--'],['Grado',U.grade||'--'],
    ['Plan',U.plan||'--'],['Días/semana',U.days],
    ['Inicio',U.startDate?U.startDate.toLocaleDateString('es-ES',{day:'numeric',month:'short'}):'--'],
    ['Fin',endD?endD.toLocaleDateString('es-ES',{day:'numeric',month:'short'}):'--'],
    ['FC Óptima',arMin+'-'+arMax+' bpm'],
    ['Proteina',Math.round(U.weight*1.3)+'g/día'],['Tests',U.tests.length]
  ];
  document.getElementById('summ').innerHTML=rows.map(function(r){
    return '<div class="sr"><span class="sl">'+r[0]+'</span><span class="sv2">'+r[1]+'</span></div>';
  }).join('');
}
function renderSchedPreview(){
  var p=document.getElementById('sched-preview');if(!p)return;
  if(U.gymDays.length===0 && (!U.rockDays || U.rockDays.length===0)){
    p.innerHTML='<div style="font-size:11px;color:var(--text-muted);text-align:center">Selecciona tus días para ver el plan</div>';
    return;
  }
  var days=['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];
  var rockSet = U.rockDays || [];
  var effectiveGym = U.gymDays.filter(function(d){return rockSet.indexOf(d) === -1;});
  var chosen = effectiveGym.length > 0
    ? scoreAndPickDays(effectiveGym, BLOCK_FATIGUE['strength']||'HIGH', effectiveGym.length, 'never')
    : [];
  var html='';
  [1,2,3,4,5,6,0].forEach(function(dow){
    var isRock = rockSet.indexOf(dow) !== -1;
    var isGym  = !isRock && chosen.indexOf(dow) !== -1;
    var lbl    = isRock ? 'Roca' : isGym ? 'Entreno' : 'Descanso';
    var col    = isRock ? 'var(--accent-power)' : isGym ? 'var(--accent-primary)' : 'var(--text-muted)';
    var bg     = isRock ? '#9B6EFF20' : isGym ? '#CCFF0015' : 'transparent';
    html+='<div class="sched-row">'
      +'<div class="sched-day">'+days[dow]+'</div>'
      +'<div class="sched-pill" style="background:'+bg+';color:'+col+'">'+lbl+'</div>'
      +(isGym?'<div class="sched-reason">Sesión de gimnasio</div>':'')
      +(isRock?'<div class="sched-reason">Roca exterior (alta carga, plan se adapta)</div>':'')
      +'</div>';
  });
  p.innerHTML=html;
}
function toggleGymDay(btn){
  btn.classList.toggle('on');
  U.gymDays=[];
  document.querySelectorAll('#gym-day-grid .dp-btn.on').forEach(function(b){
    U.gymDays.push(parseInt(b.getAttribute('data-dow')));
  });
  renderSchedPreview();
}
function toggleRockDay(btn){
  btn.classList.toggle('on');
  U.rockDays = [];
  document.querySelectorAll('#rock-day-grid .dp-btn.on').forEach(function(b){
    U.rockDays.push(parseInt(b.getAttribute('data-dow')));
  });
  if(typeof renderSchedPreview === 'function') renderSchedPreview();
}
