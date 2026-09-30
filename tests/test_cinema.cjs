// Canvas contract: reversible geometry, bounded work, graceful absence, no clock.
const {runInNewContext} = require('node:vm');
const {readFileSync} = require('node:fs');
const assert = require('node:assert/strict');
const math = readFileSync('assets/motion-math.js', 'utf8');
const cinema = readFileSync('assets/cinema.js', 'utf8');
const calls = [];
const ctx = Object.fromEntries(['setTransform', 'clearRect', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'fillRect'].map(name => [name, (...args) => {
  assert.ok(args.every(Number.isFinite), `${name}: all coordinates must be finite`);
  calls.push([name, ...args]);
}]));
const canvas = {width:0, height:0, getContext: () => ctx};
const context = {document: {querySelector: () => canvas}, devicePixelRatio:3};
runInNewContext(math, context);
runInNewContext(cinema, context);
const frame = {width:1440, height:640, progress:.4, visible:true, motion:true};
const draw = values => {calls.length = 0; context.StoryCinema.render({...frame, ...values}); return JSON.stringify(calls);};
const first = draw({});
assert.equal(canvas.width, 2160, 'Retina backing store is capped at 1.5x');
assert.equal(canvas.height, 960);
assert.equal(draw({}), '[]', 'an unchanged scroll state does not redraw');
draw({progress:.85});
assert.equal(draw({}), first, 'reverse scroll returns to the same geometry');
assert.equal(draw({motion:false}), '[]', 'reduced motion does no canvas work');
assert.equal(draw({visible:false}), '[]', 'offscreen scenes do no canvas work');
assert.equal(draw({width:0}), '[]', 'zero-size canvas is safe');
draw({width:390, height:360});
assert.equal(calls.filter(([name]) => name === 'fillRect').length, 48, 'mobile uses a smaller decoration budget');
assert.equal(calls.filter(([name]) => name === 'stroke').length, 10);
for (const value of [null, {getContext: () => null}]) {
  const fallback = {document: {querySelector: () => value}};
  runInNewContext(cinema, fallback);
  assert.equal(fallback.StoryCinema, undefined, 'missing canvas/context leaves the story intact');
}
console.log('PASS: reversible canvas, idle deduplication, motion/offscreen guards, resolution cap, mobile budget and fallback');
