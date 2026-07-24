/* Tests for the modular weekly frequency: sessionsForPhase() varies the number
   of sessions by phase (Barrows taper) within the climber's availability. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  describe('sessionsForPhase()', function(){
    it('gives "3 and 2 depending on the week" for 3 available days', function(){
      expect(app.sessionsForPhase('endurance', 3, 4)).toBe(3);
      expect(app.sessionsForPhase('strength',  3, 4)).toBe(3);
      expect(app.sessionsForPhase('power',     3, 4)).toBe(2);
      expect(app.sessionsForPhase('deload',    3, 4)).toBe(2);
    });
    it('a 2-day climber trains 2× every week (their whole availability)', function(){
      ['endurance','strength','power','deload'].forEach(function(b){
        expect(app.sessionsForPhase(b, 2, 4)).toBe(2);
      });
    });
    it('never exceeds availability', function(){
      expect(app.sessionsForPhase('endurance', 2, 4)).toBe(2);
    });
    it('never exceeds the level max (maxSessPerWk)', function(){
      expect(app.sessionsForPhase('endurance', 6, 4)).toBe(4);
    });
    it('floors at 2 when at least 2 days are available', function(){
      expect(app.sessionsForPhase('deload', 5, 6)).toBeGreaterThanOrEqual(2);
    });
    it('respects a 1-day availability (no artificial floor above it)', function(){
      expect(app.sessionsForPhase('endurance', 1, 4)).toBe(1);
    });
  });
};
