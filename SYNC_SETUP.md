# Sincronización en la nube (Supabase) — guía de 5 minutos

La app funciona **100% offline** sin esto. El sync es opcional: sincroniza tu
plan, sesiones, tests y check-ins entre dispositivos (teléfono ↔ compu) y te da
una copia en la nube. Mientras no lo configures, no cambia nada.

Solo tenés que hacer unos clics en Supabase y pegar **2 valores**. No hace falta
tocar código de la app.

---

## 1. Crear el proyecto (gratis)

1. Entrá a **https://supabase.com** → **Start your project** → creá una cuenta.
2. **New project**. Poné un nombre (ej. `climbcycle`), una contraseña de base de
   datos (guardala) y una región cercana. Esperá ~2 min a que se cree.

## 2. Crear la tabla + seguridad

1. En el panel del proyecto, menú izquierdo → **SQL Editor** → **New query**.
2. Pegá esto **tal cual** y apretá **Run**:

```sql
-- Tabla donde vive el estado de cada usuario (un JSON por persona)
create table if not exists climbcycle_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  bundle     jsonb not null,
  updated_at timestamptz not null default now()
);

-- Seguridad a nivel de fila: cada quien solo ve/edita SU fila
alter table climbcycle_state enable row level security;

create policy "own row - select" on climbcycle_state
  for select using (auth.uid() = user_id);
create policy "own row - insert" on climbcycle_state
  for insert with check (auth.uid() = user_id);
create policy "own row - update" on climbcycle_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Esto es lo que hace que los datos de una persona **no sean accesibles** para
otra, aunque la app use la clave pública.

## 3. (Recomendado) Login sin confirmación por email

Para que crear cuenta sea instantáneo:

- Menú izquierdo → **Authentication** → **Providers** → **Email** →
  desactivá **"Confirm email"** → **Save**.

(Si lo dejás activado, funciona igual, pero al crear cuenta vas a tener que
confirmar por email antes de poder entrar.)

## 4. Copiar tus 2 valores

- Menú izquierdo → **Project Settings** (el engranaje) → **API**.
- Copiá:
  - **Project URL** → algo como `https://abcd1234.supabase.co`
  - **anon public** key (la larga que empieza con `eyJ...`).

> Usá SIEMPRE la **anon public**, nunca la `service_role` (esa es secreta).
> La anon es pública a propósito: está pensada para ir en el navegador, y lo
> que protege los datos es el Row-Level Security del paso 2.

## 5. Pegarlos en la app

Abrí **`js/sync-config.js`** y reemplazá los placeholders:

```js
window.CC_SUPABASE_URL      = 'https://abcd1234.supabase.co';   // tu Project URL
window.CC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1...';            // tu anon public key
```

Guardá y recargá la app. Listo: en **Perfil** vas a ver una sección nueva
**"Nube · Sync"** para crear cuenta / entrar.

---

## Cómo se usa

- **Perfil → Nube · Sync → Crear cuenta** (email + contraseña). Sube tus datos.
- En **otro dispositivo**: entrá con el mismo email/contraseña → **Sincronizar
  ahora** baja tu plan.
- A partir de ahí, cada cambio se **sube solo** (con un pequeño retardo). Al
  abrir la app, baja lo último de la nube.

## Cómo resuelve conflictos

Si editaste en dos lados, gana **la versión más reciente** (por timestamp): al
sincronizar, si la nube es más nueva que lo local, baja; si lo local es más
nuevo, sube. Es "last-write-wins", simple y predecible.

## Preguntas frecuentes

- **¿Y si no configuro nada?** La app sigue igual, offline, sin sección de nube.
- **¿Mis datos viajan a algún lado sin permiso?** No. Nada sale del dispositivo
  hasta que creás una cuenta de nube y entrás.
- **¿Es seguro subir la anon key al repo?** Sí, es pública por diseño. Nunca
  subas la `service_role`.
