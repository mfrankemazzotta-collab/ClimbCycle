/* ====================================================
   sync-config.example.js -- Supabase credentials template
   ClimbCycle

   HOW TO USE (see SYNC_SETUP.md for the full walkthrough):
   1. Copy this file to js/sync-config.js
   2. Paste your two Supabase values below (Project URL + anon public key)
   3. That's it — the app picks it up automatically.

   Leaving the placeholders (TU_...) untouched keeps sync OFF and the app
   fully offline. These are the *public* anon values — safe to ship to the
   browser. Row-level security in Supabase is what actually protects data.
   Do NOT put the service_role / secret key here.
==================================================== */

window.CC_SUPABASE_URL      = 'TU_PROJECT_URL';   // p.ej. https://abcd1234.supabase.co
window.CC_SUPABASE_ANON_KEY = 'TU_ANON_KEY';      // la "anon public" key (empieza con eyJ...)
