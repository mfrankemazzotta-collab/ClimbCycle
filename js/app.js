/* ====================================================
   app.js -- App initialization & navigation
   ClimbCycle v5
==================================================== */


function finish(){
  if(!U.startDate){showErr('Selecciona una fecha de inicio');return;}
  /* Persist the quick-baseline diagnostic before the plan is generated so
     the goal engine can focus the macrocycle on the weakest capacity. */
  if(typeof commitBaselineTests === 'function') commitBaselineTests();
  generatePlan();
  saveU();
  savePlan();
  document.getElementById('vob').style.display='none';
  document.getElementById('vapp').style.display='flex';
  document.getElementById('vapp').style.flexDirection='column';
  initApp();
  bigDate=new Date(U.startDate);
  renderBigCal();
}
function initApp(){
  if(typeof wireBus === 'function') wireBus();   /* register render fan-out once */
  loadSL();
  loadRec();
  loadLastEx();
  try{ exShowSci = localStorage.getItem('cc_exmode') === 'sci'; }catch(e){}
  if(typeof initThemeToggle === 'function') initThemeToggle();
  /* Home dashboard: anchor the calendar dates, then render the configurable
     widgets. renderWidgets() injects each enabled widget's markup and calls
     its populate function (recovery, today, goal, calendar, stats, glance). */
  hcDate=new Date(TODAY);
  hcSel=new Date(TODAY);
  if(typeof renderWidgets === 'function'){
    renderWidgets();
  } else {
    /* Fallback: legacy fixed layout (if widgets.js failed to load) */
    renderRecoveryCard(calcRecovery());
    renderHC();
    showDayPanel(TODAY,planMap[TODAY.toDateString()],TODAY.toDateString());
    renderTodayCard();
    if(typeof renderNextAction === 'function') renderNextAction();
    if(typeof renderGoalCard === 'function') renderGoalCard();
  }
  if(typeof updateQAVisibility === 'function') updateQAVisibility();
  if(typeof syncInit === 'function') syncInit();
  if(typeof maybeNotifyToday === 'function') maybeNotifyToday();
}

/* -- INIT -- */
document.addEventListener('DOMContentLoaded',function(){
  /* Capture anything uncaught (errors + rejected promises) from here on. */
  if(typeof installGlobalErrorHandlers === 'function') installGlobalErrorHandlers();
  if(typeof registerPWA === 'function') registerPWA();   /* installable + offline */
  /* Auth check - if not logged in, show login modal and stop */
  if(typeof initAuth === 'function' && !initAuth()){
    return;
  }

  redrawDots();
  buildTests();
  calDate=new Date();
  renderMiniCal();
  /* Try to restore previous session */
  if(loadU()&&loadPlan()){
    try{
      document.getElementById('vob').style.display='none';
      document.getElementById('vapp').style.display='flex';
      document.getElementById('vapp').style.flexDirection='column';
      /* set wkOff to current week so Semana shows correct week */
      var _prof=(typeof LEVEL_PROFILES!=='undefined'&&U.level)?(LEVEL_PROFILES[U.level]||LEVEL_PROFILES.intermediate):null;
      var _maxWk=(_prof&&_prof.phaseSeq&&_prof.phaseSeq[U.plan])?(_prof.phaseSeq[U.plan].length-1):(U.plan==='3-2-1'?5:9);
      wkOff=Math.min(getCurrentWeekIndex(),_maxWk);
      initApp();
      bigDate=new Date(U.startDate);
      renderBigCal();
      showToast('Plan restaurado','var(--accent-deload)');
    }catch(e){
      /* restore failed — show onboarding */
      console.error('Restore failed:',e);
      document.getElementById('vob').style.display='flex';
      document.getElementById('vapp').style.display='none';
    }
  }
});
function goPage(id){
  /* always switch the page first, then render content */
  document.querySelectorAll('.pg').forEach(function(p){p.classList.remove('on');});
  document.querySelectorAll('.nb').forEach(function(b){b.classList.remove('on');b.removeAttribute('aria-current');});
  var pg=document.getElementById('p'+id);
  var nb=document.querySelector('[data-p="'+id+'"]');
  if(pg)pg.classList.add('on');
  if(nb){nb.classList.add('on');nb.setAttribute('aria-current','page');}
  var scr=document.getElementById('ascr');
  if(scr)scr.scrollTop=0;
  try{if(id==='home'&&typeof renderWidgets==='function')renderWidgets();}catch(e){console.error('renderWidgets',e);}
  try{if(id==='cal')renderBigCal();}catch(e){console.error('renderBigCal',e);}
  try{if(id==='semana')renderWk();}catch(e){console.error('renderWk',e);}
  try{if(id==='plan')renderPlanPage();}catch(e){console.error('renderPlanPage',e);}
  try{if(id==='profile')renderProfile();}catch(e){console.error('renderProfile',e);}
  try{if(id==='nutri')renderNutri();}catch(e){console.error('renderNutri',e);}
  if(typeof updateQAVisibility === 'function') updateQAVisibility();
}
function openEdit(){document.getElementById('emod').classList.add('on');if(typeof a11yOpenModal==='function')a11yOpenModal(document.getElementById('emod'),closeEdit);}
function closeEdit(){document.getElementById('emod').classList.remove('on');if(typeof a11yCloseModal==='function')a11yCloseModal(document.getElementById('emod'));}
function jumpTo(n){
  closeEdit();
  document.getElementById('vapp').style.display='none';
  document.getElementById('vob').style.display='flex';
  showStep(n);
}
