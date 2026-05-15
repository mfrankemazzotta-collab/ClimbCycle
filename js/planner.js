/* ====================================================
   planner.js -- Plan generation & scheduling
   ClimbCycle v5
==================================================== */


/* ──────────────────────────────────────────────────
   Level & exercise selection
────────────────────────────────────────────────── */


function getLevelTier(){
  var map={beginner:0,intermediate:1,advanced:2,elite:3};
  return map[U.level]||0;
}
function getLevelProfile(){
  return LEVEL_PROFILES[U.level] || LEVEL_PROFILES['intermediate'];
}
function getLevelAdjustedMinGap(blockFatigue, level){
  var base = MIN_GAP_H[blockFatigue]||24;
  if(level==='beginner') return Math.round(base * 1.25);   /* 25% more recovery */
  if(level==='elite')    return Math.round(base * 0.85);   /* elite recover faster */
  return base;
}
function getSafetyWarning(block, level){
  if(level==='beginner'){
    if(block==='strength') return 'Principiantes: los tendones digitales necesitan 6-12 meses antes de soportar cargas maximas. Esta semana enfocate en hangs asistidos y dominadas  -  no en fingerboard de alta intensidad.';
    if(block==='power')    return 'Principiantes: el campus board y los movimientos dinamicos al limite estan contraindicados antes de tener una base de fuerza solida. Los ejercicios de esta fase estan adaptados a tu nivel.';
    if(block==='endurance') return 'Principiantes: ARC suave y travesias tecnicas son tu mejor entrenamiento de resistencia ahora. El trabajo de alta intensidad llega despues de construir la base aerobica.';
  }
  if(level==='intermediate'){
    if(block==='power') return 'Intermedios: el campus board es valioso pero requiere tendones adaptados. Si llevas menos de 2 anos de fingerboard regular, usa bouldering dinamico en lugar de campus.';
  }
  return '';
}
function loadLastEx(){
  try{var s=localStorage.getItem('cc_lastex');if(s)lastExUsed=JSON.parse(s);}catch(e){}
}
function saveLastEx(){
  try{localStorage.setItem('cc_lastex',JSON.stringify(lastExUsed));}catch(e){}
}
function selectExercises(block, dateStr, count){
  var pool = EX_POOL[block];
  if(!pool || pool.length===0){
    var legEx = EX[block]||[];
    return legEx.map(function(e){return {id:e.n,n:e.n,cat:block,sys:block,col:BLOCKS[block]?BLOCKS[block].col:'#EDEDFF',fatigue:3,skill:3,minLevel:0,det:e.d,nota:'',sci:'',tips:[]};});
  }
  /* Use level profile for exercise count */
  var prof2 = getLevelProfile();
  count = Math.min(count || prof2.exPerSession || 3, prof2.exPerSession || 4);

  /* Filter by user level  -  never show exercises above their tier */
  var tier = getLevelTier();
  var levelFiltered = pool.filter(function(e){
    return (e.minLevel||0) <= tier;
  });
  /* Fallback: if filtering leaves < count, use full pool */
  if(levelFiltered.length < count) levelFiltered = pool.slice();

  /* Beginners: cap at 3 exercises max (lower volume) */
  if(tier === 0) count = Math.min(count, 3);

  /* deterministic shuffle from dateStr seed */
  var seed = 0;
  for(var i=0; i<dateStr.length; i++) seed = (seed*31 + dateStr.charCodeAt(i)) & 0x7fffffff;
  var shuffled = levelFiltered.slice().sort(function(a,b){
    seed = (seed*1103515245 + 12345) & 0x7fffffff;
    return (seed % 3) - 1;
  });

  /* filter out last used primary exercise if pool is big enough */
  var lastId = lastExUsed[block];
  var candidates = lastId && shuffled.length > count
    ? shuffled.filter(function(e){return e.id !== lastId;})
    : shuffled;

  var selected = candidates.slice(0, count);

  /* record first exercise of selection as "last used" for next session */
  if(selected.length > 0){
    lastExUsed[block] = selected[0].id;
    saveLastEx();
  }
  return selected;
}
function getExercisesForDay(dateStr, block){
  var plan = planMap[dateStr];
  if(!plan) return [];
  if(!plan.exercises){
    plan.exercises = selectExercises(block, dateStr, 4);
  }
  return plan.exercises;
}
function makeFatigueDots(fatigue, col){
  var h='<div class="ex-fatigue" style="color:'+col+'">';
  for(var i=1;i<=5;i++){
    h+='<div class="ex-fatigue-dot'+(i<=fatigue?' on':'')+'" style="'+(i<=fatigue?'background:'+col:'')+'"></div>';
  }
  h+='<span style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:#444466;margin-left:4px">fatiga</span></div>';
  return h;
}
function makeSkillTag(skill){
  var lvls=['','Tecnica basica','Tecnica moderada','Tecnica avanzada','Alta especificidad','Elite'];
  return '<div class="ex-skill">Skill: '+lvls[skill]+'</div>';
}
/* ──────────────────────────────────────────────────
   Plan generation
────────────────────────────────────────────────── */


function generatePlan(){
  planMap={};
  if(!U.startDate||!U.plan) return;

  /* Use LEVEL_PROFILES for phase sequence — Lattice Training principle:
     beginners need MORE endurance base before strength work */
  var prof = getLevelProfile();
  var levelSeqs = prof.phaseSeq || {
    '4-3-2-1':['strength','power','endurance','deload'],
    '3-2-1':  ['strength','power','deload']
  };
  var seq = levelSeqs[U.plan] || levelSeqs['4-3-2-1'];

  /* Cap sessions per week based on level */
  var effectiveDays = Math.min(U.days, prof.maxSessPerWk||4);

  /* Gym days from user selection, fallback to spread */
  var gymDOWs = U.gymDays && U.gymDays.length > 0
    ? U.gymDays.slice(0, effectiveDays)
    : smartDefaultDays(effectiveDays, U.rockWeekend);

  /* Rock days are NO LONGER hardcoded from rockWeekend pref.
     They come from manual markRockDay() entries in planMap.
     rockWeekend preference only affects scheduling score, not blocking. */
  var testDone = false;

  seq.forEach(function(block, wi){
    var blockFatigue = BLOCK_FATIGUE[block]||'MED';

    /* pick which gym days to USE this week via spacing scorer */
    var chosenDOWs = scoreAndPickDays(gymDOWs, blockFatigue, U.days, U.rockWeekend);

    /* Track last session date within this week for gap calc */
    var lastSessionDay = -99;   /* day-of-week of previous session */

    for(var di=0; di<7; di++){
      var date = new Date(U.startDate);
      date.setDate(date.getDate() + wi*7 + di);
      var key  = date.toDateString();
      var dow  = date.getDay();

      /* Test day: first day of first week if tests selected */
      if(wi===0 && di===0 && U.tests.length>0 && !testDone){
        planMap[key] = {block:'test', week:wi+1};
        testDone = true;
        lastSessionDay = dow;
        continue;
      }

      /* Assign training or rest */
      if(chosenDOWs.indexOf(dow) !== -1){
        /* spacing guard: if last session was yesterday -> demote to rest */
        var daysSinceLast = dow - lastSessionDay;
        if(daysSinceLast < 0) daysSinceLast += 7;
        var hoursGap = daysSinceLast * 24;
        /* Level-adjusted minimum gap: beginners need more recovery */
        var baseGap = MIN_GAP_H[blockFatigue]||24;
        var minNeeded = Math.round(baseGap * (getLevelProfile().minGapMult||1.0));

        if(hoursGap < minNeeded && hoursGap > 0){
          /* Not enough gap -> rest this day */
          planMap[key] = {block:'rest', week:wi+1, note:'gap-forzado'};
        } else {
          planMap[key] = {block:block, week:wi+1};
          lastSessionDay = dow;
        }
      } else {
        planMap[key] = {block:'rest', week:wi+1};
      }
    }
  });
}
function scoreAndPickDays(available, fatigueTier, n, rockMode){
  if(available.length <= n) return available.slice();

  /* score each available DOW */
  var scored = available.map(function(dow){
    var score = 0;
    /* prefer mid-week for HIGH, flexible for LOW */
    if(fatigueTier==='HIGH'){
      /* Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0 */
      /* penalise Fri if rock weekend (Bechtel rule) */
      if((rockMode==='always'||rockMode==='sometimes') && (dow===5||dow===4))
        score -= 20;
      /* prefer Tue, Thu for classic spacing */
      if(dow===2||dow===4) score += 5;
    }
    /* penalise weekend days for gym if user climbs rock */
    if((rockMode==='always') && (dow===6||dow===0)) score -= 50;
    if((rockMode==='sometimes') && dow===6) score -= 30;
    return {dow:dow, score:score};
  });

  /* sort by score descending */
  scored.sort(function(a,b){return b.score-a.score;});

  /* greedy pick: select n days that maximise minimum gap */
  var chosen = [scored[0].dow];
  var candidates = scored.slice(1);
  while(chosen.length < n && candidates.length > 0){
    var best = null, bestMinGap = -1;
    candidates.forEach(function(c){
      var minGap = chosen.reduce(function(mg, ch){
        var gap = Math.abs(c.dow - ch);
        if(gap > 3) gap = 7 - gap; /* circular week */
        return Math.min(mg, gap);
      }, 7);
      if(minGap > bestMinGap || (minGap===bestMinGap && c.score > (best?best.score:-99))){
        bestMinGap = minGap;
        best = c;
      }
    });
    if(best){
      chosen.push(best.dow);
      candidates = candidates.filter(function(c){return c.dow!==best.dow;});
    } else break;
  }

  return chosen;
}
function smartDefaultDays(n, rockMode){
  /* Horst canonical templates by session count */
  var templates = {
    2: [2,5],           /* Tue + Fri */
    3: [1,3,5],         /* Mon + Wed + Fri */
    4: [1,3,5,4],       /* Mon + Wed + Fri + Thu (light) */
    5: [1,2,4,5,3],     /* Mon-Tue-Thu-Fri-Wed */
    6: [1,2,3,4,5,6]
  };
  var base = templates[n]||templates[4];

  /* Rock weekend mode: remove Fri (5) and Sat (6) if always */
  if(rockMode==='always'){
    base = base.filter(function(d){return d!==5&&d!==6&&d!==0;});
    /* refill if needed */
    [4,3,2,1].forEach(function(d){
      if(base.length<n&&base.indexOf(d)===-1) base.push(d);
    });
  }
  return base.slice(0,n);
}
/* ──────────────────────────────────────────────────
   Session state
────────────────────────────────────────────────── */


function getSessionState(dateStr, plan){
  if(!plan || plan.block==='rest') return 'rest';
  var log = sessionLog[dateStr];

  /* explicit user marks override everything */
  if(log==='done')       return 'completed';
  if(log==='moved')      return 'rescheduled';
  if(log==='fail')       return 'missed';

  var date = new Date(dateStr);
  var isToday = dateStr === TODAY.toDateString();
  var isPast  = date < TODAY;

  if(isToday)  return 'available';
  if(isPast)   return 'missed';    /* past + no log = missed */
  return 'locked';                 /* future */
}
function getWeekCompletion(weekIdx){
  if(!U.startDate) return {done:0,total:0,pct:100};
  var done=0, total=0;
  for(var di=0; di<7; di++){
    var date = new Date(U.startDate);
    date.setDate(date.getDate() + weekIdx*7 + di);
    var key  = date.toDateString();
    var plan = planMap[key];
    if(!plan || plan.block==='rest' || plan.block==='test') continue;
    total++;
    if(sessionLog[key]==='done') done++;
  }
  var pct = total>0 ? Math.round(done/total*100) : 100;
  return {done:done, total:total, pct:pct};
}
function isWeekLocked(weekIdx){
  if(weekIdx===0) return false;             /* first week never locked */
  if(!U.startDate) return false;
  var prevEnd = new Date(U.startDate);
  prevEnd.setDate(prevEnd.getDate() + weekIdx*7 - 1);
  if(prevEnd >= TODAY) return false;        /* prev week not over yet */
  var comp = getWeekCompletion(weekIdx-1);
  return comp.pct < 70;
}
function getCurrentWeekIndex(){
  if(!U.startDate) return 0;
  var days = Math.floor((TODAY - U.startDate)/86400000);
  return Math.max(0, Math.floor(days/7));
}
/* ──────────────────────────────────────────────────
   Rock day management
────────────────────────────────────────────────── */


function markRockDay(dateStr){
  /* Mark this day as outdoor rock */
  var existingWeek = planMap[dateStr] ? planMap[dateStr].week : 1;
  planMap[dateStr] = {block:'rest', week:existingWeek, note:'roca', outdoor:true};

  /* Post-rock adjustment: reduce intensity of next 2 training days */
  var date = new Date(dateStr);
  var adjusted = 0;
  for(var di = 1; di <= 5 && adjusted < 2; di++){
    var nd = new Date(date);
    nd.setDate(nd.getDate() + di);
    var nk = nd.toDateString();
    var np = planMap[nk];
    if(np && np.block !== 'rest' && np.block !== 'deload' && !np.outdoor){
      /* Downgrade: strength/power -> endurance; endurance -> deload */
      var downgrades = {strength:'endurance', power:'endurance', endurance:'deload'};
      if(downgrades[np.block]){
        planMap[nk] = {
          block: downgrades[np.block],
          week:  np.week,
          note:  'reducido-post-roca',
          originalBlock: np.block
        };
        adjusted++;
      }
    }
  }

  /* Also mark day before rock as deload if it was a high-intensity session */
  var prevDate = new Date(date);
  prevDate.setDate(prevDate.getDate() - 1);
  var prevKey = prevDate.toDateString();
  var prevPlan = planMap[prevKey];
  if(prevPlan && (prevPlan.block==='strength'||prevPlan.block==='power')){
    planMap[prevKey] = {
      block: 'endurance',
      week:  prevPlan.week,
      note:  'reducido-pre-roca',
      originalBlock: prevPlan.block
    };
  }

  /* Feed recovery engine: outdoor rock = high-load session */
  recData.hoursAgo  = 0;
  recData.stype     = 'outdoor';
  recData.rpe       = 8;
  recData.dur       = recData.dur || 240; /* 4h default */
  saveRec();

  /* Persist and re-render */
  savePlan();
  renderHC(); renderBigCal(); renderWk();
  hcSel = new Date(dateStr);
  showDayPanel(hcSel, planMap[dateStr], dateStr);

  var msg = adjusted > 0
    ? 'Roca marcada. Proximas '+adjusted+' sesion(es) reducidas en intensidad.'
    : 'Roca marcada.';
  showToast(msg, '#9B6EFF');
}
function unmarkRockDay(dateStr){
  var plan = planMap[dateStr];
  if(!plan || !plan.outdoor){return;}
  /* Restore plan entry to rest */
  planMap[dateStr] = {block:'rest', week:plan.week||1};

  /* Restore any post-rock downgraded sessions */
  var date = new Date(dateStr);
  for(var di = 1; di <= 5; di++){
    var nd = new Date(date); nd.setDate(nd.getDate()+di);
    var nk = nd.toDateString();
    var np = planMap[nk];
    if(np && np.note === 'reducido-post-roca' && np.originalBlock){
      planMap[nk] = {block: np.originalBlock, week: np.week};
    }
    if(np && np.note === 'reducido-pre-roca' && np.originalBlock){
      planMap[nk] = {block: np.originalBlock, week: np.week};
    }
  }

  savePlan();
  renderHC(); renderBigCal(); renderWk();
  showDayPanel(new Date(dateStr), planMap[dateStr], dateStr);
  showToast('Dia de roca eliminado', '#444466');
}
function forceSession(dateStr){
  /* Find the block for this week from surrounding plan days */
  var date = new Date(dateStr);
  var block = 'endurance'; /* safe default */
  for(var di=-3;di<=3;di++){
    var nd=new Date(date);nd.setDate(nd.getDate()+di);
    var np=planMap[nd.toDateString()];
    if(np&&np.block!=='rest'&&np.block!=='test'){block=np.block;break;}
  }
  planMap[dateStr]={block:block,week:(planMap[dateStr]&&planMap[dateStr].week)||1,forced:true};
  /* Re-show day panel with the forced session */
  showDayPanel(date,planMap[dateStr],dateStr);
  renderHC();renderWk();
  showToast('Sesion forzada  -  monitorea tu recuperacion','#FFB800');
}