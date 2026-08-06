/* Tests for the onboarding baseline-freshness path: _isFresh, back-dated
   saveTestResult, and hasRecentBaseline (which skips the forced initial test). */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  const DAY = 86400000;

  describe('_isFresh()', function(){
    const now = 1000 * DAY;
    it('true within the window', function(){ expect(app._isFresh(now - 5*DAY, 21, now)).toBe(true); });
    it('false outside the window', function(){ expect(app._isFresh(now - 40*DAY, 21, now)).toBe(false); });
    it('false for a missing timestamp', function(){ expect(app._isFresh(0, 21, now)).toBe(false); });
  });

  describe('saveTestResult() with a timestamp', function(){
    it('stores the given ts and keeps history ordered by time', function(){
      app.localStorage.clear();
      app.saveTestResult('hang_max', 70, 1000);   /* older */
      app.saveTestResult('hang_max', 80, 5000);   /* newest */
      app.saveTestResult('hang_max', 75, 3000);   /* back-dated, lands in the middle */
      const h = app.loadTestHistory('hang_max');
      expect(h.length).toBe(3);
      expect(h[0].ts).toBe(1000);
      expect(h[2].ts).toBe(5000);
      expect(h[2].v).toBe(80);
      app.localStorage.clear();
    });
  });

  describe('hasRecentBaseline()', function(){
    it('true when a recent hang_max exists', function(){
      app.localStorage.clear();
      app.saveTestResult('hang_max', 75, Date.now() - 3*DAY);
      expect(app.hasRecentBaseline(21)).toBe(true);
      app.localStorage.clear();
    });
    it('false when the only result is old', function(){
      app.localStorage.clear();
      app.saveTestResult('hang_max', 75, Date.now() - 60*DAY);
      expect(app.hasRecentBaseline(21)).toBe(false);
      app.localStorage.clear();
    });
    it('false with no history at all', function(){
      app.localStorage.clear();
      expect(app.hasRecentBaseline(21)).toBe(false);
    });
  });
};
