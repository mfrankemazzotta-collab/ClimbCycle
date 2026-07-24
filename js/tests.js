/* ====================================================
   tests.js -- Test system, interpretation, dashboard
   ClimbCycle v5
==================================================== */


function testFreqDays(freq){
  if(!freq)return 35;
  var m=freq.match(/(\d+)-(\d+)\s*semanas?/);
  if(m)return Math.round((parseInt(m[1])+parseInt(m[2]))/2*7);
  m=freq.match(/(\d+)\s*semanas?/);
  if(m)return parseInt(m[1])*7;
  if(freq.indexOf('mesociclo')>=0){
    /* one mesociclo = plan length (use profile if available) */
    if(typeof LEVEL_PROFILES!=='undefined'&&U.level&&U.plan){
      var prof=LEVEL_PROFILES[U.level]||LEVEL_PROFILES.intermediate;
      if(prof&&prof.phaseSeq&&prof.phaseSeq[U.plan])return prof.phaseSeq[U.plan].length*7;
    }
    var seqs={'4-3-2-1':10,'3-2-1':6};
    return (seqs[U.plan]||10)*7;
  }
  return 35; /* default 5 weeks */
}
function testStatus(resultKey, freq){
  var hist=loadTestHistory(resultKey);
  if(!hist||hist.length===0) return {daysSince:null,daysUntil:0,overdue:false,pct:0,lastDate:null,neverDone:true};
  var last=hist[hist.length-1];
  var daysSince=Math.floor((Date.now()-last.ts)/86400000);
  var interval=testFreqDays(freq);
  var daysUntil=Math.max(0,interval-daysSince);
  var overdue=daysSince>interval;
  var pct=Math.min(100,Math.round(daysSince/interval*100));
  var d=new Date(last.ts);
  var lastDate=('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear();
  return {daysSince:daysSince,daysUntil:daysUntil,overdue:overdue,pct:pct,lastDate:lastDate,neverDone:false};
}
function nextTestRecommendation(){
  var best=null,bestScore=-1;
  TESTS.forEach(function(t){
    var st=testStatus(t.result_key,t.freq);
    /* score: neverDone=200, overdue=100+daysSince, else pct */
    var score=st.neverDone?200:st.overdue?(100+st.daysSince):st.pct;
    if(score>bestScore){bestScore=score;best={test:t,status:st,score:score};}
  });
  return best;
}
/* Façade over the pure interpreters in test-interpret.js (was: test.interpret,
   now extracted so TESTS[] is pure data). Signature unchanged for all callers. */
function runInterpret(test, value){
  if(typeof interpretTest !== 'function' || !test) return null;
  try{ return interpretTest(test, value, U.level||'beginner', U.weight||70); }catch(e){ return null; }
}
/* Commit the onboarding quick-baseline (finger + pull) into the test
   history that the goal engine reads. Dedups: only writes when the value
   actually changed, so navigating back and forth doesn't spam history. */
function commitBaselineTests(){
  /* Record the baseline at the date the climber actually tested (U.baseDate),
     not "now" — so the plan can tell whether it's fresh. Noon avoids TZ
     midnight drift; future dates fall back to now. */
  var ts = Date.now();
  if(U.baseDate){ var t = new Date(U.baseDate + 'T12:00:00').getTime(); if(!isNaN(t) && t <= Date.now()) ts = t; }
  var map=[['baseFinger','hang_max'],['basePull','pullup_3rm']];
  map.forEach(function(m){
    var v=parseFloat(U[m[0]]);
    if(!v||isNaN(v)||v<=0) return;
    var hist=loadTestHistory(m[1]);
    var last=hist.length?parseFloat(hist[hist.length-1].v):null;
    if(last===v) return;
    saveTestResult(m[1], v, ts);
  });
}
function recordTestResult(resultKey, cardIndex){
  var inp=document.getElementById('tri_'+resultKey);
  if(!inp||!inp.value.trim()){showToast('Ingresa un resultado primero','var(--accent-warning)');return;}
  var val=inp.value.trim();
  saveTestResult(resultKey, val);
  var test=null;
  TESTS.forEach(function(t){if(t.result_key===resultKey)test=t;});
  var interp=test?runInterpret(test,val):null;
  if(interp){showToast(interp.txt,interp.col);}
  else{showToast('Resultado guardado','var(--accent-deload)');}
  inp.value=''; /* clear input after save */
  buildTsTab(); /* rebuild to show updated dashboard */
}
/* getTestBasedIntensity() was RETIRED. It averaged every test's `adj` into one
   global multiplier and was never called anywhere — dead code that made the
   UI's "los tests ajustan la intensidad" claim false. Test results now drive
   the plan for real through:
     · intensity.js  → getCategoryLoad(): concrete kg per capacity & stage
       (the `adj` field is consumed here as a per-capacity nudge), and
     · goal.js       → computeGoalPlan() severity → macrocycle emphasis. */
/* ─────────────────────────────────────────────────────
   Test progress chart
   buildTestChartModel(): PURE geometry — maps a test's recorded history onto
   an SVG coordinate space, with the TEST_RANGES level bands as background
   zones. Unit-tested. renderTestChart(): thin SVG string builder over it.
   ───────────────────────────────────────────────────── */
function buildTestChartModel(hist, range, isRatio, weight, dims){
  dims = dims || {w:300, h:130, padL:8, padR:8, padT:10, padB:22};
  weight = weight || 70;
  var vals = [];
  (hist || []).forEach(function(e){
    var n = parseFloat(e.v);
    if(isNaN(n)) return;
    vals.push({ raw:n, val: isRatio ? (weight > 0 ? n/weight : 0) : n, ts:e.ts });
  });
  if(vals.length === 0) return { empty:true };

  var maxVal = 0; vals.forEach(function(p){ if(p.val > maxVal) maxVal = p.val; });
  var ceil = range ? range.elite * 1.15 : (maxVal * 1.15 || 1);
  if(maxVal > ceil) ceil = maxVal * 1.05;            /* never clip a record above elite */

  var plotW = dims.w - dims.padL - dims.padR;
  var plotH = dims.h - dims.padT - dims.padB;
  var n = vals.length;
  function xAt(i){ return dims.padL + (n === 1 ? plotW/2 : (i/(n-1))*plotW); }
  function yAt(v){ var t = ceil > 0 ? v/ceil : 0; t = Math.max(0, Math.min(1, t)); return dims.padT + (1-t)*plotH; }

  var points = vals.map(function(p, i){
    var d = new Date(p.ts);
    return { x:+xAt(i).toFixed(1), y:+yAt(p.val).toFixed(1), val:p.val, raw:p.raw,
             label:('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2) };
  });

  var zones = [];
  if(range){
    [ {from:0,         to:range.lo,  col:'#FF4D6A'},
      {from:range.lo,  to:range.mid, col:'#FFB800'},
      {from:range.mid, to:range.hi,  col:'#00E5A0'},
      {from:range.hi,  to:ceil,      col:'#CCFF00'} ].forEach(function(b){
      var yTo = yAt(b.to), yFrom = yAt(b.from);
      zones.push({ y:+yTo.toFixed(1), h:+(yFrom - yTo).toFixed(1), col:b.col });
    });
  }

  var first = vals[0].val, last = vals[n-1].val;
  var trendPct = first > 0 ? Math.round((last - first) / first * 100) : 0;
  return { empty:false, points:points, zones:zones, trendPct:trendPct, dims:dims,
           ceil:ceil, count:n, firstVal:first, lastVal:last, isRatio:!!isRatio };
}
function renderTestChart(model, col){
  if(!model || model.empty) return '';
  var d = model.dims, W = d.w, H = d.h;
  col = col || 'var(--accent-primary-d)';
  var zones = model.zones.map(function(z){
    return '<rect x="0" y="'+z.y+'" width="'+W+'" height="'+Math.max(0, z.h)+'" fill="'+z.col+'" opacity="0.10"/>';
  }).join('');
  var line = model.points.map(function(p, i){ return (i ? 'L' : 'M') + p.x + ' ' + p.y; }).join(' ');
  var dots = model.points.map(function(p, i){
    var last = i === model.points.length - 1;
    return '<circle cx="'+p.x+'" cy="'+p.y+'" r="'+(last?3.2:2.2)+'" fill="'+(last?col:'var(--bg-card)')+'" stroke="'+col+'" stroke-width="1.4"/>';
  }).join('');
  var pts = model.points;
  function xlab(p, anchor){ return '<text x="'+p.x+'" y="'+(H-6)+'" fill="var(--text-muted)" font-size="8" font-family="JetBrains Mono, monospace" text-anchor="'+anchor+'">'+p.label+'</text>'; }
  var xlabs = pts.length === 1 ? xlab(pts[0], 'middle') : (xlab(pts[0], 'start') + xlab(pts[pts.length-1], 'end'));
  var tr = model.trendPct;
  var tcol = tr > 0 ? 'var(--accent-deload)' : tr < 0 ? 'var(--accent-caution)' : 'var(--text-muted)';
  var arrow = tr > 0 ? '&#x25B2;' : tr < 0 ? '&#x25BC;' : '&#x25A0;';
  return '<div class="tdb-chart" style="margin-top:10px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin:0 2px 2px">'
      + '<span style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:var(--text-muted)">Progreso · '+model.count+' registros</span>'
      + '<span style="font-size:10px;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:'+tcol+'">'+arrow+' '+(tr>0?'+':'')+tr+'% vs 1er test</span>'
    + '</div>'
    + '<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="display:block;margin-top:4px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-card-alt)">'
    +   zones
    +   '<path d="'+line+'" fill="none" stroke="'+col+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'
    +   dots
    +   xlabs
    + '</svg></div>';
}
function makeTestDashboard(t, ip, lastVal, hist, weight){
  var rng=TEST_RANGES[t.result_key];
  var lvl=U.level||'beginner';
  var r=rng?(rng[lvl]||rng['intermediate']):null;
  weight=weight||U.weight||70;
  var rawNum=parseFloat(lastVal);
  var isRatio=r&&r.unit==='ratio';
  var cur=isRatio?(weight>0?rawNum/weight:0):rawNum;

  var barHTML='';
  if(r){
    var ceil=r.elite*1.15;
    var pct=Math.min(100,Math.round(cur/ceil*100));
    var loP=Math.round(r.lo/ceil*100);
    var hiP=Math.round(r.hi/ceil*100);
    var fillCol=cur<r.lo?'var(--accent-warning)':cur<r.mid?'var(--accent-caution)':cur<r.hi?'var(--accent-deload)':'var(--accent-primary)';
    var zoneLbl=cur<r.lo?'Por desarrollar':cur<r.mid?'En progreso':cur<r.hi?'En rango':cur<r.elite?'Solido':'Elite';
    var pctVsMid=r.mid>0?Math.round((cur-r.mid)/r.mid*100):0;
    var pctStr=pctVsMid>=0?'+'+pctVsMid+'%':pctVsMid+'%';
    var dispVal=isRatio?cur.toFixed(2)+' x PC':rawNum+' '+(t.unit||'').split(' ')[0];
    var loLbl=isRatio?r.lo.toFixed(2):r.lo;
    var hiLbl=isRatio?r.hi.toFixed(2):r.hi;
    barHTML=
      '<div class="tdb-header">'
        +'<div>'
          +'<div class="tdb-val" style="color:'+fillCol+'">'+dispVal+'</div>'
          +'<div class="tdb-unit">'+(isRatio?'relativo al peso corporal':t.unit)+'</div>'
        +'</div>'
        +'<div class="tdb-zone" style="color:'+fillCol+';border-color:'+fillCol+'44;background:'+fillCol+'15">'+zoneLbl+'</div>'
      +'</div>'
      +'<div class="tdb-bar-lbl">'
        +'<span class="tdb-lbl">min</span>'
        +'<span class="tdb-lbl">Rango: '+loLbl+' - '+hiLbl+(isRatio?' x PC':'')+'</span>'
        +'<span class="tdb-lbl">elite</span>'
      +'</div>'
      +'<div class="tdb-track">'
        +'<div class="tdb-fill" style="width:'+pct+'%;background:'+fillCol+'"></div>'
        +'<div style="position:absolute;top:0;left:'+loP+'%;width:'+(hiP-loP)+'%;height:100%;background:#FFFFFF0A;border-left:2px solid #FFFFFF25;border-right:2px solid #FFFFFF25"></div>'
        +'<div class="tdb-marker" style="left:calc('+pct+'% - 1px)"></div>'
      +'</div>'
      +'<div class="tdb-zones">'
        +'<div class="tdb-z" style="background:#FF4D6A55"></div>'
        +'<div class="tdb-z" style="background:#FFB80055"></div>'
        +'<div class="tdb-z" style="background:#00E5A055"></div>'
        +'<div class="tdb-z" style="background:#CCFF0055"></div>'
      +'</div>'
      +'<div style="text-align:right;margin-top:4px">'
        +'<span style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:'+(pctVsMid>=0?'var(--accent-deload)':'var(--accent-caution)')+'">'
          +pctStr+' vs punto medio del rango'
        +'</span>'
      +'</div>';
  }

  /* Progress chart (line + level-range bands) — upgrade of the old sparkline.
     Geometry from buildTestChartModel (pure, unit-tested). */
  var trendHTML = (hist.length > 1)
    ? renderTestChart(buildTestChartModel(hist, r, isRatio, weight), (t && t.col) || 'var(--accent-primary-d)')
    : '';

  var msgHTML=ip?'<div class="tdb-msg">'+ip.txt+'</div>':'';
  return '<div class="tdb">'+barHTML+trendHTML+msgHTML+'</div>';
}
function buildTsTab(){
  var c=document.getElementById('ptts');if(!c)return;

  /* ── NEXT TEST RECOMMENDATION (I) ── */
  var rec=nextTestRecommendation();
  var recHtml='';
  if(rec){
    var st=rec.status;
    var recCol=st.neverDone?'var(--accent-primary)':st.overdue?'var(--accent-warning)':st.daysUntil<=7?'var(--accent-caution)':'var(--accent-deload)';
    var recMsg=st.neverDone
      ?'Nunca hecho - hazlo al comienzo de tu próximo día fresco'
      :st.overdue
        ?'Hace '+st.daysSince+' días - ya toca repetirlo'
        :st.daysUntil===0
          ?'Puedes hacerlo hoy'
          :'En '+st.daysUntil+' días';
    recHtml='<div style="background:'+recCol+'18;border:1px solid '+recCol+'44;border-radius:12px;padding:12px;margin-bottom:14px">'
      +'<div style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:'+recCol+';text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Próximo test recomendado</div>'
      +'<div style="display:flex;align-items:center;gap:10px">'
        +'<div style="flex:1">'
          +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:2px">'+rec.test.title+'</div>'
          +'<div style="font-size:11px;color:'+recCol+'">'+recMsg+'</div>'
        +'</div>'
        +'<div style="text-align:right;flex-shrink:0">'
          +(st.neverDone
            ?'<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;font-weight:700;color:'+recCol+'">!</div>'
            :'<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;font-weight:700;color:'+recCol+'">'+st.pct+'%</div>'
              +'<div style="font-size:9px;color:var(--text-muted)">del intervalo</div>')
        +'</div>'
      +'</div>'
      /* progress bar showing how close to next test */
      +(st.neverDone?'':'<div style="margin-top:8px"><div style="height:4px;background:var(--border-color);border-radius:99px;overflow:hidden"><div style="width:'+st.pct+'%;height:100%;background:'+recCol+';border-radius:99px"></div></div></div>')
    +'</div>';
  }

  /* ── INFO HEADER ── */
  var infoHtml='<div style="background:var(--bg-card-alt);border:1px solid var(--border-color);border-radius:10px;padding:10px 12px;margin-bottom:14px;font-size:11px;color:var(--text-muted);line-height:1.6">'
    +'<span style="color:var(--accent-primary-d);font-family:\'JetBrains Mono\',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px">Tests vs Entrenamientos</span><br>'
    +'Los tests son <em style="color:var(--text-primary)">evaluaciones puntuales</em> con resultados medibles. '
    +'Los entrenamientos (4x4, ARC, campus) son <em style="color:var(--text-primary)">estimulos de adaptación</em> que generan mejora.'
    +'</div>';

  var h=recHtml+infoHtml;

  TESTS.forEach(function(t,ti){
    var hist=loadTestHistory(t.result_key);
    var lastVal=hist.length>0?hist[hist.length-1].v:'';
    var lastInterp=lastVal?runInterpret(t,lastVal):'';

    /* ── PER-TEST STATUS BAR (H) ── */
    var st=testStatus(t.result_key,t.freq);
    var stCol=st.neverDone?'var(--text-muted)':st.overdue?'var(--accent-warning)':st.daysUntil<=7?'var(--accent-caution)':'var(--accent-deload)';
    var stTxt=st.neverDone?'Nunca realizado'
             :st.overdue?'Hace '+st.daysSince+' días - ya toca'
             :st.daysUntil===0?'Puedes hacerlo hoy'
             :'Prox. en '+st.daysUntil+' días';
    var stBar=st.neverDone?''
      :'<div style="height:3px;background:var(--border-color);border-radius:99px;overflow:hidden;margin-top:3px">'
        +'<div style="width:'+st.pct+'%;height:100%;background:'+stCol+';border-radius:99px"></div>'
      +'</div>';

    h+='<div class="test-result" id="trcard'+ti+'" style="cursor:default">';

    /* header row */
    h+='<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;cursor:pointer" onclick="tgTR('+ti+')">'
      +'<div style="flex:1">'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:16px;font-weight:700;color:var(--text-primary)">'+t.title+'</div>'
        +'<div style="font-size:10px;color:var(--text-muted);margin-top:1px">'+t.mide+'</div>'
        +'<div style="font-size:10px;color:'+stCol+';margin-top:3px">'+stTxt+'</div>'
        +stBar
        +(st.lastDate?'<div style="font-size:9px;color:var(--text-muted);margin-top:2px">Último: '+st.lastDate+'</div>':'')
      +'</div>'
      +'<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;margin-left:8px">'
        +'<span style="font-size:9px;font-family:\'JetBrains Mono\',monospace;padding:3px 8px;border-radius:99px;border:1px solid;color:'+t.col+';border-color:'+t.col+'">'+t.diff+'</span>'
        +'<span style="font-size:9px;color:var(--text-muted)">'+t.freq+'</span>'
      +'</div>'
    +'</div>';

    /* performance dashboard */
    if(lastVal){
      h+=makeTestDashboard(t,lastInterp,lastVal,hist,U.weight||70);
    }

    /* input + save */
    h+='<div style="display:flex;gap:8px;align-items:stretch;margin-bottom:8px">'
      +'<input type="text" id="tri_'+t.result_key+'" placeholder="'+t.result_label+'" '
        +'style="flex:1;background:var(--bg-card-alt);border:1.5px solid var(--border-color);border-radius:8px;padding:9px 12px;color:var(--text-primary);font-family:\'JetBrains Mono\',monospace;font-size:13px;outline:none" '
        +'onclick="event.stopPropagation()">'
      +'<button onclick="event.stopPropagation();recordTestResult(\''+t.result_key+'\','+ti+')" '
        +'style="padding:9px 14px;background:#CCFF00;border:none;border-radius:8px;color:var(--accent-primary-on);font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;cursor:pointer;flex-shrink:0">'
        +'Guardar</button>'
    +'</div>';

    /* expandable instructions */
    h+='<button id="trbtn'+ti+'" onclick="event.stopPropagation();tgTR('+ti+')" '
      +'style="font-size:11px;color:var(--text-secondary);background:none;border:none;cursor:pointer;padding:0;font-family:\'JetBrains Mono\',monospace">+ ver instrucciones</button>';
    h+='<div id="trbdy'+ti+'" style="display:none;margin-top:10px;padding:10px;background:var(--bg-card-alt);border-radius:8px">'
      +'<div style="font-size:10px;color:var(--accent-primary-d);font-family:\'JetBrains Mono\',monospace;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Como hacerlo:</div>'
      +'<div style="font-size:12px;color:var(--text-secondary);line-height:1.8">'+t.how+'</div>'
      +'</div>';
    h+='</div>';
  });

  /* ── CALIBRATION: show the tests actually driving the plan (finding #1) ──
     Proves the linkage with real numbers: which max the plan scales loads
     from, and whether the interpret() adj nudged them up or down. */
  var cal = (typeof getTestCalibration === 'function') ? getTestCalibration() : {hasAny:false, items:[]};
  if(cal.hasAny){
    var calRows = cal.items.map(function(it){
      var adjTxt = it.adj < 0 ? ' · bajo el rango → cargas algo más conservadoras'
                 : it.adj > 0 ? ' · sobre el rango → cargas algo más altas'
                 : '';
      return '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:4px 0;border-top:1px solid var(--border-color)">'
        +'<span style="font-size:12px;color:var(--text-primary)">'+it.label+'</span>'
        +'<span style="font-family:\'JetBrains Mono\',monospace;font-size:12px;color:var(--accent-primary-d);font-weight:700;text-align:right">'+it.max+' kg'
          +(adjTxt?'<span style="font-size:9px;color:var(--text-muted);font-weight:400">'+adjTxt+'</span>':'')+'</span>'
      +'</div>';
    }).join('');
    h+='<div style="margin-top:8px;background:#CCFF0012;border:1px solid #CCFF0033;border-radius:10px;padding:12px">'
      +'<div style="font-size:10px;color:var(--accent-primary-d);font-family:\'JetBrains Mono\',monospace;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Tu plan calibrado a tus tests</div>'
      +calRows
      +'<div style="font-size:11px;color:var(--text-secondary);line-height:1.5;margin-top:8px">Cada ejercicio de fuerza muestra su carga objetivo en <strong style="color:var(--text-primary)">kg</strong>, calculada desde estos números según la semana de la fase.</div>'
    +'</div>';
  } else {
    h+='<div style="margin-top:8px;background:var(--bg-card-alt);border:1px dashed var(--border-color);border-radius:10px;padding:12px">'
      +'<div style="font-size:10px;color:var(--text-muted);font-family:\'JetBrains Mono\',monospace;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Aún sin calibrar</div>'
      +'<div style="font-size:11px;color:var(--text-secondary);line-height:1.5">Registrá tu <strong style="color:var(--text-primary)">Max Hang</strong> o tu <strong style="color:var(--text-primary)">3RM de dominadas</strong> y el plan calculará la carga objetivo en kg de cada ejercicio de fuerza, ajustada a tu nivel.</div>'
    +'</div>';
  }

  h+='<div style="margin-top:8px;background:#CCFF0012;border:1px solid #CCFF0033;border-radius:10px;padding:12px">'
    +'<div style="font-size:10px;color:var(--accent-primary-d);font-family:\'JetBrains Mono\',monospace;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Cuando repetir</div>'
    +'<div style="font-size:11px;color:var(--text-secondary);line-height:1.6">Siempre fresco, al principio de la sesión. Cada nuevo resultado recalibra las cargas objetivo (kg) de tu plan.</div>'
    +'</div>';

  c.innerHTML=h;
}
function tgTR(ti){
  var b=document.getElementById('trbdy'+ti),btn=document.getElementById('trbtn'+ti);
  if(!b||!btn)return;
  var open=b.style.display!=='none';
  b.style.display=open?'none':'block';
  btn.textContent=open?'+ ver instrucciones':'- ocultar';
  btn.style.color=open?'var(--accent-primary)':'var(--text-secondary)';
}
function svTR(key,val){try{if(localStorage)localStorage.setItem('tr_'+key,val);}catch(e){}}