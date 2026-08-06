/* Tests for errors.js — the central error sink (buffer + reporter + notify).
   Runs in the main sandbox where errors.js is loaded first. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  describe('logError()', function(){
    it('records a normalized entry (message + context)', function(){
      app.clearErrorLog();
      app.logError(new Error('boom'), 'unit');
      const log = app.getErrorLog();
      expect(log.length).toBe(1);
      expect(log[0].message).toBe('boom');
      expect(log[0].context).toBe('unit');
    });

    it('accepts a plain string as the error', function(){
      app.clearErrorLog();
      app.logError('just a string', 'ctx');
      expect(app.getErrorLog()[0].message).toBe('just a string');
    });

    it('handles null/undefined without throwing', function(){
      app.clearErrorLog();
      app.logError(null, 'ctx');
      expect(app.getErrorLog()[0].message).toBe('unknown error');
    });

    it('returns the entry it created', function(){
      app.clearErrorLog();
      const e = app.logError(new Error('x'), 'ret');
      expect(e.context).toBe('ret');
      expect(typeof e.t).toBe('number');
    });
  });

  describe('ring buffer', function(){
    it('never grows past CC_ERR_MAX', function(){
      app.clearErrorLog();
      const max = app.CC_ERR_MAX;
      for(let i = 0; i < max + 25; i++) app.logError('e' + i, 'loop');
      expect(app.getErrorLog().length).toBe(max);
    });
    it('keeps the most recent entries (drops oldest)', function(){
      app.clearErrorLog();
      const max = app.CC_ERR_MAX;
      for(let i = 0; i < max + 3; i++) app.logError('e' + i, 'loop');
      const log = app.getErrorLog();
      expect(log[log.length - 1].message).toBe('e' + (max + 2));
      expect(log[0].message).toBe('e3');   /* first 3 dropped */
    });
  });

  describe('pluggable reporter', function(){
    it('dispatches entries to a registered reporter', function(){
      app.clearErrorLog();
      let seen = null;
      app.setErrorReporter(function(entry){ seen = entry; });
      app.logError(new Error('reported'), 'rep');
      expect(seen && seen.message).toBe('reported');
      app.setErrorReporter(null);
    });
    it('a throwing reporter never breaks logError', function(){
      app.clearErrorLog();
      app.setErrorReporter(function(){ throw new Error('reporter down'); });
      /* Should not throw: */
      app.logError(new Error('ok'), 'rep');
      expect(app.getErrorLog()[0].message).toBe('ok');
      app.setErrorReporter(null);
    });
  });

  describe('user notification', function(){
    it('shows a toast only when opts.notify is set', function(){
      app.clearErrorLog();
      const orig = app.showToast;
      let toastMsg = null;
      app.showToast = function(msg){ toastMsg = msg; };
      app.logError(new Error('silent'), 'ctx');
      expect(toastMsg).toBe(null);
      app.logError(new Error('loud'), 'ctx', { notify: true, userMessage: 'Falló X' });
      expect(toastMsg).toBe('Falló X');
      app.showToast = orig;
    });
  });

  describe('installGlobalErrorHandlers()', function(){
    it('is a safe no-op without window.addEventListener', function(){
      /* harness window has no addEventListener → returns false, never throws */
      expect(app.installGlobalErrorHandlers()).toBe(false);
    });
  });
};
