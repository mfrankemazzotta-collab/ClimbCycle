/* ====================================================
   syncmerge.test.js -- dirección del sync y carga de proyectos

   (G) EL PEOR BUG DE LA AUDITORÍA. `syncPull` decidía la dirección así:

         var localTs = syncBundleTs(_syncBuildBundle());
         var dir = syncResolve(localTs, remote.updated_at);

       …y `_syncBuildBundle()` sella `exportedAt: new Date()`. O sea que el
       "timestamp local" era LA HORA DE LA CONSULTA. Como el remoto nunca
       está en el futuro, `syncResolve` devolvía SIEMPRE 'push': el pull no
       ocurría jamás.

       Consecuencia real: el sync era unidireccional sin que nadie lo notara.
       Abrir la app en un segundo dispositivo con datos viejos no bajaba nada
       y el auto-push pisaba en la nube el trabajo del primero.

       Y el test de `syncResolve` pasaba en verde, porque probaba la función
       aislada con valores inyectados a mano. El bug estaba en la costura.

   (H) `cc_projects` era una isla: 12 días proyectando al límite dejaban el
       ACWR en cero. Proyectar es la escalada más intensa que hace el
       usuario — ignorarla desarma la alerta justo en el peor escenario.
==================================================== */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  const H = 3600000, D = 86400000;
  const iso = ms => new Date(ms).toISOString();
  /* Un ÚNICO instante de referencia por test. Antes cada `Date.now()` se
     evaluaba por separado y bastaba que el reloj avanzara 1 ms entre dos
     líneas para que `lastLocalChange` quedara después de `lastPush` y el
     resolver dijera 'conflict' — un test que fallaba 1 de cada 5 corridas.
     Mismo error que veníamos cazando en la app: dos lecturas de tiempo
     donde tenía que haber una sola. */
  const AHORA = Date.now();

  describe('(G) resolveSyncDirection compara hechos, no "ahora"', function(){

    it('el remoto cambió después de mi último push → pull', function(){
      const meta = { lastPush: iso(AHORA - 2*D), lastLocalChange: iso(AHORA - 2*D) };
      expect(app.resolveSyncDirection(meta, iso(AHORA - 1*D))).toBe('pull');
    });

    it('cambié cosas después de mi último push → push', function(){
      const meta = { lastPush: iso(AHORA - 2*D), lastLocalChange: iso(AHORA - 1*H) };
      expect(app.resolveSyncDirection(meta, iso(AHORA - 2*D))).toBe('push');
    });

    it('los dos lados cambiaron → conflicto, no se pisa nada', function(){
      const meta = { lastPush: iso(AHORA - 2*D), lastLocalChange: iso(AHORA - 1*H) };
      expect(app.resolveSyncDirection(meta, iso(AHORA - 3*H))).toBe('conflict');
    });

    it('nadie cambió nada desde el último push → insync', function(){
      const t = iso(AHORA - 2*D);
      expect(app.resolveSyncDirection({ lastPush:t, lastLocalChange:t }, t)).toBe('insync');
    });

    it('nunca subí nada y hay algo remoto → pull', function(){
      expect(app.resolveSyncDirection({}, iso(AHORA - D))).toBe('pull');
    });

    it('nunca subí nada pero tengo cambios locales → conflicto', function(){
      /* dispositivo nuevo con datos propios + una cuenta que ya tenía nube:
         pisar cualquiera de los dos lados en silencio sería pérdida de datos */
      const meta = { lastLocalChange: iso(AHORA - H) };
      expect(app.resolveSyncDirection(meta, iso(AHORA - D))).toBe('conflict');
    });

    it('no hay nada remoto todavía → push', function(){
      expect(app.resolveSyncDirection({ lastLocalChange: iso(AHORA) }, null)).toBe('push');
    });

    it('tolera meta vacía sin romper', function(){
      expect(app.resolveSyncDirection(null, null)).toBe('insync');
    });
  });

  describe('(G) el bug concreto: el pull tiene que poder ocurrir', function(){

    it('un remoto de ayer se baja (antes daba push y no bajaba nunca)', function(){
      /* Reproduce el escenario real: pusheé anteayer, otro dispositivo subió
         ayer, yo no toqué nada desde entonces. Debe bajar. */
      const meta = { lastPush: iso(AHORA - 2*D), lastLocalChange: iso(AHORA - 2*D) };
      const dir = app.resolveSyncDirection(meta, iso(AHORA - 1*D));
      expect(dir).toBe('pull');

      /* Y con el criterio viejo (localTs = ahora) habría dado 'push': */
      const viejo = app.syncResolve(iso(AHORA), iso(AHORA - 1*D));
      expect(viejo).toBe('push');
    });

    it('_syncBuildBundle sigue sellando la hora actual (por eso no sirve de referencia)', function(){
      const a = app.syncBundleTs(app._syncBuildBundle());
      expect(typeof a).toBe('string');
      /* el bundle es para EXPORTAR, no para fechar el estado: su exportedAt
         es siempre "ahora" y por eso no puede decidir la dirección */
      expect(Math.abs(Date.parse(a) - Date.now())).toBeLessThan(5000);
    });
  });

  describe('(H) los días de proyecto cuentan como carga', function(){

    function conIntentos(dias){
      app.saveSLogs([]);
      let list = app.addProjectTo([], 'Proyecto', '7c', 'route', Date.now());
      const id = list[0].id;
      dias.forEach(function(offset){
        const d = new Date(app.TODAY); d.setDate(d.getDate() - offset); d.setHours(12,0,0,0);
        list = app.logAttemptIn(list, id, {}, d.getTime());
      });
      app.saveProjects(list);
      return list;
    }

    it('un día con intentos genera una sesión', function(){
      app.TODAY = new Date(2026, 7, 20); app.TODAY.setHours(0,0,0,0);
      const list = conIntentos([3]);
      expect(app.syncProjectLoad(list)).toBe(1);
      const logs = app.loadSLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].block).toBe('project');
    });

    it('varios intentos el MISMO día siguen siendo una sola sesión', function(){
      /* 12 intentos no son 12 sesiones: inflar la carga sería tan malo como
         ignorarla. */
      app.TODAY = new Date(2026, 7, 20); app.TODAY.setHours(0,0,0,0);
      const list = conIntentos([3, 3, 3, 3, 3]);
      app.syncProjectLoad(list);
      expect(app.loadSLogs().length).toBe(1);
    });

    it('días distintos generan sesiones distintas', function(){
      app.TODAY = new Date(2026, 7, 20); app.TODAY.setHours(0,0,0,0);
      const list = conIntentos([2, 5, 9]);
      expect(app.syncProjectLoad(list)).toBe(3);
    });

    it('no pisa una sesión ya registrada ese día', function(){
      /* los intentos ocurrieron DENTRO de la salida de roca que ya se logueó */
      app.TODAY = new Date(2026, 7, 20); app.TODAY.setHours(0,0,0,0);
      const d = new Date(app.TODAY); d.setDate(d.getDate() - 3);
      const key = d.toDateString();
      const list = conIntentos([3]);
      app.saveSLogs([{ ts:Date.now(), dateStr:key, block:'outdoor', rpe:9, dur:300 }]);
      expect(app.syncProjectLoad(list)).toBe(0);
      const logs = app.loadSLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].rpe).toBe(9);     /* el registro original sobrevive */
    });

    it('un intento fechado a futuro no genera carga', function(){
      app.TODAY = new Date(2026, 7, 20); app.TODAY.setHours(0,0,0,0);
      const list = conIntentos([-5]);   /* 5 días adelante */
      expect(app.syncProjectLoad(list)).toBe(0);
    });

    it('projectAttemptDays agrupa por día y tolera basura', function(){
      const dias = app.projectAttemptDays([
        { attempts:[{ts:Date.parse('2026-08-03T10:00:00')}, {ts:Date.parse('2026-08-03T18:00:00')}] },
        { attempts:[{ts:Date.parse('2026-08-05T10:00:00')}, null, {}] },
        null
      ]);
      expect(dias.length).toBe(2);
    });

    it('12 días de proyecto activan el ACWR (antes daba ratio null)', function(){
      app.TODAY = new Date(2026, 7, 20); app.TODAY.setHours(0,0,0,0);
      const list = conIntentos([1,3,5,7,9,11,13,15,17,19,21,23]);
      app.syncProjectLoad(list);
      const acwr = app.computeACWR();
      expect(acwr.sessions).toBeGreaterThan(3);
      expect(acwr.ratio).notToBe(null);
    });
  });
};
