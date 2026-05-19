/* ====================================================
   render-utils.js -- Shared UI utilities
   Reusable building blocks: ring widgets, progress bars,
   toast notifications, calendar-side day detail panel.
==================================================== */


function makeRing(val,col,sz){
  var st=10,r=(sz-st)/2,cx=sz/2,circ=2*Math.PI*r,p=Math.max(0,Math.min(100,val)),dash=p/100*circ;
  return '<div style="position:relative;width:'+sz+'px;height:'+sz+'px;display:inline-flex;align-items:center;justify-content:center"><svg width="'+sz+'" height="'+sz+'" style="position:absolute"><circle cx="'+cx+'" cy="'+cx+'" r="'+r+'" stroke="var(--border-color)" stroke-width="'+st+'" fill="none"/><circle cx="'+cx+'" cy="'+cx+'" r="'+r+'" stroke="'+col+'" stroke-width="'+st+'" fill="none" stroke-dasharray="'+dash+' '+(circ-dash)+'" stroke-linecap="round" transform="rotate(-90 '+cx+' '+cx+')"/></svg><div style="position:absolute;display:flex;flex-direction:column;align-items:center"><span style="font-family:\'JetBrains Mono\',monospace;font-size:20px;font-weight:700;color:'+col+'">'+Math.round(p)+'%</span><span style="font-size:9px;color:var(--text-secondary)">recovery</span></div></div>';
}
function mbar(lbl,cur,tgt,col,unit){
  var p=Math.min(100,Math.round(cur/Math.max(tgt,1)*100));
  return '<div class="mr"><div class="mh"><span class="ml">'+lbl+'</span><span class="mv">'+cur+'<span style="color:var(--text-muted)">/'+tgt+unit+'</span></span></div><div class="mtr"><div class="mf" style="width:'+p+'%;background:'+col+'"></div></div></div>';
}
function r2(l,v){return '<div><div style="font-size:10px;color:var(--text-muted)">'+l+'</div><div style="font-family:\'JetBrains Mono\',monospace;font-size:13px;color:var(--text-primary)">'+v+'</div></div>';}
function showToast(msg,col){
  var t=document.getElementById('toast');if(!t)return;
  t.textContent=msg;t.style.borderColor=col||'var(--border-light)';t.style.color=col||'var(--text-primary)';t.style.display='block';
  if(toastTmr)clearTimeout(toastTmr);
  toastTmr=setTimeout(function(){t.style.display='none';},3000);
}
function showErr(msg){
  document.querySelectorAll('.emsg').forEach(function(e){e.remove();});
  var e=document.createElement('div');e.className='emsg';e.textContent=msg;
  var f=document.querySelector('#s'+curStep+' .sfoot');
  if(f)f.insertBefore(e,f.firstChild);
  setTimeout(function(){if(e.parentNode)e.remove();},2500);
}
/* showDD - Day detail panel for the big calendar page.
   Writes to #ddtl. Uses EX_POOL via getExercisesForDay for level-aware exs. */
function showDD(date,plan){
  var dd=document.getElementById('ddtl');
  if(!dd)return;
  var key=date.toDateString();
  var bt=BLOCKS[plan.block];
  var opts={weekday:'long',day:'numeric',month:'long'};
  var dateStr='<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:20px;font-weight:700;margin-bottom:4px;color:'+bt.col+'">'+bt.label+' <span style="color:var(--text-muted);font-size:14px">S'+plan.week+'</span></div>'
    +'<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">'+date.toLocaleDateString('es-ES',opts)+'</div>';

  var body='';
  if(plan.block==='rest'){
    var isRock=plan.outdoor;
    body='<div style="font-size:13px;color:var(--text-secondary)">'+(isRock?'Escalada exterior. Las sesiones siguientes estan ajustadas.':'Dia de descanso. Prioriza sueno, hidratacion y nutricion.')+'</div>';
  } else if(plan.block==='test'){
    body='<div style="font-size:13px;color:var(--text-secondary)">Tests programados: '+(U.tests&&U.tests.length?U.tests.join(', '):'ninguno seleccionado')+'</div>';
  } else {
    var exs=getExercisesForDay(key, plan.block);
    if(!exs||exs.length===0){
      exs=(EX[plan.block]||[]).map(function(e){return {n:e.n,nota:e.d,col:bt.col,fatigue:3,sys:''};});
    }
    var safetyWarn=getSafetyWarning(plan.block, U.level);
    if(safetyWarn){
      body+='<div style="background:#FFB80015;border:1px solid #FFB80044;border-radius:8px;padding:8px 12px;font-size:11px;color:#FFB800;margin-bottom:10px;display:flex;align-items:flex-start;gap:6px"><span>&#x26A0;</span><span>'+safetyWarn+'</span></div>';
    }
    body+=exs.map(function(e){
      return '<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:10px 12px;margin-bottom:8px">'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">'
          +'<div style="font-size:13px;font-weight:600;color:var(--text-primary);flex:1">'+e.n+'</div>'
          +(e.nota?'<div style="font-size:10px;font-family:\'JetBrains Mono\',monospace;color:var(--text-muted);flex-shrink:0;text-align:right">'+e.nota+'</div>':'')
        +'</div>'
        +(e.simple?'<div style="font-size:11px;color:var(--text-secondary);margin-top:4px;line-height:1.5">'+e.simple+'</div>':'')
        +(e.sys?'<div style="margin-top:6px"><span style="font-size:9px;padding:2px 8px;border-radius:99px;background:'+(e.col||bt.col)+'20;color:'+(e.col||bt.col)+';border:1px solid '+(e.col||bt.col)+'44;font-family:\'JetBrains Mono\',monospace">'+(SYS_HUMAN[e.sys]||e.sys)+'</span></div>':'')
      +'</div>';
    }).join('');
  }

  dd.innerHTML=dateStr+body;
  dd.classList.add('on');
  dd.scrollIntoView({behavior:'smooth',block:'nearest'});
}
/* tgSci - toggle expandable scientific info inside exercise cards.
   Used by inline onclick handlers generated in showDayPanel. */
function tgSci(eid){
  var el=document.getElementById('sci'+eid),btn=document.getElementById('btn'+eid);
  if(!el||!btn)return;
  var open=el.style.display!=='none';
  el.style.display=open?'none':'block';
  btn.textContent=open?'+ ciencia':'- ocultar';
  btn.style.color=open?'var(--text-secondary)':'#CCFF00';
}
/* makeFatigueDots / makeSkillTag are defined in planner.js (they belong with
   exercise selection logic). They are referenced from multiple render files. */
