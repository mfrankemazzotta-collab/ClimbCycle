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

report();
