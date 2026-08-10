/* ====================================================
   secciones-perfil.test.js -- ninguna sección desaparece en silencio

   (M) EL PATRÓN QUE APARECIÓ TRES VECES EN UN DÍA.

   Cuatro secciones del Perfil hacían lo mismo cuando les faltaba un
   requisito:

       if(!algo){ wrap.innerHTML = ''; return; }

   Desde afuera eso es indistinguible de que la app esté rota: no hay nada
   en la pantalla, ningún mensaje, ninguna pista. Durante el QA del
   2026-08-07 pasó dos veces seguidas —el vault sin sesión iniciada, y el
   modo entrenador sin sesión de nube— y las dos veces se fue un rato largo
   buscando un bug que no existía. La app estaba funcionando perfecto: sólo
   no contaba lo que le faltaba.

   Es la misma familia que el bug del ACWR y el del motor de objetivo: el
   sistema toma una decisión razonable y NO la comunica, así que el usuario
   no puede distinguir "no aplica" de "está roto".

   Este test no verifica el HTML exacto: verifica que ninguna de estas
   funciones deje el contenedor vacío cuando el usuario está esperando algo
   ahí. Si mañana se agrega una sección nueva al Perfil, sumala acá.
==================================================== */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  /* Contenedor mínimo que registra lo que le escriben. */
  function hacerWrap(){
    const estado = { html: '' };
    return {
      estado: estado,
      el: {
        get innerHTML(){ return estado.html; },
        set innerHTML(v){ estado.html = String(v == null ? '' : v); }
      }
    };
  }

  describe('(M) el helper de sección bloqueada', function(){

    it('existe y dice el título, el motivo y cómo resolverlo', function(){
      expect(typeof app.renderSeccionBloqueada).toBe('function');
      const w = hacerWrap();
      app.renderSeccionBloqueada(w.el, 'Modo entrenador', 'Iniciá sesión', 'Se crea arriba en Nube.');
      expect(w.estado.html.indexOf('Modo entrenador') > -1).toBe(true);
      expect(w.estado.html.indexOf('Iniciá sesión') > -1).toBe(true);
      expect(w.estado.html.indexOf('Se crea arriba') > -1).toBe(true);
    });

    it('el "cómo resolverlo" es opcional', function(){
      const w = hacerWrap();
      app.renderSeccionBloqueada(w.el, 'Titulo', 'Motivo');
      expect(w.estado.html.indexOf('Motivo') > -1).toBe(true);
      expect(w.estado.html.length).toBeGreaterThan(20);
    });

    it('escapa el contenido (los motivos pueden traer datos del entorno)', function(){
      const w = hacerWrap();
      app.renderSeccionBloqueada(w.el, '<img src=x onerror=alert(1)>', 'ok');
      expect(w.estado.html.indexOf('<img src=x')).toBe(-1);
      expect(w.estado.html.indexOf('&lt;img') > -1).toBe(true);
    });

    it('no rompe si el contenedor no existe', function(){
      app.renderSeccionBloqueada(null, 'x', 'y');   /* no debe tirar */
      expect(true).toBe(true);
    });
  });

  describe('(M) ninguna sección del Perfil se vacía sin explicar', function(){

    /* Cada entrada: nombre, función que renderiza, y el id del contenedor
       que esa función busca. Se fuerza el peor escenario (nada configurado,
       sin sesión) y se exige que igual escriba algo legible. */
    const SECCIONES = [
      ['Modo entrenador', 'renderCoachUI',        'coach-section-wrap'],
      ['Nube · Sync',     'renderSyncUI',         'sync-section-wrap'],
      ['Recordatorios',   'renderNotifSettings',  'notif-section-wrap']
      /* El vault va aparte: tiene un caso legítimo de ocultarse (ver abajo). */
    ];

    SECCIONES.forEach(function(s){
      const nombre = s[0], fn = s[1], id = s[2];

      it(nombre + ': con todo apagado, igual dice algo', function(){
        if(typeof app[fn] !== 'function'){
          throw new Error(fn + ' no está expuesto — el test no puede verificar la sección');
        }
        const w = hacerWrap();
        const originalGet = app.document.getElementById;
        app.document.getElementById = function(x){ return x === id ? w.el : originalGet.call(app.document, x); };
        try {
          app[fn]();
        } catch(e){
          /* Que reviente es otro bug, pero no es el que este test persigue:
             se reporta claro en vez de disfrazarse de "no escribió nada". */
          app.document.getElementById = originalGet;
          throw new Error(fn + '() lanzó: ' + e.message);
        }
        app.document.getElementById = originalGet;

        const html = w.estado.html;
        if(!html || !html.trim()){
          throw new Error(nombre + ' dejó el contenedor VACÍO. Si la feature no está '
            + 'disponible, usá renderSeccionBloqueada() para decir qué falta: un panel '
            + 'en blanco es indistinguible de una pantalla rota.');
        }
        /* y lo que escribe tiene que ser texto para una persona, no un div hueco */
        const texto = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        expect(texto.length).toBeGreaterThan(15);
      });
    });

    /* EL VAULT TIENE DOS SITUACIONES DISTINTAS, y sólo una amerita explicar.

       Feature NO LANZADA (flag apagado): ocultarla es lo correcto. No es que
       al usuario le falte un requisito — es que la feature no existe para él,
       y anunciar algo que no puede activar sólo genera preguntas.

       Feature DISPONIBLE pero con requisito faltante (flag encendido, sin
       sesión iniciada): ahí sí hay que decirlo, porque el usuario la está
       buscando. Es exactamente el caso que trabó el QA del 2026-08-07.

       La distinción importa: "no aplica" y "te falta algo" se resuelven de
       formas opuestas, y confundirlas fue el bug. */
    it('Cifrado: con el flag APAGADO se oculta (feature no lanzada)', function(){
      const w = hacerWrap();
      const orig = app.document.getElementById;
      const antes = app.window.CC_VAULT_ENABLED;
      app.window.CC_VAULT_ENABLED = false;
      app.document.getElementById = x => (x === 'vault-section-wrap' ? w.el : orig.call(app.document, x));
      try { app.renderVaultUI(); } finally {
        app.document.getElementById = orig;
        app.window.CC_VAULT_ENABLED = antes;
      }
      expect(w.estado.html).toBe('');
    });

    it('Cifrado: con el flag ENCENDIDO y sin sesión, explica qué falta', function(){
      const w = hacerWrap();
      const orig = app.document.getElementById;
      const antesFlag = app.window.CC_VAULT_ENABLED;
      app.window.CC_VAULT_ENABLED = true;
      app.localStorage.removeItem('cc_current_user');   /* sin sesión */
      app.document.getElementById = x => (x === 'vault-section-wrap' ? w.el : orig.call(app.document, x));
      try { app.renderVaultUI(); } finally {
        app.document.getElementById = orig;
        app.window.CC_VAULT_ENABLED = antesFlag;
      }
      const texto = w.estado.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if(!texto){
        throw new Error('con el flag encendido y sin sesión el vault dejó el panel vacío: '
          + 'es el caso que hizo perder media hora en el QA.');
      }
      expect(/cuenta|sesión/i.test(texto)).toBe(true);
    });
  });
};
