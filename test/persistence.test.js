/* Tests for state.js persistence — round-trips through the (stubbed)
   localStorage, the "slim" plan serialization, and backup collect/import.
   These guard the data the user would lose if serialization regressed. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  const LS = app.localStorage;

  describe('saveU / loadU round-trip', function(){
    it('restores user profile fields and rehydrates startDate as a Date', function(){
      LS.clear();
      app.U.goal = 'boulder';
      app.U.plan = '6-3-1';
      app.U.weight = 72;
      app.U.name = 'Pedro';
      app.U.startDate = new Date('2026-01-15T00:00:00.000Z');
      app.saveU();

      app.U.goal = ''; app.U.weight = 0; app.U.name = '';
      const ok = app.loadU();

      expect(ok).toBeTruthy();
      expect(app.U.goal).toBe('boulder');
      expect(app.U.weight).toBe(72);
      expect(app.U.name).toBe('Pedro');
      expect(typeof app.U.startDate.getTime).toBe('function');
      expect(app.U.startDate.getTime()).toBe(new Date('2026-01-15T00:00:00.000Z').getTime());
    });

    it('loadU returns false when nothing is stored', function(){
      LS.clear();
      expect(app.loadU()).toBe(false);
    });
  });

  describe('savePlan / loadPlan (slim serialization)', function(){
    it('persists block/week/note/moved and strips exercise arrays', function(){
      LS.clear();
      app.planMap = {
        'Mon Jan 05 2026': { block:'strength', week:2, note:'ojo dedos', moved:true,
                             exercises:[{id:'a',name:'x'},{id:'b',name:'y'}] }
      };
      app.savePlan();

      /* stored JSON must not carry the heavy exercises array */
      const raw = LS.getItem('cc_plan');
      expect(raw.indexOf('exercises')).toBe(-1);

      app.planMap = {};
      const ok = app.loadPlan();
      expect(ok).toBe(true);
      const day = app.planMap['Mon Jan 05 2026'];
      expect(day.block).toBe('strength');
      expect(day.week).toBe(2);
      expect(day.note).toBe('ojo dedos');
      expect(day.moved).toBe(true);
      expect(day.exercises).toBe(undefined);
    });
  });

  describe('sessionLog / logs / recovery round-trips', function(){
    it('saveSL / loadSL', function(){
      LS.clear();
      app.sessionLog = { 'Mon Jan 05 2026': { done:true, fail:false } };
      app.saveSL();
      app.sessionLog = {};
      app.loadSL();
      expect(app.sessionLog['Mon Jan 05 2026'].done).toBe(true);
    });
    it('saveSLogs / loadSLogs', function(){
      LS.clear();
      const logs = [{ d:'2026-01-01', rpe:5 }, { d:'2026-01-03', rpe:7 }];
      app.saveSLogs(logs);
      expect(app.loadSLogs()).toEqual(logs);
    });
    it('loadSLogs defaults to [] when empty', function(){
      LS.clear();
      expect(app.loadSLogs()).toEqual([]);
    });
    it('saveRec / loadRec', function(){
      LS.clear();
      app.recData.sleep = 6; app.recData.rpe = 8;
      app.saveRec();
      app.recData.sleep = 99; app.recData.rpe = 0;
      app.loadRec();
      expect(app.recData.sleep).toBe(6);
      expect(app.recData.rpe).toBe(8);
    });
  });

  describe('_collectBundle()', function(){
    it('collects present keys and NEVER leaks cc_users (other password hashes)', function(){
      LS.clear();
      LS.setItem('cc_user', JSON.stringify({ goal:'x' }));
      LS.setItem('cc_plan', JSON.stringify({ d:{ block:'a' } }));
      LS.setItem('cc_users', 'SECRET-HASHES');
      const b = app._collectBundle();
      expect(b.version).toBe(1);
      expect(b.data.cc_user).toBe(JSON.stringify({ goal:'x' }));
      expect(b.data.cc_plan).toBe(JSON.stringify({ d:{ block:'a' } }));
      expect(b.data.cc_users).toBe(undefined);
    });
    it('omits keys that are absent', function(){
      LS.clear();
      LS.setItem('cc_user', '{}');
      const b = app._collectBundle();
      expect(b.data.cc_user).toBe('{}');
      expect(b.data.cc_plan).toBe(undefined);
    });
  });

  describe('importUserData (plaintext backup)', function(){
    it('rejects invalid JSON without throwing', function(){
      const st = app.showToast; let msg = null;
      app.showToast = function(m){ msg = m; };
      app.importUserData('{ not valid json');
      expect(msg).toBe('Error: archivo inválido');
      app.showToast = st;
    });

    it('collect → import round-trips every key back into storage', function(){
      LS.clear();
      LS.setItem('cc_user', JSON.stringify({ goal:'boulder' }));
      LS.setItem('cc_plan', JSON.stringify({ d:{ block:'power', week:1 } }));
      const json = JSON.stringify(app._collectBundle());

      LS.clear();   /* wipe, then restore from the backup */

      const cd = app.confirmDialog, st = app.showToast, loc = app.location, to = app.setTimeout;
      app.confirmDialog = function(){ return { then: function(cb){ cb(true); return this; } }; };
      app.showToast = function(){};
      app.location = { reload: function(){} };
      app.setTimeout = function(){ return 0; };   /* swallow the post-import reload timer */

      app.importUserData(json);

      expect(app.localStorage.getItem('cc_user')).toBe(JSON.stringify({ goal:'boulder' }));
      expect(app.localStorage.getItem('cc_plan')).toBe(JSON.stringify({ d:{ block:'power', week:1 } }));

      app.confirmDialog = cd; app.showToast = st; app.location = loc; app.setTimeout = to;
    });
  });
};
