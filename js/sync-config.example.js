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

/* OPCIONAL — Crash reporting con Sentry (observability.js).
   Creá un proyecto en sentry.io, copiá su DSN y pegalo acá. Vacío/placeholder
   = reporting apagado (la app no carga ningún SDK externo). */
window.CC_SENTRY_DSN        = '';                 // p.ej. https://abc123@o0.ingest.sentry.io/123

/* ── Cifrado en reposo (vault) ─────────────────────────
   Poner en true para habilitar el cifrado de los datos locales.
   APAGADO por defecto: la lógica está testeada con WebCrypto real, pero
   nunca corrió en un navegador y un fallo acá significa perder el
   historial. Probalo primero con datos de prueba. Ver PROJECT_CONTEXT §16.2. */
window.CC_VAULT_ENABLED = false;
