/* Unit tests for widgets.js — the configurable-dashboard logic
   (config defaults, reconciliation, toggle, reorder). DOM render is not
   exercised here. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  describe('defaultWidgetConfig()', function(){
    it('lists every registered widget, all enabled', function(){
      var def = app.defaultWidgetConfig();
      expect(def.length).toBe(app.WIDGET_DEFS.length);
      expect(def.every(function(w){ return w.on === true; })).toBe(true);
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
      /* store only one known widget + one bogus id */
      app.localStorage.setItem('cc_widgets', JSON.stringify([
        { id:'recovery', on:false }, { id:'__gone__', on:true }
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
