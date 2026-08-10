/* ====================================================
   sync-config.js -- configuración de la instancia pública
   ClimbCycle

   ESTE ARCHIVO SE VERSIONA. Antes estaba en .gitignore, y esa decisión
   tenía una consecuencia que no era obvia: como GitHub Pages sirve el
   repo, la app publicada NO tenía credenciales, así que el sync no
   existía ahí. Cualquiera que la usara guardaba todo en el localStorage
   de su teléfono — y perdía el historial al limpiar la caché o cambiar
   de dispositivo. Para una beta con gente real eso no sirve.

   ¿ES SEGURO PUBLICAR ESTAS CLAVES? La `anon key` de Supabase es pública
   POR DISEÑO: viaja al navegador de cualquier usuario, en cualquier app
   de Supabase. Lo que protege los datos no es el secreto de esta clave,
   es la Row Level Security — verificada contra la base real con
   `npm run test:live` (9/9 el 2026-08-07), incluido el caso de que un
   usuario intente leer la fila de otro.

   Lo que NUNCA va acá es la `service_role` key: esa saltea la RLS.
==================================================== */

window.CC_SUPABASE_URL      = 'https://ixzpnjtxmynmjvkdwien.supabase.co';
window.CC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4enBuanR4bXlubWp2a2R3aWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMjYyNDEsImV4cCI6MjA5MzkwMjI0MX0.cuhX3X-QJavzmRBhggZJmSdlJr0xmqvr7q7kzcoXEio';

/* Crash reporting (observability.js). El DSN también es público por
   diseño: identifica al proyecto, no autoriza a leer nada. */
window.CC_SENTRY_DSN = 'https://7946f8a3b49b4f4a40e9ddedf428088f@o4511811958865920.ingest.de.sentry.io/4511811967451216';

/* ── Cifrado en reposo (vault) ─────────────────────────
   APAGADO para todos, a propósito. Pasó el QA de escritorio (2026-08-07)
   pero NO el de móvil, y ahí hay una incógnita concreta: cuánto tarda
   PBKDF2 con 150.000 iteraciones en un teléfono de gama media. Si son
   varios segundos, pedirle la contraseña a alguien cada vez que abre la
   app es inaceptable — y esto se decide midiendo, no suponiendo.

   Para probarlo en TU dispositivo, sin encenderlo para nadie más, desde
   la consola del navegador:

       localStorage.setItem('ccvault_optin', '1')    // y recargá

   Para apagarlo de nuevo:

       localStorage.removeItem('ccvault_optin')

   Ojo: si ya cifraste tus datos, quitar el opt-in NO los descifra. El
   arranque detecta el vault existente y sigue pidiendo la contraseña —
   a propósito, para que apagar un flag nunca haga arrancar la app en
   blanco. Para volver atrás de verdad: Perfil → Desactivar el cifrado. */
window.CC_VAULT_ENABLED = false;
