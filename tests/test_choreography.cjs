const assert = require('node:assert/strict');
const {frame, shots} = require('../assets/presentation-choreography.js');

const ids = Object.keys(shots);
assert.equal(new Set(Object.values(shots)).size, 6, 'each entrance has a distinct mechanism');
const keys = Object.keys(frame('timing', 0));
const unitChannels = [
  'reveal', 'exposure', 'contentOpacity', 'interactionReady', 'bridgeOpacity', 'chartEntry',
  'titleOpacity', 'wallOpacity', 'release', 'pressure', 'seam', 'wipe', 'camera', 'trail',
  'portalOpen', 'portalLanding', 'followProgress', 'followOpacity', 'pressWidth', 'pressRupture',
  'pressLeft', 'pressRight', 'pressStrip', 'pressClear', 'pressLanding', 'dock', 'stackClear',
  'spatialClear', 'folioCover', 'folioHinge', 'folioUncover', 'folioClose', 'folioClear',
  'parallaxSpread', 'parallaxClear', 'archiveClose', 'archiveTurn', 'archiveRule', 'archiveClear',
];
const binaryChannels = ['contentOpacity', 'interactionReady', 'bridgeOpacity', 'portalLanding', 'pressLanding', 'pressStrip'];
let sampled = 0;
for (const id of ids) {
  for (let i = 0; i <= 1000; i++) {
    const result = frame(id, i / 1000);
    assert.deepEqual(Object.keys(result), keys, `${id}: frame schema is stable`);
    for (const [key, value] of Object.entries(result)) {
      if (key !== 'shot') assert.ok(Number.isFinite(value), `${id}:${key} is finite`);
    }
    for (const key of unitChannels) assert.ok(result[key] >= 0 && result[key] <= 1, `${id}:${key} bounded`);
    for (const key of binaryChannels) assert.ok(result[key] === 0 || result[key] === 1, `${id}:${key} is binary`);
    assert.equal(result.chartEntry, 0, 'the real chart never acquires a spatial entrance');
    assert.equal(result.wallOpacity, 0, 'the repeated word-wall template is disabled');
    if (id !== 'attempt-scores') assert.equal(result.trail, 0, 'speed trails belong only to the exterior drop');
    if (result.interactionReady) {
      assert.equal(result.reveal, 1, 'covered controls cannot become interactive');
      assert.equal(result.contentOpacity, 1);
      assert.equal(result.exposure, 0, 'the interactive figure has no effects overlay');
    }
    sampled++;
  }
  const landing = frame(id, 1);
  assert.equal(landing.bridgeOpacity, 0);
  assert.equal(landing.titleOpacity, 0);
  assert.equal(landing.followOpacity, 0);
  assert.equal(landing.cameraX, 0);
  assert.equal(landing.cameraY, 0);
  assert.equal(landing.cameraYaw, 0);
  assert.equal(landing.cameraPitch, 0);
  assert.equal(landing.parallaxX, 0);
  assert.deepEqual(frame(id, 2), landing, 'overshooting time produces the same complete landing');
  assert.deepEqual(frame(id, -1), frame(id, 0), 'negative time is clamped');
}

// Reverse seeking must reconstruct DOM swap decisions as well as geometric channels.
const boundaries = [0, .02, .08, .10, .12, .15, .18, .20, .21, .22, .23, .235, .27, .28,
  .29, .30, .31, .34, .36, .40, .43, .44, .45, .48, .52, .57, .58, .66, .68, .70, .72,
  .74, .76, .78, .82, .84, .96, .98, 1];
for (const id of ids) {
  const positions = boundaries.flatMap(p => [Math.max(0, p - 1e-7), p, Math.min(1, p + 1e-7)]);
  const forward = positions.map(p => frame(id, p));
  for (let i = positions.length - 1; i >= 0; i--) {
    assert.deepEqual(frame(id, positions[i]), forward[i], `${id}: reverse boundary seek is exact`);
    frame(id, .99); // A later scene state cannot make an earlier swap or rupture sticky.
    assert.deepEqual(frame(id, positions[i]), forward[i]);
  }
}

const swaps = [
  ['timing', .74, 'portalOpen', 'portalLanding'],
  ['scores', .84, 'pressClear', 'pressLanding'],
  ['attempt-scores', .12, 'stackClear'],
  ['midterm-associations', .78, 'folioClear', 'folioClose'],
  ['platform-associations', .15, 'parallaxClear'],
  ['evidence', .40, 'archiveClear', 'archiveClose'],
];
for (const [id, p, clearChannel, coverChannel] of swaps) {
  const before = frame(id, p - 1e-7), after = frame(id, p);
  assert.equal(before.contentOpacity, 0, `${id}: source remains until the authored swap`);
  assert.equal(after.contentOpacity, 1, `${id}: target swap is a cut, not a fade`);
  assert.equal(after[clearChannel], 0, `${id}: the clearing mask has not opened at the swap`);
  if (coverChannel) assert.equal(after[coverChannel], 1, `${id}: cover is fully present at the swap`);
  assert.equal(after.exposure, 1);
  assert.equal(after.interactionReady, 0, 'an opaque underlay does not expose its links');
}
for (const [id, end] of [['timing', .98], ['scores', .96], ['attempt-scores', .96],
  ['midterm-associations', .96], ['platform-associations', .96], ['evidence', .76]]) {
  assert.deepEqual(frame(id, end), frame(id, 1), `${id}: the readable landing starts before the boundary`);
}

// Each mechanism has a distinct, observable action, not merely different parameters.
const portalA = frame('timing', .32), portalB = frame('timing', .42);
for (const key of ['portalScale', 'portalX', 'portalY']) assert.equal(portalA[key], portalB[key], 'the aperture camera arrests');
assert.ok(portalB.followProgress > portalA.followProgress, 'Follow continues sideways during the camera arrest');
assert.equal(portalA.followOpacity, 1);
assert.equal(portalB.followOpacity, 1);
assert.equal(frame('timing', .71).portalLanding, 1, 'opaque landing cover precedes the chart swap');

assert.deepEqual(frame('scores', .301), frame('scores', .339), 'the press has a real dead stop');
assert.ok(frame('scores', .35).pressRight > 0, 'right boundary breaks first');
assert.equal(frame('scores', .35).pressLeft, 0, 'left boundary initially stays rigid');
assert.equal(frame('scores', .50).pressStrip, 1, 'the unchanged fact strip has a reading beat');
assert.equal(frame('scores', .50).bridgeOpacity, 1);
assert.equal(frame('scores', .84).bridgeOpacity, 0, 'fact strip swaps away under the opaque landing cover');

assert.ok(frame('attempt-scores', .12).cameraY > frame('attempt-scores', 0).cameraY, 'camera first anticipates upward');
assert.ok(frame('attempt-scores', .50).cameraY < frame('attempt-scores', .30).cameraY, 'camera drops along the exterior');
assert.deepEqual(frame('attempt-scores', .53), frame('attempt-scores', .57), 'the exterior camera fully stops before docking');
assert.ok(frame('attempt-scores', .74).cameraX > frame('attempt-scores', .59).cameraX, 'docking is lateral');
assert.equal(frame('attempt-scores', .80).cameraYaw, 0, 'the figure plane lands front-on');
assert.equal(frame('attempt-scores', .80).cameraPitch, 90, 'horizontal target slab is viewed front-on from above');

assert.deepEqual(frame('midterm-associations', .46), frame('midterm-associations', .65), 'all three checks have one stable common underlay');
assert.equal(frame('midterm-associations', .70).contentOpacity, 0, 'full chart does not replace the checks before occlusion');
assert.equal(frame('midterm-associations', .79).bridgeOpacity, 0);
assert.equal(frame('midterm-associations', .79).folioClose, 1, 'the chart exchange remains covered');

assert.deepEqual(frame('platform-associations', .49), frame('platform-associations', .56), 'parallax separation has a still inspection beat');
assert.ok(frame('platform-associations', .27).parallaxX < 0, 'parallax anticipates left');
assert.ok(frame('platform-associations', .75).parallaxX > .60, 'parallax resolves right');
assert.equal(frame('platform-associations', .50).camera, 0, 'no inherited forward tunnel motion');
assert.equal(frame('platform-associations', .90).seam, 0, 'the old seam collapse is disabled');
for (const id of ['attempt-scores', 'platform-associations']) {
  assert.equal(frame(id, .70).spatialClear, 0, 'spatial field remains opaque until the authored final reveal');
  assert.equal(frame(id, .96).spatialClear, 1);
}
assert.equal(frame('evidence', .50).titleOpacity, 0, 'ending does not replay a giant title impact');
assert.equal(frame('evidence', .76).archiveRule, 0, 'the decorative rule is handed off before the final hold');

console.log(`PASS: ${sampled} finite scene frames, stable numeric schema, opaque swaps, reverse seeks, authored stops and clean chart landings`);
