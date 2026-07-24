/* ====================================================
   events.js -- Minimal pub/sub bus + render wiring
   ClimbCycle

   Decouples state MUTATIONS from RE-RENDERING. Before this, every action
   (markSess, markRockDay, doMv, …) hand-listed the 3-5 renderers it had to
   call, so the same list was duplicated ~8 times and easy to get wrong.

   Now an action just: mutate → persist → Bus.emit(...). The wiring below,
   registered once at init, fans each event out to the right set of views.
   Adding a view — or moving to region-based rendering (§4 of the review) —
   touches only wireBus(), not every action.

   Events:
     'cc:planChanged'    → calendar-shaped views (home mini-cal, big cal, week)
     'cc:sessionChanged' → the above + today card + next-action banner
   Each action keeps its own showDayPanel/hcSel logic afterwards, since that
   part legitimately differs per action.
==================================================== */

var Bus = (function(){
  var subs = {};
  return {
    on: function(ev, fn){ (subs[ev] = subs[ev] || []).push(fn); return this; },
    emit: function(ev, data){
      var list = subs[ev];
      if(!list) return;
      for(var i = 0; i < list.length; i++){
        try { list[i](data); }
        catch(e){ if(typeof console !== 'undefined') console.error('Bus ' + ev, e); }
      }
    }
  };
})();

/* Register the render fan-out exactly once. Renderers are looked up lazily
   (typeof) so this file can load before them without caring about order. */
function wireBus(){
  if(wireBus._done) return;
  wireBus._done = true;

  Bus.on('cc:planChanged', function(){
    if(typeof renderHC === 'function')      renderHC();
    if(typeof renderBigCal === 'function')  renderBigCal();
    if(typeof renderWk === 'function')      renderWk();
  });

  Bus.on('cc:sessionChanged', function(){
    if(typeof renderHC === 'function')          renderHC();
    if(typeof renderBigCal === 'function')      renderBigCal();
    if(typeof renderWk === 'function')          renderWk();
    if(typeof renderTodayCard === 'function')   renderTodayCard();
    if(typeof renderNextAction === 'function')  renderNextAction();
  });
}
