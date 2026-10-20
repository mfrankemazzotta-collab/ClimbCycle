-- ====================================================
-- push.sql -- recordatorios push con la app cerrada
-- ClimbCycle
--
-- Se corre UNA vez en Supabase → SQL Editor → New query → pegar → Run.
-- Es idempotente: si lo corrés de nuevo no rompe ni duplica nada.
-- Guía paso a paso: PUSH_SETUP.md
--
-- Qué crea:
--   push_subscriptions  un registro por teléfono/navegador que activó avisos
--   push_reminders      los avisos ya programados (la app los sube)
--   push_vapid          la clave del servidor (sólo la lee la función)
--   un cron cada 10 min que llama a la función send-reminders
-- ====================================================

-- ── Dispositivos suscriptos ──────────────────────────
create table if not exists public.push_subscriptions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);
alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subs own select" on public.push_subscriptions;
drop policy if exists "push_subs own insert" on public.push_subscriptions;
drop policy if exists "push_subs own update" on public.push_subscriptions;
drop policy if exists "push_subs own delete" on public.push_subscriptions;
create policy "push_subs own select" on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "push_subs own insert" on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "push_subs own update" on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push_subs own delete" on public.push_subscriptions for delete using (auth.uid() = user_id);

-- ── Avisos programados ───────────────────────────────
create table if not exists public.push_reminders (
  id       bigint generated always as identity primary key,
  user_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  send_at  timestamptz not null,
  tag      text not null,
  title    text not null,
  body     text not null,
  sent_at  timestamptz
);
create index if not exists push_reminders_due on public.push_reminders (send_at) where sent_at is null;
alter table public.push_reminders enable row level security;

drop policy if exists "push_rem own select" on public.push_reminders;
drop policy if exists "push_rem own insert" on public.push_reminders;
drop policy if exists "push_rem own delete" on public.push_reminders;
create policy "push_rem own select" on public.push_reminders for select using (auth.uid() = user_id);
create policy "push_rem own insert" on public.push_reminders for insert with check (auth.uid() = user_id);
create policy "push_rem own delete" on public.push_reminders for delete using (auth.uid() = user_id);
-- (sin policy de update: marcar "enviado" lo hace sólo la función)

-- ── Clave del servidor (VAPID) ───────────────────────
-- RLS encendida y SIN policies: ningún usuario puede leerla, sólo la
-- función con la service role. Se genera sola en el primer uso.
create table if not exists public.push_vapid (
  id          int primary key default 1 check (id = 1),
  public_key  text not null,
  private_jwk jsonb not null,
  created_at  timestamptz not null default now()
);
alter table public.push_vapid enable row level security;

-- ── Cron: cada 10 minutos, mandar lo que venció ──────
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('climbcycle-push')
where exists (select 1 from cron.job where jobname = 'climbcycle-push');

-- La URL y la anon key son las PÚBLICAS de la app (las mismas de
-- js/sync-config.js). No va ninguna clave secreta acá.
select cron.schedule(
  'climbcycle-push',
  '*/10 * * * *',
  $$
  select net.http_post(
    url     := 'https://ixzpnjtxmynmjvkdwien.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4enBuanR4bXlubWp2a2R3aWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMjYyNDEsImV4cCI6MjA5MzkwMjI0MX0.cuhX3X-QJavzmRBhggZJmSdlJr0xmqvr7q7kzcoXEio'
    ),
    body    := '{"action":"send"}'::jsonb
  );
  $$
);

-- Verificación rápida: tendría que mostrar una fila "climbcycle-push".
select jobname, schedule, active from cron.job where jobname = 'climbcycle-push';
