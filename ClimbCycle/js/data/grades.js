/* ======================================================
   data/grades.js -- Escala de grados franceses (fuente única) + gradeIndex()/gradeLevel().
   ClimbCycle · datos estáticos (troceado desde el antiguo data.js).
====================================================== */

var GRADES={
  beginner:    ['4','4+','5','5+','6a','6a+'],
  intermediate:['6a','6a+','6b','6b+','6c','6c+'],
  advanced:    ['7a','7a+','7b','7b+','7c','7c+'],
  elite:       ['8a','8a+','8b','8b+','8c','8c+','9a']
};

/* Canonical ordered French grade scale — single source of truth for the
   goal engine (gap between current and target grade). */
var GRADE_ORDER=['4','4+','5','5+','6a','6a+','6b','6b+','6c','6c+',
  '7a','7a+','7b','7b+','7c','7c+','8a','8a+','8b','8b+','8c','8c+','9a','9a+','9b'];
function gradeIndex(g){
  if(!g) return -1;
  return GRADE_ORDER.indexOf(String(g).toLowerCase().replace(/\s/g,''));
}
/* Which level tier a grade belongs to (for calibrating expectations). */
function gradeLevel(g){
  var i=gradeIndex(g);
  if(i<0) return 'intermediate';
  if(i<=gradeIndex('6a+')) return 'beginner';
  if(i<=gradeIndex('6c+')) return 'intermediate';
  if(i<=gradeIndex('7c+')) return 'advanced';
  return 'elite';
}
