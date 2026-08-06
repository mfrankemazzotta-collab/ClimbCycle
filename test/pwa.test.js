/* Unit tests for pwa.js — the pure reminder decision (buildReminder). */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  const BLK = { strength:{label:'Fuerza'}, endurance:{label:'Resistencia'} };
  const H = 3600*1000;
  const now = 1000000 * H;

  describe('buildReminder()', function(){
    it('reminds to train when today is a session not marked done', function(){
      const r = app.buildReminder({block:'strength'}, null, now - H, now, BLK);
      expect(r.tag).toBe('today');
      expect(r.title).toBe('Hoy toca entrenar');
      expect(r.body.indexOf('Fuerza') >= 0).toBe(true);
    });
    it('gives no train reminder once the session is done (recent check-in)', function(){
      const r = app.buildReminder({block:'strength'}, 'done', now - H, now, BLK);
      expect(r).toBe(null);
    });
    it('reminds about tests on a test day', function(){
      const r = app.buildReminder({block:'test'}, null, now - H, now, BLK);
      expect(r.tag).toBe('today');
      expect(r.title.toLowerCase().indexOf('test') >= 0).toBe(true);
    });
    it('reminds to check in when the last check-in is stale (>20h)', function(){
      const r = app.buildReminder({block:'rest'}, null, now - 21*H, now, BLK);
      expect(r.tag).toBe('checkin');
    });
    it('gives no reminder on a rest day with a recent check-in', function(){
      const r = app.buildReminder({block:'rest'}, null, now - 1*H, now, BLK);
      expect(r).toBe(null);
    });
    it('reminds to check in with no plan and no prior check-in', function(){
      const r = app.buildReminder(null, null, 0, now, BLK);
      expect(r.tag).toBe('checkin');
    });
    it('a done session with a stale check-in still nudges the check-in', function(){
      const r = app.buildReminder({block:'strength'}, 'done', now - 30*H, now, BLK);
      expect(r.tag).toBe('checkin');
    });
  });
};
