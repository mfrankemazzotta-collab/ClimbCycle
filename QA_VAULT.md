# QA del cifrado en reposo — guía paso a paso

El vault está implementado y testeado con WebCrypto real, pero **nunca corrió en un navegador**. Esta guía es para verificarlo antes de confiarle datos de verdad.

> ⚠️ **Hacelo con datos de prueba.** Si algo sale mal acá, es un rato perdido. Si sale mal con tu historial de 10 semanas, es tu historial.

---

## Antes de empezar

**1. Exportá un backup.** Perfil → Exportar datos. Guardá el archivo fuera de la carpeta del proyecto. Es tu red de seguridad real.

**2. Activá el flag.** En `js/sync-config.js` (el archivo real, no el `.example`):

```js
window.CC_VAULT_ENABLED = true;
```

Si el archivo no tiene esa línea, agregala al final.

**3. Recargá con caché limpia:** `Ctrl+Shift+R` (Windows/Linux) o `Cmd+Shift+R` (Mac). La app usa versionado por `?v=` y sin esto podés quedarte con los scripts viejos.

---

## El recorrido

### Paso 1 — Ver los datos sin cifrar (punto de partida)

Abrí DevTools (`F12`) → pestaña **Application** → **Local Storage**.

Buscá una clave `cc_<tu-usuario>_user`. **Tenés que poder leer tu peso y tu edad en texto plano.** Ese es exactamente el problema que el vault resuelve.

### Paso 2 — Activar el cifrado

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
