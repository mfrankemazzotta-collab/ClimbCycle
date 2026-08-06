/* Tests for store.js — the commit() layer that centralizes persist + notify.
   Runs in the main sandbox (Bus from events.js + saveX from state.js loaded). */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  const LS = app.localStorage;

  describe('commit() — centralized persist + notify', function(){
    it('persists the plan slice and emits cc:planChanged', function(){
      LS.clear();
      let fired = 0;
      app.Bus.on('cc:planChanged', function(){ fired++; });
      app.planMap = { 'Mon Jan 05 2026': { block:'strength', week:1 } };
      const ok = app.commit('plan');
      expect(ok).toBe(true);
      expect(LS.getItem('cc_plan')).toBeTruthy();   /* savePlan ran */
      expect(fired).toBe(1);                        /* emitted exactly once */
    });

    it('the session slice emits cc:sessionChanged and persists', function(){
      LS.clear();
      let fired = 0;
      app.Bus.on('cc:sessionChanged', function(){ fired++; });
      app.sessionLog = { 'Mon Jan 05 2026': 'done' };
      app.commit('session');
      expect(fired).toBe(1);
      expect(LS.getItem('cc_sl')).toBeTruthy();
    });

    it('emit=false persists WITHOUT notifying', function(){
      let fired = 0;
      app.Bus.on('cc:planChanged', function(){ fired++; });
      app.commit('plan', false);
      expect(fired).toBe(0);
    });

    it('an unknown slice returns false and logs, without throwing', function(){
      app.clearErrorLog();
      expect(app.commit('does-not-exist')).toBe(false);
      expect(app.getErrorLog().length).toBeGreaterThan(0);
    });

    it('commitAll persists user, plan, session and recovery', function(){
      LS.clear();
      app.U.goal = 'boulder'; app.U.plan = '6-3-1'; app.U.startDate = new Date('2026-01-01T00:00:00Z');
      app.planMap = { 'x': { block:'rest', week:1 } };
      app.sessionLog = { 'x': 'done' };
      app.commitAll();
      expect(LS.getItem('cc_user')).toBeTruthy();
      expect(LS.getItem('cc_plan')).toBeTruthy();
      expect(LS.getItem('cc_sl')).toBeTruthy();
      expect(LS.getItem('cc_rec')).toBeTruthy();
    });
  });

  describe('Store write accessors', function(){
    it('setUser patches U, persists it, and emits by default', function(){
      LS.clear();
      let fired = 0;
      app.Bus.on('cc:planChanged', function(){ fired++; });
      app.U.goal = 'sport';
      app.Store.setUser({ goal:'boulder', weight:80 });
      expect(app.U.goal).toBe('boulder');
      expect(app.U.weight).toBe(80);
      expect(LS.getItem('cc_user')).toBeTruthy();
      expect(fired).toBe(1);
    });

    it('setRec patches recData and can skip the emit (emit=false)', function(){
      LS.clear();
      let fired = 0;
      app.Bus.on('cc:sessionChanged', function(){ fired++; });
      app.Store.setRec({ rpe:7, stype:'outdoor' }, false);
      expect(app.recData.rpe).toBe(7);
      expect(app.recData.stype).toBe('outdoor');
      expect(LS.getItem('cc_rec')).toBeTruthy();
      expect(fired).toBe(0);
    });
  });
};
