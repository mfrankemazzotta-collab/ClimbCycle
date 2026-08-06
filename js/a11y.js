/* ====================================================
   a11y.js -- Small, dependency-free accessibility helpers
   ClimbCycle

   The app builds a lot of interactive elements as <div onclick> (calendar
   cells) and shows modals by toggling a CSS class, neither of which is
   reachable by keyboard or announced to assistive tech. These helpers add
   the missing semantics without restyling everything into native controls.
==================================================== */

/* Make a non-button element behave like a button for keyboard + AT users.
   Used for programmatically-created calendar cells we don't want to restyle
   as <button>. Sets role/tabindex/label and triggers its onclick on
   Enter/Space. Idempotent. */
function a11yClickable(el, label){
  if(!el) return el;
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  if(label) el.setAttribute('aria-label', label);
  if(!el._a11yKeyed){
    el._a11yKeyed = true;
    el.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar'){
        e.preventDefault();
        if(typeof el.onclick === 'function') el.onclick(e);
      }
    });
  }
  return el;
}

/* Modal focus management. Adds dialog semantics, moves focus into the modal,
   cycles Tab within it, closes on Escape, and restores focus to the opener
   on close. Call a11yOpenModal in the open fn and a11yCloseModal in the close
   fn (any close path — backdrop click, button, Escape — restores focus). */
var _a11yTraps = {};
function _a11yFocusables(el){
  return Array.prototype.slice.call(el.querySelectorAll(
    'button, [href], input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])'
  ));
}
function a11yOpenModal(el, closeFn, labelId){
  if(!el) return;
  if(!el.id) el.id = 'a11y-modal-' + Math.random().toString(36).slice(2);
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  if(labelId) el.setAttribute('aria-labelledby', labelId);

  var prev = (typeof document !== 'undefined') ? document.activeElement : null;
  var handler = function(e){
    if(e.key === 'Escape'){ e.preventDefault(); if(typeof closeFn === 'function') closeFn(); return; }
    if(e.key !== 'Tab') return;
    var f = _a11yFocusables(el);
    if(!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  };
  el.addEventListener('keydown', handler);
  _a11yTraps[el.id] = { handler: handler, prev: prev };

  /* move focus in after the show transition */
  setTimeout(function(){
    var f = _a11yFocusables(el);
    if(f[0] && typeof f[0].focus === 'function'){ try { f[0].focus(); } catch(e){} }
  }, 30);
}
function a11yCloseModal(el){
  if(!el || !el.id) return;
  var t = _a11yTraps[el.id];
  if(!t) return;
  el.removeEventListener('keydown', t.handler);
  if(t.prev && typeof t.prev.focus === 'function'){ try { t.prev.focus(); } catch(e){} }
  delete _a11yTraps[el.id];
}

/* ArrowLeft/Right navigation for a role="tablist". Moves focus to the
   neighbouring tab and activates it (matches the WAI-ARIA tabs pattern). */
function a11yTablist(listEl){
  if(!listEl || listEl._a11yTabbed) return;
  listEl._a11yTabbed = true;
  listEl.addEventListener('keydown', function(e){
    if(e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var tabs = Array.prototype.slice.call(listEl.querySelectorAll('[role="tab"]'));
    var i = tabs.indexOf(document.activeElement);
    if(i < 0) return;
    e.preventDefault();
    var j = e.key === 'ArrowRight' ? (i+1) % tabs.length : (i-1+tabs.length) % tabs.length;
    tabs[j].focus();
    if(typeof tabs[j].onclick === 'function') tabs[j].onclick();
  });
}

/* Keep a range slider's spoken value in sync with its visible label. */
function a11ySlider(id, valueText){
  var el = (typeof document !== 'undefined') ? document.getElementById(id) : null;
  if(el) el.setAttribute('aria-valuetext', valueText);
}
