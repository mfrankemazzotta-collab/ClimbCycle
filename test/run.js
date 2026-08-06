/* Test runner. Loads the app once into a browser-less sandbox and hands the
   shared globals to each suite. Run with: npm test  (or: node test/run.js) */
const { loadApp, loadSecureApp, loadRenderApp } = require('./harness');
const { report, flush } = require('./assert');

const app = loadApp();
const secure = loadSecureApp();   /* isolated sandbox: crypto.js + auth.js */
const render = loadRenderApp();   /* sandbox con la capa de render, para medir anchos */

require('./planner.test')(app);
require('./recovery.test')(app);
require('./security.test')(app);
require('./sync.test')(app);
require('./goal.test')(app);
require('./widgets.test')(app);
require('./intensity.test')(app);
require('./events.test')(app);
require('./test-interpret.test')(app);
require('./charts.test')(app);
require('./ics.test')(app);
require('./projects.test')(app);
require('./coach.test')(app);
require('./pwa.test')(app);
require('./timer.test')(app);
require('./onboarding.test')(app);
require('./schedule.test')(app);
require('./errors.test')(app);
require('./observability.test')(app);
require('./persistence.test')(app);
require('./render-card.test')(app);
require('./tstab.test')(app);
require('./store.test')(app);
require('./exdone.test')(app);
require('./flexdays.test')(app);
require('./rockwindow.test')(app);
require('./rocklog.test')(app);
require('./loadmodel.test')(app);
require('./build.test')();
require('./rotation.test')(app);
require('./backup-crypto.test')(app);   /* async — awaited by flush() */
require('./sync-e2e.test')();          /* async — HTTP real contra un Supabase de prueba */
require('./coach-e2e.test')();        /* async — privacidad del modo entrenador */

require('./storage.test')(secure);
/* Sandbox PROPIO: el vault monta un espejo sobre localStorage y cambia el
   usuario activo. Compartirlo con storage.test contaminaría a ambos. */
require('./vault.test')(loadSecureApp());   /* async — WebCrypto real */

require('./layout.test')(render);        /* sandbox propio: ejecuta los renderers */
require('./sessionload.test')(render.app);  /* markSess/saveSessionLog tocan el DOM */
require('./statesync.test')(render.app);   /* fronteras entre estados */
require('./syncmerge.test')(render.app);   /* dirección del sync + carga de proyectos */

/* Async suites (Web Crypto): register Promise-returning tests. */
require('./crypto.test')(secure);
require('./auth.test')(secure);

(async () => {
  await flush();   /* wait for the async tests to settle before reporting */
  report();
})();
