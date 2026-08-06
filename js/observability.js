/* ====================================================
   observability.js -- Optional crash reporting (Sentry), drop-in
   ClimbCycle

   errors.js already funnels every caught/uncaught error through logError()
   and can dispatch to a pluggable reporter (setErrorReporter). This wires that
   hook to Sentry — but stays a NO-OP until a DSN is configured, so the app
   ships without any external dependency.

   To activate: set window.CC_SENTRY_DSN = 'https://...@...ingest.sentry.io/...'
   (e.g. in js/sync-config.js, which is git-ignored). Then initSentry() loads
   the Sentry browser SDK from CDN and routes errors to it. No DSN → nothing
   loads, nothing is sent.

   makeSentryReporter() is kept pure so it can be unit-tested without a browser.
==================================================== */

var CC_SENTRY_SDK = 'https://browser.sentry-cdn.com/7.120.3/bundle.min.js';

function ccSentryDsn(){
  return (typeof window !== 'undefined' && window.CC_SENTRY_DSN) ? String(window.CC_SENTRY_DSN) : '';
}

/* True only when a real DSN is present (ignores empty / placeholder values). */
function sentryConfigured(){
  var d = ccSentryDsn();
  return !!(d && d.indexOf('http') === 0 && d.indexOf('TU_') !== 0);
}

/* Build the reporter handed to errors.js (setErrorReporter). Pure: pass any
   object exposing captureException/captureMessage. A broken SDK never throws
   back into logError. */
function makeSentryReporter(sentry){
  return function(entry, err){
    if(!sentry) return;
    try {
      if(err && sentry.captureException){ sentry.captureException(err); }
      else if(sentry.captureMessage){ sentry.captureMessage((entry && entry.message) || 'error', { level:'error', extra: entry }); }
    } catch(e){}
  };
}

/* Load the Sentry SDK (once) and register it as the error reporter. No-op with
   no DSN or outside the browser. Called from app init. */
function initSentry(){
  if(!sentryConfigured() || typeof document === 'undefined' || !document.createElement) return false;
  if(initSentry._done) return true;
  initSentry._done = true;
  var s = document.createElement('script');
  s.src = CC_SENTRY_SDK;
  s.crossOrigin = 'anonymous';
  s.async = true;
  s.onload = function(){
    try {
      if(typeof Sentry === 'undefined') return;
      Sentry.init({ dsn: ccSentryDsn() });
      if(typeof setErrorReporter === 'function') setErrorReporter(makeSentryReporter(Sentry));
    } catch(e){ if(typeof logError === 'function') logError(e, 'initSentry'); }
  };
  s.onerror = function(){ if(typeof logError === 'function') logError('Sentry SDK failed to load', 'initSentry'); };
  (document.head || document.body).appendChild(s);
  return true;
}
