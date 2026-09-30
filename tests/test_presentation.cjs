// The clock is an explicit input: waiting must never advance a stopped figure.
const assert = require('node:assert/strict');
const {PresentationClock} = require('../assets/presentation-clock.js');
const stops = [
  {id: 'home', duration: 0}, {id: 'timing', duration: 4000},
  {id: 'retries', duration: 1600}, {id: 'evidence', duration: 2000},
];
const clock = () => new PresentationClock(stops);
const a = clock();
assert.equal(a.current.id, 'home');
assert.equal(a.state, 'HOLD');
a.next(0); a.tick(500); a.next(500); a.next(700); a.tick(4000);
assert.equal(a.current.id, 'timing', 'repeated next commands never queue');
assert.equal(a.state, 'HOLD');
a.tick(124000);
assert.equal(a.current.id, 'timing', 'two-minute hold never advances');
assert.equal(a.elapsed, 0);
for (const fraction of [.2, .5, .8]) {
  const b = clock(); b.next(100); b.pause(100 + 4000 * fraction);
  const elapsed = b.elapsed;
  assert.equal(b.state, 'PAUSED');
  b.tick(300000); b.next(300000);
  assert.equal(b.elapsed, elapsed, 'paused time and next commands do not move the clock');
  b.resume(300000); b.tick(300100);
  assert.equal(b.elapsed, elapsed + 100, 'resume uses a fresh clock origin');
  b.tick(310000);
  assert.equal(b.state, 'HOLD'); assert.equal(b.current.id, 'timing');
}
const c = clock(); c.jump('timing'); c.next(0); c.tick(800); c.previous();
assert.equal(c.current.id, 'timing', 'previous during A→B returns to A');
assert.equal(c.state, 'HOLD'); c.previous(); assert.equal(c.current.id, 'home');
c.jump('evidence'); assert.equal(c.next(0), false, 'ending never loops');
c.jump('retries'); c.replay(0); c.tick(2000);
assert.equal(c.current.id, 'retries', 'replay returns to the same stop');
const before = c.current.id;
assert.throws(() => c.jump('missing'));
assert.equal(c.current.id, before, 'invalid ID does not mutate the current stop');
const d = clock(); d.next(0, false);
assert.equal(d.state, 'HOLD'); assert.equal(d.current.id, 'timing', 'reduced motion lands directly');
d.next(100); d.finish(); assert.equal(d.current.id, 'retries');
assert.equal(d.state, 'HOLD'); assert.equal(d.target, null);
console.log('PASS: bounded segments, indefinite hold, pause/resume, spam, previous, replay, stable IDs, reduced motion, ending');
