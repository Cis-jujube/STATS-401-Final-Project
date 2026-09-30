// Authored, reversible scene scores. Every channel is a function of the playhead.
// Geometry is decorative; complete figures remain at their final DOM coordinates.
(() => {
  'use strict';
  const clamp = x => Math.max(0, Math.min(1, x));
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const smooth = x => x * x * (3 - 2 * x);
  const move = (p, a, b) => smooth(range(p, a, b));
  const mix = (a, b, p) => a + (b - a) * p;
  // Finite support makes the press genuinely still between authored impacts.
  const recoil = (p, a, b) => {
    const u = range(p, a, b);
    return Math.sin(u * Math.PI * 2) * (1 - u);
  };
  const shots = {
    timing: 'portal', scores: 'press', 'attempt-scores': 'stack',
    'midterm-associations': 'papers', 'platform-associations': 'seam', evidence: 'archive',
  };
  const clearEnds = {portal: .98, press: .96, stack: .96, papers: .96, seam: .96, archive: .76};
  const neutral = {
    reveal: 1, exposure: 0, contentOpacity: 1, interactionReady: 1,
    bridgeOpacity: 0, chartEntry: 0,
    titleOpacity: 0, titleScale: 1, titleX: 0, titleY: 0, titleTurn: 0, titleStretch: 1,
    wallOpacity: 0, wallTravel: 0, wallGap: 1, release: 0, pressure: 0, seam: 0, wipe: 0,
    camera: 0, trail: 0,
    portalScale: 1, portalX: 0, portalY: 0, portalOpen: 1, portalLanding: 0,
    followProgress: 1, followOpacity: 0,
    pressWidth: 1, pressRupture: 0, pressLeft: 0, pressRight: 0, pressStrip: 0, pressClear: 1,
    pressLanding: 0,
    cameraX: 0, cameraY: 0, cameraYaw: 0, cameraPitch: 0, cameraRoll: 0,
    dock: 0, stackClear: 1, spatialClear: 0,
    folioCover: 0, folioHinge: 0, folioUncover: 0, folioClose: 0, folioClear: 1,
    parallaxX: 0, parallaxSpread: 0, parallaxClear: 1,
    archiveClose: 0, archiveTurn: 0, archiveRule: 0, archiveClear: 1,
  };

  function portal(f, p) {
    const firstPush = move(p, .10, .31), crossing = move(p, .43, .68);
    f.portalScale = 1 + firstPush * 8 + crossing * 16;
    f.portalX = -.24 * (1 - firstPush);
    f.portalY = -.04 * (1 - firstPush);
    f.followProgress = move(p, .21, .68);
    f.followOpacity = move(p, .18, .23) * (1 - move(p, .66, .72));
    f.portalLanding = Number(p >= .70);
    f.portalOpen = move(p, .74, .98);
    f.contentOpacity = Number(p >= .74);
    f.reveal = f.portalOpen;
  }

  function press(f, p) {
    f.pressWidth = clamp(1 - .30 * move(p, .08, .18) - .16 * move(p, .20, .235)
      - .14 * move(p, .27, .30) + .04 * recoil(p, .08, .18)
      + .025 * recoil(p, .20, .235) + .02 * recoil(p, .27, .30));
    f.pressRupture = move(p, .34, .43);
    f.pressRight = move(p, .34, .40);
    f.pressLeft = move(p, .36, .43);
    f.pressStrip = Number(p >= .40 && p < .84);
    f.pressLanding = Number(p >= .84);
    f.pressClear = move(p, .84, .96);
    f.bridgeOpacity = Number(p < .84);
    f.contentOpacity = Number(p >= .84);
    f.titleOpacity = Number(p < .43);
    f.titleStretch = f.pressWidth;
    f.titleScale = 1 + .05 * recoil(p, .08, .18) + .04 * recoil(p, .20, .235)
      + .03 * recoil(p, .27, .30);
    f.pressure = clamp((1 - f.pressWidth) / .6);
    f.release = f.pressRupture;
    f.reveal = f.pressClear;
  }

  function stack(f, p) {
    const dropA = range(p, .29, .44) ** 2, dropB = range(p, .44, .52) ** 2;
    f.cameraY = .1 * move(p, 0, .12) - 1.25 * dropA - 1.05 * dropB;
    f.dock = move(p, .58, .76);
    f.cameraX = .18 * f.dock;
    f.cameraYaw = mix(-28, 14, move(p, .12, .52)) * (1 - f.dock);
    // The slabs are horizontal: a top-down camera makes the target face frontal.
    f.cameraPitch = mix(22, 90, f.dock);
    f.trail = Math.sin(Math.PI * range(p, .29, .52));
    // Eliminate floating-point tails outside the fast drop itself.
    if (p <= .29 || p >= .52) f.trail = 0;
    f.stackClear = move(p, .76, .96);
    f.spatialClear = f.stackClear;
    f.contentOpacity = Number(p >= .12);
    f.titleOpacity = Number(p >= .12 && p < .58);
    f.camera = .8 * move(p, .12, .52) + .2 * f.dock;
    f.reveal = f.stackClear;
  }

  function folio(f, p) {
    f.folioCover = move(p, 0, .12);
    f.folioHinge = move(p, .12, .45);
    f.folioUncover = move(p, .29, .45);
    f.folioClose = move(p, .66, .78);
    f.folioClear = move(p, .82, .96);
    f.bridgeOpacity = Number(p < .78);
    f.contentOpacity = Number(p >= .78);
    f.reveal = f.folioClear;
  }

  function parallax(f, p) {
    // The historical shot ID is retained, but there is no slit or forward dive.
    f.parallaxX = -.06 * move(p, .15, .28) + .38 * move(p, .28, .48)
      + .33 * move(p, .57, .76);
    f.parallaxSpread = move(p, .28, .48);
    f.parallaxClear = move(p, .76, .96);
    f.spatialClear = f.parallaxClear;
    f.contentOpacity = Number(p >= .15);
    f.titleOpacity = Number(p >= .02 && p < .57);
    f.reveal = f.parallaxClear;
  }

  function archive(f, p) {
    f.archiveClose = move(p, 0, .22);
    f.archiveTurn = move(p, .22, .40);
    f.archiveRule = move(p, .40, .76);
    f.archiveClear = move(p, .40, .76);
    f.contentOpacity = Number(p >= .40);
    f.reveal = f.archiveClear;
  }

  const score = {portal, press, stack, papers: folio, seam: parallax, archive};
  function frame(id, progress) {
    const p = Number.isNaN(progress) ? 0 : clamp(progress);
    const shot = shots[id] || 'archive';
    const f = {shot, ...neutral};
    if (shot === 'stack' || shot === 'seam') f.spatialClear = 1;
    if (p >= clearEnds[shot]) return f;
    f.exposure = 1;
    f.interactionReady = 0;
    f.reveal = 0;
    f.contentOpacity = 0;
    score[shot](f, p);
    return f;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {frame, shots};
  else globalThis.PresentationChoreography = {frame, shots};
})();
