/* ====================================================
   layout.test.js -- regresión de ANCHO contra un móvil de 390px

   Por qué existe: la suite testea view-models, no pintura, y dos bugs
   reales se escaparon justo por ahí — un chip `flex:none` con 74 chars
   que partió el nombre del ejercicio letra por letra, y una nav de 6
   items donde "Calendario" no entraba en su cuota de ~60px. Los dos son
   invisibles para un test de lógica y visibles al primer vistazo en el
   teléfono.

   Estos tests ejecutan los renderers de verdad y miden el HTML que
   producen. La medición es estimada (±8%, ver layout-metrics.js): sirve
   para cazar desbordes groseros, NO reemplaza el QA en dispositivo.
==================================================== */

const { describe, it, expect } = require('./assert');
const M = require('./layout-metrics');

module.exports = function(R){
  const app = R.app;

  /* ── El medidor mismo, contra los dos bugs históricos ──
     Si el medidor deja de detectarlos, los tests de abajo pasan en verde
     sin significar nada. Se verifica primero la herramienta. */
  describe('layout-metrics — detecta los bugs de ancho conocidos', function(){

    it('caza un chip rígido (flex:none) que se come la fila', function(){
      /* El texto es el SYS_HUMAN más largo del pool: el dato real que rompió. */
      const largo = 'Capacidad de mantener esfuerzos submáximos prolongados sin acumular fatiga';
      const html = '<div style="display:flex;gap:8px;align-items:center">'
        + '<div style="flex:1 1 auto;min-width:0;font-size:15px;font-weight:700">Max hangs en regleta de 20mm</div>'
        + '<div style="flex:none;font-size:11px">' + largo + '</div>'
        + '</div>';
      expect(M.findOverflows(html).length).toBeGreaterThan(0);
    });

    it('acepta el mismo chip con etiqueta corta y tope de ancho', function(){
      const html = '<div style="display:flex;gap:8px;align-items:center">'
        + '<div style="flex:1 1 auto;min-width:0;font-size:15px;font-weight:700">Max hangs en regleta de 20mm</div>'
        + '<div style="flex:none;max-width:38%;font-size:11px">Fuerza max</div>'
        + '</div>';
      expect(M.findOverflows(html).length).toBe(0);
    });

    it('caza una nav de 6 items cuyo label no entra en su cuota', function(){
      /* `flex:1` reparte parejo: lo que le sobra a "Hoy" NO se lo presta
         a "Calendario". Ése fue exactamente el modo de fallo. */
      const nav = ls => '<div style="display:flex;gap:2px">'
        + ls.map(l => '<button style="flex:1;min-width:0;font-size:11px;padding:6px 4px;white-space:nowrap">'
                      + l + '</button>').join('')
        + '</div>';
      expect(M.findOverflows(nav(['Inicio','Hoy','Semana','Calendario','Plan','Ejercicios'])).length).toBeGreaterThan(0);
      expect(M.findOverflows(nav(['Inicio','Hoy','Semana','Mes','Plan','Ejerc.'])).length).toBe(0);
    });

    it('no marca una fila con scroll horizontal declarado', function(){
      /* La barra de filtros de la tab Ejercicios es ancha A PROPÓSITO. */
      const html = '<div style="display:flex;gap:6px;overflow-x:auto">'
        + ['Todos','Fuerza de dedos','Fuerza de traccion','Muro de entrenamiento','Resistencia aeróbica']
            .map(l => '<button style="flex:none;white-space:nowrap;padding:6px 10px;font-size:12px">'
                      + l + '</button>').join('')
        + '</div>';
      expect(M.findOverflows(html).length).toBe(0);
    });
  });

  /* ── Preparar un usuario con plan, para renderizar pantallas reales ── */
  function setup(){
    const lunes = new Date(2026, 7, 3); lunes.setHours(0,0,0,0);
    Object.assign(app.U, {
      goal:'rock', level:'intermediate', plan:'10', days:4,
      weight:72, age:31, session:90,
      name:'Matías', grade:'7a', targetGrade:'7c',
      startDate: lunes, gymDays:[1,2,4,5], rockDays:[6,0], rockWeekend:'sometimes'
    });
    app.generatePlan();
    /* posarse en un día CON sesión: en uno de descanso no se pinta nada */
    const conSesion = Object.keys(app.planMap).find(k => {
      const p = app.planMap[k];
      return p && p.block && p.block !== 'rest' && p.block !== 'test';
    });
    app.TODAY = new Date(conSesion); app.TODAY.setHours(0,0,0,0);
    return { key: app.TODAY.toDateString() };
  }

  function entra(nombre, html){
    const malas = M.findOverflows(html);
    if(malas.length){
      throw new Error(nombre + ' no entra en ' + M.AVAIL + 'px:\n  '
        + malas.slice(0,3).map(M.describeOverflow).join('\n  '));
    }
    expect(malas.length).toBe(0);
  }

  describe('tarjeta de ejercicio — los 48 del pool entran en 390px', function(){
    /* Barrido completo en vez de un caso elegido a mano: el bug de la
       `nota` de 44 chars apareció porque el mockup usaba una de 6. */
    const { key } = setup();
    const plan = app.planMap[key];
    const todos = [];
    ['strength','power','endurance','deload'].forEach(function(b){
      (app.EX_POOL[b] || []).forEach(function(ex){ todos.push(ex); });
    });

    it('hay ejercicios que barrer (guarda contra un pool vacío)', function(){
      expect(todos.length).toBeGreaterThan(40);
    });

    it('entran todos con el check de sesión (variante de la pantalla Hoy)', function(){
      todos.forEach(function(ex){
        entra('tarjeta ' + ex.id + ' (' + ex.n + ') con check',
          app.renderExerciseCard(ex, plan, '#38BDF8', 'lt_' + ex.id, '',
                                 { check:true, done:false, onCheck:'x()' }));
      });
    });

    it('entran todos sin check (variante del panel de día)', function(){
      todos.forEach(function(ex){
        entra('tarjeta ' + ex.id + ' (' + ex.n + ')',
          app.renderExerciseCard(ex, plan, '#38BDF8', 'lt2_' + ex.id, '', {}));
      });
    });
  });

  describe('pantallas completas entran en 390px', function(){
    const { key } = setup();

    it('Hoy — sesión de entrenamiento', function(){
      entra('pantalla Hoy', R.capture(function(){ app.renderHoy(); }));
    });

    it('Hoy — día de descanso', function(){
      const rest = Object.keys(app.planMap).find(k => app.planMap[k] && app.planMap[k].block === 'rest');
      const antes = app.TODAY;
      app.TODAY = new Date(rest); app.TODAY.setHours(0,0,0,0);
      const html = R.capture(function(){ app.renderHoy(); });
      app.TODAY = antes;
      entra('Hoy (descanso)', html);
    });

    it('Semana', function(){
      entra('vista Semana', R.capture(function(){ app.renderWk(); }));
    });

    it('Semana con los chips de roca (confirmar / agendar)', function(){
      /* Se posa el "hoy" DESPUÉS del finde para que aparezcan los chips de
         confirmación: son la fila más ancha que agrega esta vista. */
      const antes = app.TODAY;
      const lunes2 = new Date(app.U.startDate); lunes2.setDate(lunes2.getDate() + 7);
      app.TODAY = lunes2;
      const html = R.capture(function(){ app.renderWk(); });
      app.TODAY = antes;
      entra('Semana con chips de roca', html);
    });

    it('Inicio — hub completo con todos los widgets', function(){
      entra('Inicio', R.capture(function(){ app.renderWidgets(); app.populateWidgets(); }));
    });

    it('panel de día — sesión y descanso', function(){
      entra('panel de día (sesión)',
        R.capture(function(){ app.showDayPanel(app.TODAY, app.planMap[key], key); }));
      const rest = Object.keys(app.planMap).find(k => app.planMap[k] && app.planMap[k].block === 'rest');
      entra('panel de día (descanso)',
        R.capture(function(){ app.showDayPanel(new Date(rest), app.planMap[rest], rest); }));
    });

    it('Plan — tabs de ejercicios, hangboard y tests', function(){
      entra('tab Plan', R.capture(function(){ app.renderPlanPage(); }));
    });

    it('Perfil — incluye los editores de días flexibles', function(){
      entra('Perfil', R.capture(function(){ app.renderProfile(); }));
    });

    it('editores de ventana de gym y de roca', function(){
      entra('ventana gym',  app.renderDayWindowSection('gym'));
      entra('ventana roca', app.renderDayWindowSection('rock'));
    });

    it('configurador de widgets', function(){
      entra('config de widgets', R.capture(function(){ app.renderWidgetConfigList(); }));
    });
  });
};
