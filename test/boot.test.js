/* ====================================================
   boot.test.js -- que la app ABRA

   (X) POR QUÉ EXISTE.

   Auditando qué archivos ejecuta la suite salió que, de los 47 scripts de
   `index.html`, había exactamente uno que NINGÚN sandbox cargaba: `app.js`.
   Es decir, el archivo que decide si la app abre o no —el que engancha
   DOMContentLoaded, pasa por el vault, restaura el plan guardado y pinta la
   primera pantalla— no lo tocaba ni un test.

   La consecuencia práctica: 660 tests en verde eran compatibles con una app
   que no arranca. Cualquier error dentro de `arrancarApp()` cae en un
   `catch` que hace `console.error` y muestra el onboarding — así que el
   usuario con meses de historial ve la pantalla de bienvenida y cree que
   perdió todo, mientras la suite sigue verde.

   Este archivo carga los scripts EXACTAMENTE como los lista `index.html`
   (leyendo el HTML, no una copia a mano) y dispara el arranque de verdad.
==================================================== */
const { describe, it, expect } = require('./assert');
const { loadRenderApp } = require('./harness');

module.exports = function(){

  /* Un arranque limpio por escenario: `arrancarApp` tiene estado global. */
  function arrancar(prep){
    const R = loadRenderApp({ boot:true });
    const app = R.app;
    const errores = [];
    const antes = app.console.error;
    app.console.error = function(){ errores.push(Array.prototype.join.call(arguments, ' ')); };
    try {
      if(prep) prep(app, R);
      const n = R.disparar('DOMContentLoaded');
      return { app, R, errores, handlers:n };
    } finally { app.console.error = antes; }
  }

  const U_GUARDADO = {
    name:'Beta', goal:'sport', level:'intermediate', plan:'4-3-2-1', days:4,
    weight:70, age:30, session:90, gymDays:[1,3,5,6], rockDays:[], rockWeekend:'never',
    trainTime:'evening', grade:'6c', targetGrade:'7a', startDate:new Date(2026,7,3).toISOString()
  };

  /* Un usuario que ya usó la app: sesión local abierta + plan guardado. Sin
     `cc_current_user`, `initAuth()` corta el arranque y muestra el login —
     que es correcto, pero deja sin ejercitar todo el camino de restauración. */
  function conPlanGuardado(app){
    app.localStorage.clear();
    app.localStorage.setItem('cc_current_user', 'beta');
    app.U = Object.assign({}, app.U, U_GUARDADO, {
      startDate: new Date(2026,7,3), gear: app.gearDefault()
    });
    app.planMap = {};
    app.generatePlan();
    app.saveU();
    app.savePlan();
  }

  describe('(X) la app arranca', function(){

    it('app.js se carga y engancha su arranque', function(){
      /* Si este falla, es que `index.html` dejó de cargar app.js o que el
         listener cambió de nombre: la app no abriría en el navegador. */
      const { app, handlers } = arrancar();
      expect(typeof app.arrancarApp).toBe('function');
      expect(typeof app.initApp).toBe('function');
      expect(handlers).toBeGreaterThan(0);
    });

    it('usuario nuevo: arranca sin errores y no finge tener plan', function(){
      const { app, errores } = arrancar(function(app){ app.localStorage.clear(); });
      if(errores.length) throw new Error('errores durante el arranque: ' + errores.join(' | '));
      /* Sin datos guardados, la vista de app no se muestra. */
      if(app.document.getElementById('vapp').style.display === 'flex'){
        throw new Error('sin datos guardados mostró la app en vez del onboarding');
      }
    });

    it('usuario con plan guardado: lo RESTAURA, no lo manda al onboarding', function(){
      /* El fallo que este test cubre no rompe nada visiblemente: un error
         adentro de `arrancarApp()` se traga en un catch, se loguea, y se
         muestra el onboarding. Para el usuario con historial eso se lee como
         "la app me borró todo". */
      const { app, errores } = arrancar(conPlanGuardado);

      const fallos = errores.filter(function(e){ return /Restore failed/.test(e); });
      if(fallos.length) throw new Error('el restore se cayó: ' + fallos.join(' | '));
      if(errores.length) throw new Error('errores durante el arranque: ' + errores.join(' | '));

      /* Y llegó a mostrar la app, no el onboarding. */
      expect(app.document.getElementById('vapp').style.display).toBe('flex');
      expect(app.document.getElementById('vob').style.display).toBe('none');
      /* El plan quedó cargado en memoria. */
      expect(Object.keys(app.planMap || {}).length).toBeGreaterThan(10);
    });

    it('el arranque deja pintada la pantalla de Inicio', function(){
      /* Arrancar "sin excepciones" no alcanza: la app podía abrir en blanco.
         Se mira que haya HTML de verdad. */
      const { app, R } = arrancar(conPlanGuardado);
      const html = R.capture(function(){ app.goPage('home'); });
      expect(html.length).toBeGreaterThan(200);
      /* Nada de basura de JS a la vista. */
      if(/NaN|undefined|\[object Object\]|Invalid Date/.test(html)){
        throw new Error('la pantalla de Inicio salió con basura: '
          + (html.match(/.{0,40}(NaN|undefined|\[object Object\]|Invalid Date).{0,40}/) || [])[0]);
      }
    });

    it('cada pantalla se puede abrir después de arrancar', function(){
      const { app, R } = arrancar(conPlanGuardado);
      /* `goPage` envuelve cada renderer en try/catch y sólo hace
         console.error: una pantalla rota NO tira excepción, se queda vacía.
         Por eso se mira el HTML y los errores, no si tiró. */
      const errores = [];
      const antes = app.console.error;
      app.console.error = function(){ errores.push(Array.prototype.join.call(arguments, ' ')); };
      const vacias = [];
      try {
        /* `cal` va aparte: arma el mes con createElement/appendChild, no con
           innerHTML, así que el sink lo ve vacío aunque esté bien. */
        ['home','hoy','semana','plan','profile'].forEach(function(id){
          const html = R.capture(function(){ app.goPage(id); });
          if(!html || html.length < 100) vacias.push(id + ' (' + (html ? html.length : 0) + ' chars)');
        });
        const grilla = app.document.getElementById('bigdays');
        const antesCeldas = grilla._appends;
        app.goPage('cal');
        const celdas = grilla._appends - antesCeldas;
        if(celdas < 28) vacias.push('cal (' + celdas + ' celdas)');
        if(!app.document.getElementById('bigmonth').textContent) vacias.push('cal (sin mes)');
      } finally { app.console.error = antes; }
      if(errores.length) throw new Error('renderers con error: ' + errores.join(' | '));
      if(vacias.length) throw new Error('pantallas que abren vacías: ' + vacias.join(', '));
    });
  });
};
