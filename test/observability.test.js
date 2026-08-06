/* Tests for observability.js — the Sentry drop-in. The DOM loader (initSentry)
   isn't unit-testable, but the reporter it builds and the config gate are. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  describe('Sentry scaffold', function(){
    it('is not configured without a DSN (no external SDK loads)', function(){
      expect(app.sentryConfigured()).toBe(false);   /* window.CC_SENTRY_DSN unset in harness */
    });

    it('makeSentryReporter forwards a real error to captureException', function(){
      let captured = null;
      const stub = { captureException: function(e){ captured = e; } };
      const err = new Error('boom');
      app.makeSentryReporter(stub)({ message:'boom' }, err);
      expect(captured).toBe(err);
    });

    it('falls back to captureMessage when there is no Error object', function(){
      let msg = null;
      const stub = { captureMessage: function(m){ msg = m; } };
      app.makeSentryReporter(stub)({ message:'just a string' }, null);
      expect(msg).toBe('just a string');
    });

    it('a broken SDK never throws back into logError', function(){
      const stub = { captureException: function(){ throw new Error('sdk down'); } };
      /* should not throw: */
      app.makeSentryReporter(stub)({ message:'x' }, new Error('x'));
      expect(true).toBe(true);
    });

    it('wires cleanly into errors.js (logError → reporter)', function(){
      let seen = null;
      const stub = { captureException: function(e){ seen = e; } };
      app.setErrorReporter(app.makeSentryReporter(stub));
      const e = new Error('routed');
      app.logError(e, 'ctx');
      expect(seen).toBe(e);
      app.setErrorReporter(null);
    });
  });
};
