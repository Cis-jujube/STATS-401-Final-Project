/* Core for the data film: math, easing, seeded randomness, shared state, tooltip, layout.
   Every scene renders as a pure function of its local time t (seconds) plus the
   viewer's interaction state, so any frame can be paused, scrubbed or deep-linked. */
(function () {
  const F = (window.Film = {});
  const D = window.CS201;

  // ── math & easing ────────────────────────────────────────────────
  F.clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  F.lerp = (a, b, p) => a + (b - a) * p;
  F.ease = {
    linear: (p) => p,
    inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    out: (p) => 1 - Math.pow(1 - p, 3),
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    inExpo: (p) => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10)),
    outBack: (p) => 1 + 2.4 * Math.pow(p - 1, 3) + 1.4 * Math.pow(p - 1, 2),
    in: (p) => p * p * p,
  };
  /** Eased progress of t through [a, b]. */
  F.seg = (t, a, b, e = F.ease.inOut) => e(F.clamp((t - a) / (b - a)));
  /** Staggered progress for item i of n inside [a, b]; spread is the stagger share of the window. */
  F.stagger = (t, a, b, i, n, spread = 0.5, e = F.ease.inOut) => {
    const w = (b - a) * (1 - spread);
    const s = a + (n > 1 ? (i / (n - 1)) * (b - a) * spread : 0);
    return e(F.clamp((t - s) / w));
  };
  /** Frame-rate independent smoothing toward a target. */
  F.approach = (cur, target, dt, rate = 9) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
  F.rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  /** Terminal-style decode: characters settle left to right as p goes 0→1; unsettled ones cycle
      through glyphs. Pure function of (text, p, tick) so it scrubs deterministically. */
  const GLYPHS = '01<>/{}[]#*+=_~ABCDEFGHJKLMNPQRSTUVWXYZ';
  F.decode = (text, p, tick) => {
    if (p >= 1 || !text) return text || '';
    const n = text.length, k = Math.floor(F.clamp(p) * n);
    let out = '';
    for (let i = 0; i < n; i++) {
      const ch = text[i];
      out += i < k || ch === ' ' || ch === '·' ? ch : GLYPHS[(i * 7 + tick * 13 + i * i * 3) % GLYPHS.length];
    }
    return out;
  };
  F.gauss = (r) => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  // ── palette ──────────────────────────────────────────────────────
  F.HW = ['HW1', 'HW2', 'HW3', 'HW4'];
  F.color = { HW1: '#3987e5', HW2: '#199e70', HW3: '#d4a017', HW4: '#e07bb0' };
  F.ink = '#ece7dd'; F.ink2 = '#b3b8c3'; F.muted = '#767d8c'; F.signal = '#ff6a3d'; F.ember = '#ffb547'; F.withheld = '#5b6273'; F.bg = '#07090d';
  F.ember_ramp = d3.scaleSequential(d3.piecewise(d3.interpolateRgb.gamma(1.6), ['#2a1a14', '#7a2d14', '#d4561c', '#ff9f3a', '#ffe2a6']));

  // ── formatting ───────────────────────────────────────────────────
  F.fmt = { int: d3.format(','), p1: d3.format('.1f'), pct: (v) => d3.format('.1f')(v) + '%', rho: (v) => (v < 0 ? '−' : '+') + d3.format('.2f')(Math.abs(v)) };
  F.time = (s) => { s = Math.max(0, Math.round(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  /** Human-readable problem name: strip course prefixes, split camel case. */
  F.problemName = (name) => {
    let n = name.replace(/^\d+s\d+HW\d-/, '').replace(/^HW\d-/, '').replace(/^Exercise[\d.]+[- ]/, '');
    n = n.replace(/Consective/, 'Consecutive');
    return n.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
  };

  // ── data helpers ─────────────────────────────────────────────────
  F.data = D;
  const hw = D.homework;
  F.assign = Object.fromEntries(hw.assignments.map((a) => [a.homework, a]));
  F.windowOf = (ms) => hw.assignments.find((a) => ms >= Date.parse(a.start_local) && ms <= Date.parse(a.end_local));
  F.byProblem = Object.fromEntries(hw.event_progress.by_problem.map((r) => [r.problem_id, r]));
  F.progress = Object.fromEntries(hw.score_progression.map((r) => [r.problem_id, r]));

  // ── shared interaction state (coordinated across every scene) ─────
  const listeners = {};
  F.state = { lens: null, selected: null };
  F.on = (key, fn) => (listeners[key] = listeners[key] || []).push(fn);
  F.set = (key, value) => {
    if (F.state[key] === value) return;
    F.state[key] = value;
    (listeners[key] || []).forEach((fn) => fn(value));
  };
  /** Alpha multiplier for an element that belongs to homework h under the current lens. */
  F.lensAlpha = (h) => (!F.state.lens || F.state.lens === h ? 1 : 0.14);

  // ── layout: shared by CSS placement, particles and every scene ─────
  F.layout = {};
  F.computeLayout = () => {
    const W = window.innerWidth || 1280, H = window.innerHeight || 800; // a hidden frame can report 0×0
    const narrow = W < 820 || W / H < 1;
    const L = { W, H, narrow, top: narrow ? 64 : 78, bottom: narrow ? 74 : 86 };
    if (!narrow) {
      const pad = Math.max(18, Math.min(56, W * 0.034));
      const capW = Math.min(440, Math.max(300, W * 0.29));
      L.caption = { x: pad, y: L.top + 20, w: capW, h: H - L.top - L.bottom - 20 };
      const cx = pad + capW + Math.max(36, W * 0.035);
      L.chart = { x: cx, y: L.top + 26, w: W - cx - pad, h: H - L.top - L.bottom - 40 };
    } else {
      const pad = 18;
      const capH = Math.min(230, H * 0.34);
      L.caption = { x: pad, y: H - L.bottom - capH, w: W - pad * 2, h: capH };
      L.chart = { x: pad, y: L.top + 34, w: W - pad * 2, h: H - L.top - 34 - capH - L.bottom - 16 };
    }
    // never hand scenes a degenerate box (tiny windows would produce negative SVG sizes)
    L.chart.w = Math.max(160, L.chart.w); L.chart.h = Math.max(180, L.chart.h);
    Object.assign(F.layout, L);
    return F.layout;
  };

  // ── tooltip ──────────────────────────────────────────────────────
  const tip = () => document.getElementById('tooltip');
  F.tip = {
    show(html, ev) {
      const el = tip(); el.innerHTML = html; el.hidden = false;
      F.tip.move(ev);
    },
    move(ev) {
      const el = tip(); if (el.hidden || !ev) return;
      const r = el.getBoundingClientRect();
      let x = ev.clientX + 16, y = ev.clientY + 16;
      if (x + r.width > window.innerWidth - 10) x = ev.clientX - r.width - 16;
      if (y + r.height > window.innerHeight - 76) y = ev.clientY - r.height - 12;
      el.style.transform = `translate(${Math.max(8, x)}px, ${Math.max(8, y)}px)`;
    },
    hide() { tip().hidden = true; },
    /** Build tooltip markup: kicker (with color dot), title, rows of [label, value], note. */
    html({ kicker, color, title, rows = [], note }) {
      return `<div class="tt-k">${color ? `<i style="background:${color}"></i>` : ''}${kicker || ''}</div>` +
        (title ? `<div class="tt-t">${title}</div>` : '') +
        (rows.length ? `<dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` : '') +
        (note ? `<div class="tt-n">${note}</div>` : '');
    },
  };

  // ── small DOM helpers for scenes ──────────────────────────────────
  /** Segmented control. options: [[value, label]], onPick(value) */
  F.segmented = (parent, label, options, onPick) => {
    const wrap = document.createElement('div');
    wrap.style.display = 'inline-flex'; wrap.style.alignItems = 'center'; wrap.style.gap = '12px';
    if (label) { const l = document.createElement('span'); l.className = 'ctrl-label'; l.textContent = label; wrap.appendChild(l); }
    const seg = document.createElement('div'); seg.className = 'seg'; seg.setAttribute('role', 'group'); if (label) seg.setAttribute('aria-label', label);
    const buttons = options.map(([value, text]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.dataset.value = value;
      b.addEventListener('click', (e) => { e.stopPropagation(); onPick(value); F.userTookWheel && F.userTookWheel(); });
      seg.appendChild(b); return b;
    });
    wrap.appendChild(seg); parent.appendChild(wrap);
    return { el: wrap, set(value) { buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === String(value)))); } };
  };

  /** Draggable, continuous stage slider with labelled stops (a scrubbable "time machine" for scores).
      onChange(value, dragging) receives a float in [0, stops.length - 1]. */
  F.stageSlider = (parent, stops, onChange) => {
    const wrap = document.createElement('div'); wrap.className = 'stage-slider';
    const lab = document.createElement('span'); lab.className = 'ctrl-label'; lab.textContent = 'Stage'; wrap.appendChild(lab);
    const box = document.createElement('div'); box.className = 'ss-box'; wrap.appendChild(box);
    const input = document.createElement('input');
    Object.assign(input, { type: 'range', min: 0, max: stops.length - 1, step: 0.001, value: stops.length - 1 });
    input.setAttribute('aria-label', 'Score stage: ' + stops.join(', '));
    box.appendChild(input);
    const fill = document.createElement('i'); fill.className = 'ss-fill'; box.insertBefore(fill, input);
    const ticks = document.createElement('div'); ticks.className = 'ss-ticks'; box.appendChild(ticks);
    const tickEls = stops.map((name, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = name; b.style.left = `${(i / (stops.length - 1)) * 100}%`;
      b.addEventListener('click', (e) => { e.stopPropagation(); onChange(i, false); F.userTookWheel && F.userTookWheel(); });
      ticks.appendChild(b); return b;
    });
    let dragging = false;
    input.addEventListener('pointerdown', (e) => { e.stopPropagation(); dragging = true; F.userTookWheel && F.userTookWheel(); });
    input.addEventListener('input', () => onChange(+input.value, dragging));
    input.addEventListener('change', () => { dragging = false; onChange(+input.value, false); });
    input.addEventListener('click', (e) => e.stopPropagation());
    parent.appendChild(wrap);
    return {
      el: wrap,
      set(v) {
        if (!dragging && Math.abs(+input.value - v) > 0.0005) input.value = v;
        const f = v / (stops.length - 1);
        fill.style.transform = `scaleX(${f})`;
        tickEls.forEach((b, i) => b.classList.toggle('on', Math.abs(v - i) < 0.5));
      },
    };
  };

  /** Diagonal hatch pattern for withheld (masked) cells. */
  F.hatch = (defs, id, color = '#5b6273', opacity = 0.55, size = 5) => {
    const p = defs.append('pattern').attr('id', id).attr('patternUnits', 'userSpaceOnUse').attr('width', size).attr('height', size).attr('patternTransform', 'rotate(45)');
    p.append('rect').attr('width', size).attr('height', size).attr('fill', 'rgba(91,98,115,0.08)');
    p.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', size).attr('stroke', color).attr('stroke-width', 1.2).attr('stroke-opacity', opacity);
    return `url(#${id})`;
  };

  /** Glow filter for highlighted marks. */
  F.glow = (defs, id, std = 3.5) => {
    const f = defs.append('filter').attr('id', id).attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    f.append('feGaussianBlur').attr('stdDeviation', std).attr('result', 'b');
    const m = f.append('feMerge'); m.append('feMergeNode').attr('in', 'b'); m.append('feMergeNode').attr('in', 'SourceGraphic');
    return `url(#${id})`;
  };

  F.scenes = [];
  F.scene = (def) => F.scenes.push(def);
})();
