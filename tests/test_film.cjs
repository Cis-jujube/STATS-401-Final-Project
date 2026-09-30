const assert = require('node:assert/strict');
const {FilmClock} = require('../assets/film-clock.js');
const stops = [
  {id:'home', filmDuration:0, hold:2200},
  {id:'timing', filmDuration:6000, hold:6500},
  {id:'scores', filmDuration:4600, hold:7500},
  {id:'evidence', filmDuration:3200, hold:3200},
];
const film = () => new FilmClock(stops);
const snapshot = c => [c.current.id, c.target?.id, c.progress, c.readingProgress];
let checks = 0;
const check = (value, label) => {assert.ok(value, label); checks++;};
const c = film();
check(c.duration === 33200, 'total includes every entrance and reading interval');
c.restart(0); c.tick(2200);
check(c.target.id === 'timing' && c.progress === 0, 'opening flows directly into first transition');
c.tick(8200);
check(c.current.id === 'timing' && !c.target && c.state === 'PLAYING', 'complete graph stays on film clock during reading');
c.tick(14700);
check(c.target.id === 'scores', 'full story continues without another click');
c.tick(99999);
check(c.current.id === 'evidence' && c.state === 'HOLD' && c.position === c.duration, 'end is clamped and never loops');
c.tick(1e6); check(c.position === c.duration, 'complete clock stays idle');

for (const position of [0, 1500, 4000, 8200, 12000, 15600, 29000, 33199]) {
  const a = film(); a.seek(position); const expected = snapshot(a);
  a.resume(100); a.pause(100); a.tick(120100);
  check(a.position === position && a.state === 'PAUSED', `pause at ${position} survives two minutes`);
  a.resume(120100); a.tick(120225);
  check(a.position === Math.min(a.duration, position + 125), 'resume uses a new time origin');
  a.seek(position);
  assert.deepEqual(snapshot(a), expected); checks++;
}
for (const hz of [30, 60, 120]) {
  const a = film(); a.restart(0);
  for (let i = 1; i <= 10 * hz; i++) a.tick(i * 1000 / hz);
  check(Math.abs(a.position - 10000) < 1e-7 && a.current.id === 'timing', `${hz} Hz has the same edit`);
}
const a = film(); a.seek(4000); a.previous();
check(a.current.id === 'home' && !a.target, 'back during a transition returns to its source');
a.seek(4000); a.finish();
check(a.current.id === 'timing' && a.state === 'PAUSED' && !a.target, 'explanation hold lands on the complete target');
a.next(); check(a.current.id === 'scores' && a.state === 'PAUSED', 'next chapter is a paused complete figure');
a.replay(10); check(a.target.id === 'scores' && a.state === 'PLAYING', 'replay plays the current entrance');
a.jump('scores'); const previous = a.position;
assert.throws(() => a.jump('missing')); assert.throws(() => a.seek(NaN)); checks += 2;
check(a.position === previous, 'invalid navigation is non-mutating');
a.seek(-50); check(a.position === 0, 'negative seeks clamp to start');
assert.throws(() => a.seek(Infinity)); checks++;
a.seek(1e6); check(a.state === 'HOLD', 'seek to end stops scheduling');
a.seek(100); check(a.state === 'PAUSED', 'scrubbing back from end does not autoplay');
assert.throws(() => new FilmClock([]));
assert.throws(() => new FilmClock([...stops, stops[0]]));
assert.throws(() => new FilmClock([{id:'home', hold:0}])); checks += 3;
const cuts = new FilmClock(stops.map(s => ({...s, filmDuration:0})));
cuts.restart(0); cuts.tick(2200);
check(cuts.current.id === 'timing' && !cuts.target, 'direct-cut timeline supports zero-duration entrances');
console.log(`PASS: ${checks} full-story clock assertions (continuous play, seek, pause, 30/60/120 Hz, chapter controls, boundaries)`);
