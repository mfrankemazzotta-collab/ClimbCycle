/* Flat ESLint config (ESLint 9).
   This project is intentionally global-by-<script>-order (no bundler), so
   no-undef is off — enforcing it would mean hand-maintaining a huge globals
   list and would fight the architecture (revisit after the planned ESM move).
   The lint exists to catch REAL bugs on every push: duplicate object keys,
   variable redeclaration, unreachable code, invalid typeof, etc. */
const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['js/**/*.js', 'sw.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script' },
    rules: {
      'no-undef': 'off',        /* cross-file globals via <script> order */
      'no-unused-vars': 'off',  /* event params / documented API shapes — noisy today */
      'no-empty': 'off'         /* best-effort try/catch is an intentional pattern here */
    }
  },
  {
    files: ['test/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs' },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-empty': 'off'
    }
  }
];
