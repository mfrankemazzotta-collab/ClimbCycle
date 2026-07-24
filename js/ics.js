/* ====================================================
   ics.js -- Export the training plan as an iCalendar (.ics) file
   ClimbCycle

   Turns planMap into a standard calendar the user can import into Google /
   Apple / Outlook: one all-day event per training, test or rock day (rest
   days are skipped). buildICS() is pure and unit-tested; downloadICS()
   triggers the browser download.
==================================================== */

/* RFC 5545 text escaping: backslash, semicolon, comma, newline. */
function _icsEsc(s){
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
function _icsDate(d){   /* local YYYYMMDD for VALUE=DATE all-day events */
  return d.getFullYear() + ('0'+(d.getMonth()+1)).slice(-2) + ('0'+d.getDate()).slice(-2);
}
function _icsStamp(d){  /* UTC YYYYMMDDTHHMMSSZ for DTSTAMP */
  function p(n){ return ('0'+n).slice(-2); }
  return d.getUTCFullYear() + p(d.getUTCMonth()+1) + p(d.getUTCDate()) + 'T'
       + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z';
}

/* Build the full .ics text from a planMap. Pure: inject blocks/now for tests. */
function buildICS(planMap, opts){
  opts = opts || {};
  var blocks = opts.blocks || (typeof BLOCKS !== 'undefined' ? BLOCKS : {});
  var stamp  = _icsStamp(opts.now || new Date());
  var lines  = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ClimbCycle//Plan//ES',
                'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];

  var keys = Object.keys(planMap || {}).filter(function(k){
    var p = planMap[k];
    /* keep sessions, tests and rock outings; skip plain rest days.
       (rock days are stored as block:'rest' with outdoor:true) */
    return p && (p.outdoor || (p.block && p.block !== 'rest'));
  }).sort(function(a, b){ return new Date(a) - new Date(b); });

  keys.forEach(function(k){
    var p = planMap[k];
    var d = new Date(k);
    if(isNaN(d.getTime())) return;
    var end = new Date(d); end.setDate(end.getDate() + 1);
    var bt  = blocks[p.block] || { label: p.block };
    var summary = p.outdoor       ? 'Escalada en roca'
                : p.block==='test' ? 'Tests de evaluación'
                : (bt.label || p.block) + (p.week ? (' · Semana ' + p.week) : '');
    var desc = p.outdoor       ? 'Día de escalada exterior (ClimbCycle).'
             : p.block==='test' ? 'Sesión de tests — hacelos fresco al inicio (ClimbCycle).'
             : 'Sesión de ' + (bt.label || p.block) + ' (ClimbCycle).';
    lines.push('BEGIN:VEVENT');
    lines.push('UID:cc-' + _icsDate(d) + '-' + p.block + '@climbcycle');
    lines.push('DTSTAMP:' + stamp);
    lines.push('DTSTART;VALUE=DATE:' + _icsDate(d));
    lines.push('DTEND;VALUE=DATE:' + _icsDate(end));
    lines.push('SUMMARY:' + _icsEsc(summary));
    lines.push('DESCRIPTION:' + _icsEsc(desc));
    lines.push('TRANSP:TRANSPARENT');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');   /* RFC 5545 mandates CRLF */
}

/* Count of exportable (non-rest) days — used to label the UI button. */
function icsEventCount(planMap){
  return Object.keys(planMap || {}).filter(function(k){
    var p = planMap[k]; return p && (p.outdoor || (p.block && p.block !== 'rest'));
  }).length;
}

function downloadICS(){
  try {
    var ics  = buildICS(planMap);
    var blob = new Blob([ics], { type: 'text/calendar' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    var uname = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : 'plan';
    a.href = url; a.download = 'climbcycle_' + uname + '.ics';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 0);
    if(typeof showToast === 'function') showToast('Calendario exportado (.ics)', 'var(--accent-deload)');
  } catch(e){
    if(typeof showToast === 'function') showToast('Error al exportar: ' + e.message, 'var(--accent-warning)');
  }
}
