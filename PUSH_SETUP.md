# Avisos con la app cerrada (push): guía de 15 minutos

Con esto activado, ClimbCycle te avisa **aunque la app esté cerrada**: el día que
toca entrenar, el de tests y los días de Abrahangs. Si todavía no lo configuraste,
la app sigue funcionando igual que antes: avisa recién cuando la abrís.

Son **3 pasos en el panel de Supabase**. Todo se copia y se pega: **no hay que
generar claves, no hay que copiar secretos y no hay que instalar nada** en la
compu.

> Antes de empezar: el sync en la nube ya tiene que estar andando (ver
> `SYNC_SETUP.md`). Los avisos se guardan por cuenta, así que quien quiera
> recibirlos tiene que tener la sesión iniciada en la app.

---

## Paso 1 — Crear las tablas y el reloj (3 min)

1. Entrá a **https://supabase.com/dashboard** y abrí el proyecto de ClimbCycle.
2. Menú izquierdo → **SQL Editor** → **New query**.
3. Abrí el archivo **`sql/push.sql`** de este repo, copiá **todo** y pegalo.
4. Apretá **Run**.

Al final tendría que aparecer una fila que dice `climbcycle-push` con
`*/10 * * * *`. Eso es el reloj: cada 10 minutos revisa si hay avisos para mandar.

**Si da un error que menciona `pg_cron` o `pg_net`:** menú izquierdo →
**Database** → **Extensions**, buscá `pg_cron` y activalo, después `pg_net` y
activalo. Volvé al SQL Editor y apretá **Run** de nuevo (se puede correr las
veces que quieras, no duplica nada).

## Paso 2 — Crear la función que manda los avisos (5 min)

1. Menú izquierdo → **Edge Functions**.
2. **Deploy a new function** → **Via Editor**.
3. Nombre de la función: **`send-reminders`** (exactamente así, con el guion).
4. Borrá el código de ejemplo que aparece.
5. Abrí el archivo **`supabase/functions/send-reminders/index.ts`** de este
   repo, copiá **todo** y pegalo en el editor.
6. Apretá **Deploy function** y esperá a que diga que terminó.

No cambies ninguna otra opción: la de *"Enforce JWT verification"* puede quedar
como está.

## Paso 3 — Activarlo en el teléfono (2 min)

**Android:** abrí ClimbCycle (mejor instalada: menú de Chrome → *Instalar app*).

**iPhone:** primero hay que instalarla, si no Apple no deja mandar avisos:
en Safari tocá **Compartir** → **Añadir a pantalla de inicio**, y abrila desde
ese ícono nuevo. Hace falta iOS 16.4 o más nuevo.

Después, en la app:

1. Si no tenés la sesión de la nube iniciada, iniciala en Perfil → **Nube · Sync**.
2. **Perfil → Recordatorios → Activar recordatorios** → aceptá el permiso.
3. Tendría que decir **"✓ Activados en este dispositivo. Llegan aunque la app
   esté cerrada."** Ahí mismo elegís la **hora del aviso** (por defecto, 8:00).

Listo. Cada vez que abrís la app o cambiás algo del plan, la app reprograma los
avisos de las próximas 2 semanas sola.

---

## ¿Cómo sé que funciona? (opcional, 5 min)

En Supabase → **SQL Editor** → **New query**, pegá esto y **Run**:

```sql
-- Manda un aviso de prueba YA a tu cuenta
insert into push_reminders (user_id, send_at, tag, title, body)
select user_id, now(), 'prueba', 'Prueba de ClimbCycle', 'Si ves esto, los avisos funcionan.'
from push_subscriptions
limit 1;
```

En **10 minutos como máximo** te tiene que llegar al teléfono, con la app cerrada.

Si no llega, revisá en este orden:

| Qué mirar | Dónde | Qué tendría que haber |
|---|---|---|
| ¿El teléfono quedó suscripto? | SQL: `select count(*) from push_subscriptions;` | 1 o más |
| ¿Hay avisos programados? | SQL: `select send_at, title, sent_at from push_reminders order by send_at;` | filas con fechas futuras |
| ¿El reloj corre? | SQL: `select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;` | `succeeded` |
| ¿La función responde? | Edge Functions → `send-reminders` → **Logs** | sin errores en rojo |
| ¿El permiso sigue dado? | Ajustes del teléfono → Notificaciones → ClimbCycle | permitidas |

Si la columna `sent_at` del aviso de prueba se llenó pero no te llegó nada, el
problema está del lado del teléfono (permiso, modo "No molestar", ahorro de
batería en Android). En la app: Perfil → Recordatorios → **Desactivar** y
**Activar** de nuevo renueva la suscripción.

---

## Qué datos viajan (y cuáles no)

- **Supabase guarda:** la dirección de entrega del navegador (una URL larga que
  da Google o Apple) y el texto de cada aviso ("Hoy toca entrenar · Sesión de
  Fuerza"). Con Row Level Security, cada usuario sólo ve lo suyo.
- **Google/Apple** (que entregan el aviso) reciben el mensaje **cifrado de punta
  a punta**: no pueden leer el texto. Tampoco reciben tu email.
- **La clave privada del servidor** se genera sola la primera vez y queda en la
  tabla `push_vapid`, que **ningún usuario puede leer** (sólo la función).
  Nunca aparece en el repo ni hay que copiarla a ningún lado.

## Para apagarlo del todo

- **Un teléfono:** en la app, Perfil → Recordatorios → Desactivar.
- **Para todos:** en el SQL Editor, `select cron.unschedule('climbcycle-push');`
  — la app vuelve sola al aviso al abrir.
