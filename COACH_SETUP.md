# Modo entrenador — configuración de Supabase

El modo entrenador deja que un atleta comparta sus datos (solo lectura) con un coach. Requiere la sincronización de nube ya configurada (ver `SYNC_SETUP.md`) y estas tablas + políticas.

## Diseño

El flujo es **consentimiento primero** y no expone emails ni permite que un coach se enlace a un atleta sin permiso:

1. El atleta genera un **código de un solo uso** (fila en `coach_shares`, expira a los 7 días). Compartir el código *es* el acto de consentimiento.
2. El coach ingresa el código → la función `redeem_coach_share()` (SECURITY DEFINER) valida el código y crea el enlace aceptado en `coach_links`.
3. La RLS de `climbcycle_state` permite que el coach lea la fila de ese atleta.

El atleta puede listar y **revocar** coaches cuando quiera.

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

-- 3) Extender la RLS de climbcycle_state: un coach puede LEER la fila de un atleta enlazado.
--    (Conservá tu policy de dueño de SYNC_SETUP.md.)
create policy climbcycle_state_coach_read on public.climbcycle_state
  for select using (
    exists (select 1 from public.coach_links l
            where l.athlete_id = climbcycle_state.user_id
              and l.coach_id  = auth.uid()
              and l.status    = 'accepted')
  );

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
4. Probá que **no** podés leer la fila de un atleta al que no estás enlazado (debe fallar por RLS).
5. Como atleta, **Revocá** el acceso → el coach deja de ver los datos.

## Alcance (v1)

El coach solo **observa**. No escribe el plan del atleta. La escritura bidireccional (coach ajusta el plan) es v2 y necesita una resolución de conflictos más fina que la actual por timestamp. Nota de privacidad: hoy se comparte el bundle completo; si más adelante se cifran los datos (PBKDF2+AES-GCM), habrá que separar "datos privados" (peso, edad) de "datos compartibles" (adherencia, tests) o compartir una clave.
