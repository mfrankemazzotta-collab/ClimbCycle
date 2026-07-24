/* ======================================================
   data/levels.js -- Perfiles por nivel: secuencias de fase, gaps, sesiones/semana (LEVEL_PROFILES).
   ClimbCycle · datos estáticos (troceado desde el antiguo data.js).
====================================================== */

/* =====================================================
   LEVEL_PROFILES: per-level training prescriptions
   Each entry in phaseSeq represents ONE WEEK of training.
   - "4-3-2-1" plan = 10 weeks total (4 + 3 + 2 + 1)
   - "3-2-1" plan = 6 weeks total (3 + 2 + 1)

   Scientific basis:
   - Bompa & Buzzichelli (Periodization Training for Sports, 2015): framework
     canonico de periodizacion AA > MxS > Conversion to Power > Maintenance.
     Para principiantes (cap.11) la fase AA (Anatomical Adaptation) es OBLIGATORIA
     antes de cualquier trabajo de fuerza máxima - prepara tendones y ligamentos.
   - Horst (Training for Climbing, 2016): el macrociclo 4-3-2-1 aplicado a escalada
     organiza el ciclo como 4 sem base aeróbica > 3 sem fuerza máxima >
     2 sem potencia > 1 sem deload/supercompensacion.
   - Barrows (Training for Sport Climbing, 2014): "in EVERY phase, strength is
     trained" - lo que cambia entre Base y Peak es la mezcla de capacidades
     (An Cap + Aero Cap) vs powers (Aero Pow + An Pow).
   - Tkacz (Training 102, p.38): los principiantes (v3-v5) deben dedicar
     ~75% del tiempo a escalada en muro. El fingerboard pesado solo cuando
     tendones ya estan adaptados (>2 anios consistentes).
   - Feehally (Beastmaking): tendones digitales adaptan 3x más lento que
     musculos. Los principiantes deben evitar la fase de potencia (campus,
     dinámicos al limite) hasta tener base de fuerza.
   - Anderson (RCTM): no fingerboard de alta intensidad antes de 6-12 meses
     de escalada consistente.
===================================================== */
var LEVEL_PROFILES = {
  beginner: {
    /* Principiantes: NO power phase. Bompa cap.11 (Anatomical Adaptation):
       las primeras semanas son AA - circuit training, alto volumen / baja
       intensidad para preparar tendones y ligamentos. Tkacz: 75% del tiempo
       en muro (volumen técnico). Sin campus, sin max hangs intensos. */
    phaseSeq:    {
      '4-3-2-1': ['endurance','endurance','endurance','endurance',
                  'endurance','endurance','endurance',
                  'strength','strength',
                  'deload'],
      '3-2-1':   ['endurance','endurance','endurance',
                  'strength','strength',
                  'deload']
    },
    minGapMult:  1.4,
    maxSessPerWk: 3,
    exPerSession: 2,
    intensityNote: 'Fader 3-5. Nunca al fallo muscular las primeras 8 semanas. Bompa: fase de Anatomical Adaptation.',
    progressNote: 'Progresar cada 2-3 semanas, no cada semana. Tkacz (Training102 p.38): 75% del tiempo en muro, 25% aislamiento.'
  },
  intermediate: {
    /* Intermedios: modelo Horst clasico 4-3-2-1. Endurance > Strength > Power > Deload.
       Tkacz (p.38): 50% aislamiento + 50% muro. Bompa: ya pueden hacer MxS
       y Conversion to Power tradicional. */
    phaseSeq:    {
      '4-3-2-1': ['endurance','endurance','endurance','endurance',
                  'strength','strength','strength',
                  'power','power',
                  'deload'],
      '3-2-1':   ['endurance','endurance','endurance',
                  'strength','strength',
                  'deload']
    },
    minGapMult:  1.0,
    maxSessPerWk: 4,
    exPerSession: 3,
    intensityNote: 'Fader 6-8 en sesiones Go Hard. Fader 4-6 en Do More. Bompa: Conversion to Power requiere base previa.',
    progressNote: 'Progresar cada 1-2 semanas con carga medida. Tkacz: 50% muro, 50% aislamiento.'
  },
  advanced: {
    /* Avanzados: el orden de fases depende del OBJETIVO (Barrows 2013 / Bompa).
       - boulder/competition: Strength → Power → Endurance (peak de potencia
         antes de la temporada de boulder o evento).
       - sport: Endurance → Strength → Power (base aeróbica primero para
         sostener vías largas; el peak es de potencia aplicada).
       - both: híbrido (base corta + strength + power + endurance corta).
       Tkacz (p.38): 25-45% muro, 55-75% aislamiento.
       Default (fallback): el orden de boulder. */
    phaseSeq:    {
      '4-3-2-1': ['strength','strength','strength','strength',
                  'power','power','power',
                  'endurance','endurance',
                  'deload'],
      '3-2-1':   ['strength','strength','strength',
                  'power','power',
                  'deload']
    },
    phaseSeqByGoal: {
      sport: {
        /* Sport: base aeróbica primero, después fuerza, después potencia
           aplicada a rutas. Peak de potencia justo antes del deload coincide
           con temporada de roca. */
        '4-3-2-1': ['endurance','endurance','endurance','endurance',
                    'strength','strength','strength',
                    'power','power',
                    'deload'],
        '3-2-1':   ['endurance','endurance','endurance',
                    'strength','strength',
                    'deload']
      },
      boulder: {
        /* Boulder: fuerza primero (frescura neural), luego potencia, después
           algo de resistencia para enlaces de boulder largos. */
        '4-3-2-1': ['strength','strength','strength','strength',
                    'power','power','power',
                    'endurance','endurance',
                    'deload'],
        '3-2-1':   ['strength','strength','strength',
                    'power','power',
                    'deload']
      },
      both: {
        /* Híbrido: base corta + fuerza + potencia + resistencia final corta. */
        '4-3-2-1': ['endurance','endurance','endurance',
                    'strength','strength','strength','strength',
                    'power','power',
                    'deload'],
        '3-2-1':   ['endurance','endurance',
                    'strength','strength',
                    'power',
                    'deload']
      },
      competition: {
        /* Competition: igual que boulder pero con peak más afilado. */
        '4-3-2-1': ['strength','strength','strength','strength',
                    'power','power','power',
                    'endurance','endurance',
                    'deload'],
        '3-2-1':   ['strength','strength',
                    'power','power','power',
                    'deload']
      }
    },
    minGapMult:  0.9,
    maxSessPerWk: 5,
    exPerSession: 4,
    intensityNote: 'Fader 8-10 en Go Hard. Detener ante fatiga neuromuscular, no ante pump. Barrows: Base(4)+Peak1(3)+Peak2(2)+Deload(1).',
    progressNote: 'Progresión semanal con metricas exactas (kg, TTF, liston). Bompa: buffer descendente sesión a sesión.'
  },
  elite: {
    /* Elite: estructura paralela a advanced pero con microciclos 3:1
       (3 semanas build + 1 descarga implícita en deload final) y maintenance
       de MxS durante la fase de endurance. En plan corto, priorizan
       potencia ya que fuerza esta consolidada. Bompa: Conversion to
       Specific Strength. */
    phaseSeq:    {
      '4-3-2-1': ['strength','strength','strength','strength',
                  'power','power','power',
                  'endurance','endurance',
                  'deload'],
      '3-2-1':   ['power','power','power',
                  'endurance','endurance',
                  'deload']
    },
    phaseSeqByGoal: {
      sport: {
        '4-3-2-1': ['endurance','endurance','endurance','endurance',
                    'strength','strength','strength',
                    'power','power',
                    'deload'],
        '3-2-1':   ['endurance','endurance',
                    'strength','strength',
                    'power','power',
                    'deload']
      },
      boulder: {
        '4-3-2-1': ['strength','strength','strength','strength',
                    'power','power','power',
                    'endurance','endurance',
                    'deload'],
        '3-2-1':   ['power','power','power',
                    'endurance','endurance',
                    'deload']
      },
      both: {
        '4-3-2-1': ['endurance','endurance','endurance',
                    'strength','strength','strength','strength',
                    'power','power',
                    'deload'],
        '3-2-1':   ['strength','strength',
                    'power','power','power',
                    'deload']
      },
      competition: {
        '4-3-2-1': ['strength','strength','strength','strength',
                    'power','power','power',
                    'endurance','endurance',
                    'deload'],
        '3-2-1':   ['power','power','power','power',
                    'endurance',
                    'deload']
      }
    },
    minGapMult:  0.85,
    maxSessPerWk: 6,
    exPerSession: 4,
    intensityNote: 'Fader 9-10. Autorregulacion por HRV y TTF. Máxima especificidad (Bompa: Conversion to Specific Strength).',
    progressNote: 'Progresión por ciclos de 3 semanas con validacion de tests. Tests al inicio y fin del macrociclo (Bompa cap.10).'
  }
};
