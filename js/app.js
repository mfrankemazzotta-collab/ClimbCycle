/* ====================================================
   app.js -- App initialization & navigation
   ClimbCycle v5
==================================================== */


function finish(){
  if(!U.startDate){showErr('Selecciona una fecha de inicio');return;}
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
  loadSL();
  loadRec();
  loadLastEx();
  if(typeof initThemeToggle === 'function') initThemeToggle();
  /* Recovery Engine */
  var rec=calcRecovery();
  renderRecoveryCard(rec);
  /* Home calendar */
  hcDate=new Date(TODAY);renderHC();
  hcSel=new Date(TODAY);
  showDayPanel(TODAY,planMap[TODAY.toDateString()],TODAY.toDateString());
  renderTodayCard();
}

/* -- INIT -- */
document.addEventListener('DOMContentLoaded',function(){
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
      showToast('Plan restaurado','#00E5A0');
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
  document.querySelectorAll('.nb').forEach(function(b){b.classList.remove('on');});
  var pg=document.getElementById('p'+id);
  var nb=document.querySelector('[data-p="'+id+'"]');
  if(pg)pg.classList.add('on');
  if(nb)nb.classList.add('on');
  var scr=document.getElementById('ascr');
  if(scr)scr.scrollTop=0;
  try{if(id==='cal')renderBigCal();}catch(e){console.error('renderBigCal',e);}
  try{if(id==='semana')renderWk();}catch(e){console.error('renderWk',e);}
  try{if(id==='plan')renderPlanPage();}catch(e){console.error('renderPlanPage',e);}
  try{if(id==='profile')renderProfile();}catch(e){console.error('renderProfile',e);}
  try{if(id==='nutri')renderNutri();}catch(e){console.error('renderNutri',e);}
}
function openEdit(){document.getElementById('emod').classList.add('on');}
function closeEdit(){document.getElementById('emod').classList.remove('on');}
function jumpTo(n){
  closeEdit();
  document.getElementById('vapp').style.display='none';
  document.getElementById('vob').style.display='flex';
  showStep(n);
}
