/* Unit tests for events.js — the pub/sub bus that decouples mutations from
   re-rendering. Renderers aren't loaded in the harness, so wireBus()'s
   listeners no-op via their typeof guards — which is exactly what we assert
   (emitting the app events must never throw). */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  describe('Bus.on / Bus.emit', function(){
    it('delivers an event with its payload to a subscriber', function(){
      var got = [];
      app.Bus.on('t:evt', function(d){ got.push(d); });
      app.Bus.emit('t:evt', { x: 1 });
      expect(got.length).toBe(1);
      expect(got[0].x).toBe(1);
    });
    it('emitting with no subscribers is a safe no-op', function(){
      app.Bus.emit('t:nobody', {});
      expect(true).toBe(true);   /* reached without throwing */
    });
    it('isolates a throwing subscriber so later ones still run', function(){
      var reached = false;
      var origErr = console.error; console.error = function(){};   /* silence the expected Bus log */
      try {
        app.Bus.on('t:iso', function(){ throw new Error('boom'); });
        app.Bus.on('t:iso', function(){ reached = true; });
        app.Bus.emit('t:iso');
      } finally { console.error = origErr; }
      expect(reached).toBe(true);
    });
  });

  describe('wireBus()', function(){
    it('registers the render fan-out and is idempotent', function(){
      app.wireBus();
      app.wireBus();                      /* second call must be a no-op */
      expect(app.wireBus._done).toBe(true);
    });
    it('app events emit without throwing when renderers are absent', function(){
      app.wireBus();
      app.Bus.emit('cc:planChanged');
      app.Bus.emit('cc:sessionChanged');
      expect(true).toBe(true);
    });
  });
};
