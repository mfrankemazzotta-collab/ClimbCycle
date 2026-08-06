-- ====================================================
-- diagnostico-coach.sql · ClimbCycle
--
-- Responde de una sola corrida:
--   1. ¿Qué tablas hay instaladas?
--   2. ¿Sigue viva la policy que filtraba el historial completo al coach?
--   3. ¿Hay coaches con acceso a datos de un atleta?
--
-- SÓLO LEE. No modifica nada. Pegalo en Supabase → SQL Editor → Run.
--
-- Nota: usa `to_regclass` y SQL dinámico a propósito. Una consulta común
-- contra `public.coach_links` FALLA AL PARSEAR si la tabla no existe, y ese
-- error corta el resto del diagnóstico justo cuando más falta hace saber lo
-- demás (aprendido a los golpes).
-- ====================================================

do $$
declare
  hay_links   boolean := to_regclass('public.coach_links')      is not null;
  hay_sum     boolean := to_regclass('public.coach_summaries')  is not null;
  hay_state   boolean := to_regclass('public.climbcycle_state') is not null;
  hay_policy  boolean;
  n_links     integer := 0;
  n_pols      integer := 0;
begin
  select exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'climbcycle_state'
      and policyname = 'climbcycle_state_coach_read'
  ) into hay_policy;

  if hay_links then
    execute 'select count(*) from public.coach_links where status = ''accepted''' into n_links;
  end if;

  select count(*) into n_pols
  from pg_policies where schemaname = 'public' and tablename = 'climbcycle_state';

  raise notice '';
  raise notice '=== DIAGNÓSTICO MODO ENTRENADOR ===';
  raise notice '';
  raise notice 'climbcycle_state (sync).... %', case when hay_state then 'instalada' else 'NO existe' end;
  raise notice 'coach_links............... %', case when hay_links then 'instalada' else 'NO existe' end;
  raise notice 'coach_summaries (nueva)... %', case when hay_sum   then 'instalada' else 'NO existe' end;
  raise notice '';

  if not hay_links then
    raise notice '>> El modo entrenador NUNCA se instaló en esta base.';
    raise notice '   No hay coaches enlazados y no hay nada que arreglar.';
  else
    raise notice '>> Coaches con acceso activo: %', n_links;
  end if;

  raise notice '';
  if hay_policy then
    raise notice '>> ATENCIÓN: la policy climbcycle_state_coach_read EXISTE.';
    raise notice '   Le da al coach SELECT sobre la fila ENTERA del atleta';
    raise notice '   (peso, edad, pulsaciones y las notas de cada sesión).';
    raise notice '   Ejecutá:';
    raise notice '     drop policy climbcycle_state_coach_read on public.climbcycle_state;';
  else
    raise notice '>> La policy peligrosa NO existe. Nada que hacer.';
  end if;
  raise notice '';
  raise notice 'Policies sobre climbcycle_state: % (ver detalle abajo)', n_pols;
  raise notice '';
end $$;

-- Detalle de las policies que sí existen sobre la tabla de datos.
select policyname, cmd, qual::text as condicion
from pg_policies
where schemaname = 'public' and tablename = 'climbcycle_state'
order by policyname;
