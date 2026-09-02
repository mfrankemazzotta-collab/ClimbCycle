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

  /* CATEGORÍAS SUPLENTES POR BLOQUE.

     La composición de arriba asume un pool profundo: cada slot tiene lo suyo
     y el último recoge lo que sobra. Con un pool chico eso se rompe de una
     forma que no da error, sólo aburre.

     Medido: un INTERMEDIO en fase de potencia tenía exactamente 5 ejercicios
     disponibles (el resto pide tier 2+, que es criterio de seguridad y no se
     toca). Pero como `exPerSession` de intermedio es 3, el bucle sólo llega
     al slot 3 — y `pull_strength` sólo aparecía en el slot 4. Resultado: los
     tres días de potencia de la semana proponían LOS MISMOS TRES ejercicios,
     semana tras semana, con dos (pow3, pow3b) que el usuario no veía nunca.

     Estas categorías entran sólo cuando el slot ya no tiene nada fresco esta
     semana: primero se respeta la composición, y recién si se agotó se
     amplía en vez de repetir. Quien tiene pool profundo no nota diferencia.

     `technique` en resistencia arregla el mismo defecto del otro lado: end0b,
     end0c y end0d (drills de pies precisos y brazos rectos, escritos con
     fuente y guía) no aparecían en NINGÚN plan, porque ningún slot de
     `endurance` pedía esa categoría. Tres ejercicios muertos. Se probó
     también meterlos en la composición y da casi lo mismo (10 vs 10 huecos de
     técnica sobre 60), así que se deja acá: no toca el protocolo. */
  var SLOT_FALLBACK = {
    strength: ['wall_training','pull_strength','finger_strength'],
    power: ['pull_strength','wall_training','power'],
    endurance: ['wall_training','power_endurance','aerobic_endurance','technique'],
    deload: ['mobility','technique']
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

  /* FILTRO POR EQUIPAMIENTO — y sustitución cuando la hay.

     Antes de esto el plan proponía "Campus bumps 1-4-7" a alguien cuyo
     gimnasio no tiene campus board, sin alternativa ni aviso. Medido: quien
     entrena en un gimnasio sólo de cuerda tenía 16 de 48 ejercicios (33%)
     que no podía ejecutar.

     `adaptExercise` devuelve el ejercicio tal cual si se puede hacer, la
     versión adaptada si hay sustituto (campus → lanzamientos sin pies en el
     muro, vías → travesías largas), o null si no hay forma. La sustitución
     es silenciosa: cada uno ve un plan ejecutable, sin leer sobre material
     que no tiene.

     El default de `gearDefault()` es gimnasio completo, así que quien nunca
     respondió la pregunta no pierde nada — ausencia de dato no es ausencia
     de material. */
  if(typeof adaptExercise === 'function'){
    var gear = (typeof U !== 'undefined' && U) ? U.gear : null;
    availablePool = availablePool
      .map(function(e){ return adaptExercise(e, gear); })
      .filter(Boolean);
  }

  /* Rotation: gather exercise ids already used for this block THIS week (avoid
     repeats within the week) and LAST week (rotate the stimulus across weeks —
     this is what makes week N feel different from week N-1). */
  var thisWk = U.startDate ? Math.floor((new Date(dateStr) - U.startDate) / (7*86400000)) : 0;
  var usedThisWeek = [];
  var usedLastWeek = [];
  var firmasSemana = {};   /* "id,id,id" de cada sesión del mismo bloque esta semana */
  Object.keys(planMap || {}).forEach(function(dk){
    if(dk === dateStr) return;
    var pl = planMap[dk];
    if(!pl || pl.block !== block || !pl.exercises) return;
    var dd = new Date(dk);
    var wk = U.startDate ? Math.floor((dd - U.startDate) / (7*86400000)) : 0;
    if(wk === thisWk){
      firmasSemana[pl.exercises.map(function(e){return e && e.id;}).sort().join(',')] = 1;
      pl.exercises.forEach(function(e){ if(e && e.id) usedThisWeek.push(e.id); });
    } else if(wk === thisWk - 1){
      pl.exercises.forEach(function(e){ if(e && e.id) usedLastWeek.push(e.id); });
    }
  });

  /* Deterministic seed from dateStr */
  var seed = 0;
  for(var i = 0; i < dateStr.length; i++) seed = (seed*31 + dateStr.charCodeAt(i)) & 0x7fffffff;
  function nextSeed(){ seed = (seed*1103515245 + 12345) & 0x7fffffff; return seed; }

  /* Fill each slot with best matching exercise */
  var selected = [];
  var selectedIds = {};

  function candidatosDe(cats){
    return availablePool.filter(function(e){
      if(selectedIds[e.id]) return false;
      return cats.indexOf(e.cat) !== -1;
    });
  }
  function sinUsarEstaSemana(list){
    return list.filter(function(e){ return usedThisWeek.indexOf(e.id) < 0; });
  }

  for(var s = 0; s < Math.min(count, slots.length); s++){
    var allowedCats = slots[s];
    /* Find candidates matching this slot's category, not yet used this session,
       and preferably not used this week */
    var candidates = candidatosDe(allowedCats);

    /* Si en las categorías propias de este slot ya no queda nada sin usar esta
       semana, se amplía a las suplentes del bloque ANTES de repetir. Sin esto,
       un pool chico devolvía el mismo trío todos los días de la semana. */
    if(sinUsarEstaSemana(candidates).length === 0 && SLOT_FALLBACK[block]){
      var suplentes = sinUsarEstaSemana(candidatosDe(SLOT_FALLBACK[block]));
      if(suplentes.length) candidates = candidates.concat(suplentes);
    }

    if(candidates.length === 0){
      /* No exercises for this slot category - skip but don't break */
      continue;
    }

    /* Prefer candidates fresh across BOTH this week and last week (cross-week
       rotation), then just this week, then anything. */
    var freshWk = candidates.filter(function(e){return usedThisWeek.indexOf(e.id) < 0;});
    var freshBoth = freshWk.filter(function(e){return usedLastWeek.indexOf(e.id) < 0;});
    var picklist;
    if(freshBoth.length > 0)      picklist = freshBoth;
    else if(freshWk.length > 0)   picklist = freshWk;
    else {
      /* Ya no queda nada sin usar esta semana: hay que repetir sí o sí. Pero
         repetir "cualquiera" hacía que el tercer día de un bloque reprodujera
         EXACTAMENTE el primero: mismo pool reducido, mismo orden de
         preferencia, mismo resultado.

         Dos cambios acá. Uno: se mira el bloque entero, no sólo las
         categorías de este slot — con el pool agotado, respetar la
         composición al pie de la letra es lo que fuerza la copia. Dos: se
         elige el MENOS usado de la semana, que reparte el desgaste.

         Nada de esto abre la puerta a ejercicios de más nivel: el filtro de
         tier y el de equipamiento ya se aplicaron sobre `availablePool`. */
      var amplios = SLOT_FALLBACK[block]
        ? candidatosDe(allowedCats.concat(SLOT_FALLBACK[block]))
        : candidates;
      if(amplios.length === 0) amplios = candidates;
      var veces = {};
      usedThisWeek.forEach(function(id){ veces[id] = (veces[id]||0) + 1; });
      var minimo = Infinity;
      amplios.forEach(function(e){ minimo = Math.min(minimo, veces[e.id]||0); });
      picklist = amplios.filter(function(e){ return (veces[e.id]||0) === minimo; });
      if(picklist.length === 0) picklist = amplios;
    }

    /* Seeded pick, advanced by week so consecutive weeks rotate through the
       pool. (mod is made non-negative in case thisWk is ever < 0.) */
    /* `thisWk` sale de una resta con `U.startDate`. El estado lo normaliza a
       Date al cargar (state.js), pero si algún camino lo dejara como string
       la resta da NaN, `idx` da NaN, `picklist[NaN]` es undefined y la línea
       siguiente revienta con "Cannot read properties of undefined" — la app
       entera sin ejercicios. Barato de blindar, caro de depurar: el mensaje
       no dice nada de fechas. */
    var wkOffset = isFinite(thisWk) ? thisWk : 0;
    var idx = ((nextSeed() + wkOffset) % picklist.length + picklist.length) % picklist.length;
    if(!isFinite(idx) || idx < 0) idx = 0;
    var chosen = picklist[idx];
    if(!chosen) continue;
    selected.push(chosen);
    selectedIds[chosen.id] = true;
  }

  /* If we have fewer than count, fill with any remaining valid exercise */
  if(selected.length < count){
    var remaining = availablePool.filter(function(e){return !selectedIds[e.id];});
    /* prefer not used this week nor last week, then not this week, then any */
    var freshRemBoth = remaining.filter(function(e){return usedThisWeek.indexOf(e.id) < 0 && usedLastWeek.indexOf(e.id) < 0;});
    var freshRem = freshRemBoth.length > 0 ? freshRemBoth : remaining.filter(function(e){return usedThisWeek.indexOf(e.id) < 0;});
    var fillPool = freshRem.length > 0 ? freshRem : remaining;

    while(selected.length < count && fillPool.length > 0){
      var fidx = nextSeed() % fillPool.length;
      selected.push(fillPool[fidx]);
      fillPool.splice(fidx, 1);
    }
  }

  /* ANTI-CALCO: ningún día repite la sesión completa de otro día de la semana.

     Los filtros de arriba miran ejercicio por ejercicio; ninguno mira la
     COMBINACIÓN. Con un pool chico eso alcanzaba para que dos días quedaran
     armados exactamente igual aunque cada pieza se hubiera elegido "bien":
     medido en un principiante, lunes y viernes de la semana 1 eran la misma
     sesión (end0a + end8) teniendo cuatro ejercicios disponibles y seis
     combinaciones posibles.

     Se cambia UNA pieza por otra del mismo bloque (availablePool ya pasó los
     filtros de nivel, fase y equipamiento) hasta que la firma sea nueva. Si
     no hay forma —pool realmente agotado— se deja como está: es preferible
     repetir a devolver un día incompleto. */
  if(selected.length > 0 && Object.keys(firmasSemana).length > 0){
    var firmaDe = function(list){
      return list.map(function(e){return e.id;}).sort().join(',');
    };
    if(firmasSemana[firmaDe(selected)]){
      var enSesion = {};
      selected.forEach(function(e){ enSesion[e.id] = 1; });
      var alternativas = availablePool.filter(function(e){ return !enSesion[e.id]; });
      var resuelto = false;
      for(var pos = selected.length - 1; pos >= 0 && !resuelto; pos--){
        for(var a = 0; a < alternativas.length && !resuelto; a++){
          var prueba = selected.slice();
          prueba[pos] = alternativas[a];
          if(!firmasSemana[firmaDe(prueba)]){ selected = prueba; resuelto = true; }
        }
      }
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
  h+='<span style="font-size:11px;font-family:\'JetBrains Mono\',monospace;color:var(--text-muted);margin-left:4px">fatiga</span></div>';
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

/* How many sessions to schedule THIS WEEK for a given phase — a volume taper
   (Barrows: Base > Peak > Deload). Floored at 2 (when ≥2 days are available),
   capped by the climber's availability and the level's max. So a climber who
   marks 3 available days trains 3× in base/strength weeks and 2× in power /
   deload — "3 y 2 según la semana", automatically. Pure. */
function sessionsForPhase(block, available, maxSess){
  var factor = { endurance:1.0, strength:0.9, power:0.7, deload:0.55, test:0.7, rest:0 };
  var f = (factor[block] != null) ? factor[block] : 1.0;
  var n = Math.round(available * f);
  n = Math.min(n, available, maxSess || available);
  return Math.max(Math.min(2, available), n);
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

  var maxSess = prof.maxSessPerWk || 4;

  /* AVAILABILITY: all the days the climber COULD train. NOT capped per week
     here — the per-week count varies by phase (sessionsForPhase) inside the
     loop, so base weeks use more of these days and peak/deload use fewer. */
  var gymDOWs = U.gymDays && U.gymDays.length > 0
    ? U.gymDays.slice()
    : smartDefaultDays(Math.min(U.days, maxSess), getRockMode());

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

    /* Variable weekly frequency: fewer sessions in high-fatigue / deload weeks
       (Barrows volume taper), then pick the best-spaced days for that count. */
    var weekTarget = sessionsForPhase(block, gymDOWs.length, maxSess);
    var chosenDOWs = scoreAndPickDays(gymDOWs, blockFatigue, weekTarget, getRockMode());

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

  /* El plan cambió: el progreso por ejercicio de los días que dejaron de ser
     de entrenamiento queda huérfano (nunca se limpiaba y se acumulaba en los
     backups y el sync). Se conserva el de los días que siguen entrenables. */
  if(typeof pruneExDone === 'function') pruneExDone();
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

/* PURE. Extract the rest interval an exercise prescribes, in SECONDS, so the
   "Hoy" screen can preload a rest timer with the right value.
   Handles the formats used across the pool: "descanso 3 min", ":3min",
   "descanso 3-4 min" (takes the LOW end), "descanso 5-8 min", "90s", "descanso 1:1".
   Returns null when the exercise defines rest relative to work (1:1, rest=work)
   or when nothing parseable is found — the caller then offers a manual timer. */
/* PURA. Segundos de descanso prescritos, o null si es relativo al trabajo.

   DOS BUGS QUE ESTO ARREGLA, los dos encontrados por la beta.

   1. LA NOTA Y EL DETALLE PODÍAN CONTRADECIRSE, Y GANABA EL DETALLE.
      Se buscaba en `nota + det` concatenados. En `str0b` la nota dice
      "3 min de descanso" y el det "Descanso 2-3 min": el regex de
      "descanso N min" matcheaba primero en el det y devolvía 120 s para un
      ejercicio prescrito a 180. La nota es el resumen que el usuario mira
      entre series — tiene que mandar ella. Ahora se busca primero en la
      nota y sólo se cae al det si ahí no hay nada.

   2. FORMATOS QUE NO ENTENDÍA. "descanso 3+ min" (el `+`), "90 s de
      descanso" (segundos con espacio) y "N min de descanso" con rango
      devolvían null, así que la tarjeta de Hoy se quedaba sin descanso y el
      temporizador no podía armarse. Siete ejercicios estaban así. */
function parseRestSeconds(ex){
  if(!ex) return null;
  function buscar(txt){
    if(!txt) return null;
    txt = String(txt).toLowerCase();
    /* Descanso RELATIVO al trabajo: no se puede saber de antemano. */
    if(/1\s*:\s*1|rest\s*=\s*work|descanso\s*=\s*tiempo|igual al tiempo|el doble|el triple|veces lo que|veces el tiempo/.test(txt)) return null;
    /* "descanso 3 min", "descanso 3-4 min", "descanso 3+ min", ":3min" */
    var m = txt.match(/(?:descanso|:)\s*(\d+)\s*(?:\+|(?:\s*-\s*\d+))?\s*min/);
    if(m) return parseInt(m[1], 10) * 60;
    /* "3 min de descanso", "3-4 min de descanso" */
    m = txt.match(/(\d+)\s*(?:\+|(?:\s*-\s*\d+))?\s*min\s*(?:de\s+)?descanso/);
    if(m) return parseInt(m[1], 10) * 60;
    /* segundos: "descanso 90s", ":90s", "90 s de descanso" */
    m = txt.match(/(?:descanso|:)\s*(\d+)\s*s\b/);
    if(m) return parseInt(m[1], 10);
    m = txt.match(/(\d+)\s*s\s*(?:de\s+)?descanso/);
    if(m) return parseInt(m[1], 10);
    return null;
  }
  /* La nota manda; el detalle es el respaldo. */
  var enNota = buscar(ex.nota);
  if(enNota != null) return enNota;
  /* Si la nota declara un descanso relativo, NO se cae al det: sería
     inventar un número donde el ejercicio dice "el doble de lo que tardes". */
  if(/1\s*:\s*1|descanso\s*=\s*tiempo|el doble|el triple|veces lo que/i.test(String(ex.nota || ''))) return null;
  return buscar(ex.det);
}

/* PURA. El descanso EN PALABRAS cuando es relativo al trabajo.
   Sin esto, "descansás el doble de lo que tardás" simplemente desaparecía de
   la tarjeta de Hoy —`rest` quedaba vacío— y el usuario veía menos
   información en la pantalla que usa DURANTE la sesión que en la vista
   Semana. Fue el reporte "el ejercicio no es igual en Hoy que en Semana". */
function restoRelativo(ex){
  var nota = String((ex && ex.nota) || '');
  var m = nota.match(/(?:·|,)?\s*(descans[^·,]*(?:doble|triple|veces lo que|veces el tiempo|=\s*tiempo[^·,]*|1\s*:\s*1)[^·,]*)/i);
  if(m) return m[1].trim();
  if(/descanso\s*1\s*:\s*1/i.test(nota)) return 'descanso 1:1 (lo mismo que tardaste)';
  return '';
}

/* PURE. Format seconds as m:ss for the card's rest line. */
function formatRest(secs){
  if(!secs || secs <= 0) return '';
  var m = Math.floor(secs/60), s = secs % 60;
  return m + ':' + ('0'+s).slice(-2);
}

/* PURE. La tarjeta muestra la DOSIS en grande (lo que se relee entre series) y
   el resto como líneas secundarias. `nota` mezcla todo ("5 series · 10s con
   buffer 3s · descanso 3 min"), así que lo separamos en tres:
     dose   → primer segmento, COMPACTO ("5 series") — va en grande
     detail → segmentos intermedios ("10s con buffer 3s") — va chico
     rest   → 'm:ss', o '' si es relativo (1:1 / rest=work)
   Mantener `dose` corto es lo que evita que la columna desborde en móvil. */
function splitDose(ex){
  if(!ex) return {dose:'', detail:'', rest:''};
  var nota = String(ex.nota || '');
  /* saca la cláusula de descanso, en cualquiera de sus formas */
  var body = nota
    /* ORDEN IMPORTANTE. "3 min de descanso" va PRIMERO: si corriera antes el
       patrón genérico de abajo, éste se comería sólo la palabra "descanso" y
       dejaría "3 min de" colgando en la tarjeta. */
    .replace(/\s*[·,;]?\s*\d+\s*(?:\+|(?:\s*-\s*\d+))?\s*(?:min|s)\s*de\s+descans[^·,;]*/i, '')
    /* "· descanso 3 min", "· descansás el doble de lo que tardás" */
    .replace(/\s*[·,;]?\s*descans[^·,;]*/i, '')
    .replace(/\s*:\s*\d+\s*(?:min|s)\b[^·,;]*/i, '')
    .replace(/\s*,?\s*rest\s*=\s*work\s*/i, '')
    .replace(/\s*[·,;]\s*$/, '')
    .trim();
  var parts = body.split(/\s*[·,]\s*/).filter(function(p){ return p.trim(); });
  var dose = (parts.shift() || body || nota).trim();

  /* Si el primer segmento sigue siendo una frase ("6-10 intentos de 1-2
     movimientos máximos"), quedate solo con la parte cuantitativa: hasta la
     palabra-unidad inclusive. Lo que sobra baja a `detail`. */
  if(dose.length > 13){
    var m = dose.match(/^(.{0,24}?\b(?:series?|sets?|min|intentos?|reps?|movs?|movimientos?|bloques?|v[ií]as?|lanzamientos?|veces|ciclos?))\b\s*(.*)$/i);
    if(!m) m = dose.match(/^((?:\S+\s+){2}\S+)\s+(.*)$/);   /* fallback: 3 palabras */
    /* nunca cortar dejando un paréntesis abierto ("8-12 x (30s") */
    var balanced = m && (m[1].split('(').length === m[1].split(')').length);
    if(m && m[1] && balanced){
      if(m[2]) parts.unshift(m[2]);
      dose = m[1].trim();
    }
  }
  var secs = (typeof parseRestSeconds === 'function') ? parseRestSeconds(ex) : null;
  var rest = formatRest(secs);
  /* Descanso relativo ("el doble de lo que tardás", "1:1"): no hay m:ss que
     mostrar, pero SÍ hay una instrucción — y perderla dejaba la tarjeta de
     Hoy con menos información que la de Semana. Baja a `detail`, que es
     donde se muestra en palabras. */
  if(!rest){
    var rel = (typeof restoRelativo === 'function') ? restoRelativo(ex) : '';
    /* Sólo si no quedó ya en los segmentos: agregarlo a ciegas lo mostraba
       dos veces ("descansás el doble … · descansás el doble …"). */
    var yaEsta = parts.some(function(p){ return /descans/i.test(p); });
    if(rel && !yaEsta) parts.push(rel);
  }
  return { dose: dose, detail: parts.join(' · '), rest: rest };
}

/* PURE. ¿Este ejercicio se hace CON TIEMPO? Si es así devuelve un protocolo
   listo para el temporizador (prep → trabajo → descanso, series contadas);
   si va por repeticiones (dominadas, bloques) devuelve null y sólo se ofrece
   el descanso  -  las reps las contás vos.
   Formatos que cubre:
     "5 series · 10s con buffer 3s · descanso 3 min" → 5x10s, descanso 180
     "3-4 series · (7s on / 3s off) x6 · descanso 3 min" → 3 series de 6 reps 7s/3s
     "5 x 8s(2) cada brazo :3min"                   → 5x8s, descanso 180
     "4 x 3rep x 5s hold :3min"                     → 4 series de 3 reps de 5s   */
function parseWorkProtocol(ex){
  if(!ex) return null;
  var nota = String(ex.nota || '');
  var low = function(s){ return parseInt(String(s).split('-')[0], 10); };

  /* Buscamos el tiempo de trabajo SOLO en la dosis (splitDose ya sacó la
     cláusula de descanso), y descartamos "cada Ns", que es cadencia de
     intervalo y no tiempo de cuelgue. Sin esto, ":90s" (descanso) y
     "cada 60s" (cadencia) se colaban como si fueran trabajo. */
  var d = (typeof splitDose === 'function') ? splitDose(ex) : {dose:nota, detail:''};
  var cuerpo = (d.dose + ' ' + (d.detail || '')).replace(/cada\s*\d+\s*s\b/ig, '');

  var mWork = cuerpo.match(/(\d+(?:-\d+)?)\s*s\b/);
  if(!mWork) return null;
  var work = low(mWork[1]);
  if(!work || work > 120) return null;          /* > 2 min ya no es un cuelgue */

  /* Series: primer número seguido de una palabra-unidad.

     REGRESIÓN QUE ESTO ARREGLA. Sólo se reconocían "series", "sets" y "x".
     Al pasar las notas de la jerga de planilla al castellano —"5 x 10s
     :2min" → "5 cuelgues de 10s · 2 min de descanso"— la palabra dejó de
     estar en la lista y `sets` caía al default de 1: el usuario abría el
     temporizador esperando 5 series con 2 minutos entre medio y veía una
     sola cuenta de 10 segundos. Fue el reporte "el temporizador no se activa
     bien, para descanso de 3 minutos veo 10 segundos".

     Lección: cambiar un TEXTO rompió una FUNCIÓN, y ningún test lo vio
     porque nada ataba el protocolo del timer a la nota que lo alimenta.
     Los casos de `timer.test` cubren eso ahora. */
  var mSets = cuerpo.match(/(\d+(?:-\d+)?)\s*(?:series?|sets?|cuelgues?|intentos?|rondas?|circuitos?|vueltas?|ciclos?|bloques?|x)\b/i);
  var sets = mSets ? low(mSets[1]) : 1;

  /* repeticiones dentro de la serie: "(7s on / 3s off) x6", "3rep",
     "x 3 bloqueos", "x 15 reps" */
  var reps = 1, restRep = 0;
  var mRep = cuerpo.match(/\)\s*x\s*(\d+)/i)
          || cuerpo.match(/x\s*(\d+)\s*(?:rep|bloqueos?|cuelgues?)/i)
          || cuerpo.match(/(\d+)\s*rep/i);
  if(mRep) reps = parseInt(mRep[1], 10) || 1;
  var mOff = cuerpo.match(/\/\s*(\d+)\s*s\s*off/i);
  if(mOff) restRep = parseInt(mOff[1], 10) || 0;

  var restSet = (typeof parseRestSeconds === 'function') ? (parseRestSeconds(ex) || 0) : 0;
  if(!sets || sets < 1) sets = 1;
  return { sets:sets, reps:reps, work:work, restRep:restRep, restSet:restSet };
}

/* PURE. Given the day-of-week ints a climber trains in a week, return true if
   any two fall on consecutive days (a 1-day gap = little recovery between
   sessions). Used to warn when the user manually packs sessions together;
   scoreAndPickDays already max-spaces the auto-schedule. */
function hasTightSpacing(dows){
  var s = (dows || []).slice().sort(function(a, b){ return a - b; });
  for(var i = 1; i < s.length; i++){
    if(s[i] - s[i-1] === 1) return true;
  }
  return false;
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

/* PURE. "I trained today" for the disorganized climber. Given this week's days
   (chronological: [{date, isTraining, done, isToday}]) decide what to do:
     · today is a training day not done   → 'markToday' (just mark it)
     · today already done                 → 'alreadyDone' (no-op + message)
     · otherwise, an earlier/other session is pending → 'moveHere' (anchor that
       session to today, so the weekly count & block stay right)
     · nothing pending                     → 'bonus' (log an extra session today)
   `from` (for moveHere) is the pending session's dateStr. */
function resolveTrainedToday(weekDays){
  var today = null, pending = null;
  for(var i = 0; i < (weekDays || []).length; i++){
    var d = weekDays[i];
    if(d.isToday) today = d;
    else if(d.isTraining && !d.done && pending === null) pending = d;
  }
  if(today && today.done) return { action:'alreadyDone' };
  if(today && today.isTraining) return { action:'markToday' };
  if(pending) return { action:'moveHere', from: pending.date };
  return { action:'bonus' };
}

/* PURE. Días de la semana en los que el usuario PODRÍA salir a roca pero
   todavía no lo marcó. `U.rockDays` es una ventana de disponibilidad (los DOW
   que declaró en Perfil), no una obligación: hasta acá sólo se podían marcar
   día por día desde Inicio, así que la ventana era invisible justo donde se
   mira la semana.

   Entrada (inyectada, para poder testear sin estado global):
     days      [{date, dow, outdoor, block, isPast}]  la semana en orden
     rockDows  [int]  los DOW de la ventana
   Devuelve sólo los candidatos accionables:
     · dentro de la ventana
     · no marcados ya como roca (no tiene sentido ofrecer lo hecho)
     · no pasados — marcar roca dispara el ripple (descanso/sesión reducida)
       hacia adelante, y aplicarlo al pasado reescribiría días ya vividos.
   `busy` avisa que ese día ya tiene sesión de gym: marcar roca la reemplaza,
   y el usuario merece saberlo ANTES de tocar. */
/* PURE. Marcar roca significa dos cosas MUY distintas según la fecha:
     · "salí el sábado pasado"  → es carga real: hay que registrarla
     · "voy a salir el sábado"  → es una intención: el plan se acomoda, pero
                                  NADA de carga ocurrió todavía
   Tratarlas igual producía dos errores: la recuperación se desplomaba al
   planificar una salida futura (`hoursAgo:0` decía "acabás de escalar"), y
   una salida ya hecha no entraba en el historial que alimenta el ACWR.

   Devuelve qué corresponde hacer:
     log            registrar la salida en cc_logs (sólo si ya ocurrió)
     touchRecovery  actualizar el último check-in
     hoursAgo       cuántas horas hace que terminó (para el motor) */
function resolveSessionTiming(dateStr, today){
  var d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  var t = new Date(today || TODAY); t.setHours(0, 0, 0, 0);
  var dias = Math.round((t - d) / 86400000);

  if(dias < 0) return { when:'future', log:false, touchRecovery:false, daysAgo:-dias };
  return {
    when: dias === 0 ? 'today' : 'past',
    log: true,
    /* Una sesión de hace una semana no debe pisar el check-in de hoy: sólo
       manda sobre `recData` si es la más reciente que conocemos. */
    touchRecovery: dias <= 1,
    daysAgo: dias,
    hoursAgo: dias * 24
  };
}
/* Alias histórico: las salidas de roca son un caso de lo mismo. */
function resolveRockLogging(dateStr, today){ return resolveSessionTiming(dateStr, today); }

/* PURE. Qué ofrecer en la vista Semana respecto de las salidas de roca.

   Un día de roca tiene TRES estados, y confundirlos es lo que dejaba la
   carga real sin registrar:
     · `plannedRock`       el plan RESERVÓ el día porque cae en tu ventana de
                           disponibilidad. Es tentativo: nadie sabe si saliste.
     · outdoor sin planned  la salida está CONFIRMADA (cuenta como carga).
     · libre                día de la ventana que el plan no reservó.

   El hueco: un finde reservado que ya pasó no le preguntaba nada a nadie, y
   la sesión más dura de la semana nunca entraba al historial de carga que
   alimenta el ACWR. De ahí el candidato 'confirm'.

   Entrada (inyectada, para testear sin estado global):
     days      [{date, dow, outdoor, plannedRock, block, isPast, isToday}]
     rockDows  [int] los DOW de la ventana
   Salida: [{date, dow, kind, busy}] con kind:
     'confirm'  día reservado que ya llegó → "¿saliste?" (registra la carga)
     'mark'     día libre a futuro → agendar la salida
   `busy` avisa que ese día ya tiene sesión de gym: marcar roca la reemplaza
   y conviene saberlo ANTES de tocar. */
function rockCandidates(days, rockDows){
  var win = {};
  (rockDows || []).forEach(function(d){ win[d] = true; });
  var out = [];

  (days || []).forEach(function(d){
    var busy = !!(d.block && d.block !== 'rest' && d.block !== 'test');

    /* Salida ya confirmada: no hay nada que preguntar. */
    if(d.outdoor && !d.plannedRock) return;

    if(d.plannedRock){
      /* Sólo cuando el día llegó: preguntarle por una salida futura no tiene
         respuesta posible todavía. */
      if(d.isPast || d.isToday) out.push({ date:d.date, dow:d.dow, kind:'confirm', busy:busy });
      return;
    }

    /* Día de la ventana que el plan no reservó (p. ej. tras editar el plan).
       No se ofrece en el pasado: el ripple sólo va hacia adelante. */
    if(win[d.dow] && !d.isPast) out.push({ date:d.date, dow:d.dow, kind:'mark', busy:busy });
  });

  return out;
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

/* Qué fase es una semana, LEÍDA DEL PLAN y no recalculada.

   EL BUG QUE ESTO ARREGLA (reportado por la beta): la vista Semana mostraba
   "Fuerza" en una semana que el plan tenía como resistencia, y "Potencia" en
   una de fuerza. Reproducido con el perfil por defecto:

       semana | la vista decía | el plan tenía
          5   | strength       | endurance

   La causa: `renderWk()` recalculaba la secuencia con
   `getLevelProfile().phaseSeq[U.plan]` —la secuencia BASE del nivel—
   mientras que `generatePlan()` la construye con `getPlanSeq()`, que es la
   AJUSTADA por el motor de objetivo (reasigna semanas hacia la capacidad más
   débil). Dos fuentes para el mismo dato, y la pantalla mostraba justo la
   que no se había usado.

   Leyendo del `planMap`, la divergencia deja de ser posible: la vista no
   puede contradecir al plan porque muestra el plan. Mismo criterio con el
   que se cerraron las otras fronteras del proyecto.

   PURA: recibe el mapa y el lunes de la semana. */
function blockOfWeek(planMap, wkStart){
  if(!planMap || !wkStart) return null;
  var cuenta = {};
  var d = new Date(wkStart);
  if(isNaN(d.getTime())) return null;
  for(var i = 0; i < 7; i++){
    var p = planMap[d.toDateString()];
    if(p && p.block && p.block !== 'rest') cuenta[p.block] = (cuenta[p.block] || 0) + 1;
    d.setDate(d.getDate() + 1);
  }
  var mejor = null, max = 0;
  Object.keys(cuenta).forEach(function(b){ if(cuenta[b] > max){ max = cuenta[b]; mejor = b; } });
  return mejor;   /* null si la semana entera es descanso */
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
  function at(off){ var d=new Date(date); d.setDate(d.getDate()+off); var k=d.toDateString(); return {k:k, p:planMap[k]}; }
  function isRock(off){ var x=at(off); return !!(x.p && x.p.outdoor); }

  /* 1) Rest the day after rock (unless that day is itself a rock day → block). */
  var a1 = at(1);
  if(a1.p && !a1.p.outdoor && a1.p.block !== 'test'){
    if(a1.p.block === 'rest' || a1.p.block === 'deload'){
      res.rest = a1.k;                      /* already resting — good */
    } else {
      /* preserve the TRUE original block if this day was already reduced */
      planMap[a1.k] = {block:'rest', week:a1.p.week, note:'descanso-post-roca', originalBlock: a1.p.originalBlock || a1.p.block};
      res.rest = a1.k;
    }
  }

  /* 2) Ease the next HARD session back — ONE per rock block, not one per rock
     day (a Sat+Sun weekend is a single high-load event, not two). Skip if the
     day before is already rock (block continuation) or a post-rock reduction
     already exists nearby. Endurance is low-intensity, so it is NOT downgraded
     — the rest day above is enough (never turns a day into the deload PHASE). */
  var downgrades = {strength:'endurance', power:'endurance'};
  var blockContinuation = isRock(-1);
  var alreadyReduced = false;
  for(var c = 1; c <= 7; c++){ var xc = at(c); if(xc.p && xc.p.note === 'reducido-post-roca'){ alreadyReduced = true; break; } }
  if(!blockContinuation && !alreadyReduced){
    for(var di = 2; di <= 6 && !res.reduced; di++){
      var xn = at(di);
      if(xn.p && xn.p.block !== 'rest' && xn.p.block !== 'deload' && xn.p.block !== 'test' && !xn.p.outdoor && downgrades[xn.p.block]){
        planMap[xn.k] = {block:downgrades[xn.p.block], week:xn.p.week, note:'reducido-post-roca', originalBlock:xn.p.block};
        res.reduced = xn.k;
      }
    }
  }

  /* 3) Soften a hard session the day before the block (unless that day is rock). */
  var b1 = at(-1);
  if(b1.p && !b1.p.outdoor && (b1.p.block === 'strength' || b1.p.block === 'power')){
    planMap[b1.k] = {block:'endurance', week:b1.p.week, note:'reducido-pre-roca', originalBlock:b1.p.block};
    res.softenedPrev = b1.k;
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

/* Efectos de marcar roca que NO son del plan: historial de carga + check-in.
   Compartido por el panel de día (markRockDay) y la vista Semana
   (wkMarkRock) para que las dos entradas se comporten igual. */
function applyRockSideEffects(dateStr){
  var w = resolveRockLogging(dateStr, TODAY);
  if(w.log && typeof logRockOuting === 'function') logRockOuting(dateStr);
  if(w.touchRecovery && typeof Store !== 'undefined' && Store.setRec){
    /* no emite: el commit('plan') de quien llama ya repinta */
    Store.setRec({ hoursAgo: w.hoursAgo, stype:'outdoor',
                   rpe: ROCK_DEFAULT_RPE, dur: recData.dur || ROCK_DEFAULT_MIN }, false);
  }
  return w;
}

/* Mensaje del toast: además de lo que cambió en el plan, deja claro si la
   salida se contabilizó como carga o si sólo quedó agendada. */
function rockToastMsg(res, when){
  var parts = [];
  if(res && res.rest) parts.push('descanso al día siguiente');
  if(res && res.reduced) parts.push('próxima sesión reducida');
  var base = when === 'future' ? 'Salida agendada' : 'Roca registrada';
  return parts.length ? base + ' — ' + parts.join(' + ') + '.' : base + '.';
}

function markRockDay(dateStr){
  var res = applyRockDayToPlan(dateStr);
  var w = applyRockSideEffects(dateStr);

  /* Persist and re-render */
  commit('plan');
  hcSel = new Date(dateStr);
  showDayPanel(hcSel, planMap[dateStr], dateStr);

  showToast(rockToastMsg(res, w.when), 'var(--accent-power)');
}
function unmarkRockDay(dateStr){
  if(!removeRockDayFromPlan(dateStr)) return;
  if(typeof unlogRockOuting === 'function') unlogRockOuting(dateStr);
  commit('plan');
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
  commit('plan');
  hcSel=new Date(dateStr); showDayPanel(hcSel, planMap[dateStr], dateStr);
  showToast('Marcado como entrenamiento','var(--accent-strength)');
}
function markRestDay(dateStr){
  setDayRest(dateStr);
  commit('plan');
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

/* ─────────────────────────────────────────────────────
   Flexible availability window (gym / rocódromo)
   The climber declares which days they CAN train; the plan schedules N/week
   from that pool (scoreAndPickDays already max-spaces for recovery). When the
   window changes we re-schedule FUTURE weeks only, preserving the past and any
   day the climber already logged or hand-tweaked.
   ───────────────────────────────────────────────────── */

/* PURE. Merge a freshly-regenerated plan (newMap) over the previous one
   (oldMap), keeping history and manual edits intact:
     · dates strictly before `today`            → keep old (never rewrite history)
     · dates with a logged session (sessionLog) → keep old
     · dates the user forced/moved/marked rock  → keep old (respect tweaks)
     · every other (future, untouched) day      → take the new schedule
   Returns the merged planMap. */
function mergePreservePast(oldMap, newMap, today, sessionLog){
  oldMap = oldMap || {}; newMap = newMap || {}; sessionLog = sessionLog || {};
  var t0 = new Date(today); t0.setHours(0,0,0,0);
  var keys = {}, merged = {};
  Object.keys(oldMap).forEach(function(k){ keys[k] = 1; });
  Object.keys(newMap).forEach(function(k){ keys[k] = 1; });
  Object.keys(keys).forEach(function(k){
    var d = new Date(k);
    var isPast = !isNaN(d.getTime()) && d < t0;
    var o = oldMap[k];
    var locked = !!sessionLog[k] || (o && (o.forced || o.outdoor || o.moved));
    if(isPast || locked){
      if(o) merged[k] = o;               /* preserve */
    } else if(newMap[k]){
      merged[k] = newMap[k];             /* future, untouched → new schedule */
    }
    /* else: future untouched day dropped from the new window → becomes rest */
  });
  return merged;
}

/* Regenerate the plan from the (already-updated) U and preserve the past.
   Shared by the gym and rock window editors. Persists + repaints. */
function rescheduleFuture(){
  var oldMap = planMap;
  generatePlan();                         /* rebuilds planMap fresh from U */
  planMap = mergePreservePast(oldMap, planMap, (typeof TODAY !== 'undefined' ? TODAY : new Date()), sessionLog);
  if(typeof saveU === 'function') saveU();
  if(typeof commit === 'function') commit('plan'); else if(typeof savePlan === 'function') savePlan();
  return planMap;
}

/* Change the gym availability window and re-schedule the future. */
function rescheduleGymWindow(newGymDays){
  U.gymDays = (newGymDays || []).slice();
  if(U.gymDays.length) U.days = U.gymDays.length;
  return rescheduleFuture();
}

/* Change the rock availability window (days the climber might go outdoors) and
   re-schedule the future — re-scores gym placement to leave the pool freer. */
function rescheduleRockWindow(newRockDays){
  U.rockDays = (newRockDays || []).slice();
  return rescheduleFuture();
}
