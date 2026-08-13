/* ====================================================
   install-prompt.test.js -- la invitación a instalar la app

   (P) EL BANNER NO SALÍA PORQUE NADIE ESCUCHABA EL EVENTO.

   Chrome dejó de mostrar el mini-banner de instalación por su cuenta:
   dispara `beforeinstallprompt` y espera que la página lo capture y ofrezca
   su propio botón. La app cumplía todos los requisitos —manifest completo,
   service worker, HTTPS, iconos 192 y 512— y aun así no aparecía nada,
   porque el evento se disparaba y se perdía.

   Reportado desde la beta real: "no me sale el cartel de instalar en los
   celulares". Ningún test podía verlo: la suite no simula el ciclo de vida
   de instalación de un navegador.

   iOS es un caso aparte y por eso hay lógica dedicada. Safari NO dispara
   `beforeinstallprompt` y no existe API para pedir la instalación: lo único
   posible es explicar el gesto manual. Y no es cosmético — en iOS las
   notificaciones web sólo funcionan con la PWA instalada, así que sin esa
   instrucción esa puerta queda cerrada.
==================================================== */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  describe('(P) a quién y cuándo se le ofrece instalar', function(){

    /* installPromptMode(hayEvento, iOS, instalada, descartado) */
    const modo = (...a) => app.installPromptMode(...a);

    it('con el evento de Chrome, se ofrece el botón', function(){
      expect(modo(true, false, false, false)).toBe('chrome');
    });

    it('en iOS sin evento, se explica el gesto manual', function(){
      /* Safari no tiene API: o se explica, o el usuario nunca la instala —
         y en iOS eso significa además quedarse sin notificaciones. */
      expect(modo(false, true, false, false)).toBe('ios');
    });

    it('si ya está instalada, no se ofrece nada', function(){
      expect(modo(true, false, true, false)).toBe(null);
      expect(modo(false, true, true, false)).toBe(null);
    });

    it('si el usuario dijo "ahora no", no se insiste', function(){
      expect(modo(true, false, false, true)).toBe(null);
      expect(modo(false, true, false, true)).toBe(null);
    });

    it('en un navegador de escritorio que no lo soporta, silencio', function(){
      /* Sin evento y sin iOS no hay forma de instalar: mostrar un cartel
         sería prometer algo que no se puede cumplir. */
      expect(modo(false, false, false, false)).toBe(null);
    });
  });

  describe('(P) detección de entorno', function(){

    it('reconoce iPhone y iPad', function(){
      const orig = app.navigator.userAgent;
      const set = ua => { try { Object.defineProperty(app.navigator, 'userAgent', { value: ua, configurable: true }); } catch(e){} };
      set('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
      expect(app.esIOS()).toBe(true);
      set('Mozilla/5.0 (Linux; Android 13; Pixel 7)');
      expect(app.esIOS()).toBe(false);
      set(orig);
    });

    it('detecta que ya corre instalada', function(){
      const orig = app.matchMedia;
      app.matchMedia = q => ({ matches: /standalone/.test(q) });
      expect(app.appYaInstalada()).toBe(true);
      app.matchMedia = () => ({ matches:false });
      expect(app.appYaInstalada()).toBe(false);
      app.matchMedia = orig;
    });

    it('no rompe si el storage está bloqueado', function(){
      const orig = app.localStorage.getItem;
      app.localStorage.getItem = function(){ throw new Error('bloqueado'); };
      try { expect(app.installPromptDismissed()).toBe(false); }
      finally { app.localStorage.getItem = orig; }
    });
  });

  describe('(P) el render', function(){

    function pintar(){
      const estado = { html:'' };
      const el = {
        get innerHTML(){ return estado.html; },
        set innerHTML(v){ estado.html = String(v == null ? '' : v); }
      };
      const orig = app.document.getElementById;
      app.document.getElementById = x => (x === 'install-prompt-wrap' ? el : orig.call(app.document, x));
      try { app.renderInstallPrompt(); } finally { app.document.getElementById = orig; }
      return estado.html;
    }

    it('sin nada que ofrecer, no deja basura en la pantalla', function(){
      app.localStorage.setItem('cc_install_off', '1');
      expect(pintar()).toBe('');
      app.localStorage.removeItem('cc_install_off');
    });

    it('el texto de iOS nombra los dos pasos exactos del gesto', function(){
      /* "Instalar la app" no significa nada en iOS: hay que decir Compartir
         y Añadir a pantalla de inicio, con esas palabras. */
      const orig = app.navigator.userAgent;
      try {
        Object.defineProperty(app.navigator, 'userAgent', { value:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', configurable:true });
        app.localStorage.removeItem('cc_install_off');
        const html = pintar();
        expect(/Compartir/i.test(html)).toBe(true);
        expect(/inicio/i.test(html)).toBe(true);
      } finally {
        try { Object.defineProperty(app.navigator, 'userAgent', { value: orig, configurable: true }); } catch(e){}
      }
    });
  });
};
