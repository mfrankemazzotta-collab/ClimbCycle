/* ====================================================
   state.js -- Global mutable state + persistence
   ClimbCycle v5
==================================================== */


/* ──────────────────────────────────────────────────
   Global state variables
────────────────────────────────────────────────── */

var U={
  goal:'',level:'',plan:'',days:4,
  weight:70,age:25,rhr:55,session:90,
  name:'',grade:'',tests:[],startDate:null,
  /* NEW: smart scheduler fields */
  gymDays:[],
  rockDays:[],    /* array of DOW ints the user CAN go to gym — default Mon/Wed/Thu/Fri */
  rockWeekend:'never',  /* never | sometimes | always */
  trainTime:'evening'   /* morning | afternoon | evening */
};
var TODAY=new Date();
var MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
var curStep=1,NSTEPS=7;
var calDate=new Date(), bigDate=new Date();  // <-- LÍNEA CORREGIDA: bigDate estaba sin declarar
var hcDate=new Date();
var hcSel=null;
var wkOff=0;
var planMap={};
var sessionLog={};
var recData={sleep:7,sleepQ:3,sore:0,fat:0,rpe:0,dur:0,ts:0,
  hoursAgo:24,   /* hours since last session — KEY FIX */
  stype:'none'   /* session type: none|recovery|endurance|strength|power|outdoor */
};
var ciState={sleepq:3,sore:0,fat:0,rpe:0,ago:24,stype:'none'};
var slState={rpe:0,feel:2,pain:0,focus:'',dateStr:'',block:''};
var lastExUsed = {};
var toastTmr = null;

/* ──────────────────────────────────────────────────
   Persistence functions
────────────────────────────────────────────────── */


function saveU(){
  try{
    var toSave=JSON.parse(JSON.stringify(U));
    if(toSave.startDate)toSave.startDate=toSave.startDate instanceof Date
      ?toSave.startDate.toISOString():toSave.startDate;
    localStorage.setItem('cc_user',JSON.stringify(toSave));
  }catch(e){}
}
function loadU(){
  try{
    var s=localStorage.getItem('cc_user');
    if(!s)return false;
    var saved=JSON.parse(s);
    Object.keys(saved).forEach(function(k){U[k]=saved[k];});
    if(U.startDate)U.startDate=new Date(U.startDate);
    return !!(U.goal&&U.plan&&U.startDate);
  }catch(e){return false;}
}
function savePlan(){
  try{
    /* planMap keys are dateStrings, values are plain objects — safe to JSON */
    /* but exercises arrays contain objects from EX_POOL — strip them to just ids */
    var slim={};
    Object.keys(planMap).forEach(function(k){
      var p=planMap[k];
      slim[k]={block:p.block,week:p.week};
      if(p.note)slim[k].note=p.note;
      if(p.moved)slim[k].moved=true;
      if(p.forced)slim[k].forced=true;
    });
    localStorage.setItem('cc_plan',JSON.stringify(slim));
  }catch(e){}
}
function loadPlan(){
  try{
    var s=localStorage.getItem('cc_plan');
    if(!s)return false;
    planMap=JSON.parse(s);
    return Object.keys(planMap).length>0;
  }catch(e){return false;}
}
function saveSL(){try{localStorage.setItem('cc_sl',JSON.stringify(sessionLog));}catch(e){}}
function loadSL(){try{var s=localStorage.getItem('cc_sl');if(s)sessionLog=JSON.parse(s);}catch(e){}}
function loadSLogs(){try{var s=localStorage.getItem('cc_logs');return s?JSON.parse(s):[];}catch(e){return [];}}
function saveSLogs(logs){try{localStorage.setItem('cc_logs',JSON.stringify(logs));}catch(e){}}
function loadAllTestResults(){
  try{var s=localStorage.getItem('cc_tests');return s?JSON.parse(s):{};}catch(e){return {};}
}
function saveAllTestResults(data){
  try{localStorage.setItem('cc_tests',JSON.stringify(data));}catch(e){}
}
function loadTestHistory(resultKey){
  var all=loadAllTestResults();
  return all[resultKey]||[];
}
function saveTestResult(resultKey, value){
  var all=loadAllTestResults();
  if(!all[resultKey])all[resultKey]=[];
  all[resultKey].push({v:value, ts:Date.now()});
  /* keep last 20 entries */
  if(all[resultKey].length>20)all[resultKey]=all[resultKey].slice(-20);
  saveAllTestResults(all);
}
function loadRec(){
  try{var s=localStorage.getItem('cc_rec');if(s)recData=JSON.parse(s);}catch(e){}
}
function saveRec(){
  try{localStorage.setItem('cc_rec',JSON.stringify(recData));}catch(e){}
}
