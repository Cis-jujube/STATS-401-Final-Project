// Unlabelled stage architecture only. No geometry represents students or scores.
// Every vertex comes from the shared playhead; this module owns no animation loop.
(() => {
  'use strict';
  const clamp = x => Math.max(0, Math.min(1, x));
  const degrees = Math.PI / 180;
  const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
  const near = .18;
  const palette = {top: '#ddd2bd', front: '#796e5e', side: '#352f29', line: '#f8e8cf'};

  // Clip before division: crossing the near plane must not invert a solid face.
  function clipNear(points) {
    const clipped = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      const aInside = a.z >= near, bInside = b.z >= near;
      if (aInside) clipped.push(a);
      if (aInside !== bInside) {
        const t = (near - a.z) / (b.z - a.z);
        clipped.push({x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: near});
      }
    }
    return clipped;
  }

  function projectFaces(faces, width, height, view) {
    const scale = Math.min(width, height);
    const yaw = finite(view.yaw) * degrees, pitch = finite(view.pitch) * degrees;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    return faces.map((face, order) => {
      const points = face.points.map(([x, y, z]) => {
        const dx = x - view.x, dy = y - view.y;
        const rx = cy * dx + sy * z, rz = -sy * dx + cy * z;
        return {x: rx, y: cp * dy - sp * rz, z: view.distance + sp * dy + cp * rz};
      });
      const clipped = clipNear(points);
      return {...face, order, depth: points.reduce((sum, point) => sum + point.z, 0) / points.length,
        points: clipped.map(point => ({
          x: width / 2 + scale * (view.focal * point.x / point.z + (view.track || 0)),
          y: height * .49 - scale * view.focal * point.y / point.z,
        }))};
    }).filter(face => face.points.length >= 3)
      .sort((a, b) => b.depth - a.depth || a.order - b.order);
  }

  function slab(faces, id, x, y, halfWidth, depth, clear) {
    const left = x - halfWidth, right = x + halfWidth, back = .57, front = back - depth;
    const bottom = y - .065;
    const shift = (id % 2 ? 1 : -1) * clear * (halfWidth * 2 + 1.8);
    const point = (px, py, pz) => [px + shift, py, pz];
    faces.push(
      {id, kind: 'slab-top', fill: palette.top, points: [point(left,y,front),point(right,y,front),point(right,y,back),point(left,y,back)]},
      {id, kind: 'slab-front', fill: palette.front, points: [point(left,y,front),point(left,bottom,front),point(right,bottom,front),point(right,y,front)]},
      {id, kind: 'slab-side', fill: palette.side, points: [point(right,y,front),point(right,bottom,front),point(right,bottom,back),point(right,y,back)]},
    );
  }

  function beam(faces, id, x, y, w, h, depth, clear, layer, mobile) {
    // Precompensation registers disjoint pieces in the front view. Moving only
    // camera X reveals their depths; dimensions and camera distance never change.
    const distance = 2.8, focal = 2.4, k = (distance + depth) / focal;
    const shift = (layer % 2 ? 1 : -1) * clear * (mobile ? 1.8 : 2.5);
    const left = x * k + shift, right = (x + w) * k + shift;
    const top = y * k, bottom = (y - h) * k, back = depth + .075;
    faces.push(
      {id, kind: 'beam-face', layer, fill: palette.top, points: [[left,top,depth],[left,bottom,depth],[right,bottom,depth],[right,top,depth]]},
      {id, kind: 'beam-edge', layer, fill: palette.front, points: [[right,top,depth],[right,bottom,depth],[right,bottom,back],[right,top,back]]},
      {id, kind: 'beam-edge', layer, fill: palette.side, points: [[left,bottom,depth],[left,bottom,back],[right,bottom,back],[right,bottom,depth]]},
    );
  }

  function geometry({width, height, progress = 0, shot, frame = {}}) {
    if (!(width > 0) || !(height > 0) || !Number.isFinite(width + height)) return [];
    if (shot !== 'stack' && shot !== 'seam' && shot !== 'parallax') return [];
    const clear = clamp(finite(frame.spatialClear, finite(shot === 'stack' ? frame.stackClear : frame.parallaxClear)));
    if (clear >= 1 || progress >= 1) return [];
    const faces = [], mobile = width < 701;
    if (shot === 'stack') {
      const halfWidth = Math.max(.64, width / Math.min(width, height) * .48);
      // Unequal spacing and widths avoid a numbered sequence of attempts.
      const levels = [.95, .55, .09, -.45, -1.04, -1.62, -2.2];
      levels.forEach((y, id) => slab(faces, id, id % 2 ? -.13 : .16, y,
        halfWidth * [1,.94,1.08,.9,1.02,.96,1.12][id], .82 + (id % 3) * .13, clear));
      return projectFaces(faces, width, height, {
        x: finite(frame.cameraX), y: finite(frame.cameraY), yaw: finite(frame.cameraYaw, -28),
        pitch: finite(frame.cameraPitch, 22), distance: 3.2, focal: 2.35,
      });
    }
    // Incomplete off-centre frames initially appear interlocked. No labels,
    // source-specific colors or data dots suggest that these are observations.
    const depths = mobile ? [-1.0, -.05, 1.3] : [-1.0, -.35, .45, 1.3];
    const shapes = mobile ? [
      [[-.46,.46,.92,.08],[-.46,.46,.08,.5],[-.46,.04,.46,.08]],
      [[.38,.46,.08,.5],[-.04,.46,.08,.84],[0,.04,.46,.08]],
      [[-.46,-.38,.92,.08],[-.46,.04,.08,.5],[.38,.04,.08,.5]],
    ] : [
      [[-.46,.46,.46,.08],[-.46,.46,.08,.5],[-.46,.04,.46,.08]],
      [[0,.46,.46,.08],[.38,.46,.08,.5],[-.04,.46,.08,.5]],
      [[0,-.38,.46,.08],[.38,.04,.08,.5],[0,.04,.46,.08]],
      [[-.46,-.38,.46,.08],[-.46,.04,.08,.5],[-.04,.04,.08,.5]],
    ];
    depths.forEach((depth, layer) => shapes[layer].forEach(([x,y,w,h], i) =>
      beam(faces, layer * 3 + i, x, y, w, h, depth, clear, layer, mobile)));
    const x = finite(frame.parallaxX);
    return projectFaces(faces, width, height, {x, y: 0, yaw: 0, pitch: 0,
      distance: 2.8, focal: 2.4, track: x * .72});
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = {geometry, clipNear};
  const canvas = typeof document === 'undefined' ? null : document.querySelector('#presentation-energy');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  let previousKey = '';
  function render({width, height, progress = 0, shot = 'portal', frame = {}}) {
    if (!(width > 0) || !(height > 0) || !Number.isFinite(width + height)) return;
    const ratio = Math.min(Math.max(finite(globalThis.devicePixelRatio, 1), 1), 1.5);
    const active = shot === 'stack' || shot === 'seam' || shot === 'parallax';
    const state = [frame.cameraX,frame.cameraY,frame.cameraYaw,frame.cameraPitch,
      frame.parallaxX,frame.spatialClear,frame.stackClear,frame.parallaxClear];
    const key = JSON.stringify([width,height,ratio,active ? shot : 'clear',progress >= 1,...(active ? state : [])]);
    if (key === previousKey) return;
    previousKey = key;
    const w = Math.round(width * ratio), h = Math.round(height * ratio);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!active) return;
    ctx.lineJoin = 'round'; ctx.lineWidth = .8; ctx.strokeStyle = palette.line;
    for (const face of geometry({width,height,progress,shot,frame})) {
      ctx.beginPath();
      face.points.forEach((point, i) => i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
      ctx.closePath(); ctx.fillStyle = face.fill; ctx.fill(); ctx.stroke();
    }
  }
  globalThis.PresentationEffects = {render};
})();
