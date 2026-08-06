/* ====================================================
   intensity.js -- Tests → concrete session loads & calibration
   ClimbCycle

   PURE logic (no DOM). Turns recorded test results into the actual numbers
   the plan prescribes, so "tus tests ajustan la intensidad" is TRUE and
   VISIBLE instead of a claim. Loaded AFTER tests.js — needs TESTS,
   runInterpret, loadTestHistory (state.js), U (state.js) and is read by
   the renderers (render-home, tests tab).

   Load model — three inputs, no double-counting:
     max    = your measured 1-max for the capacity  → sets the ABSOLUTE scale
     base%  = stage target from WEEK_PROGRESSION     → WHERE in the phase you are
     adjΔ   = nudge from the test interpretation      → below range = a bit more
              conservative, above range = a bit higher. This is now the ONLY
              consumer of interpret()'s `adj` field, which used to be averaged
              into getTestBasedIntensity() and then discarded (never called).
==================================================== */

/* Which result_key sets a category's absolute load, the onboarding
   quick-baseline that stands in until a real test exists, a human label,
   and the sane working band for that modality (a hangboard max is never
   trained at 100%; a pull-up 3RM can be met or slightly exceeded). */
var CAT_LOAD_BASE = {
  finger_strength: { resultKey:'hang_max',   baseline:'baseFinger', label:'Max Hang', band:[0.55, 0.95] },
  pull_strength:   { resultKey:'pullup_3rm', baseline:'basePull',   label:'3RM',      band:[0.80, 1.10] }
};

/* Latest positive numeric result recorded for a result_key, or null.
   El historial se mantiene ordenado por `ts` en saveTestResult(), así que el
   último elemento es el más reciente aunque se haya cargado retroactivamente. */
function latestTestValue(resultKey){
  if(typeof loadTestHistory !== 'function') return null;
  var h = loadTestHistory(resultKey);
  if(h && h.length){ var v = parseFloat(h[h.length - 1].v); if(v > 0) return v; }
  return null;
}

/* ─────────────────────────────────────────────────────
   Frescura del dato

   Los kg que la app imprime salen del ÚLTIMO test registrado, sin mirar
   cuándo se hizo. `testStatus()` (tests.js) ya sabe calcular si un test está
   vencido, pero intensity.js no lo consultaba: un max hang de hace 14 meses
   prescribía exactamente los mismos kg que uno de hace dos semanas.

   Deliberadamente NO se aplica un decaimiento automático: un test viejo no
   significa que hayas perdido fuerza (podés haber entrenado 6 meses sin
   re-testear y estar más fuerte). El error puede ir en cualquier dirección,
   y eso es justamente el argumento para no fingir precisión — se marca el
   número como estimación vieja y se pide revalidar.
   ───────────────────────────────────────────────────── */
var TEST_STALE_FACTOR = 2;   /* vencido = más del doble del intervalo sugerido */

/* PURE. `daysSince` + el intervalo recomendado → cuán confiable es el dato. */
function rateTestFreshness(daysSince, intervalDays){
  if(daysSince == null) return { level:'none', stale:false, daysSince:null };
  var iv = intervalDays || 35;
  if(daysSince > iv * TEST_STALE_FACTOR) return { level:'stale',   stale:true,  daysSince:daysSince };
  if(daysSince > iv)                     return { level:'overdue', stale:false, daysSince:daysSince };
  return { level:'fresh', stale:false, daysSince:daysSince };
}

/* Frescura del test que fija la carga de una categoría. */
function categoryFreshness(cat){
  var b = CAT_LOAD_BASE[cat];
  if(!b || typeof loadTestHistory !== 'function') return { level:'none', stale:false, daysSince:null };
  var h = loadTestHistory(b.resultKey);
  if(!h || !h.length) return { level:'none', stale:false, daysSince:null };   /* baseline de onboarding */
  var last = h[h.length - 1];
  if(!last || !last.ts) return { level:'none', stale:false, daysSince:null };
  var dias = Math.floor((Date.now() - last.ts) / 86400000);
  var iv = 35;
  if(typeof TESTS !== 'undefined' && typeof testFreqDays === 'function'){
    for(var i = 0; i < TESTS.length; i++){
      if(TESTS[i].result_key === b.resultKey){ iv = testFreqDays(TESTS[i].freq); break; }
    }
  }
  return rateTestFreshness(dias, iv);
}

/* Best available max (kg totales) for a category: a recorded test first,
   else the onboarding quick-baseline. Null when there's nothing to scale from. */
function categoryMax(cat){
  var b = CAT_LOAD_BASE[cat];
  if(!b) return null;
  var v = latestTestValue(b.resultKey);
  if(v == null && b.baseline && typeof U !== 'undefined'){
    var q = parseFloat(U[b.baseline]); if(q > 0) v = q;
  }
  return (v && v > 0) ? v : null;
}

/* The interpret() `adj` (−20..+10) for a category's test, or 0 when untested.
   Positive = above the expected range for the climber's level, negative = below. */
function getCapacityAdj(cat){
  var b = CAT_LOAD_BASE[cat];
  if(!b || typeof TESTS === 'undefined' || typeof runInterpret !== 'function') return 0;
  var val = latestTestValue(b.resultKey);
  if(val == null) return 0;
  var test = null;
  for(var i = 0; i < TESTS.length; i++){ if(TESTS[i].result_key === b.resultKey){ test = TESTS[i]; break; } }
  if(!test) return 0;
  var ip = runInterpret(test, val);
  return (ip && typeof ip.adj === 'number') ? ip.adj : 0;
}

/* Concrete target load for a category at a base stage fraction (0..1).
   Applies the test adj as a small % nudge (half of adj, so −20 → −10 pts),
   clamped to the modality's band. Returns null when there's no max to scale
   from, so the card falls back to the static % text. */
function getCategoryLoad(cat, baseFraction){
  if(!baseFraction) return null;
  var b = CAT_LOAD_BASE[cat];
  var max = categoryMax(cat);
  if(!b || max == null) return null;
  var adj = getCapacityAdj(cat);
  var eff = baseFraction + (adj / 100) * 0.5;        /* adj −20 → −0.10; +10 → +0.05 */
  eff = Math.max(b.band[0], Math.min(b.band[1], eff));
  var fresh = categoryFreshness(cat);
  return {
    kg:      Math.round(max * eff),
    basePct: Math.round(baseFraction * 100),
    pct:     Math.round(eff * 100),
    max:     max,
    label:   b.label,
    adjusted: adj !== 0,
    /* La UI usa esto para avisar que el número sale de un test viejo, en vez
       de mostrarlo con la misma confianza que uno reciente. */
    stale:     fresh.stale,
    daysSince: fresh.daysSince
  };
}

/* Texto corto del aviso de dato viejo, o '' si el test está al día.
   Vive acá (y no en el render) porque los 3 renderers que imprimen kg tienen
   que decir exactamente lo mismo. */
function staleLoadNote(load){
  if(!load || !load.stale || load.daysSince == null) return '';
  var meses = Math.floor(load.daysSince / 30);
  var cuando = meses >= 2 ? ('hace ' + meses + ' meses') : ('hace ' + load.daysSince + ' días');
  return 'test ' + cuando + ' — revalidá';
}

/* Compact summary of what the plan is currently calibrated to, so the Tests
   tab / methodology can state the linkage HONESTLY (and prove it with numbers). */
function getTestCalibration(){
  var out = { hasAny:false, items:[] };
  Object.keys(CAT_LOAD_BASE).forEach(function(cat){
    var max = categoryMax(cat);
    if(max == null) return;
    out.hasAny = true;
    out.items.push({ cat:cat, label:CAT_LOAD_BASE[cat].label, max:max, adj:getCapacityAdj(cat) });
  });
  return out;
}
