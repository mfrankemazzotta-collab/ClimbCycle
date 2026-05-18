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
  _v3init();
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
      wkOff=Math.min(getCurrentWeekIndex(), (U.plan==='3-2-1'?2:3));
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
}
function openEdit(){document.getElementById('emod').classList.add('on');}
function closeEdit(){document.getElementById('emod').classList.remove('on');}
function jumpTo(n){
  closeEdit();
  document.getElementById('vapp').style.display='none';
  document.getElementById('vob').style.display='flex';
  showStep(n);
}
