/* Unit tests for projects.js — the pure list transforms behind the projects
   widget (CRUD + progress). The DOM render is not tested here. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  describe('addProjectTo()', function(){
    it('appends a "trying" project with the given fields', function(){
      const l = app.addProjectTo([], 'La Rambla', '9a', 'sport', 1000);
      expect(l.length).toBe(1);
      expect(l[0].name).toBe('La Rambla');
      expect(l[0].grade).toBe('9a');
      expect(l[0].type).toBe('sport');
      expect(l[0].status).toBe('trying');
      expect(l[0].attempts.length).toBe(0);
    });
    it('ignores an empty/whitespace name', function(){
      expect(app.addProjectTo([], '   ').length).toBe(0);
    });
    it('does not mutate the input list', function(){
      const a = [];
      app.addProjectTo(a, 'X');
      expect(a.length).toBe(0);
    });
  });

  describe('logAttemptIn()', function(){
    it('pushes an attempt with a timestamp, staying "trying"', function(){
      let l = app.addProjectTo([], 'X', '7a', 'sport', 1);
      const id = l[0].id;
      l = app.logAttemptIn(l, id, {}, 2000);
      expect(l[0].attempts.length).toBe(1);
      expect(l[0].attempts[0].ts).toBe(2000);
      expect(l[0].status).toBe('trying');
    });
    it('marks sent and sets sentAt when attempt.sent is true', function(){
      let l = app.addProjectTo([], 'X', '7a', 'sport', 1);
      l = app.logAttemptIn(l, l[0].id, { sent:true }, 3000);
      expect(l[0].status).toBe('sent');
      expect(l[0].sentAt).toBe(3000);
    });
    it('stores highpoint and notes when provided', function(){
      let l = app.addProjectTo([], 'X');
      l = app.logAttemptIn(l, l[0].id, { highpoint:'crux', notes:'casi' }, 1);
      expect(l[0].attempts[0].highpoint).toBe('crux');
      expect(l[0].attempts[0].notes).toBe('casi');
    });
  });

  describe('setStatusIn() / deleteProjectIn()', function(){
    it('reopening a sent project clears sentAt', function(){
      let l = app.addProjectTo([], 'X');
      l = app.logAttemptIn(l, l[0].id, { sent:true }, 1);
      l = app.setStatusIn(l, l[0].id, 'trying');
      expect(l[0].status).toBe('trying');
      expect(l[0].sentAt).toBe(null);
    });
    it('deletes the project by id', function(){
      const l = app.addProjectTo([], 'X');
      expect(app.deleteProjectIn(l, l[0].id).length).toBe(0);
    });
  });

  describe('projectProgress()', function(){
    it('sent is 100%', function(){
      expect(app.projectProgress({ status:'sent' }).pct).toBe(100);
    });
    it('trying scales with attempts, capped at 85', function(){
      expect(app.projectProgress({ status:'trying', attempts:[{},{}] }).pct).toBe(24);
      expect(app.projectProgress({ status:'trying', attempts:new Array(20).fill({}) }).pct).toBe(85);
    });
    it('shelved is 0% / En pausa', function(){
      const pr = app.projectProgress({ status:'shelved' });
      expect(pr.pct).toBe(0);
      expect(pr.label).toBe('En pausa');
    });
  });

  describe('projectStats()', function(){
    it('counts active vs sent (shelved is neither)', function(){
      const s = app.projectStats([{status:'trying'},{status:'sent'},{status:'shelved'},{status:'trying'}]);
      expect(s.total).toBe(4);
      expect(s.sent).toBe(1);
      expect(s.active).toBe(2);
    });
  });
};
