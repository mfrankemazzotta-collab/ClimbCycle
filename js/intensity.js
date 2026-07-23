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

/* Latest positive numeric result recorded for a result_key, or null. */
function latestTestValue(resultKey){
  if(typeof loadTestHistory !== 'function') return null;
  var h = loadTestHistory(resultKey);
  if(h && h.length){ var v = parseFloat(h[h.length - 1].v); if(v > 0) return v; }
  return null;
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
  return {
    kg:      Math.round(max * eff),
    basePct: Math.round(baseFraction * 100),
    pct:     Math.round(eff * 100),
    max:     max,
    label:   b.label,
    adjusted: adj !== 0
  };
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
