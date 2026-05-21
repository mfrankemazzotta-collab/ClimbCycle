/* ====================================================
   render-calendar.js -- Mini & big month calendars
   - renderMiniCal: onboarding start-date picker (#cdays)
   - renderBigCal: full plan view on the Calendar page (#bigdays)
==================================================== */


function calNav(d){calDate.setMonth(calDate.getMonth()+d);renderMiniCal();}
function renderMiniCal(){
  var y=calDate.getFullYear(),m=calDate.getMonth();
  document.getElementById('cmonth').textContent=MONTHS[m]+' '+y;
  var first=new Date(y,m,1),dow=first.getDay();if(dow===0)dow=7;dow--;
  var dim=new Date(y,m+1,0).getDate();
  var g=document.getElementById('cdays');g.innerHTML='';
  for(var i=0;i<dow;i++){var e=document.createElement('div');e.className='cd emp';g.appendChild(e);}
  for(var d=1;d<=dim;d++){
    var date=new Date(y,m,d);
    var btn=document.createElement('button');btn.textContent=d;btn.className='cd';
    if(date<TODAY){btn.classList.add('ps');}
    else{
      if(date.getTime()===TODAY.getTime())btn.classList.add('tod');
      if(U.startDate&&date.getTime()===U.startDate.getTime())btn.classList.add('pk');
      (function(dt){
        btn.onclick=function(){
          U.startDate=dt;renderMiniCal();
          document.getElementById('slbl').textContent=dt.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
          buildSummary();
        };
      })(date);
    }
    g.appendChild(btn);
  }
}
function bigNav(d){bigDate.setMonth(bigDate.getMonth()+d);renderBigCal();}
function renderBigCal(){
  var y=bigDate.getFullYear(),m=bigDate.getMonth();
  document.getElementById('bigmonth').textContent=MONTHS[m]+' '+y;
  var first=new Date(y,m,1),dow=first.getDay();if(dow===0)dow=7;dow--;
  var dim=new Date(y,m+1,0).getDate();
  var g=document.getElementById('bigdays');g.innerHTML='';
  for(var i=0;i<dow;i++){var e=document.createElement('div');e.className='bd emp';g.appendChild(e);}
  for(var d=1;d<=dim;d++){
    var date=new Date(y,m,d),key=date.toDateString(),plan=planMap[key];
    var isToday=date.toDateString()===TODAY.toDateString();
    var div=document.createElement('div');
    div.className='bd'+(isToday?' tod':'');
    div.innerHTML='<div class="bdn2">'+d+'</div>';
    if(plan){
      var bt=BLOCKS[plan.block];
      if(plan.block!=='rest'){
        var pill=document.createElement('div');pill.className='pill';
        pill.style.background=bt.col+'25';pill.style.color=bt.col;
        pill.textContent=bt.emo;div.appendChild(pill);
      }
      (function(dt,pl){div.onclick=function(){showDD(dt,pl);};})(date,plan);
    }
    g.appendChild(div);
  }
}
