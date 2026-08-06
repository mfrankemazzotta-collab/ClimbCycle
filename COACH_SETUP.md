# Modo entrenador — configuración de Supabase

El modo entrenador deja que un atleta comparta sus datos (solo lectura) con un coach. Requiere la sincronización de nube ya configurada (ver `SYNC_SETUP.md`) y estas tablas + políticas.

## Diseño

El flujo es **consentimiento primero** y no expone emails ni permite que un coach se enlace a un atleta sin permiso:

1. El atleta genera un **código de un solo uso** (fila en `coach_shares`, expira a los 7 días). Compartir el código *es* el acto de consentimiento.
2. El coach ingresa el código → la función `redeem_coach_share()` (SECURITY DEFINER) valida el código y crea el enlace aceptado en `coach_links`.
3. El atleta **publica un resumen** en `coach_summaries`; la RLS deja que el coach lea los resúmenes de sus atletas enlazados.

El atleta puede listar y **revocar** coaches cuando quiera. Al revocar al último, su resumen publicado **se borra**.

## Nota de privacidad (cambio importante, 2026-08-05)

Hasta esta versión, la RLS le daba al coach acceso de **lectura a la fila completa** del atleta, y el recorte a "resumen" lo hacía la app **en el navegador del coach**. O sea: el bundle entero —peso, edad, pulsaciones en reposo y **las notas libres de cada sesión**— viajaba igual y quedaba en su pestaña Network. La interfaz prometía "solo lectura, un resumen"; el sistema entregaba el historial completo.

Ahora el resumen se calcula en el dispositivo del **atleta** (que ya tiene los datos) y se publica en una tabla aparte. Los datos privados no salen nunca del dispositivo del dueño.

**Si venías de la versión anterior, el `drop policy` del SQL de abajo no es opcional**: mientras esa política exista, un coach puede bajarse el bundle entero con un `fetch`, aunque la app ya no lo haga.

El coach ve exactamente esto y nada más: nombre, nivel, objetivo, grado actual y meta, cantidad de sesiones (7 y 30 días), total registrado, fecha de la última sesión, últimos resultados de test y contadores de proyectos.

## SQL

Ejecutá esto en el editor SQL de Supabase (una vez, después de `SYNC_SETUP.md`):

```sql
-- 1) Códigos de un solo uso que el atleta genera para un coach.
create table if not exists public.coach_shares (
  token         text primary key,
  athlete_id    uuid not null references auth.users(id) on delete cascade,
  athlete_email text,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null
);
alter table public.coach_shares enable row level security;
create policy coach_shares_owner on public.coach_shares
  for all using (auth.uid() = athlete_id) with check (auth.uid() = athlete_id);

-- 2) Enlaces coach ↔ atleta aceptados.
create table if not exists public.coach_links (
  coach_id      uuid not null references auth.users(id) on delete cascade,
  athlete_id    uuid not null references auth.users(id) on delete cascade,
  coach_email   text,
  athlete_email text,
  status        text not null default 'accepted',
  created_at    timestamptz not null default now(),
  primary key (coach_id, athlete_id)
);
alter table public.coach_links enable row level security;
create policy coach_links_coach_read    on public.coach_links for select using (auth.uid() = coach_id);
create policy coach_links_athlete_read  on public.coach_links for select using (auth.uid() = athlete_id);
create policy coach_links_athlete_revoke on public.coach_links for delete using (auth.uid() = athlete_id);
-- No hay policy de INSERT directo: los enlaces se crean SOLO vía redeem_coach_share().

-- 3) RESÚMENES. El coach NO lee la fila de datos del atleta: lee un resumen
--    que el atleta publica. Ver la nota de privacidad más abajo.
create table if not exists public.coach_summaries (
  athlete_id uuid primary key references auth.users(id) on delete cascade,
  summary    jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.coach_summaries enable row level security;

-- El atleta escribe/borra el suyo.
create policy coach_summaries_owner on public.coach_summaries
  for all using (auth.uid() = athlete_id) with check (auth.uid() = athlete_id);

-- El coach lee los de sus atletas enlazados.
create policy coach_summaries_coach_read on public.coach_summaries
  for select using (
    exists (select 1 from public.coach_links l
            where l.athlete_id = coach_summaries.athlete_id
              and l.coach_id  = auth.uid()
              and l.status    = 'accepted')
  );

-- ⚠️ SI YA TENÍAS LA VERSIÓN ANTERIOR: borrá la policy que le daba al coach
--    acceso de lectura a la fila COMPLETA del atleta. Mientras exista, un
--    coach puede bajarse el bundle entero con un fetch, por más que la app
--    ya no lo haga.
drop policy if exists climbcycle_state_coach_read on public.climbcycle_state;

-- 4) Canjear un código → crear el enlace. SECURITY DEFINER para que el coach no
--    pueda forjar enlaces sin un token válido y no expirado.
create or replace function public.redeem_coach_share(p_token text)
returns void language plpgsql security definer set search_path = public as $$
declare s public.coach_shares;
begin
  select * into s from public.coach_shares where token = p_token;
  if s.token is null      then raise exception 'Código inválido'; end if;
  if s.expires_at < now() then raise exception 'Código expirado'; end if;
  if s.athlete_id = auth.uid() then raise exception 'No podés seguirte a vos mismo'; end if;
  insert into public.coach_links (coach_id, athlete_id, coach_email, athlete_email, status)
    values (auth.uid(), s.athlete_id, auth.jwt()->>'email', s.athlete_email, 'accepted')
    on conflict (coach_id, athlete_id) do update set status = 'accepted';
  delete from public.coach_shares where token = p_token;  -- un solo uso
end; $$;
revoke all on function public.redeem_coach_share(text) from public;
grant execute on function public.redeem_coach_share(text) to authenticated;
```

## Verificación (recomendado)

Con dos cuentas de prueba:

1. Como atleta, generá un código en Perfil → Modo entrenador.
2. Como coach (otra cuenta/navegador), ingresá el código → deberías ver al atleta en la lista.
3. Tocá **Ver**: aparece el resumen de solo lectura (adherencia, tests, proyectos).
4. Probá que **no** podés leer el resumen de un atleta al que no estás enlazado (debe volver vacío por RLS).
5. **Comprobá que la fila privada quedó cerrada.** Como coach, con el token de sesión, pedí a mano:
   `GET /rest/v1/climbcycle_state?user_id=eq.<id-del-atleta>&select=bundle`
   Tiene que devolver `[]`. Si devuelve el bundle, la policy vieja sigue viva:
   corré el `drop policy` de arriba. **Este paso es el que importa** — el resto
   verifica la app, éste verifica que los datos estén realmente protegidos.
6. Como atleta, **Revocá** el acceso → el coach deja de ver los datos, y si era
   el último, tu resumen publicado se borra.

## Alcance (v1)

El coach solo **observa**. No escribe el plan del atleta. La escritura bidireccional (coach ajusta el plan) es v2 y necesita una resolución de conflictos más fina que la actual.

**Privacidad:** desde 2026-08-05 se comparte únicamente el resumen, no el bundle. Eso además destraba el cifrado en reposo: al no viajar los datos crudos, ya no hay que elegir entre cifrar y poder compartir con el coach — antes eran incompatibles.

**Limitación conocida:** el resumen se actualiza cuando el atleta sincroniza, no en tiempo real. Si el atleta no abre la app, el coach ve datos viejos (con la fecha de `updated_at` a la vista).
