/* ====================================================
   store.js -- Centralized persist + notify for state slices
   ClimbCycle

   The app keeps its state in plain globals (U, planMap, sessionLog, recData).
   READS stay direct (U.goal, planMap[key]) — cheap and fine. What used to be
   error-prone was the WRITE path: "mutate; saveX(); Bus.emit('cc:xChanged')"
   hand-written at every action and easy to do half-way (forget the save → lost
   data; forget the emit → stale UI).

   store.js owns that convention in ONE place. An action now does:
       <mutate the global>; commit('plan');
   and the slice → (save fn, Bus event) mapping lives here.

   Deliberately NOT a full getter/setter store: with ~355 direct reads and no
   build step, wrapping every access would be high-risk churn for no bug-fix —
   the write path is where the bugs were, so that's what we centralize. A
   getter/setter facade can be layered on top later, incrementally.

   Loads after events.js (needs Bus) and state.js (needs saveX). Save fns are
   looked up lazily (typeof) so load order never bites.
==================================================== */

/* slice → { save(): persist it, event: Bus event to emit afterwards }. */
var CC_STATE_SLICES = {
  user:     { save: function(){ if(typeof saveU    === 'function') saveU();    }, event: 'cc:planChanged' },
  plan:     { save: function(){ if(typeof savePlan  === 'function') savePlan();  }, event: 'cc:planChanged' },
  session:  { save: function(){ if(typeof saveSL    === 'function') saveSL();    }, event: 'cc:sessionChanged' },
  recovery: { save: function(){ if(typeof saveRec   === 'function') saveRec();   }, event: 'cc:sessionChanged' },
  /* progreso dentro de la sesión (qué ejercicios marcaste) */
  exdone:   { save: function(){ if(typeof saveExDone === 'function') saveExDone(); }, event: 'cc:sessionChanged' }
};

/* Persist a state slice and notify its views.
   `emit` defaults to true; pass false to persist without a repaint. */
function commit(slice, emit){
  var s = CC_STATE_SLICES[slice];
  if(!s){
    if(typeof logError === 'function') logError('unknown state slice: ' + slice, 'store.commit');
    return false;
  }
  s.save();
  if(emit !== false && s.event && typeof Bus !== 'undefined') Bus.emit(s.event);
  return true;
}

/* Persist every slice without emitting (bulk save / before unload). */
function commitAll(){
  for(var k in CC_STATE_SLICES){
    if(Object.prototype.hasOwnProperty.call(CC_STATE_SLICES, k)) CC_STATE_SLICES[k].save();
  }
}

/* ── Write accessors ──────────────────────────────────
   Facade for DISCRETE mutations of a single action: patch the slice's fields
   then commit (persist + notify) in one call. `emit` defaults to true; pass
   false to persist without a repaint (e.g. when a sibling commit handles the
   render, as in markRockDay). Reads stay direct — this is intentionally NOT a
   full getter/setter store (see PROJECT_CONTEXT §4).
   NOTE: this codebase already BATCHES most writes (mutate many fields → one
   saveX at the end), so there are few migration targets today; these accessors
   are mostly the correct API for future discrete settings. */
function _ccPatch(target, patch){
  if(!patch) return;
  Object.keys(patch).forEach(function(k){ target[k] = patch[k]; });
}
var Store = {
  commit: commit,
  commitAll: commitAll,
  /* U (user profile / settings). */
  setUser: function(patch, emit){ _ccPatch(U, patch); return commit('user', emit); },
  /* recData (recovery check-in state). */
  setRec:  function(patch, emit){ _ccPatch(recData, patch); return commit('recovery', emit); }
};
