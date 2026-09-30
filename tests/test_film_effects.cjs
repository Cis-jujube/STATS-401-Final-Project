const {runInNewContext} = require('node:vm');
const {readFileSync} = require('node:fs');
const assert = require('node:assert/strict');
const {geometry, clipNear} = require('../assets/presentation-effects.js');
const {frame: choreography} = require('../assets/presentation-choreography.js');
const source = readFileSync('assets/presentation-effects.js', 'utf8');
let calls = [];
const ctx = Object.fromEntries(['setTransform','clearRect','beginPath','moveTo','lineTo','closePath','fill','stroke'].map(name => [name, (...args) => {
  assert.ok(args.every(Number.isFinite), `${name} receives finite coordinates`); calls.push([name, ...args]);
}]));
const canvas = {width:0, height:0, getContext:() => ctx};
const browser = {document:{querySelector:() => canvas}, devicePixelRatio:3};
runInNewContext(source, browser);
const sample = (shot, frame, width = 1440, progress = .4) => ({shot, frame, width, height:700, progress});
const draw = input => { calls = []; browser.PresentationEffects.render(input); return JSON.stringify(calls); };
const stackFrame = {cameraX:0,cameraY:-1.1,cameraYaw:3,cameraPitch:22,spatialClear:0};
const scene = sample('stack', stackFrame), first = draw(scene);
assert.equal(canvas.width, 2160, 'raster resolution is capped at 1.5 DPR');
assert.equal(draw(scene), '[]', 'paused frame does no extra drawing');
draw(sample('stack', {...stackFrame,cameraY:-2.2}));
assert.equal(draw(scene), first, 'reverse seek recreates identical projected paths');
draw(sample('stack', stackFrame, 390));
assert.equal(canvas.width, 585, 'paused resize recomputes the same geometry at mobile size');

const stack = geometry(scene);
assert.equal(new Set(stack.map(face => face.id)).size, 7, 'only seven unnumbered slabs');
assert.deepEqual([...new Set(stack.map(face => face.kind))].sort(), ['slab-front','slab-side','slab-top']);
const lower = geometry(sample('stack', {...stackFrame,cameraY:-2.2}));
const centerY = (faces, id) => {
  const face = faces.find(face => face.id === id && face.kind === 'slab-top');
  return face.points.reduce((sum, point) => sum + point.y, 0) / face.points.length;
};
assert.ok(centerY(lower,6) < centerY(stack,6), 'lowering the exterior camera lifts the destination slab into view');
assert.deepEqual(geometry(sample('stack', {...stackFrame,spatialClear:1})), [], 'held chart has no surviving architecture');

const closed = geometry(sample('seam', {parallaxX:0,spatialClear:0}));
const open = geometry(sample('seam', {parallaxX:.65,spatialClear:0}));
const front = faces => faces.filter(face => face.kind === 'beam-face').sort((a,b) => a.id - b.id);
const a = front(closed), b = front(open);
assert.equal(a.length,12, 'desktop uses four three-piece incomplete frames');
assert.equal(front(geometry(sample('seam',{parallaxX:.65},390))).length,9, 'mobile preserves mechanism with three layers');
const joins = [
  {width:1440,left:0,right:3},
  {width:390,left:2,right:5},
];
for (const {width,left,right} of joins) {
  const registered = front(geometry(sample('seam',{parallaxX:0},width)));
  const separated = front(geometry(sample('seam',{parallaxX:.32},width)));
  assert.ok(Math.abs(registered[left].points[3].x - registered[right].points[0].x) < 1e-9,
    'front-view pieces meet exactly to form one registered window');
  assert.ok(separated[right].points[0].x - separated[left].points[3].x > width * .04,
    'the formerly joined edge visibly separates under lateral camera travel');
}
const shifts = [];
for (let i = 0; i < a.length; i++) {
  const p = a[i].points, q = b[i].points;
  assert.equal(p.length,q.length);
  const dx = q[0].x - p[0].x;
  shifts.push([a[i].layer,dx]);
  for (let j = 0; j < p.length; j++) {
    assert.ok(Math.abs((q[j].x - p[j].x) - dx) < 1e-9, 'parallax is lateral translation, never zoom');
    assert.equal(q[j].y,p[j].y, 'parallax preserves beam height and vertical placement');
  }
}
assert.ok(shifts.find(([layer]) => layer === 0)[1] < 0 && shifts.find(([layer]) => layer === 3)[1] > 0,
  'near and far layers move to opposite sides of the tracked view, revealing depth');
const parallaxFirst = draw(sample('seam',{parallaxX:.32,spatialClear:0}));
draw(sample('seam',{parallaxX:.65,spatialClear:.5}));
assert.equal(draw(sample('seam',{parallaxX:.32,spatialClear:0})),parallaxFirst,'parallax restores after reverse seek');
assert.notEqual(first,parallaxFirst,'stack and parallax do not reuse one tunnel composition');

for (const shot of ['portal','press','papers','folio','archive']) {
  draw(scene);
  draw(sample(shot,{}));
  assert.deepEqual(calls.map(([name]) => name),['setTransform','clearRect'],`${shot} clears Canvas and delegates to DOM`);
}
for (const width of [390,1024,1440]) for (let i = 0; i <= 100; i++) {
  const p = i / 100;
  for (const [id,shot] of [['attempt-scores','stack'],['platform-associations','seam']]) {
    const input = sample(shot,choreography(id,p),width,p);
    const faces = geometry(input);
    assert.ok(faces.length <= (shot === 'stack' ? 21 : 36), 'work is bounded by visible solids');
    faces.forEach((face,index) => {
      assert.ok(face.points.every(point => Number.isFinite(point.x + point.y)), 'projection stays finite across authored camera path');
      if (index) assert.ok(faces[index-1].depth >= face.depth, 'opaque faces draw back to front');
    });
    if (p >= .96) assert.equal(faces.length,0, 'authored landing clears all spatial geometry');
  }
}
for (const [id,shot,p1,p2] of [['attempt-scores','stack',.53,.57],['platform-associations','seam',.49,.56]]) {
  const before = geometry(sample(shot,choreography(id,p1),1440,p1));
  const after = geometry(sample(shot,choreography(id,p2),1440,p2));
  assert.deepEqual(before,after,'the authored dead stop is geometrically still');
}
const clipped = clipNear([{x:-1,y:-1,z:-.2},{x:1,y:-1,z:.4},{x:1,y:1,z:.4},{x:-1,y:1,z:-.2}]);
assert.equal(clipped.length,4);
assert.ok(clipped.every(point => point.z >= .18 && Number.isFinite(point.x + point.y)),'near crossing clips before perspective division');
assert.deepEqual(clipNear([{x:0,y:0,z:-1},{x:1,y:0,z:-1},{x:0,y:1,z:-1}]),[],'faces behind camera are rejected');
for (const input of [{width:0,height:700},{width:1440,height:Infinity}]) assert.deepEqual(geometry(input),[]);
for (const canvas of [null,{getContext:() => null}]) {
  const fallback = {document:{querySelector:() => canvas}};
  runInNewContext(source,fallback);
  assert.equal(fallback.PresentationEffects,undefined);
}
assert.ok(!source.includes('requestAnimationFrame'), 'effects never own a second animation loop');
console.log('PASS: exterior slabs and lateral parallax, deterministic pause/reverse/resize, finite clipping, bounded faces, static landings, DOM-only other shots');
