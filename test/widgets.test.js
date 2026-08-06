/* Unit tests for widgets.js — the configurable-dashboard logic
   (config defaults, reconciliation, toggle, reorder). DOM render is not
   exercised here. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  describe('defaultWidgetConfig()', function(){
    it('lists every registered widget, enabled unless it declares def:false', function(){
      var def = app.defaultWidgetConfig();
      expect(def.length).toBe(app.WIDGET_DEFS.length);
      var okDefaults = def.every(function(w, i){ return w.on === (app.WIDGET_DEFS[i].def !== false); });
      expect(okDefaults).toBe(true);
    });
    it('preserves the registry order', function(){
      var def = app.defaultWidgetConfig();
      expect(def[0].id).toBe(app.WIDGET_DEFS[0].id);
    });
  });

  describe('loadWidgetConfig() reconciliation', function(){
    it('returns defaults when nothing is stored', function(){
      app.localStorage.removeItem('cc_widgets');
      expect(app.loadWidgetConfig().length).toBe(app.WIDGET_DEFS.length);
    });
    it('drops unknown ids and appends newly-registered widgets', function(){
      /* config YA migrada (incluye 'bridge') + un id inexistente */
      app.localStorage.setItem('cc_widgets', JSON.stringify([
        { id:'recovery', on:false }, { id:'__gone__', on:true }, { id:'bridge', on:true }
      ]));
      var cfg = app.loadWidgetConfig();
      var ids = cfg.map(function(w){ return w.id; });
      expect(ids).notToContain('__gone__');                 /* unknown dropped */
      expect(ids).toContain('recovery');
      expect(cfg.length).toBe(app.WIDGET_DEFS.length);       /* missing ones re-added */
      expect(cfg[0].id).toBe('recovery');                    /* stored order kept first */
      expect(cfg.filter(function(w){return w.id==='recovery';})[0].on).toBe(false); /* stored state kept */
      app.localStorage.removeItem('cc_widgets');
    });

    /* Rediseño: una config vieja tenía encendidos los 3 widgets que duplicaban
       la sesión. Si sólo mergeáramos, el usuario quedaría con esos MÁS los
       nuevos = más abrume. La migración adopta el layout nuevo una sola vez. */
    it('migra una config pre-rediseño al layout nuevo', function(){
      app.localStorage.setItem('cc_widgets', JSON.stringify([
        { id:'next', on:true }, { id:'today', on:true }, { id:'todaylist', on:true }
      ]));
      var cfg = app.loadWidgetConfig();
      var estaOn = function(id){ return cfg.some(function(w){ return w.id===id && w.on; }); };
      expect(estaOn('bridge')).toBe(true);      /* el puente a Hoy aparece */
      expect(estaOn('macro')).toBe(true);       /* el macrociclo es el hero */
      expect(estaOn('next')).toBe(false);       /* los duplicados se apagan */
      expect(estaOn('today')).toBe(false);
      expect(estaOn('todaylist')).toBe(false);
      app.localStorage.removeItem('cc_widgets');
    });

    it('NO vuelve a migrar una config ya migrada (respeta lo que apagaste)', function(){
      app.localStorage.setItem('cc_widgets', JSON.stringify([
        { id:'bridge', on:true }, { id:'macro', on:false }
      ]));
      var cfg = app.loadWidgetConfig();
      var macro = cfg.filter(function(w){ return w.id==='macro'; })[0];
      expect(macro.on).toBe(false);             /* tu elección se respeta */
      app.localStorage.removeItem('cc_widgets');
    });
  });

  describe('agrupación del hub (rediseño)', function(){
    it('cada widget encendido por defecto tiene un grupo válido', function(){
      var validos = ['', 'estado', 'accesos', 'seguimiento', 'plan'];
      var malos = app.WIDGET_DEFS.filter(function(d){
        return d.def !== false && validos.indexOf(d.group || '') === -1;
      });
      expect(malos.length).toBe(0);
    });
    /* Regresión: el widget del calendario arrastraba el panel del día, que
       vuelca TODOS los ejercicios en Inicio. Eso es ejecución → vive en Hoy. */
    it('el hub NO incluye el panel del día (eso es de la tab Hoy)', function(){
      var planWidget = app.WIDGET_DEFS_BYID['plan'].html();
      expect(planWidget.indexOf('home-daypanel')).toBe(-1);
      expect(planWidget.indexOf('hcal-grid')).toBeGreaterThan(-1);   /* el calendario sí queda */
    });

    it('los widgets que duplicaban la sesión quedan apagados por defecto', function(){
      ['next','today','todaylist'].forEach(function(id){
        var d = app.WIDGET_DEFS_BYID[id];
        expect(d.def).toBe(false);
      });
    });
  });

  describe('widgetToggleIn()', function(){
    it('flips only the targeted widget', function(){
      var cfg = app.defaultWidgetConfig();
      var out = app.widgetToggleIn(cfg, 'recovery');
      expect(out.filter(function(w){return w.id==='recovery';})[0].on).toBe(false);
      expect(out.filter(function(w){return w.id==='goal';})[0].on).toBe(true);
      expect(cfg.filter(function(w){return w.id==='recovery';})[0].on).toBe(true); /* original untouched */
    });
  });

  describe('computeFingerLoads()', function(){
    it('scales hangboard loads by intensity off the Max Hang total', function(){
      var out = app.computeFingerLoads(100);
      expect(out.filter(function(p){ return p.id === 'hb_max'; })[0].load).toBe(85);
      expect(out.filter(function(p){ return p.id === 'hb_aerp'; })[0].load).toBe(60);
    });
    it('leaves no-hang loads null (needs a per-hand Tindeq max)', function(){
      var nh = app.computeFingerLoads(100).filter(function(p){ return p.mode === 'nohang'; })[0];
      expect(nh.load).toBe(null);
    });
    it('returns null loads when no Max Hang is provided', function(){
      expect(app.computeFingerLoads(0).filter(function(p){ return p.id === 'hb_max'; })[0].load).toBe(null);
    });
  });

  describe('widgetMoveIn()', function(){
    it('swaps a widget with its neighbour', function(){
      var cfg = app.defaultWidgetConfig();
      var a = cfg[0].id, b = cfg[1].id;
      var out = app.widgetMoveIn(cfg, b, -1);
      expect(out[0].id).toBe(b);
      expect(out[1].id).toBe(a);
    });
    it('is a no-op at the top edge', function(){
      var cfg = app.defaultWidgetConfig();
      var out = app.widgetMoveIn(cfg, cfg[0].id, -1);
      expect(out[0].id).toBe(cfg[0].id);
    });
    it('is a no-op at the bottom edge', function(){
      var cfg = app.defaultWidgetConfig();
      var last = cfg[cfg.length-1].id;
      var out = app.widgetMoveIn(cfg, last, 1);
      expect(out[out.length-1].id).toBe(last);
    });
  });
};
