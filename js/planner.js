/* ====================================================
   planner.js -- Plan generation & scheduling
   ClimbCycle v5
==================================================== */


/* ──────────────────────────────────────────────────
   Level & exercise selection
────────────────────────────────────────────────── */



/* Derive rockWeekend preference from selected rockDays */
function getRockMode(){
  var rd = U.rockDays || [];
  if(rd.length === 0) return 'never';
  if(rd.length === 1) return 'sometimes';
  return 'always';
}

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
  /* Warnings reformulated to describe what the PLAN ACTUALLY DOES rather
     than warn about scenarios the algorithm already prevents.
     Tone shift: encouraging + informative, not alarmist.
     The exercise pool filter (minLevel) already protects against unsafe
     content for beginners and intermediates — these notes explain WHY. */
  if(level==='beginner'){
    if(block==='strength') return 'Esta semana hacemos hangs en jugs y dominadas a peso corporal — todavía nada de regleta chica. Los tendones de los dedos tardan 6-12 meses en adaptarse, así que arrancamos suave y te volvés más fuerte de la base hacia arriba.';
    if(block==='power')    return 'Como principiante, tu plan reemplaza la fase de potencia clásica (campus, dinámicos al límite) por más semanas de base. No te perdés nada: la potencia real llega cuando los tendones están listos.';
    if(block==='endurance') return 'ARC suave y travesías técnicas son tu pan y manteca por ahora. Construyen la base aeróbica de los dedos — la fundación sobre la que se apoya todo lo demás. Consistencia > intensidad.';
  }
  if(level==='intermediate'){
    if(block==='power') return 'Tu plan usa bouldering dinámico y pliométricas en lugar de campus board, porque los tendones suelen necesitar 2+ años de fingerboard regular antes de aguantar campus de forma segura. Si ya tenés esa base, podés agregar campus suave por tu cuenta.';
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
    return legEx.map(function(e){return {id:e.n,n:e.n,cat:block,sys:block,col:BLOCKS[block]?BLOCKS[block].col:'var(--text-primary)',fatigue:3,skill:3,minLevel:0,det:e.d,nota:'',sci:'',tips:[]};});
  }

  var prof = getLevelProfile();
  count = Math.min(count || prof.exPerSession || 3, prof.exPerSession || 4);
  var tier = getLevelTier();

  /* ─────────────────────────────────────────────────────
     PROTOCOL-BASED SELECTION (Lattice / Anderson / Horst)
     Each phase has a REQUIRED composition that must be 
     respected. Random selection within each slot.
     ───────────────────────────────────────────────────── */
  var SLOT_COMPOSITION = {
    strength: [
      ['finger_strength'],                /* Hangboard - cornerstone (Anderson RCTM) */
      ['pull_strength'],                  /* Tracción - Horst */
      ['wall_training','pull_strength'],  /* Aplicación específica */
      ['wall_training','finger_strength'] /* Volumen segunda hangboard si pool permite */
    ],
    power: [
      ['campus_board','power'],           /* Campus si nivel lo permite */
      ['power','wall_training'],          /* Dinámicos al límite */
      ['wall_training','power'],          /* System/Moon board */
      ['power','pull_strength']           /* Pliométricas si quedan slots */
    ],
    endurance: [
      ['aerobic_endurance'],              /* ARC base - Barrows 2013 */
      ['power_endurance','wall_training'],/* 4x4 o circuitos */
      ['aerobic_endurance','power_endurance'],
      ['wall_training','power_endurance']
    ],
    deload: [
      ['mobility','technique'],
      ['technique','mobility'],
      ['mobility'],
      ['technique']
    ]
  };

  var slots = SLOT_COMPOSITION[block] || [['']];

  /* ELITE differentiation: inject a "maintenance" finger_strength slot
     into endurance phases to prevent MxS decay (Bompa cap.13: maintenance
     of max strength during the competitive/endurance phase).
     This is what makes the elite plan visibly different from advanced
     even when the phase sequence is identical. */
  if(U.level === 'elite' && block === 'endurance'){
    slots = [
      ['aerobic_endurance'],
      ['finger_strength'],                 /* MAINTENANCE HANG - elite-only */
      ['power_endurance','wall_training'],
      ['aerobic_endurance','power_endurance']
    ];
  }

  /* Level filter: never above tier, exclude warmups for intermediate+ */
  var availablePool = pool.filter(function(e){
    if((e.minLevel||0) > tier) return false;
    if(tier >= 1 && e.phase === 'warmup') return false;
    if(e.maxLevel != null && tier > e.maxLevel) return false;
    return true;
  });

  /* Rotation: exclude exercises used in OTHER days of THIS WEEK */
  var thisWk = U.startDate ? Math.floor((new Date(dateStr) - U.startDate) / (7*86400000)) : 0;
  var usedThisWeek = [];
  Object.keys(planMap || {}).forEach(function(dk){
    if(dk === dateStr) return;
    var pl = planMap[dk];
    if(!pl || pl.block !== block || !pl.exercises) return;
    var dd = new Date(dk);
    var wk = U.startDate ? Math.floor((dd - U.startDate) / (7*86400000)) : 0;
    if(wk === thisWk){
      pl.exercises.forEach(function(e){ if(e && e.id) usedThisWeek.push(e.id); });
    }
  });

  /* Deterministic seed from dateStr */
  var seed = 0;
  for(var i = 0; i < dateStr.length; i++) seed = (seed*31 + dateStr.charCodeAt(i)) & 0x7fffffff;
  function nextSeed(){ seed = (seed*1103515245 + 12345) & 0x7fffffff; return seed; }

  /* Fill each slot with best matching exercise */
  var selected = [];
  var selectedIds = {};

  for(var s = 0; s < Math.min(count, slots.length); s++){
    var allowedCats = slots[s];
    /* Find candidates matching this slot's category, not yet used this session,
       and preferably not used this week */
    var candidates = availablePool.filter(function(e){
      if(selectedIds[e.id]) return false;
      return allowedCats.indexOf(e.cat) !== -1;
    });

    if(candidates.length === 0){
      /* No exercises for this slot category - skip but don't break */
      continue;
    }

    /* Prefer candidates NOT used this week */
    var fresh = candidates.filter(function(e){return usedThisWeek.indexOf(e.id) < 0;});
    var picklist = fresh.length > 0 ? fresh : candidates;

    /* Random pick within slot */
    var idx = nextSeed() % picklist.length;
    var chosen = picklist[idx];
    selected.push(chosen);
    selectedIds[chosen.id] = true;
  }

  /* If we have fewer than count, fill with any remaining valid exercise */
  if(selected.length < count){
    var remaining = availablePool.filter(function(e){return !selectedIds[e.id];});
    /* prefer not-used-this-week */
    var freshRem = remaining.filter(function(e){return usedThisWeek.indexOf(e.id) < 0;});
    var fillPool = freshRem.length > 0 ? freshRem : remaining;

    while(selected.length < count && fillPool.length > 0){
      var fidx = nextSeed() % fillPool.length;
      selected.push(fillPool[fidx]);
      fillPool.splice(fidx, 1);
    }
  }

  /* Track for cross-week rotation */
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

/* ────────────────────────────────────────────────────
   getSessionPhases(block, sessionMinutes, goal)
   Returns array of phase objects with computed durations.
   Each phase: {id, label, col, desc, minutes, content}
──────────────────────────────────────────────────── */
function getSessionPhases(block, sessionMinutes, goal){
  if(!sessionMinutes || sessionMinutes < 30) sessionMinutes = 60;
  goal = goal || 'sport';
  var struct = SESSION_STRUCTURE[block];
  if(!struct) return [];

  var phases = struct.phases.map(function(ph){
    var min = Math.round(sessionMinutes * ph.ratio);
    /* Add goal-specific supplementary content */
    var content = '';
    if(ph.id === 'supp' && SUPP_CONTENT[goal] && SUPP_CONTENT[goal][block]){
      content = SUPP_CONTENT[goal][block];
    }
    return {
      id:       ph.id,
      label:    ph.label,
      col:      ph.col,
      desc:     ph.desc,
      minutes:  min,
      content:  content
    };
  });

  /* Normalize: ensure total adds up to sessionMinutes */
  var total = phases.reduce(function(s,p){return s + p.minutes;}, 0);
  var diff = sessionMinutes - total;
  if(diff !== 0 && phases.length > 0){
    /* add the diff to the main phase */
    var mainIdx = phases.findIndex(function(p){return p.id==='main';});
    if(mainIdx < 0) mainIdx = 0;
    phases[mainIdx].minutes += diff;
  }
  return phases;
}



function selectWarmupExercises(block, dateStr){
  var pool = EX_POOL[block] || [];
  var tier = getLevelTier();

  /* Pool of warm-up candidates:
     - Exercises with phase:'warmup' from current block
     - Plus low-fatigue recovery exercises */
  var warmups = pool.filter(function(e){
    return e.phase === 'warmup' || (e.fatigue && e.fatigue <= 2);
  });

  /* Add recovery block exercises as universal warm-up options */
  var recovery = EX_POOL.deload || [];
  recovery.forEach(function(e){
    if(e.fatigue && e.fatigue <= 2 && warmups.indexOf(e) < 0){
      warmups.push(e);
    }
  });

  if(warmups.length === 0) return [];

  /* Deterministic shuffle */
  var seed = 0;
  for(var i = 0; i < dateStr.length; i++) seed = (seed*31 + dateStr.charCodeAt(i)) & 0x7fffffff;
  var shuffled = warmups.slice().sort(function(){
    seed = (seed*1103515245 + 12345) & 0x7fffffff;
    return (seed % 3) - 1;
  });

  /* Return 1 for beginner, 2 for intermediate+ */
  var n = tier === 0 ? 1 : 2;
  return shuffled.slice(0, n);
}

function makeFatigueDots(fatigue, col){
  var h='<div class="ex-fatigue" style="color:'+col+'">';
  for(var i=1;i<=5;i++){
    h+='<div class="ex-fatigue-dot'+(i<=fatigue?' on':'')+'" style="'+(i<=fatigue?'background:'+col:'')+'"></div>';
  }
  h+='<span style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:var(--text-muted);margin-left:4px">fatiga</span></div>';
  return h;
}
function makeSkillTag(skill){
  var lvls=['','Técnica basica','Técnica moderada','Técnica avanzada','Alta especificidad','Elite'];
  return '<div class="ex-skill">Skill: '+lvls[skill]+'</div>';
}
/* ──────────────────────────────────────────────────
   Plan generation
────────────────────────────────────────────────── */


/* Is `ts` within `days` of `now`? Pure. */
function _isFresh(ts, days, now){
  if(!ts) return false;
  return ((now || Date.now()) - ts) <= (days || 21) * 86400000;
}
/* True if a finger or pull baseline/test was recorded recently — used to skip
   the forced "initial test" when the climber already has fresh numbers. */
function hasRecentBaseline(days){
  var keys = ['hang_max','pullup_3rm'], now = Date.now();
  for(var i=0;i<keys.length;i++){
    var h = (typeof loadTestHistory === 'function') ? loadTestHistory(keys[i]) : [];
    if(h && h.length && _isFresh(h[h.length-1].ts, days, now)) return true;
  }
  return false;
}

function generatePlan(){
  planMap={};
  if(!U.startDate||!U.plan) return;

  /* Phase sequence: goal-tuned by level + goal (Barrows 2013: sport =
     endurance-first, boulder = neural-freshness-first), then reweighted
     toward the climber's target-grade focus (applyGoalFocusToSeq).
     getPlanSeq() is the single source of truth for the whole app. */
  var prof = getLevelProfile();
  invalidatePlanSeqCache();
  var seq = getPlanSeq();
  if(!seq || !seq.length){
    seq = (U.plan === '3-2-1')
      ? ['strength','power','deload']
      : ['strength','power','endurance','deload'];
  }

  /* Cap sessions per week based on level */
  var effectiveDays = Math.min(U.days, prof.maxSessPerWk||4);

  /* Gym days from user selection, fallback to spread */
  var gymDOWs = U.gymDays && U.gymDays.length > 0
    ? U.gymDays.slice(0, effectiveDays)
    : smartDefaultDays(effectiveDays, getRockMode());

  /* Rock days are NO LONGER hardcoded from rockWeekend pref.
     They come from manual markRockDay() entries in planMap.
     rockWeekend preference only affects scheduling score, not blocking. */
  var testDone = false;

  /* ─── Test scheduling plan ────────────────────────────────
     Tests are scheduled BEFORE the week loop so we know which
     (week, gym-day-index) cells will hold them. This way we can
     avoid colliding with rock days or breaking out of the gym-day
     set, and we can support 3 tests for advanced/elite
     (initial + mid + final), 2 for intermediate (initial + final),
     1 for beginner (initial only).
     Tests are placed on the LAST gym day of a week to validate
     adaptations of the just-finished phase, except the initial
     test which goes on the FIRST gym day of week 1 (fresh state). */
  var hasTests = U.tests && U.tests.length > 0;
  var testWeeks = {};  /* map: weekIdx -> 'initial' | 'mid' | 'final' */
  if(hasTests){
    /* Initial test on week 0 — UNLESS the climber already logged a fresh
       baseline (finger/pull) at onboarding, so they aren't forced to re-test. */
    if(!hasRecentBaseline(21)) testWeeks[0] = 'initial';

    var nTrainWeeks = seq.length - 1;  /* last is deload */
    var lvl = U.level;
    var doMid   = (lvl === 'intermediate' || lvl === 'advanced' || lvl === 'elite');
    var doFinal = (lvl === 'intermediate' || lvl === 'advanced' || lvl === 'elite');

    if(doFinal && nTrainWeeks >= 2){
      /* Final test: last gym day of the LAST training week (before deload). */
      var finalWk = nTrainWeeks - 1;
      if(finalWk !== 0) testWeeks[finalWk] = 'final';   /* don't collide with initial */
    }
    if(doMid && nTrainWeeks >= 4){
      /* Mid test: place at the transition between the 1st and 2nd big phase.
         Find the first week whose block differs from seq[0]; place test at
         the LAST gym day of the week BEFORE that transition. */
      var transitionWk = -1;
      for(var ti = 1; ti < nTrainWeeks; ti++){
        if(seq[ti] !== seq[0]){ transitionWk = ti; break; }
      }
      var midWk = transitionWk > 0 ? transitionWk - 1 : -1;
      /* Avoid collision with initial/final test */
      if(midWk > 0 && !testWeeks[midWk]) testWeeks[midWk] = 'mid';
    }
  }

  seq.forEach(function(block, wi){
    var blockFatigue = BLOCK_FATIGUE[block]||'MED';

    /* pick which gym days to USE this week vía spacing scorer */
    var chosenDOWs = scoreAndPickDays(gymDOWs, blockFatigue, U.days, getRockMode());

    /* Track last session date within this week for gap calc */
    var lastSessionDay = -99;   /* day-of-week of previous session */

    /* Resolve which gym day of this week will host the test (if any).
       Initial → first gym DOW; mid/final → last gym DOW.
       chosenDOWs aren't strictly ordered by DOW, so sort a copy. */
    var testKind = testWeeks[wi];
    var sortedGymDOWs = chosenDOWs.slice().sort(function(a,b){
      /* Treat 0 (Sunday) as 7 so Mon-Sun reads chronologically */
      var aa = a===0?7:a, bb = b===0?7:b;
      return aa - bb;
    });
    var testDOW = -1;
    if(testKind && sortedGymDOWs.length > 0){
      testDOW = (testKind === 'initial') ? sortedGymDOWs[0]
                                         : sortedGymDOWs[sortedGymDOWs.length - 1];
    }

    for(var di=0; di<7; di++){
      var date = new Date(U.startDate);
      date.setDate(date.getDate() + wi*7 + di);
      var key  = date.toDateString();
      var dow  = date.getDay();

      /* If this day is a planned rock day -> outdoor rest.
         Rock days NEVER get overridden by tests; tests just shift
         to the next-best gym day in this week. */
      var rockDOWs = U.rockDays || [];
      if(rockDOWs.indexOf(dow) !== -1){
        planMap[key] = {block:'rest', week:wi+1, note:'roca-planificada', outdoor:true, plannedRock:true};
        continue;
      }

      /* Test scheduling: place a test on the resolved testDOW for this week. */
      if(testKind && dow === testDOW && chosenDOWs.indexOf(dow) !== -1){
        var noteByKind = {initial:'initial-test', mid:'mid-test', final:'final-test'};
        planMap[key] = {block:'test', week:wi+1, note:noteByKind[testKind]};
        if(testKind === 'initial') testDone = true;
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

/* ─────────────────────────────────────────────────────
   getPlanSeq() — the actual sequence the planner uses,
   respecting phaseSeqByGoal if defined.
   ───────────────────────────────────────────────────── */
/* Base sequence: goal-tuned by level + goal (Barrows/Bompa), before the
   climber's target-grade focus reweights it. */
function getBasePlanSeq(){
  var prof = getLevelProfile();
  if(!prof) return [];
  var goalKey = U.goal || 'sport';
  var goalSeqs = prof.phaseSeqByGoal && prof.phaseSeqByGoal[goalKey];
  var seqs = goalSeqs || prof.phaseSeq;
  return (seqs && seqs[U.plan]) || [];
}

/* ─────────────────────────────────────────────────────
   Goal-focused reweighting.
   Shifts 1-2 weeks of the macrocycle toward the block that trains the
   climber's PRIMARY limiting capacity (from computeGoalPlan), taken from
   the largest non-focus phase. Preserves total length, phase order, and
   keeps deload last. This is "prioritise your weakness" (pasoclave / Bompa)
   applied to the plan itself — not just advice on the goal card.
   Returns the base sequence unchanged when there's no target grade, when
   the focus block isn't part of this plan (e.g. power for beginners), or
   when there's no phase big enough to borrow a week from.
   ───────────────────────────────────────────────────── */
function applyGoalFocusToSeq(base){
  if(!base || base.length < 3) return base;
  if(!U.targetGrade || typeof computeGoalPlan !== 'function') return base;
  var gp = computeGoalPlan();
  if(!gp || !gp.hasTarget || gp.reached || !gp.focuses || !gp.focuses.length) return base;
  var focusBlock = gp.focuses[0].block;   /* strength | endurance | power */

  var order = [], counts = {};
  base.forEach(function(b){ if(counts[b] == null){ counts[b] = 0; order.push(b); } counts[b]++; });
  if(counts[focusBlock] == null) return base;   /* focus block not in this plan */

  var donor = null, donorN = 1;
  order.forEach(function(b){
    if(b === focusBlock || b === 'deload') return;
    if(counts[b] > donorN){ donorN = counts[b]; donor = b; }
  });
  if(!donor) return base;

  var move = (gp.gap >= 3 && counts[donor] >= 3) ? 2 : 1;
  move = Math.min(move, counts[donor] - 1);     /* never zero-out the donor phase */
  if(move < 1) return base;
  counts[donor] -= move;
  counts[focusBlock] += move;

  var seq = [];
  order.forEach(function(b){ if(b === 'deload') return; for(var i = 0; i < counts[b]; i++) seq.push(b); });
  for(var j = 0; j < (counts['deload'] || 0); j++) seq.push('deload');
  return seq;
}

/* Memoised public sequence — the one the whole app uses (plan generation,
   phase helpers, summaries). Cache keyed on every input that can change the
   result, so a render pass calling this many times stays cheap. */
var _seqCache = { key: null, seq: null };
function _seqKey(){
  var tsig = 0;
  try { var t = localStorage.getItem('cc_tests'); tsig = t ? t.length : 0; } catch(e){}
  return [U.level, U.goal, U.plan, U.grade, U.targetGrade, tsig].join('|');
}
function invalidatePlanSeqCache(){ _seqCache.key = null; }
function getPlanSeq(){
  var key = _seqKey();
  if(_seqCache.key === key && _seqCache.seq) return _seqCache.seq;
  var seq = applyGoalFocusToSeq(getBasePlanSeq());
  _seqCache = { key: key, seq: seq };
  return seq;
}

/* ─────────────────────────────────────────────────────
   getWeekInPhase(globalWeekIdx) — 1-based position of
   the given week within its contiguous phase run.
   Example: seq=[end,end,end,end,str,str,str,...]
            globalWeekIdx=2 → weekInPhase=3 (third endurance week)
            globalWeekIdx=4 → weekInPhase=1 (first strength week)
   ───────────────────────────────────────────────────── */
function getWeekInPhase(globalWeekIdx){
  var seq = getPlanSeq();
  if(seq.length === 0 || globalWeekIdx < 0 || globalWeekIdx >= seq.length) return 1;
  var current = seq[globalWeekIdx];
  var n = 1;
  for(var i = globalWeekIdx - 1; i >= 0; i--){
    if(seq[i] === current) n++;
    else break;
  }
  return n;
}

/* ─────────────────────────────────────────────────────
   getPhaseLength(globalWeekIdx) — total length of the
   contiguous phase the given week belongs to.
   ───────────────────────────────────────────────────── */
function getPhaseLength(globalWeekIdx){
  var seq = getPlanSeq();
  if(seq.length === 0 || globalWeekIdx < 0 || globalWeekIdx >= seq.length) return 1;
  var current = seq[globalWeekIdx];
  var len = 1;
  for(var i = globalWeekIdx + 1; i < seq.length; i++){
    if(seq[i] === current) len++;
    else break;
  }
  for(var j = globalWeekIdx - 1; j >= 0; j--){
    if(seq[j] === current) len++;
    else break;
  }
  return len;
}

/* ─────────────────────────────────────────────────────
   getWeekProgression(category, weekInPhase, phaseLength)
   Returns the progression stage for a given exercise category
   based on where in its phase the week lies. Buckets:
     0-25% → intro, 25-50% → build, 50-75% → peak, 75-100% → last entry
   Returns null if the category has no progression table.
   ───────────────────────────────────────────────────── */
function getWeekProgression(category, weekInPhase, phaseLength){
  if(typeof WEEK_PROGRESSION === 'undefined') return null;
  var table = WEEK_PROGRESSION[category];
  if(!table || table.length === 0) return null;
  if(table.length === 1) return table[0];
  /* 0-based position within phase */
  var pos = Math.max(0, weekInPhase - 1);
  var pct = phaseLength > 1 ? pos / (phaseLength - 1) : 0;
  var idx;
  if(pct < 0.25)      idx = 0;
  else if(pct < 0.55) idx = 1;
  else if(pct < 0.85) idx = Math.min(2, table.length - 1);
  else                idx = table.length - 1;
  return table[idx];
}

/* ─────────────────────────────────────────────────────
   getGripForWeek(weekInPhase, level)
   Rotates the suggested grip variant for finger_strength exercises
   to avoid overloading the same tendon every session.
   - beginner/intermediate: rotate half-crimp / open-hand
   - advanced/elite: also include pinch
   Source: Feehally (Beastmaking, 2020): "tendons don't like surprises,
   but they also don't like repetition" — rotate every 1-2 weeks.
   Returns a string label, or null if unknown level.
   ───────────────────────────────────────────────────── */
function getGripForWeek(weekInPhase, level){
  var tier = (typeof getLevelTier === 'function') ? getLevelTier() : 0;
  var variants = tier >= 2
    ? ['half-crimp', 'open-hand', 'pinch']
    : ['half-crimp', 'open-hand'];
  var idx = ((weekInPhase || 1) - 1) % variants.length;
  return variants[idx];
}
/* ──────────────────────────────────────────────────
   Rock day management
────────────────────────────────────────────────── */


/* ─────────────────────────────────────────────────────
   applyRockDayToPlan(dateStr) — PURE plan mutation (no DOM).
   A rock outing is a high load on fingers + CNS (Horst 2016), so the plan
   adapts around it:
     1) the day AFTER rock becomes a rest day (recovery) if it was training;
     2) the next training day after that is reduced in intensity;
     3) a hard session the day BEFORE rock is softened so you arrive fresh.
   Returns {rest, reduced, softenedPrev} with the affected date keys.
   ───────────────────────────────────────────────────── */
function applyRockDayToPlan(dateStr){
  var res = {rest:null, reduced:null, softenedPrev:null};
  var existingWeek = planMap[dateStr] ? planMap[dateStr].week : 1;
  planMap[dateStr] = {block:'rest', week:existingWeek, note:'roca', outdoor:true};
  var date = new Date(dateStr);

  /* 1) Rest day the day after rock. */
  var d1 = new Date(date); d1.setDate(d1.getDate() + 1);
  var k1 = d1.toDateString();
  var p1 = planMap[k1];
  if(p1 && !p1.outdoor && p1.block !== 'test'){
    if(p1.block === 'rest' || p1.block === 'deload'){
      res.rest = k1;                       /* already resting — good */
    } else {
      planMap[k1] = {block:'rest', week:p1.week, note:'descanso-post-roca', originalBlock:p1.block};
      res.rest = k1;
    }
  }

  /* 2) Reduce the next training day AFTER that rest. */
  var downgrades = {strength:'endurance', power:'endurance', endurance:'deload'};
  for(var di = 2; di <= 5 && !res.reduced; di++){
    var nd = new Date(date); nd.setDate(nd.getDate() + di);
    var nk = nd.toDateString();
    var np = planMap[nk];
    if(np && np.block !== 'rest' && np.block !== 'deload' && np.block !== 'test' && !np.outdoor && downgrades[np.block]){
      planMap[nk] = {block:downgrades[np.block], week:np.week, note:'reducido-post-roca', originalBlock:np.block};
      res.reduced = nk;
    }
  }

  /* 3) Soften a hard session the day before rock. */
  var pv = new Date(date); pv.setDate(pv.getDate() - 1);
  var pk = pv.toDateString();
  var pp = planMap[pk];
  if(pp && (pp.block === 'strength' || pp.block === 'power')){
    planMap[pk] = {block:'endurance', week:pp.week, note:'reducido-pre-roca', originalBlock:pp.block};
    res.softenedPrev = pk;
  }
  return res;
}

/* removeRockDayFromPlan(dateStr) — PURE. Undo applyRockDayToPlan: restore the
   rock day to plain rest and revert every day this outing touched (the loop
   spans -1..+5 so the pre-rock softening is restored too — it was previously
   missed by a forward-only loop). Returns true if a rock day was removed. */
function removeRockDayFromPlan(dateStr){
  var plan = planMap[dateStr];
  if(!plan || !plan.outdoor) return false;
  planMap[dateStr] = {block:'rest', week:plan.week || 1};
  var date = new Date(dateStr);
  var touched = {'reducido-post-roca':1, 'reducido-pre-roca':1, 'descanso-post-roca':1};
  for(var di = -1; di <= 5; di++){
    if(di === 0) continue;
    var nd = new Date(date); nd.setDate(nd.getDate() + di);
    var nk = nd.toDateString();
    var np = planMap[nk];
    if(np && np.originalBlock && touched[np.note]){
      planMap[nk] = {block:np.originalBlock, week:np.week};
    }
  }
  return true;
}

function markRockDay(dateStr){
  var res = applyRockDayToPlan(dateStr);

  /* Feed recovery engine: outdoor rock = high-load session */
  recData.hoursAgo  = 0;
  recData.stype     = 'outdoor';
  recData.rpe       = 8;
  recData.dur       = recData.dur || 240; /* 4h default */
  saveRec();

  /* Persist and re-render */
  savePlan();
  Bus.emit('cc:planChanged');
  hcSel = new Date(dateStr);
  showDayPanel(hcSel, planMap[dateStr], dateStr);

  var parts = [];
  if(res.rest) parts.push('descanso al día siguiente');
  if(res.reduced) parts.push('próxima sesión reducida');
  var msg = parts.length ? 'Roca marcada — ' + parts.join(' + ') + '.' : 'Roca marcada.';
  showToast(msg, 'var(--accent-power)');
}
function unmarkRockDay(dateStr){
  if(!removeRockDayFromPlan(dateStr)) return;
  savePlan();
  Bus.emit('cc:planChanged');
  showDayPanel(new Date(dateStr), planMap[dateStr], dateStr);
  showToast('Día de roca eliminado', 'var(--text-muted)');
}
/* ─────────────────────────────────────────────────────
   Manual per-day overrides (PURE mutations, no DOM).
   Let the user reconcile the plan with real life: I actually went to rock
   this day / I trained anyway / I rested. setDayTraining infers the phase
   block from surrounding days; both undo a rock outing's ripple first if the
   day was outdoor.
   ───────────────────────────────────────────────────── */
function setDayTraining(dateStr){
  if(planMap[dateStr] && planMap[dateStr].outdoor) removeRockDayFromPlan(dateStr);
  var date = new Date(dateStr);
  var block = 'endurance'; /* safe default */
  for(var di=-3; di<=3; di++){
    if(di===0) continue;
    var nd=new Date(date); nd.setDate(nd.getDate()+di);
    var np=planMap[nd.toDateString()];
    if(np && np.block!=='rest' && np.block!=='test' && !np.outdoor){ block=np.block; break; }
  }
  planMap[dateStr]={block:block, week:(planMap[dateStr]&&planMap[dateStr].week)||1, forced:true};
  return block;
}
function setDayRest(dateStr){
  if(planMap[dateStr] && planMap[dateStr].outdoor){ removeRockDayFromPlan(dateStr); return; }
  var wk=(planMap[dateStr]&&planMap[dateStr].week)||1;
  planMap[dateStr]={block:'rest', week:wk, forced:true};
}

function markTrainingDay(dateStr){
  setDayTraining(dateStr);
  savePlan();
  Bus.emit('cc:planChanged');
  hcSel=new Date(dateStr); showDayPanel(hcSel, planMap[dateStr], dateStr);
  showToast('Marcado como entrenamiento','var(--accent-strength)');
}
function markRestDay(dateStr){
  setDayRest(dateStr);
  savePlan();
  Bus.emit('cc:planChanged');
  hcSel=new Date(dateStr); showDayPanel(hcSel, planMap[dateStr], dateStr);
  showToast('Marcado como descanso','var(--accent-deload)');
}
/* Legacy entry point (Home day panel): force a session on a rest day. */
function forceSession(dateStr){
  setDayTraining(dateStr);
  savePlan();
  showDayPanel(new Date(dateStr),planMap[dateStr],dateStr);
  Bus.emit('cc:planChanged');
  showToast('Sesión forzada  -  monitorea tu recuperación','var(--accent-caution)');
}
