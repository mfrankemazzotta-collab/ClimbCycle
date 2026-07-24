/* Test runner. Loads the app once into a browser-less sandbox and hands the
   shared globals to each suite. Run with: npm test  (or: node test/run.js) */
const { loadApp } = require('./harness');
const { report } = require('./assert');

const app = loadApp();

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

report();
