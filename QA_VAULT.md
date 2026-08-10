# QA del cifrado en reposo — guía paso a paso

El vault está implementado y testeado con WebCrypto real, pero **nunca corrió en un navegador**. Esta guía es para verificarlo antes de confiarle datos de verdad.

> ⚠️ **Hacelo con datos de prueba.** Si algo sale mal acá, es un rato perdido. Si sale mal con tu historial de 10 semanas, es tu historial.

---

## Dónde hacer el QA (importante)

**No sirve la versión publicada en GitHub Pages.** `js/sync-config.js` está git-ignored porque lleva credenciales, así que allá el feature flag no existe y la sección de cifrado **no puede aparecer nunca**. Tampoco sirve abrir `index.html` con doble clic: sobre `file://` el navegador no registra el Service Worker.

El QA va en **localhost**:

```bash
npm run dev          # → http://localhost:8080
```

Sin dependencias: es Node puro (`serve.js`). Al arrancar te dice si el vault y el sync están encendidos, y avisa si tenés los dos a la vez.

> ✅ **Tus datos de Pages no corren riesgo.** `localhost:8080` es otro origen, y `localStorage` está separado por origen: lo que hagas en el QA no toca el historial de la app publicada. Es el "usá datos de prueba" garantizado por el navegador, no por tu memoria.

---

## Antes de empezar

**1. Exportá un backup.** Perfil → Exportar datos. Guardá el archivo fuera de la carpeta del proyecto. Es tu red de seguridad real.

**2. Activá el flag.** En `js/sync-config.js` (el archivo real, no el `.example`):

```js
window.CC_VAULT_ENABLED = true;
```

Si el archivo no tiene esa línea, agregala al final. **No subas este archivo a git** — está en el `.gitignore` porque lleva tus credenciales.

> 🐛 **Esto no funcionaba hasta el 2026-08-07.** `vault.js` leía el flag con `var` al cargarse (script nº 6) y `sync-config.js` lo escribe 34 scripts después (nº 40): la lectura pasaba antes que la escritura y el flag valía `false` siempre. Encenderlo no hacía nada y la sección del paso 2 ni se renderizaba. Ahora se lee con `ccVaultEnabled()` en el momento de uso. Si estás en una copia vieja, actualizá antes de seguir.

**2 bis. Hacé una cosa por vez.** Si además vas a configurar Supabase, dejalo para después del QA: con los placeholders `TU_PROJECT_URL` intactos la app queda offline y el sync es no-op. Activando las dos cosas juntas, si algo falla no vas a saber cuál fue.

> ℹ️ **El vault NO cifra la nube.** Protege el disco local. Con el vault activo, el blob de `localStorage` es ilegible, pero el bundle que el sync sube a Supabase lleva tu nombre, tu peso y las notas de sesión **en claro** — ahí lo que protege los datos es la RLS.

**3. Recargá con caché limpia:** `Ctrl+Shift+R` (Windows/Linux) o `Cmd+Shift+R` (Mac). La app usa versionado por `?v=` y sin esto podés quedarte con los scripts viejos.

---

## El recorrido

### Paso 1 — Ver los datos sin cifrar (punto de partida)

Abrí DevTools (`F12`) → pestaña **Application** → **Local Storage**.

Buscá una clave `cc_<tu-usuario>_user`. **Tenés que poder leer tu peso y tu edad en texto plano.** Ese es exactamente el problema que el vault resuelve.

### Paso 2 — Activar el cifrado

> ⚠️ **Prerrequisito: tenés que tener sesión iniciada.** El cifrado deriva la clave de tu contraseña (PBKDF2), así que en modo local —sin cuenta— no hay de dónde derivarla y la sección no ofrece el botón. Hasta el 2026-08-07 directamente **no se dibujaba nada**, sin decir por qué; ahora explica el requisito. Si no tenés cuenta, creala antes de seguir.
>
> **¿No ves la sección?** Pegá esto en la consola y te dice exactamente qué falta:
>
> ```js
> ccVaultDiag()
> ```
>
> El campo `porQueNoAparece` distingue las tres causas: flag que no toma efecto, sesión sin iniciar, o build viejo.

Perfil → bajá hasta **Privacidad · Cifrado** → **Cifrar mis datos**.

Te pide tu contraseña de ClimbCycle. Después aparece la **clave de recuperación**.

> **Copiala ahora.** No se puede volver a mostrar: está cifrada, no guardada. Para el QA alcanza con pegarla en un archivo de texto temporal.

Marcá "Ya la guardé" → **Listo**.

**Qué verificar en Local Storage** (refrescá el panel):
- Las claves `cc_<usuario>_*` **desaparecieron**.
- Aparecieron `ccvault_meta_<usuario>` y `ccvault_blob_<usuario>`.
- Abrí el blob: tiene que ser un `{"alg":"AES-GCM","iv":"...","ct":"..."}` ilegible.
- `ccvault_rescue_<usuario>` **ya no está** (se borró al confirmar).
- La app sigue funcionando normal: navegá por Hoy, Semana, Plan.

### Paso 3 — La prueba de fuego: recargar

Recargá la página (`F5`).

**Esperado:** una pantalla negra que dice *"Tus datos están cifrados"* con un campo de contraseña.

🚨 **Si en cambio aparece el onboarding ("Paso 1 de 7"), pará acá.** Significa que el arranque no está consultando el vault y tus datos parecen borrados. No toques nada más y contame — se recuperan, pero hay que hacerlo bien.

Ingresá tu contraseña → **Desbloquear**. La app tiene que arrancar con todos tus datos.

### Paso 4 — Contraseña incorrecta

Recargá otra vez. Escribí cualquier cosa mal.

**Esperado:** *"Contraseña incorrecta."* y el campo se limpia. La app **no** arranca.

### Paso 5 — La clave de recuperación

Recargá. Tocá **"Olvidé mi contraseña"**. El campo cambia a texto y muestra el formato de ejemplo.

Pegá tu clave de recuperación → **Desbloquear**. Tiene que entrar igual que con la contraseña.

Probá también escribirla **en minúsculas y sin guiones**: tiene que funcionar igual.

### Paso 6 — Desactivar

Perfil → **Desactivar el cifrado** → confirmar.

**Verificar en Local Storage:**
- Volvieron las claves `cc_<usuario>_*` legibles.
- `ccvault_meta_*` y `ccvault_blob_*` desaparecieron.
- Recargá: la app arranca directo, sin pedir contraseña.

---

## Si algo sale mal

**La app arranca vacía / muestra onboarding con el vault activo.**
En la consola de DevTools:

```js
ccVaultRescue(getCurrentUser())
```

Restaura la copia en claro que se guardó antes de cifrar y desactiva el vault. Después recargá.

**No tenés la copia de rescate** (ya confirmaste) **y no podés desbloquear.**
Importá el backup del paso previo (Perfil → Importar). Por eso el paso 1 no es opcional.

**Ver el estado desde la consola:**

```js
ccVaultEnabled()                    // ¿el flag está tomando efecto?  ← empezá por acá
getCurrentUser()                    // tu usuario
ccVaultExists(getCurrentUser())     // ¿hay vault?
ccVaultUnlocked()                   // ¿está abierto ahora?
ccVaultBootState(getCurrentUser())  // 'off' | 'unlock' | 'rescue'
ccVaultRescuePending(getCurrentUser())
```

---

## Qué mirar además de que "funcione"

- **Velocidad del desbloqueo.** PBKDF2 con 150.000 iteraciones debería tardar entre medio segundo y dos. Si tarda mucho más en tu teléfono, se puede bajar el work factor.
- **Tamaño.** El blob se reescribe entero en cada cambio (con 400 ms de debounce). Con un historial grande, mirá si notás lentitud al marcar sesiones.
- **En el teléfono.** El QA en desktop no reemplaza probarlo en el móvil, que es el uso real de la app.

---

## Volver atrás

Poné el flag en `false` y recargá.

Si te olvidás de desactivar el vault primero (paso 6), no pasa nada grave: la app **igual te va a pedir la contraseña**. `ccVaultBootState()` mira si existen datos cifrados *antes* de mirar el flag, justo para que apagar la feature no haga arrancar la app en blanco. El flag decide si el vault se puede **activar**, no si se respeta uno que ya existe.
