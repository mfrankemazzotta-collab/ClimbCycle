/* Unit tests for planner.js — plan generation & scheduling logic. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  /* Reset user state to a known baseline, overriding with `over`. */
  function setUser(over){
    app.U = Object.assign({
      goal:'sport', level:'intermediate', plan:'4-3-2-1', days:4,
      weight:70, age:25, rhr:55, session:90,
      name:'', grade:'', tests:[], startDate:null,
      gymDays:[], rockDays:[], rockWeekend:'never', trainTime:'evening'
    }, over || {});
    app.planMap = {};
    app.sessionLog = {};
  }

  /* Count the blocks in planMap for a given contiguous week index. */
  function weekBlocks(startDate, weekIdx){
    const out = [];
    for(let di=0; di<7; di++){
      const d = new Date(startDate);
      d.setDate(d.getDate() + weekIdx*7 + di);
      const p = app.planMap[d.toDateString()];
      out.push(p ? p.block : null);
    }
    return out;
  }

  const MONDAY = new Date('2026-01-05T00:00:00');  /* a Monday */

  describe('getRockMode()', function(){
    it('no rock days → never', function(){
      setUser({ rockDays: [] });
      expect(app.getRockMode()).toBe('never');
    });
    it('one rock day → sometimes', function(){
      setUser({ rockDays: [6] });
      expect(app.getRockMode()).toBe('sometimes');
    });
    it('two+ rock days → always', function(){
      setUser({ rockDays: [6, 0] });
      expect(app.getRockMode()).toBe('always');
    });
  });

  describe('smartDefaultDays()', function(){
    it('returns the canonical template for n sessions', function(){
      expect(app.smartDefaultDays(4, 'never')).toEqual([1,3,5,4]);
      expect(app.smartDefaultDays(3, 'never')).toEqual([1,3,5]);
      expect(app.smartDefaultDays(2, 'never')).toEqual([2,5]);
    });
    it('rockMode=always removes Fri/Sat/Sun and refills to n', function(){
      const days = app.smartDefaultDays(4, 'always');
      expect(days.length).toBe(4);
      expect(days).notToContain(5);
      expect(days).notToContain(6);
      expect(days).notToContain(0);
    });
    it('unknown n falls back to the 4-day template shape', function(){
      expect(app.smartDefaultDays(99, 'never').length).toBe(4);
    });
  });

  describe('scoreAndPickDays()', function(){
    it('returns all days when available <= n', function(){
      expect(app.scoreAndPickDays([1,3,5], 'MED', 4, 'never').sort()).toEqual([1,3,5]);
    });
    it('picks exactly n days when more are available', function(){
      const picked = app.scoreAndPickDays([1,2,3,4,5], 'HIGH', 3, 'never');
      expect(picked.length).toBe(3);
    });
    it('avoids weekend gym days when rockMode=always', function(){
      const picked = app.scoreAndPickDays([1,3,5,6,0], 'MED', 3, 'always');
      expect(picked).notToContain(6);
      expect(picked).notToContain(0);
    });
  });

  describe('generatePlan() — structure', function(){
    it('fills 7 days for every week in the sequence', function(){
      setUser({ startDate: new Date(MONDAY), gymDays:[1,2,4,5] });
      app.generatePlan();
      const seqLen = app.getPlanSeq().length;  /* intermediate 4-3-2-1 → 10 */
      expect(seqLen).toBe(10);
      expect(Object.keys(app.planMap).length).toBe(seqLen * 7);
    });

    it('never schedules more training days than maxSessPerWk allows', function(){
      setUser({ startDate: new Date(MONDAY), gymDays:[1,2,3,4,5,6], days:6 });
      app.generatePlan();
      const cap = app.LEVEL_PROFILES.intermediate.maxSessPerWk; /* 4 */
      for(let w=0; w<app.getPlanSeq().length; w++){
        const training = weekBlocks(MONDAY, w)
          .filter(b => b && b !== 'rest' && b !== 'test').length;
        expect(training).toBeLessThanOrEqual(cap);
      }
    });

    it('places the deload phase in the final week', function(){
      setUser({ startDate: new Date(MONDAY), gymDays:[1,3,5] });
      app.generatePlan();
      const lastWk = app.getPlanSeq().length - 1;
      const blocks = weekBlocks(MONDAY, lastWk).filter(Boolean);
      expect(blocks).toContain('deload');
      expect(blocks).notToContain('strength');
      expect(blocks).notToContain('power');
    });

    it('marks rock days as planned outdoor rest, never as training', function(){
      setUser({ startDate: new Date(MONDAY), gymDays:[1,2,4,5], rockDays:[6] });
      app.generatePlan();
      /* every Saturday across the plan must be an outdoor planned-rock day */
      for(let w=0; w<app.getPlanSeq().length; w++){
        const sat = new Date(MONDAY);
        sat.setDate(sat.getDate() + w*7 + 5);   /* Mon+5 = Sat */
        const p = app.planMap[sat.toDateString()];
        expect(p.block).toBe('rest');
        expect(p.plannedRock).toBe(true);
        expect(p.outdoor).toBe(true);
      }
    });

    it('respects the HIGH-fatigue minimum gap (no back-to-back strength)', function(){
      /* advanced boulder starts with 4 strength weeks; Mon+Tue are adjacent
         and strength needs a 48h gap, so the second day must be demoted. */
      setUser({ level:'advanced', goal:'boulder', startDate:new Date(MONDAY), gymDays:[1,2] });
      app.generatePlan();
      const wk0 = weekBlocks(MONDAY, 0);
      expect(wk0[0]).toBe('strength');   /* Monday trains */
      expect(wk0[1]).toBe('rest');       /* Tuesday demoted by gap guard */
    });
  });

  describe('generatePlan() — tests scheduling', function(){
    it('schedules an initial test on week 0 when tests are selected', function(){
      setUser({ startDate:new Date(MONDAY), gymDays:[1,3,5], tests:['t1'] });
      app.generatePlan();
      const wk0 = weekBlocks(MONDAY, 0);
      const hasInitial = Object.keys(app.planMap).some(k => {
        const p = app.planMap[k];
        return p.note === 'initial-test' && p.week === 1;
      });
      expect(hasInitial).toBeTruthy();
      expect(wk0).toContain('test');
    });

    it('schedules no test blocks when no tests are selected', function(){
      setUser({ startDate:new Date(MONDAY), gymDays:[1,3,5], tests:[] });
      app.generatePlan();
      const anyTest = Object.keys(app.planMap).some(k => app.planMap[k].block === 'test');
      expect(anyTest).toBeFalsy();
    });
  });

  describe('goal-aware phase sequencing', function(){
    it('advanced+sport uses the endurance-first sequence', function(){
      setUser({ level:'advanced', goal:'sport' });
      expect(app.getPlanSeq()[0]).toBe('endurance');
    });
    it('advanced+boulder uses the strength-first sequence', function(){
      setUser({ level:'advanced', goal:'boulder' });
      expect(app.getPlanSeq()[0]).toBe('strength');
    });
    it('beginner has no power phase at all', function(){
      setUser({ level:'beginner' });
      expect(app.getPlanSeq()).notToContain('power');
    });
  });

  describe('goal-focused phase reweighting', function(){
    function seqCounts(seq){
      var c={}; seq.forEach(function(b){c[b]=(c[b]||0)+1;}); return c;
    }
    it('leaves the sequence unchanged when no target grade is set', function(){
      setUser({ level:'intermediate', goal:'sport', targetGrade:'' });
      expect(app.getPlanSeq()).toEqual(app.getBasePlanSeq());
    });
    it('shifts weeks toward the focus block, preserving total length and deload-last', function(){
      /* sport intermediate base: end×4, str×3, pow×2, deload → focus=aerobic(endurance) */
      setUser({ level:'intermediate', goal:'sport', plan:'4-3-2-1', grade:'6c', targetGrade:'7b' });
      var base = app.getBasePlanSeq();
      var adj  = app.getPlanSeq();
      expect(adj.length).toBe(base.length);                    /* same duration */
      expect(adj[adj.length-1]).toBe('deload');                /* deload stays last */
      var bc = seqCounts(base), ac = seqCounts(adj);
      expect(ac.endurance).toBeGreaterThan(bc.endurance);      /* focus got more weeks */
      expect(ac.strength).toBeLessThan(bc.strength);           /* donor gave weeks up */
    });
    it('never removes the deload or the focus block entirely', function(){
      setUser({ level:'advanced', goal:'boulder', plan:'4-3-2-1', grade:'7a', targetGrade:'7c' });
      var adj = app.getPlanSeq();
      expect(adj).toContain('deload');
      expect(adj.filter(function(b){return b==='deload';}).length).toBe(1);
    });
    it('does not invent a power phase for beginners', function(){
      setUser({ level:'beginner', goal:'boulder', plan:'4-3-2-1', grade:'5', targetGrade:'6b' });
      expect(app.getPlanSeq()).notToContain('power');
    });
  });

  describe('rock-day plan adaptation', function(){
    var ROCK = new Date('2026-03-10T00:00:00');            /* a Tuesday */
    function key(base, offset){ var d = new Date(base); d.setDate(d.getDate()+offset); return d.toDateString(); }
    function seed(){
      setUser({ startDate:new Date('2026-03-01T00:00:00') });
      app.planMap = {};
      app.planMap[key(ROCK,-1)] = {block:'power', week:2};     /* day before: hard */
      app.planMap[key(ROCK, 0)] = {block:'strength', week:2};  /* the rock day itself */
      app.planMap[key(ROCK, 1)] = {block:'strength', week:2};  /* day after: training */
      app.planMap[key(ROCK, 2)] = {block:'power', week:2};     /* +2: training */
    }

    it('marks the day itself as outdoor rest', function(){
      seed(); app.applyRockDayToPlan(ROCK.toDateString());
      var p = app.planMap[ROCK.toDateString()];
      expect(p.outdoor).toBe(true);
      expect(p.block).toBe('rest');
    });
    it('turns the training day AFTER rock into a rest day', function(){
      seed(); app.applyRockDayToPlan(ROCK.toDateString());
      var p = app.planMap[key(ROCK,1)];
      expect(p.block).toBe('rest');
      expect(p.note).toBe('descanso-post-roca');
      expect(p.originalBlock).toBe('strength');
    });
    it('reduces the next training day after the rest', function(){
      seed(); app.applyRockDayToPlan(ROCK.toDateString());
      var p = app.planMap[key(ROCK,2)];
      expect(p.block).toBe('endurance');      /* power → endurance */
      expect(p.note).toBe('reducido-post-roca');
    });
    it('softens a hard session the day before rock', function(){
      seed(); app.applyRockDayToPlan(ROCK.toDateString());
      var p = app.planMap[key(ROCK,-1)];
      expect(p.block).toBe('endurance');      /* power → endurance */
      expect(p.note).toBe('reducido-pre-roca');
    });
    it('fully reverts every touched day on unmark (incl. the pre-rock day)', function(){
      seed(); app.applyRockDayToPlan(ROCK.toDateString());
      expect(app.removeRockDayFromPlan(ROCK.toDateString())).toBe(true);
      expect(app.planMap[key(ROCK,-1)].block).toBe('power');   /* restored */
      expect(app.planMap[key(ROCK, 1)].block).toBe('strength');/* restored */
      expect(app.planMap[key(ROCK, 2)].block).toBe('power');   /* restored */
      expect(app.planMap[ROCK.toDateString()].block).toBe('rest');
      expect(app.planMap[ROCK.toDateString()].outdoor).toBeFalsy();
    });
    it('does not force a second rest when the day after is already rest', function(){
      seed();
      app.planMap[key(ROCK,1)] = {block:'rest', week:2};       /* already resting */
      app.applyRockDayToPlan(ROCK.toDateString());
      var p = app.planMap[key(ROCK,1)];
      expect(p.block).toBe('rest');
      expect(p.note).toBe(undefined);                          /* untouched, no originalBlock */
    });
  });

  describe('week/phase helpers', function(){
    it('getCurrentWeekIndex reflects elapsed weeks from startDate', function(){
      setUser({ startDate:new Date(MONDAY) });
      const saved = app.TODAY;
      app.TODAY = new Date('2026-01-20T00:00:00'); /* 15 days later → week 2 */
      expect(app.getCurrentWeekIndex()).toBe(2);
      app.TODAY = saved;
    });
    it('getWeekInPhase counts position within a contiguous phase run', function(){
      setUser({ level:'intermediate', goal:'sport', plan:'4-3-2-1' });
      /* seq: end,end,end,end,str,str,str,pow,pow,deload */
      expect(app.getWeekInPhase(0)).toBe(1);  /* 1st endurance week */
      expect(app.getWeekInPhase(3)).toBe(4);  /* 4th endurance week */
      expect(app.getWeekInPhase(4)).toBe(1);  /* 1st strength week */
    });
    it('getPhaseLength returns the full length of the phase run', function(){
      setUser({ level:'intermediate', goal:'sport', plan:'4-3-2-1' });
      expect(app.getPhaseLength(0)).toBe(4);  /* endurance block is 4 weeks */
      expect(app.getPhaseLength(4)).toBe(3);  /* strength block is 3 weeks */
      expect(app.getPhaseLength(9)).toBe(1);  /* deload is 1 week */
    });
  });
};
