/* Submission particles: one dot per in-window homework submission (2,807).
   Scenes declare formations as keyframes on their local timeline; the engine
   blends from the previous formation with per-dot stagger and a curling path.
   Positions are pure functions of time + layout, so scrubbing is exact. */
(function () {
  const F = window.Film;
  const P = (F.particles = {});
  const hw = F.data.homework;
  const counts = hw.assignments.map((a) => a.submissions);
  const N = counts.reduce((a, b) => a + b, 0);
  P.N = N;
  P.counts = counts;

  // identity: particles are ordered by homework, then by rank inside that homework
  const hwIdx = new Uint8Array(N), rank = new Uint16Array(N);
  { let i = 0; counts.forEach((c, h) => { for (let j = 0; j < c; j++, i++) { hwIdx[i] = h; rank[i] = j; } }); }
  P.hwIdx = hwIdx; P.rank = rank;

  // seeded per-dot constants
  const r = F.rng(2807);
  const K = {}; ['sx', 'sy', 'u', 'v', 'd', 'ph', 'curl', 'sz', 'spd', 'gx', 'gy'].forEach((k) => (K[k] = new Float32Array(N)));
  for (let i = 0; i < N; i++) {
    K.sx[i] = r(); K.sy[i] = r(); K.u[i] = r(); K.v[i] = r(); K.d[i] = r(); K.ph[i] = r() * Math.PI * 2;
    K.curl[i] = r() * 2 - 1; K.sz[i] = r(); K.spd[i] = 0.4 + r() * 1.2; K.gx[i] = F.gauss(r); K.gy[i] = F.gauss(r);
  }
  P.K = K;

  // 0–3 homework, 4 withheld, 5 pooled/neutral, 6 new best (ember), 7 ignition flash
  const COLORS = [...F.HW.map((h) => F.color[h]), F.withheld, '#a3abbb', F.ember, '#fff4dc'];
  P.C = { WITHHELD: 4, NEUTRAL: 5, EMBER: 6, FLASH: 7 };
  const buf = () => ({ x: new Float32Array(N), y: new Float32Array(N), a: new Float32Array(N), s: new Float32Array(N), c: new Uint8Array(N), glow: 0, glowSet: null, repel: false });
  const A = buf(), B = buf(), OUT = buf();

  // ── formation registry ───────────────────────────────────────────
  const forms = (P.forms = {});
  P.define = (name, fn) => (forms[name] = fn);
  let layoutVersion = 0;
  const cache = {};
  const cached = (key, make) => { const k = key + ':' + layoutVersion; if (!cache[k]) cache[k] = make(); return cache[k]; };

  function fillIdentityColor(o) { for (let i = 0; i < N; i++) o.c[i] = hwIdx[i]; }

  P.mouseS = { x: 0, y: 0 };
  P.define('star', (o, env) => {
    const { W, H } = F.layout, T = F.wallT ?? env.T; // wall clock: held frames keep breathing
    const alpha = env.kf.alpha ?? 0.5;
    const px = (P.mouseS.x - W / 2) * -0.035, py = (P.mouseS.y - H / 2) * -0.035;
    for (let i = 0; i < N; i++) {
      const depth = 0.25 + K.sz[i] * K.sz[i] * 1.6;
      o.x[i] = K.sx[i] * W + Math.sin(T * 0.07 + K.ph[i]) * 14 + px * depth;
      o.y[i] = ((K.sy[i] * (H + 40) + T * K.spd[i] * 6) % (H + 40)) - 20 + py * depth;
      o.a[i] = alpha * (0.35 + 0.65 * K.sz[i]);
      o.s[i] = 0.9 + K.sz[i] * 1.1;
    }
    fillIdentityColor(o); o.glow = env.kf.glow ?? 0; o.glowSet = null; o.repel = true;
  });

  // ── "100" rasterised into target points ─────────────────────────
  function hundredPoints(box) {
    const w = Math.max(40, Math.round(box.w)), h = Math.max(40, Math.round(box.h));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    let fs = h * 0.95;
    const font = (s) => `620 ${s}px Fraunces, 'Iowan Old Style', Georgia, serif`;
    g.font = font(fs);
    const mw = g.measureText('100').width;
    if (mw > w * 0.96) fs *= (w * 0.96) / mw;
    g.font = font(fs); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#fff';
    const m = g.measureText('100');
    const asc = m.actualBoundingBoxAscent || fs * 0.7, desc = m.actualBoundingBoxDescent || 0;
    g.fillText('100', w / 2, h / 2 + (asc - desc) / 2);
    const img = g.getImageData(0, 0, w, h).data;
    let cnt = 0;
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (img[(y * w + x) * 4 + 3] > 128) cnt++;
    const step = Math.max(1.2, Math.sqrt((cnt * 4) / (N * 1.08)));
    const pts = [];
    for (let y = step / 2; y < h; y += step) for (let x = step / 2; x < w; x += step) if (img[((y | 0) * w + (x | 0)) * 4 + 3] > 128) pts.push(x + box.x, y + box.y);
    // deterministic shuffle so homework colours scatter through the numeral
    const rr = F.rng(100), n = pts.length / 2, idx = d3.range(n);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rr() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const X = new Float32Array(N), Y = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const k = idx[i % n];
      const extra = i >= n ? 1 : 0;
      X[i] = pts[k * 2] + (extra ? (K.u[i] - 0.5) * step : 0);
      Y[i] = pts[k * 2 + 1] + (extra ? (K.v[i] - 0.5) * step : 0);
    }
    return { X, Y, step };
  }
  P.define('hundred', (o, env) => {
    const box = env.kf.box ? env.kf.box(F.layout) : F.layout.chart;
    const key = 'hundred' + [box.x, box.y, box.w, box.h].map(Math.round).join(',');
    const { X, Y, step } = cached(key, () => hundredPoints(box));
    const alpha = env.kf.alpha ?? 0.95, wt = performance.now() / 1000;
    for (let i = 0; i < N; i++) {
      o.x[i] = X[i] + Math.sin(wt * 0.9 + K.ph[i]) * 0.6;
      o.y[i] = Y[i] + Math.cos(wt * 0.8 + K.ph[i]) * 0.6;
      o.a[i] = alpha * (0.72 + 0.28 * K.sz[i]);
      o.s[i] = Math.min(2.6, step * 0.62) * (0.8 + 0.4 * K.sz[i]);
    }
    fillIdentityColor(o); o.glow = env.kf.glow ?? 1; o.glowSet = null; o.repel = true;
  });

  // ── four stacks: a unit chart, one dot per submission ────────────
  P.stackGeom = (L = F.layout) => {
    const box = L.chart, gutterR = L.narrow ? 0.34 : 0.5;
    const top = L.narrow ? 64 : 118, bottom = L.narrow ? 46 : 92, maxN = Math.max(...counts);
    // pick the dots-per-row that gives the largest dot for this box (wide boxes → tall stacks)
    let cols = 22, sp = 0;
    for (let c = 10; c <= 40; c++) {
      const s = Math.min(7.2, (box.h - top - bottom) / Math.ceil(maxN / c), box.w / (4 * c + 3 * c * gutterR));
      if (s > sp + 0.05 || (!L.narrow && c === 22 && s >= sp - 0.05)) { sp = s; cols = c; }
    }
    const colW = cols * sp, gutter = colW * gutterR, total = 4 * colW + 3 * gutter;
    const x0 = box.x + (box.w - total) / 2, base = box.y + box.h - bottom;
    return { cols, sp, colW, gutter, x0, base, xs: F.HW.map((_, h) => x0 + h * (colW + gutter)), heights: counts.map((c) => Math.ceil(c / cols) * sp) };
  };
  P.define('stacks', (o) => {
    const g = P.stackGeom();
    for (let i = 0; i < N; i++) {
      const h = hwIdx[i], j = rank[i];
      o.x[i] = g.xs[h] + (j % g.cols) * g.sp + g.sp / 2;
      o.y[i] = g.base - Math.floor(j / g.cols) * g.sp - g.sp / 2;
      o.a[i] = 0.95 * F.la(F.HW[h]);
      o.s[i] = g.sp * 0.62;
    }
    fillIdentityColor(o); o.glow = 0.25; o.glowSet = null; o.repel = false;
  });

  P.define('ambient', (o, env) => { forms.star(o, { ...env, kf: { alpha: env.kf.alpha ?? 0.16, glow: 0 } }); o.repel = false; });
  P.define('none', (o, env) => { forms.star(o, { ...env, kf: { alpha: 0 } }); o.repel = false; });

  // ── evaluation & blending ────────────────────────────────────────
  function evalForm(target, kf, env) {
    const fn = forms[kf.form] || forms.ambient;
    fn(target, { ...env, kf });
  }
  const DEFAULT_KF = [{ at: 0, form: 'ambient', dur: 2.2 }];
  function keyframes(scene) { return scene && scene.particles ? scene.particles : DEFAULT_KF; }

  /** Blend formation A → B into dst: per-dot stagger and a curling flight path. */
  function blendInto(dst, a, b, tau, spread, curlK) {
    for (let i = 0; i < N; i++) {
      const p = F.ease.inOut(F.clamp((tau - K.d[i] * spread) / (1 - spread)));
      const dx = b.x[i] - a.x[i], dy = b.y[i] - a.y[i];
      const len = Math.hypot(dx, dy) || 1;
      const amp = K.curl[i] * Math.min(len * 0.38, 170) * curlK * Math.sin(Math.PI * p);
      dst.x[i] = a.x[i] + dx * p - (dy / len) * amp;
      dst.y[i] = a.y[i] + dy * p + (dx / len) * amp;
      dst.a[i] = a.a[i] + (b.a[i] - a.a[i]) * p;
      dst.s[i] = a.s[i] + (b.s[i] - a.s[i]) * p;
      dst.c[i] = p < 0.5 ? a.c[i] : b.c[i];
    }
    dst.glow = a.glow + (b.glow - a.glow) * F.clamp(tau);
    dst.glowSet = tau > 0.5 ? b.glowSet : a.glowSet;
    dst.repel = tau > 0.9 ? b.repel : false;
    return dst;
  }

  /** Resolve every dot for scene `sc` at local time t. prev = {scene, t} used for cross-scene hand-off. */
  P.resolve = (sc, t, T, prev) => {
    const kfs = keyframes(sc);
    let j = 0; for (let k = 0; k < kfs.length; k++) if (kfs[k].at <= t) j = k;
    const kf = kfs[j];
    const env = { t, T, scene: sc };
    evalForm(B, kf, env);
    const tau = kf.dur ? (t - kf.at) / kf.dur : 1;
    if (tau >= 1 || (j === 0 && !prev)) return B;
    if (j > 0) evalForm(A, kfs[j - 1], env);
    else { const pk = keyframes(prev.scene); evalForm(A, pk[pk.length - 1], { t: prev.t, T, scene: prev.scene }); }
    return blendInto(OUT, A, B, tau, kf.spread ?? 0.45, kf.curl ?? 1);
  };

  // Loop reel: morph from where the previous shot ended to where this shot is now.
  const SA = buf(), SB = buf(), MIX = buf();
  function copyBuf(dst, src) {
    dst.x.set(src.x); dst.y.set(src.y); dst.a.set(src.a); dst.s.set(src.s); dst.c.set(src.c);
    dst.glow = src.glow; dst.glowSet = src.glowSet; dst.repel = src.repel;
  }
  P.crossfade = (from, to, T, tau, spread = 0.45, curl = 1) => {
    copyBuf(SA, P.resolve(from.scene, from.t, T, null));
    copyBuf(SB, P.resolve(to.scene, to.t, T, null));
    return blendInto(MIX, SA, SB, F.clamp(tau), spread, curl);
  };

  // ── drawing ──────────────────────────────────────────────────────
  let canvas, ctx, dpr = 1;
  P.mouse = { x: -1e4, y: -1e4 };
  P.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  P.init = (el) => {
    canvas = el; ctx = canvas.getContext('2d');
    window.addEventListener('pointermove', (e) => { P.mouse.x = e.clientX; P.mouse.y = e.clientY; }, { passive: true });
    document.addEventListener('pointerleave', () => { P.mouse.x = P.mouse.y = -1e4; });
  };
  P.resize = () => {
    const { W, H } = F.layout;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    layoutVersion++;
    for (const k in cache) delete cache[k];
  };
  P.invalidate = () => { layoutVersion++; for (const k in cache) delete cache[k]; };

  let lastT = null;
  P.draw = (o, T, streak = 0.42) => {
    // trails only for continuous motion; a scrub/seek jump clears the frame outright
    const moving = lastT !== null && Math.abs(T - lastT) > 1e-4 && Math.abs(T - lastT) < 0.25;
    lastT = T;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // fade the previous frame instead of clearing: moving dots leave short comet trails
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(0,0,0,${moving && !P.reduced ? streak : 1})`;
    ctx.fillRect(0, 0, F.layout.W, F.layout.H);
    ctx.globalCompositeOperation = 'source-over';
    const mx = P.mouse.x, my = P.mouse.y, R = 110, repel = o.repel && !P.reduced;
    for (let c = 0; c < COLORS.length; c++) {
      ctx.fillStyle = COLORS[c];
      for (let i = 0; i < N; i++) {
        if (o.c[i] !== c || o.a[i] < 0.01) continue;
        let x = o.x[i], y = o.y[i];
        if (repel) {
          const dx = x - mx, dy = y - my, d2 = dx * dx + dy * dy;
          if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = Math.pow(1 - d / R, 2) * 42; x += (dx / d) * f; y += (dy / d) * f; }
        }
        const s = o.s[i];
        ctx.globalAlpha = o.a[i];
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
    }
    if (o.glow > 0.02) {
      // cheap bloom: a second, larger additive pass
      ctx.globalCompositeOperation = 'lighter';
      for (let c = 0; c < COLORS.length; c++) {
        if (o.glowSet && !o.glowSet.includes(c)) continue;
        ctx.fillStyle = COLORS[c];
        for (let i = 0; i < N; i += 1) {
          if (o.c[i] !== c || o.a[i] < 0.05) continue;
          const s = o.s[i] * 4.2;
          ctx.globalAlpha = 0.05 * o.glow * o.a[i];
          ctx.fillRect(o.x[i] - s / 2, o.y[i] - s / 2, s, s);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  };
})();
