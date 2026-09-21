const assert = require('node:assert/strict');
const {ease, spring} = require('../assets/motion-math.js');
assert.equal(ease(0), 0); assert.equal(ease(1), 1);
assert.ok(ease(.1) < .02, 'slow start');
assert.ok(ease(.6) - ease(.4) > .3, 'faster middle');
assert.ok(1 - ease(.9) < .02, 'slow finish');
for (const fps of [30, 60, 120]) {
  let state = {value: 0, velocity: 0}, max = 0;
  for (let i = 0; i < fps * 2; i++) {
    state = spring(state, 1, 1 / fps); max = Math.max(max, state.value);
    assert.ok(Number.isFinite(state.value) && Number.isFinite(state.velocity));
  }
  assert.ok(max > 1 && max < 1.025, 'subtle rebound');
  assert.equal(state.value, 1); assert.equal(state.velocity, 0); assert.ok(state.settled);
  for (let i = 0; i < fps * 2; i++) state = spring(state, 0, 1 / fps);
  assert.equal(state.value, 0); assert.ok(state.settled);
}
let a = {value: 0, velocity: 0}, b = {...a};
for (let i = 0; i < 15; i++) a = spring(a, 1, 1 / 30);
for (let i = 0; i < 60; i++) b = spring(b, 1, 1 / 120);
assert.ok(Math.abs(a.value - b.value) < .00001, 'frame-rate independent timing');
console.log('PASS: slow-fast-slow curve, bounded overshoot, reverse settling, 30/60/120Hz consistency');
const {LandingPause} = require('../assets/motion-math.js');
const pause = new LandingPause();
assert.equal(pause.wheel(0), false);
pause.land(50);
assert.equal(pause.wheel(100), true, 'landing catches wheel momentum');
assert.equal(pause.wheel(590), true, 'minimum pause holds despite a fresh gesture');
assert.equal(pause.wheel(610), true, 'continued momentum cannot unlock');
assert.equal(pause.wheel(820), false, 'new gesture after pause resumes native scroll');
pause.land(840); pause.reset();
assert.equal(pause.wheel(850), false, 'motion-off bypass');
const keyboard = new LandingPause(); keyboard.land(50);
assert.equal(keyboard.wheel(60), false, 'keyboard or anchor arrivals do not lock wheel');
console.log('PASS: landing pause, inertia guard, fresh gesture release and bypass');
