/* Tests for renderExerciseCard() — the unified day-panel exercise card that
   used to be copy-pasted in showDayPanel's main + secondary loops.
   render-utils.js is loaded by the harness; renderProgressionBadge (render-home)
   is not, so the card falls back to '' for it — we assert the stable parts. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  describe('renderExerciseCard()', function(){
    it('returns empty string for a null exercise', function(){
      expect(app.renderExerciseCard(null, {}, '#fff', 'e1', '')).toBe('');
    });

    it('renders the ex-card shell with the name and border color', function(){
      const html = app.renderExerciseCard({ n:'Max Hangs', det:'Cuelgues' }, {}, '#CCFF00', 'e1', '');
      expect(html.indexOf('class="ex-card"')).toBeGreaterThan(-1);
      expect(html.indexOf('Max Hangs')).toBeGreaterThan(-1);
      expect(html.indexOf('border-left-color:#CCFF00')).toBeGreaterThan(-1);
    });

    it('appends extraStyle to the outer style (secondary phases indent/tint)', function(){
      const html = app.renderExerciseCard({ n:'X', det:'d' }, {}, '#123456', 'e1', 'margin-left:10px');
      expect(html.indexOf('margin-left:10px')).toBeGreaterThan(-1);
      expect(html.indexOf('border-left-color:#123456')).toBeGreaterThan(-1);
    });

    it('includes the science toggle only when ex.sci is present', function(){
      const withSci = app.renderExerciseCard({ n:'X', det:'d', sci:'porque la ciencia' }, {}, '#fff', 'eZ', '');
      expect(withSci.indexOf('btneZ')).toBeGreaterThan(-1);
      expect(withSci.indexOf('ciencia')).toBeGreaterThan(-1);
      const without = app.renderExerciseCard({ n:'X', det:'d' }, {}, '#fff', 'eZ', '');
      expect(without.indexOf('btneZ')).toBe(-1);
    });

    it('shows the system chip when the exercise has one', function(){
      const html = app.renderExerciseCard({ n:'X', det:'d', sys:'FI' }, {}, '#fff', 'e1', '');
      expect(html.indexOf('FI')).toBeGreaterThan(-1);
      const without = app.renderExerciseCard({ n:'X', det:'d' }, {}, '#fff', 'e1', '');
      expect(without.indexOf('border-radius:99px')).toBe(-1);
    });
  });

  /* Rediseño (Claude Design): 3 niveles de lectura + check opcional */
  describe('renderExerciseCard() — rediseño', function(){
    const ex = { n:'Deadhangs', nota:'5 series · 10s · descanso 3 min', sys:'FI', simple:'Te colgás.', sci:'Horst' };

    it('muestra la dosis en grande y el descanso como línea secundaria', function(){
      const html = app.renderExerciseCard(ex, {}, '#38BDF8', 'e1', '');
      expect(html.indexOf('font-size:19px')).toBeGreaterThan(-1);   /* dosis "de reojo" */
      expect(html.indexOf('descanso 3:00')).toBeGreaterThan(-1);
    });

    it('usa color-mix sobre el color de fase (funciona con variables CSS)', function(){
      const html = app.renderExerciseCard(ex, {}, 'var(--accent-strength)', 'e1', '');
      expect(html.indexOf('color-mix(in srgb, var(--accent-strength)')).toBeGreaterThan(-1);
    });

    it('el check es opcional y respeta el área táctil de 44px', function(){
      const sin = app.renderExerciseCard(ex, {}, '#fff', 'e1', '');
      expect(sin.indexOf('width:44px;height:44px')).toBe(-1);
      const con = app.renderExerciseCard(ex, {}, '#fff', 'e1', '', { check:true, onCheck:'f(0)' });
      expect(con.indexOf('width:44px;height:44px')).toBeGreaterThan(-1);
      expect(con.indexOf('f(0)')).toBeGreaterThan(-1);
    });

    it('un ejercicio hecho se atenúa y muestra el tilde', function(){
      const html = app.renderExerciseCard(ex, {}, '#fff', 'e1', '', { check:true, done:true, onCheck:'f(0)' });
      expect(html.indexOf('opacity:.55')).toBeGreaterThan(-1);
      expect(html.indexOf('&#x2713;')).toBeGreaterThan(-1);
    });

    /* Regresión: el chip llevaba SYS_HUMAN (42-77 chars) y aplastaba el nombre
       hasta partirlo letra por letra en móvil. El chip debe ser SIEMPRE corto. */
    it('el chip del sistema es corto y nunca lleva la descripción larga', function(){
      const P = app.EX_POOL;
      const all = [].concat(P.strength, P.power, P.endurance, P.deload);
      const largos = all.filter(function(e){
        const chip = (app.SYS_CHIP && app.SYS_CHIP[e.sys]) || e.sys || '';
        return chip.length > 14;   /* ~109px en Mono 11px: el tope del 38% */
      });
      expect(largos.length).toBe(0);
      /* y la descripción larga NO debe aparecer en la tarjeta */
      const ex = all.find(function(e){ return e.sys === 'Aero Cap'; });
      const html = app.renderExerciseCard(ex, {}, '#fff', 'e1', '');
      expect(html.indexOf(app.SYS_HUMAN['Aero Cap'])).toBe(-1);
    });

    it('el nombre y el chip conviven sin que el nombre quede sin ancho', function(){
      const html = app.renderExerciseCard({ n:'ARC Training (base aeróbica)', nota:'20 min', sys:'Aero Cap' }, {}, '#fff', 'e1', '');
      expect(html.indexOf('flex:1 1 auto;min-width:0')).toBeGreaterThan(-1);  /* el nombre puede encoger */
      expect(html.indexOf('max-width:38%')).toBeGreaterThan(-1);              /* el chip tiene tope */
      /* el NOMBRE usa break-word (corta entre palabras), nunca 'anywhere'
         (que fue lo que lo partió letra por letra cuando quedó sin ancho) */
      const nombre = html.slice(html.indexOf('flex:1 1 auto;min-width:0'), html.indexOf('Barlow Condensed') + 40);
      expect(nombre.indexOf('overflow-wrap:break-word')).toBeGreaterThan(-1);
      expect(nombre.indexOf('anywhere')).toBe(-1);
    });

    it('escapa el nombre del ejercicio (defensa XSS)', function(){
      const html = app.renderExerciseCard({ n:'<img onerror=x>', nota:'1' }, {}, '#fff', 'e1', '');
      expect(html.indexOf('<img onerror')).toBe(-1);
      expect(html.indexOf('&lt;img')).toBeGreaterThan(-1);
    });
  });
};
