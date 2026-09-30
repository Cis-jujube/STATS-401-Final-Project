/* Abstract wire geometry, not student records. Drawn only by the scroll clock. */
(() => {
  'use strict';
  const canvas = document.querySelector('#journey-field');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  let previousKey = '';
  const {clamp, ease} = StoryMotion;
  const mix = (a, b, t) => a + (b - a) * t;
  function render({width, height, progress, visible, motion}) {
    if (!visible || !motion || !width || !height) { previousKey = ''; return; }
    // Bound raster work on Retina displays; use deterministic positions on reversal.
    const ratio = Math.min(globalThis.devicePixelRatio || 1, 1.5);
    const key = `${Math.round(width)}:${Math.round(height)}:${ratio}:${progress.toFixed(4)}`;
    if (key === previousKey) return;
    previousKey = key;
    const w = Math.round(width * ratio), h = Math.round(height * ratio);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const p = ease(clamp(progress));
    const turn = (p - .5) * .65;
    const centerX = width * (.56 - p * .12);
    const centerY = height * (.48 + p * .08);
    const rings = width < 701 ? 10 : 18;
    ctx.strokeStyle = '#f4f2e9';
    ctx.lineWidth = .7;
    // Nested tilted ellipses recede into a shallow tunnel behind the headline.
    for (let i = 0; i < rings; i++) {
      const depth = (i + 1) / rings;
      const scale = .14 + depth * depth * 1.35;
      ctx.globalAlpha = .08 + depth * .17;
      ctx.beginPath();
      for (let j = 0; j <= 72; j++) {
        const angle = j / 72 * Math.PI * 2;
        const x = Math.cos(angle) * width * .49 * scale;
        const y = Math.sin(angle) * height * .74 * scale;
        const px = centerX + x * Math.cos(turn) - y * Math.sin(turn);
        const py = centerY + x * Math.sin(turn) * .25 + y * Math.cos(turn);
        if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    // Sparse light flecks resolve into a margin grid as the reader moves onward.
    // The count is a decoration budget, deliberately unrelated to cohort counts.
    ctx.fillStyle = '#f4f2e9';
    const count = width < 701 ? 48 : 112;
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399963 + p * .8;
      const radius = Math.sqrt((i + 1) / count);
      const x = centerX + Math.cos(angle) * width * .56 * radius;
      const y = centerY + Math.sin(angle) * height * .7 * radius;
      const targetX = width * (.06 + (i % 28) / 27 * .88);
      const targetY = height * (i < count / 2 ? .13 : .87) + (i % 2) * 9;
      const settle = ease((p - .35) / .65);
      ctx.globalAlpha = .2 + radius * .35;
      ctx.fillRect(mix(x, targetX, settle), mix(y, targetY, settle), 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
  }
  globalThis.StoryCinema = {render};
})();
