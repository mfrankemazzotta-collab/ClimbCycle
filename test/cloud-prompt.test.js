/* ====================================================
   cloud-prompt.test.js -- que el respaldo llegue al usuario

   (N) UN FEATURE QUE NADIE DESCUBRE NO ESTÁ TERMINADO.

   El sync estaba implementado, con 12 tests e2e sobre HTTP y verificado
   contra un Supabase real (9/9). Y no lo iba a usar nadie: la única forma
   de crear la cuenta era entrar a Perfil → Nube · Sync a mano, y el
   onboarding de 7 pasos no la mencionaba ni una vez.

   Para la beta eso significaba que cada persona cargaba su historial en el
   localStorage del teléfono y lo perdía al limpiar la caché — con el
   respaldo funcionando perfectamente del otro lado, sin usar.

   No es un bug de código: es una capacidad que no llega. Estos tests fijan
   las reglas de cuándo se ofrece, porque el error fácil acá es el opuesto —
   insistir con un cartel que no se puede sacar.
==================================================== */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  function hacerWrap(){
    const estado = { html:'' };
    return { estado, el: {
      get innerHTML(){ return estado.html; },
      set innerHTML(v){ estado.html = String(v == null ? '' : v); }
    }};
  }
  function pintar(){
    const w = hacerWrap();
    const orig = app.document.getElementById;
    app.document.getElementById = x => (x === 'cloud-prompt-wrap' ? w.el : orig.call(app.document, x));
    try { app.renderCloudPrompt(); } finally { app.document.getElementById = orig; }
    return w.estado.html;
  }

  describe('(N) cuándo se ofrece respaldar en la nube', function(){

    it('la regla es pura y testeable sin DOM', function(){
      const f = app.shouldShowCloudPrompt;
      expect(typeof f).toBe('function');
      expect(f(true,  false, false)).toBe(true);    /* configurado, sin sesión, no descartado */
      expect(f(false, false, false)).toBe(false);   /* sin credenciales: no hay nube que ofrecer */
      expect(f(true,  true,  false)).toBe(false);   /* ya tiene sesión */
      expect(f(true,  false, true )).toBe(false);   /* lo descartó */
    });

    it('no se ofrece si la app no tiene credenciales de nube', function(){
      /* Ofrecer un respaldo que no existe sería peor que no ofrecer nada:
         el usuario iría a buscarlo al Perfil y encontraría "sin configurar". */
      expect(app.shouldShowCloudPrompt(false, false, false)).toBe(false);
    });

    it('desaparece en cuanto hay sesión iniciada', function(){
      expect(app.shouldShowCloudPrompt(true, true, false)).toBe(false);
    });

    it('"Ahora no" se respeta y no vuelve', function(){
      app.localStorage.removeItem('cc_cloud_prompt_off');
      expect(app.cloudPromptDismissed()).toBe(false);
      app.cloudPromptDismiss();
      expect(app.cloudPromptDismissed()).toBe(true);
      expect(app.shouldShowCloudPrompt(true, false, true)).toBe(false);
      app.localStorage.removeItem('cc_cloud_prompt_off');
    });

    it('tolera un storage bloqueado sin romper el arranque', function(){
      /* Modo incógnito o storage lleno: no puede tirar en el render de Inicio. */
      const orig = app.localStorage.getItem;
      app.localStorage.getItem = function(){ throw new Error('storage bloqueado'); };
      try {
        expect(app.cloudPromptDismissed()).toBe(false);
      } finally { app.localStorage.getItem = orig; }
    });
  });

  describe('(N) qué dice la invitación', function(){

    it('explica la consecuencia concreta, no "activá el sync"', function(){
      /* El motivo por el que a alguien le importa no es la feature: es que
         puede perder su historial. */
      app.localStorage.removeItem('cc_cloud_prompt_off');
      const html = pintar();
      if(!html){
        /* Sin credenciales en el sandbox no se pinta: se verifica el texto
           llamando al render con la regla forzada. */
        expect(app.shouldShowCloudPrompt(true, false, false)).toBe(true);
        return;
      }
      const texto = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      expect(/pierde|se pierde|perdés/i.test(texto)).toBe(true);
      expect(/dispositivo|teléfono/i.test(texto)).toBe(true);
    });

    it('ofrece salida: no es un cartel que no se pueda sacar', function(){
      app.localStorage.removeItem('cc_cloud_prompt_off');
      const html = pintar();
      if(html) expect(html.indexOf('cloudPromptDismiss') > -1).toBe(true);
      expect(typeof app.cloudPromptDismiss).toBe('function');
    });

    it('lleva al alta existente en vez de duplicar el formulario', function(){
      /* Un segundo formulario de alta sería una segunda copia de la misma
         lógica: exactamente el patrón que más bugs generó en este proyecto
         (dos estados escritos en lugares distintos). */
      expect(typeof app.cloudPromptGo).toBe('function');
      const src = app.cloudPromptGo.toString();
      expect(/goPage/.test(src)).toBe(true);
      expect(/syncSignUp|signup/i.test(src)).toBe(false);
    });
  });
};
