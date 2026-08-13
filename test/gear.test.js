/* ====================================================
   gear.test.js -- el plan se adapta a lo que el usuario tiene

   (U) EL POOL ASUMÍA UN GIMNASIO COMPLETO.

   Medido antes de tocar nada, sobre los 48 ejercicios:

     · gimnasio SÓLO DE CUERDA  → 16 ejercicios (33%) inejecutables
     · gimnasio SÓLO BOULDER    → 9
     · sin spray wall           → 7
     · sin colgador             → 4
     · sin campus board         → 3

   Y nada lo decía: el plan proponía "Campus bumps 1-4-7" a alguien cuyo
   gimnasio no tiene campus board, sin alternativa ni aviso. La app se veía
   impecable y era inaplicable — la misma familia que el resto de esta
   sesión: el sistema sabe algo (qué necesita cada ejercicio) y no lo usa.

   LO QUE ESTOS TESTS PROTEGEN:

   1. Que NADIE quede sin plan. Filtrar sin sustituir habría dejado a los
      gimnasios modestos con días de un ejercicio.
   2. Que el sustituto sea EJECUTABLE con lo que hay. La primera versión
      mandaba "hacelo en el muro de boulder" a quien sólo tiene cuerda.
   3. Que el default sea gimnasio completo. Ausencia de dato no es ausencia
      de material — misma regla que el ACWR.
==================================================== */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  const TODOS = [];
  Object.keys(app.EX_POOL).forEach(function(b){
    (app.EX_POOL[b] || []).forEach(function(e){ TODOS.push(Object.assign({ _b:b }, e)); });
  });

  const gear = o => Object.assign(app.gearDefault(), o || {});
  const SIN_NADA_ESPECIAL = gear({ board:false, campus:false, spray:false });
  const SOLO_BOULDER      = gear({ rope:false, board:false, campus:false, spray:false });
  const SOLO_CUERDA       = gear({ boulder:false, board:false, campus:false, spray:false });
  const BOULDER_PELADO    = { boulder:true, rope:false, board:false, campus:false, spray:false, hangboard:false, pullup:false };
  const CUERDA_PELADA     = { boulder:false, rope:true, board:false, campus:false, spray:false, hangboard:false, pullup:false };

  function planCon(g){
    app.U = Object.assign(app.U || {}, {
      goal:'sport', level:'intermediate', plan:'4-3-2-1', days:4, weight:70, age:30, session:90,
      gymDays:[1,3,5,6], rockDays:[], rockWeekend:'never', trainTime:'evening',
      grade:'6c', targetGrade:'7a', startDate:new Date(2026, 7, 3), gear:g
    });
    app.planMap = {};
    app.generatePlan();
    const dias = Object.keys(app.planMap).filter(k => app.planMap[k].block !== 'rest');
    let min = 99, vacios = 0, sustituidos = 0, total = 0;
    const ids = new Set();
    dias.forEach(function(k){
      const ex = app.getExercisesForDay(k, app.planMap[k].block);
      if(!ex.length) vacios++;
      min = Math.min(min, ex.length);
      total += ex.length;
      ex.forEach(function(e){ ids.add(e.id); if(e._sustituye) sustituidos++; });
    });
    return { dias:dias.length, min:min, vacios:vacios, sustituidos:sustituidos, total:total, distintos:ids.size };
  }

  describe('(U) el default no le quita nada a nadie', function(){

    it('gearDefault es un gimnasio completo', function(){
      const d = app.gearDefault();
      app.GEAR_KEYS.forEach(function(k){ expect(d[k]).toBe(true); });
    });

    it('sin dato de equipamiento, el plan es el completo', function(){
      /* Quien ya venía usando la app no puede perder ejercicios de un día
         para el otro por un campo que nunca se le preguntó. */
      const conDato = planCon(app.gearDefault());
      app.U.gear = undefined;
      app.planMap = {}; app.generatePlan();
      const dias = Object.keys(app.planMap).filter(k => app.planMap[k].block !== 'rest');
      let sust = 0;
      dias.forEach(function(k){
        app.getExercisesForDay(k, app.planMap[k].block).forEach(function(e){ if(e._sustituye) sust++; });
      });
      expect(sust).toBe(0);
      expect(conDato.sustituidos).toBe(0);
    });

    it('normalizeGear tolera basura sin recortar el plan', function(){
      [null, undefined, {}, 'texto', 42, { boulder:'sí' }].forEach(function(v){
        const g = app.normalizeGear(v);
        app.GEAR_KEYS.forEach(function(k){ expect(typeof g[k]).toBe('boolean'); });
      });
      /* un objeto vacío no debe apagar nada */
      expect(app.normalizeGear({}).campus).toBe(true);
      /* pero un false explícito sí se respeta */
      expect(app.normalizeGear({ campus:false }).campus).toBe(false);
    });
  });

  describe('(U) nadie se queda sin plan', function(){

    const ESCENARIOS = [
      ['gimnasio completo', () => app.gearDefault()],
      ['solo boulder',      () => SOLO_BOULDER],
      ['solo cuerda',       () => SOLO_CUERDA],
      ['sin extras',        () => SIN_NADA_ESPECIAL],
      ['boulder pelado',    () => BOULDER_PELADO],
      ['cuerda pelada',     () => CUERDA_PELADA]
    ];

    ESCENARIOS.forEach(function(esc){
      it(esc[0] + ': ningún día queda vacío', function(){
        const r = planCon(esc[1]());
        if(r.vacios) throw new Error(esc[0] + ': ' + r.vacios + ' días sin ejercicios');
        expect(r.min).toBeGreaterThan(1);
      });
    });

    it('un gimnasio sólo de cuerda no queda con un plan pobre', function(){
      /* La primera versión de las sustituciones apuntaba TODA al muro de
         boulder, así que este usuario se quedaba con 12 ejercicios distintos
         de 25 y días de 2. Por eso existen las alternativas en cuerda. */
      const completo = planCon(app.gearDefault());
      const cuerda   = planCon(SOLO_CUERDA);
      expect(cuerda.distintos).toBeGreaterThan(completo.distintos * 0.7);
      expect(cuerda.min).toBeGreaterThan(2);
    });

    it('cuanto menos material, más sustituciones (y no menos ejercicios)', function(){
      const completo = planCon(app.gearDefault());
      const pelado   = planCon(BOULDER_PELADO);
      expect(completo.sustituidos).toBe(0);
      expect(pelado.sustituidos).toBeGreaterThan(0);
      expect(pelado.vacios).toBe(0);
    });
  });

  describe('(U) el sustituto se puede hacer de verdad', function(){

    it('nunca se propone algo que el usuario no pueda ejecutar', function(){
      /* El bug más fácil de cometer acá: sustituir campus por "bloques en el
         muro" a alguien que tampoco tiene muro de boulder. */
      [SOLO_BOULDER, SOLO_CUERDA, BOULDER_PELADO, CUERDA_PELADA, SIN_NADA_ESPECIAL].forEach(function(g){
        TODOS.forEach(function(ex){
          const ad = app.adaptExercise(ex, g);
          if(!ad) return;                       /* descartado, es válido */
          if(!app.gearAllows(g, ad)){
            throw new Error('propone ' + ad.id + ' ("' + ad.n + '") sin el material necesario');
          }
        });
      });
    });

    it('sin campus, el sustituto entrena lo mismo en el muro', function(){
      const sinCampus = gear({ campus:false });
      const campus = TODOS.filter(e => e.cat === 'campus_board');
      expect(campus.length).toBeGreaterThan(2);
      campus.forEach(function(ex){
        const ad = app.adaptExercise(ex, sinCampus);
        if(!ad) throw new Error(ex.id + ' no tiene sustituto sin campus');
        expect(ad._sustituye).toBe(ex.id);
        /* el reemplazo tiene que hablar de pies fuera, que es el estímulo */
        expect(/sin pies/i.test(ad.n + ' ' + ad.det)).toBe(true);
      });
    });

    it('sin cuerda, las vías se vuelven travesías o bloques', function(){
      const sinCuerda = gear({ rope:false });
      const deVia = TODOS.filter(e => (app.EX_GEAR_REQ[e.id] || []).indexOf('rope') > -1);
      expect(deVia.length).toBeGreaterThan(3);
      deVia.forEach(function(ex){
        const ad = app.adaptExercise(ex, sinCuerda);
        if(!ad) return;   /* alguno puede no tener equivalente y es honesto */
        expect(app.gearAllows(sinCuerda, ad)).toBe(true);
      });
    });

    it('sin boulder, los bloques se vuelven vías', function(){
      const sinBoulder = gear({ boulder:false });
      const deBloque = TODOS.filter(e => (app.EX_GEAR_REQ[e.id] || []).indexOf('boulder') > -1);
      expect(deBloque.length).toBeGreaterThan(10);
      const conAlternativa = deBloque.filter(e => !!app.adaptExercise(e, sinBoulder));
      /* la mayoría tiene que tener traducción, o el plan queda hueco */
      expect(conAlternativa.length).toBeGreaterThan(deBloque.length * 0.6);
    });

    it('el sustituto conserva la ficha completa del ejercicio', function(){
      /* Hereda todo lo del original y pisa sólo lo que cambia: si perdiera
         `cat`, `sys` o `fatigue`, el planificador lo ubicaría mal y el
         cálculo de carga saldría torcido. */
      const ad = app.adaptExercise(TODOS.filter(e => e.id === 'pow1')[0], gear({ campus:false }));
      expect(!!ad).toBe(true);
      ['id','cat','sys','col','fatigue','skill','minLevel'].forEach(function(k){
        if(ad[k] === undefined) throw new Error('el sustituto perdió "' + k + '"');
      });
      expect(ad.how && ad.how.length > 0).toBe(true);
    });
  });

  /* (V) LOS SUSTITUTOS SON TEXTO QUE LEE UN USUARIO, y por eso tienen que
     cumplir lo mismo que exigimos al pool. Se escribieron 38 de una sentada
     y NINGUNO pasaba por los tests de calidad, que sólo miran `EX_POOL`.
     Auditados a mano: 9 no decían la intensidad — el mismo defecto que la
     beta había reportado del pool original. Este bloque cierra ese hueco. */
  describe('(V) los textos de sustitución cumplen lo mismo que el pool', function(){

    const ALTS = Object.keys(app.EX_GEAR_ALT).map(k => [k, app.EX_GEAR_ALT[k]]);
    const DICE_INTENSIDAD = /grado|l[ií]mite|m[aá]ximo|redpoint|%|RPE|pump|bombe|suave|f[aá]cil|c[oó]modo|intens|peso|esfuerzo f[ií]sico/i;
    const DICE_LUGAR = /traves|muro|pared|spray|board|boulder|circuito|v[ií]a|ruta|campus|barra|regleta|tabla|suelo|silla|caja|top-?rope|bloque/i;

    it('hay sustituciones para los casos que importan', function(){
      expect(ALTS.length).toBeGreaterThan(20);
    });

    it('todas dicen a qué intensidad', function(){
      const mudas = ALTS.filter(function(p){
        const t = [p[1].n, p[1].nota, p[1].det, p[1].simple].join(' ');
        return !DICE_INTENSIDAD.test(t);
      });
      if(mudas.length) throw new Error('sustituciones sin intensidad: ' + mudas.map(p => p[0]).join(', '));
    });

    it('todas dicen dónde se hacen', function(){
      const mudas = ALTS.filter(function(p){
        const t = [p[1].n, p[1].nota, p[1].det, p[1].simple].join(' ');
        return !DICE_LUGAR.test(t);
      });
      if(mudas.length) throw new Error('sustituciones sin lugar: ' + mudas.map(p => p[0]).join(', '));
    });

    it('ninguna vuelve a la notación de planilla', function(){
      const CRUDA = /:\s*\d+(\s*-\s*\d+)?\s*(min|s)\b|@RPE|\d+rep\b|rest\s*=/i;
      const crudas = ALTS.filter(p => p[1].nota && CRUDA.test(p[1].nota));
      if(crudas.length) throw new Error('notación de planilla en: ' + crudas.map(p => p[0]).join(', '));
    });

    it('ninguna es un texto de relleno', function(){
      const cortas = ALTS.filter(p => p[1].det && p[1].det.length < 90);
      if(cortas.length) throw new Error('descripciones demasiado cortas: ' + cortas.map(p => p[0]).join(', '));
    });

    it('el nombre dice que es una versión adaptada, o al menos qué se usa', function(){
      /* Como la sustitución es silenciosa, el NOMBRE es lo único que ubica al
         usuario. "Lanzamientos sin pies (sin campus board)" se entiende;
         "Ejercicio 4" no. */
      ALTS.forEach(function(p){
        if(!p[1].n) return;   /* hereda el nombre del original: válido */
        expect(p[1].n.length).toBeGreaterThan(10);
      });
    });

    it('apuntan a equipamiento REAL, no inventado', function(){
      ALTS.forEach(function(p){
        (p[1].req || []).forEach(function(k){
          if(app.GEAR_KEYS.indexOf(k) === -1){
            throw new Error(p[0] + ' pide "' + k + '", que no es equipamiento conocido');
          }
        });
      });
    });
  });

  describe('(U) requisitos bien puestos', function(){

    it('los 48 ejercicios están etiquetados', function(){
      const sinEtiqueta = TODOS.filter(e => app.EX_GEAR_REQ[e.id] === undefined);
      if(sinEtiqueta.length) throw new Error('sin requisitos declarados: '
        + sinEtiqueta.map(e => e.id).join(', '));
    });

    it('sólo se usan claves de equipamiento conocidas', function(){
      Object.keys(app.EX_GEAR_REQ).forEach(function(id){
        (app.EX_GEAR_REQ[id] || []).forEach(function(k){
          if(app.GEAR_KEYS.indexOf(k) === -1) throw new Error(id + ' pide "' + k + '", que no existe');
        });
      });
    });

    it('no se sobre-etiqueta: movilidad y antagonistas no piden nada', function(){
      /* Exigir material de más vaciaría los planes de quien entrena en casa. */
      expect((app.EX_GEAR_REQ['del2'] || []).length).toBe(0);
      expect((app.EX_GEAR_REQ['del3'] || []).length).toBe(0);
    });

    it('los de campus piden campus, y los de vía piden cuerda', function(){
      TODOS.filter(e => e.cat === 'campus_board').forEach(function(e){
        expect((app.EX_GEAR_REQ[e.id] || []).indexOf('campus')).toBeGreaterThan(-1);
      });
      ['end5','end6','end12'].forEach(function(id){
        expect((app.EX_GEAR_REQ[id] || []).indexOf('rope')).toBeGreaterThan(-1);
      });
    });
  });
};
