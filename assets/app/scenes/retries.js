/* Figures 11 and 12 · Eligible retries that set a new best, and progress within the window.
   Eligible retry = a completed in-window resubmission after a valid baseline while the
   prior best was below 100. New best = strictly beats every earlier score. Units are retry
   events, not students; particles are aggregate units assigned from the published counts.
   Scene timeline (local seconds):
     0–7    split: first tries / eligible retries / after full marks (2,807 → 1,131 + 1,222 + 454)
     7–24   wait-time waffle: 1,222 squares grouped by elapsed gap; 468 ignite
     24–34  Figure 11 reading view: new-best rates by homework and by gap, as 100% unit strips
     34–51  problems: one circle per visible problem (Showcase)
     51–61  Figure 12 counts: retries and new bests in five equal-duration window phases
     61–71  Figure 12 reading view: the same cells normalised to rates on one 0–100% scale */
(function () {
  const F = window.Film;
  const ev = F.data.homework.event_progress;
  const gaps = ev.by_gap, byHw = ev.by_homework;
  const TOTAL = d3.sum(gaps, (g) => g.eligible_retries), BESTS = d3.sum(gaps, (g) => g.new_bests), RATE = (100 * BESTS) / TOTAL;
  const probs = ev.by_problem.filter((p) => p.state === 'visible').map((p) => ({ ...p, name: F.problemName(p.problem_name), first: F.progress[p.problem_id].first }));
  const phases = ev.by_phase;
  const SPOT_DEFAULT = 169; // EvenOrOdd: the largest loop
  const LABELLED = new Set([169, 851, 871, 366, 1279, 1354]);
  const LABEL_AT = { 169: 'aboveLeft', 851: 'below', 871: 'left' };
  const PH = 27; // the phase views moved 27 s later when the Figure 11 reading view was inserted

  // squares: fixed random layout order + sorted order (new bests first)
  const squares = [];
  {
    const r = F.rng(1222);
    gaps.forEach((g, gi) => {
      const n = g.eligible_retries, perm = d3.shuffle(d3.range(n), r);
      const bestSet = new Set(perm.slice(0, g.new_bests));
      for (let j = 0; j < n; j++) squares.push({ gi, j, best: bestSet.has(j), sortedPos: 0, delay: r() });
      const inGroup = squares.filter((s) => s.gi === gi);
      let k = 0; inGroup.filter((s) => s.best).forEach((s) => (s.sortedPos = k++)); inGroup.filter((s) => !s.best).forEach((s) => (s.sortedPos = k++));
    });
    let rank = 0; const order = d3.shuffle(squares.filter((s) => s.best), F.rng(9)); order.forEach((s) => (s.igniteRank = rank++));
  }

  // views on one continuous index; the timeline crossfades k → k+1 inside each window
  const VIEWS = [['0', 'By gap'], ['1', 'Rates'], ['2', 'Problems'], ['3', 'Counts'], ['4', 'Phase rates']];
  // crossfades start exactly at chapter boundaries, so a reading stop never shows the next view
  const SCHED = [[24, 25.2], [34, 35.2], [51, 52.2], [61, 62.2]];
  const tlViewAt = (t) => { let v = 0; SCHED.forEach(([a, b], k) => { if (t >= a) v = k + F.seg(t, a, b, F.ease.linear); }); return v; };

  const st = { view: 0, userView: null, hover: null, chapterFig: null, route: 'showcase' };
  const O = 7; // the split intro comes first; the waffle and later views keep their timings shifted by O
  let svg, geo, gSplit, gWait, gRates, gPhase, gProb, waitLabels, phaseCells, probDots, ctrlView, ctrlBox, px, py, pr, hatchUrl, RG = null;

  // ── particles: every submission is a first try, a retry, or came after full marks ──
  // Per homework: first tries = attempt-1 events, retries = eligible retries; the rest came
  // after full credit (441) or hit a judge error (13). Totals reconcile to 2,807 exactly.
  const P = F.particles, N = P.N, hwData = F.data.homework;
  const firstH = F.HW.map((h) => hwData.attempt_score_series.find((r) => r.homework === h && r.attempt === 1).submissions);
  const retryH = F.HW.map((h) => byHw.find((r) => r.homework === h).eligible_retries);
  const otherH = F.HW.map((h, i) => P.counts[i] - firstH[i] - retryH[i]);
  const CAT = [firstH, retryH, otherH], CAT_TOTAL = CAT.map((c) => d3.sum(c));
  const cat = new Uint8Array(N), catPos = new Uint16Array(N), retryIdx = new Int16Array(N).fill(-1);
  {
    let r = 0;
    for (let i = 0; i < N; i++) {
      const h = P.hwIdx[i], j = P.rank[i];
      const c = j < firstH[h] ? 0 : j < firstH[h] + retryH[h] ? 1 : 2;
      const within = c === 0 ? j : c === 1 ? j - firstH[h] : j - firstH[h] - retryH[h];
      cat[i] = c; catPos[i] = d3.sum(CAT[c].slice(0, h)) + within;
      if (c === 1) retryIdx[i] = r++; // retry particles become waffle squares, in order
    }
  }
  const AMB = { x: new Float32Array(N), y: new Float32Array(N), a: new Float32Array(N), s: new Float32Array(N), c: new Uint8Array(N) };
  function splitGeom(L) {
    const c = L.chart, top = c.y + (L.narrow ? 96 : 150), bottom = c.y + c.h - (L.narrow ? 40 : 70), gR = L.narrow ? 0.3 : 0.55;
    let cols = 20, sp = 0;
    for (let k = 10; k <= 40; k++) {
      const v = Math.min(7, (bottom - top) / Math.ceil(d3.max(CAT_TOTAL) / k), c.w / (3 * k + 2 * k * gR));
      if (v > sp + 0.05) { sp = v; cols = k; }
    }
    const colW = cols * sp, gut = colW * gR, x0 = c.x + (c.w - (3 * colW + 2 * gut)) / 2;
    return { cols, sp, colW, xs: [0, 1, 2].map((b) => x0 + b * (colW + gut)), base: bottom };
  }
  let SG = null;
  P.define('retries', (o, env) => {
    if (!SG || !geo || !RG) return;
    const t = env.t, tw = t - O, g = geo.w, K = P.K, C = P.C, v = st.view;
    P.forms.star(AMB, { T: env.T, kf: { alpha: 0.14 } });
    const toWaffle = F.seg(t, O + 0.2, O + 2.8, F.ease.linear), dimOthers = F.seg(t, 3.6, 4.6);
    const sortP = F.seg(tw, 9, 11.2), s = g.sq, gap = Math.max(1, s * 0.18);
    for (let i = 0; i < N; i++) {
      const c = cat[i], pos = catPos[i], la = F.la(F.HW[P.hwIdx[i]]);
      // split layout: three unit blocks, homework colours kept (exact per homework)
      const sx = SG.xs[c] + (pos % SG.cols) * SG.sp + SG.sp / 2, sy = SG.base - Math.floor(pos / SG.cols) * SG.sp - SG.sp / 2;
      const sa = (c === 1 ? 0.95 : F.lerp(0.95, 0.4, dimOthers)) * la;
      const pi = F.ease.inOut(F.clamp(toWaffle * 1.5 - K.d[i] * 0.5));
      let x, y, a, sz, col;
      if (c === 1) {
        // waffle square: pooled across homeworks, so the colour turns neutral
        const q = squares[retryIdx[i]], x0 = g.xs[q.gi];
        const pa = [x0 + (q.j % g.cols) * s, g.base - Math.floor(q.j / g.cols) * s - s];
        const pb = [x0 + (q.sortedPos % g.cols) * s, g.base - Math.floor(q.sortedPos / g.cols) * s - s];
        const qp = F.ease.inOut(F.clamp(sortP * 1.4 - q.delay * 0.4));
        const wx = F.lerp(pa[0], pb[0], qp) + s / 2, wy = F.lerp(pa[1], pb[1], qp) + s / 2;
        let wc = C.NEUTRAL, wa = 0.34, ws = s - gap;
        if (q.best) {
          const ig = 3.2 + (q.igniteRank / BESTS) * 3.4;
          if (tw >= ig) { const fl = Math.max(0, 1 - (tw - ig) / 0.35); wc = fl > 0.4 ? C.FLASH : C.EMBER; wa = 1; ws = (s - gap) * (1 + 0.55 * fl); }
        }
        x = F.lerp(sx, wx, pi); y = F.lerp(sy, wy, pi); a = F.lerp(sa, wa, pi); sz = F.lerp(SG.sp * 0.66, ws, pi); col = pi > 0.5 ? wc : P.hwIdx[i];
        // Figure 11 reading view: the same squares re-flow into a 100% strip per gap group (lit first)
        if (v > 0.001) {
          const sp = stripPos(RG.gap[q.gi], q.sortedPos), u = F.ease.inOut(F.clamp(Math.min(1, v) * 1.45 - K.d[i] * 0.45));
          x = F.lerp(x, sp[0], u); y = F.lerp(y, sp[1], u); a = F.lerp(a, q.best ? 1 : 0.45, u); sz = F.lerp(sz, RG.gap[q.gi].dot, u);
          if (u > 0.5) col = q.best ? C.EMBER : C.NEUTRAL;
        }
      } else {
        x = F.lerp(sx, AMB.x[i], pi); y = F.lerp(sy, AMB.y[i], pi); a = F.lerp(sa, AMB.a[i], pi); sz = F.lerp(SG.sp * 0.66, AMB.s[i], pi); col = P.hwIdx[i];
      }
      // past the rates view every unit returns to the ambient field
      const out = F.ease.inOut(F.clamp((v - 1) * 1.5 - K.d[i] * 0.5));
      o.x[i] = F.lerp(x, AMB.x[i], out); o.y[i] = F.lerp(y, AMB.y[i], out); o.a[i] = F.lerp(a, AMB.a[i], out); o.s[i] = F.lerp(sz, AMB.s[i], out);
      o.c[i] = out > 0.5 ? P.hwIdx[i] : col;
    }
    const lit = toWaffle > 0.5 ? 1 - F.clamp(v - 1) : 0.25 * (1 - F.clamp(v - 1));
    o.glow = lit * (v > 0.5 ? 0.55 : 1); o.glowSet = toWaffle > 0.5 ? [C.EMBER, C.FLASH] : null; o.repel = false;
  });

  function waffleGeom(L) {
    const c = L.chart, cols = L.narrow ? 10 : 14, top = c.y + 110, bottom = c.y + c.h - 70;
    const maxRows = Math.ceil(d3.max(gaps, (g) => g.eligible_retries) / cols);
    const gw = (c.w - 40) / gaps.length;
    const sq = Math.max(3, Math.min(11, (bottom - top) / maxRows, (gw - 24) / cols));
    const xs = gaps.map((g, i) => c.x + 20 + i * gw + (gw - cols * sq) / 2);
    return { cols, sq, xs, base: bottom, gw };
  }

  // ── Figure 11 reading view: 100% unit strips (one square = one eligible retry; lit = new best) ──
  /** Grid of n units in a strip [x0, x1] × band height hb, filled column by column so the lit
      (first) units occupy the left share of the strip: its length is the rate. */
  function strip(x0, x1, yc, hb, n) {
    const L = x1 - x0, r = Math.max(1, Math.round(Math.sqrt((n * hb) / L))), cols = Math.ceil(n / r);
    const dx = L / cols, dy = hb / r;
    return { x0, x1, yc, hb, n, r, dx, dy, dot: Math.max(1.4, Math.min(6, Math.min(dx, dy) * 0.78)) };
  }
  const stripPos = (S, k) => [S.x0 + (Math.floor(k / S.r) + 0.5) * S.dx, S.yc - S.hb / 2 + ((k % S.r) + 0.5) * S.dy];
  function ratesGeom(L) {
    const c = L.chart, nar = L.narrow, top = c.y + (nar ? 70 : 104), bottom = c.y + c.h - (nar ? 34 : 56);
    const lw = nar ? 78 : 120, vw = nar ? 44 : 66;
    let A, Bp;
    if (!nar) {
      const pw = (c.w - 56) / 2;
      A = { x0: c.x, x1: c.x + pw, y0: top, y1: bottom };
      Bp = { x0: c.x + pw + 56, x1: c.x + c.w, y0: top, y1: bottom };
    } else {
      const mid = top + (bottom - top) * 0.44;
      A = { x0: c.x, x1: c.x + c.w, y0: top, y1: mid - 26 };
      Bp = { x0: c.x, x1: c.x + c.w, y0: mid + 22, y1: bottom };
    }
    const rows = (P0, list) => {
      const rh = (P0.y1 - P0.y0) / list.length, hb = Math.max(10, Math.min(32, rh * 0.42));
      return list.map((d, i) => strip(P0.x0 + lw, P0.x1 - vw, P0.y0 + rh * (i + 0.5), hb, d.eligible_retries));
    };
    return { A, B: Bp, lw, vw, hw: rows(A, byHw), gap: rows(Bp, gaps) };
  }

  F.scene({
    id: 'retries', title: 'Retries', duration: 71, enter: 'wipe', tint: 'rgba(255,181,71,.10)',
    particles: [{ at: 0, form: 'retries', dur: 3.0, curl: 1.0, spread: 0.5 }],
    howto: (fig) => (fig === '12'
      ? '<b>Counts</b>: bar height = eligible retries in that fifth of the window; the lit part set a new best. <b>Phase rates</b>: each cell is new bests ÷ eligible retries on one 0–100% colour scale, with S distinct students. Hatched = withheld (fewer than five students, or a secondary mask), not zero. Phases are equal fractions of each window, so their clock length differs by homework.'
      : '<b>By gap</b>: one square per eligible retry, grouped by clock time since the previous try; lit squares set a new best. <b>Rates</b>: each strip holds one group’s retries; the lit share of its length is the new-best rate, its density the denominator. S = distinct students; events repeat within students. <b>Problems</b> (Showcase): x = retries (log), y = share of new bests, size = students.'),
    onBeat() { st.userView = null; },
    /** Each figure offers only its own views: 11 = gap/rates (+ problems in Showcase), 12 = counts/rates. */
    onChapter(seg) {
      st.chapterFig = seg ? seg.fig : null; st.route = seg ? seg.route : 'showcase';
      const allow = st.chapterFig === '12' ? ['3', '4'] : st.route === 'core' ? ['0', '1'] : ['0', '1', '2'];
      ctrlView.el.querySelectorAll('button').forEach((b) => (b.hidden = !allow.includes(b.dataset.value)));
    },
    mount(el) {
      svg = d3.select(el).append('svg').attr('class', 'viz');
      const defs = svg.append('defs');
      hatchUrl = F.hatch(defs, 'hatch-phase', '#8a91a2', 0.55, 5);
      const lg = defs.append('linearGradient').attr('id', 'rate-grad');
      d3.range(0, 1.01, 0.1).forEach((v) => lg.append('stop').attr('offset', v).attr('stop-color', rateColor(v * 100)));
      gSplit = svg.append('g').attr('data-interactive', '');
      gWait = svg.append('g');
      waitLabels = gWait.selectAll('g.wl').data(gaps).join((en) => {
        const g = en.append('g').attr('class', 'wl');
        g.append('rect').attr('class', 'hit');
        g.append('text').attr('class', 'lab').style('font-size', '12.5px').attr('fill', F.ink).style('font-weight', 500);
        g.append('text').attr('class', 'n mono').style('font-size', '10.5px').attr('fill', F.muted);
        g.append('text').attr('class', 'n2 mono').style('font-size', '10.5px').attr('fill', F.muted);
        g.append('text').attr('class', 'rate big').style('font-size', '34px').style('font-weight', 350).attr('fill', F.ember);
        g.append('text').attr('class', 'of mono').style('font-size', '10.5px').attr('fill', F.ink2);
        return g;
      });
      waitLabels.select('.lab').text((d) => d.label);
      waitLabels.on('pointerenter', (e, d) => F.tip.show(gapTip(d), e)).on('pointermove', (e) => F.tip.move(e)).on('pointerleave', () => F.tip.hide());

      gRates = svg.append('g');
      gPhase = svg.append('g');
      gProb = svg.append('g');

      const html = d3.select(el).append('div').attr('class', 'html-layer');
      ctrlBox = html.append('div').attr('class', 'ctrls').node();
      ctrlView = F.segmented(ctrlBox, 'View', VIEWS, (v) => (st.userView = +v));
    },
    resize(L) {
      const c = L.chart;
      Object.assign(ctrlBox.style, { left: c.x + 'px', top: c.y - 6 + 'px', maxWidth: c.w + 'px' });
      geo = { c, w: waffleGeom(L) };
      SG = splitGeom(L); buildSplit(L);
      RG = ratesGeom(L); buildRates(L);
      buildPhase(L); buildProb(L);
    },
    render(t0, env) {
      const dt = env.dt || 0.016, t = t0 - O;
      const tl = tlViewAt(t0);
      st.view = st.userView == null ? tl : F.approach(st.view, st.userView, dt, 6);
      ctrlView.set(st.userView ?? Math.round(tl));
      ctrlBox.style.opacity = F.seg(t0, 1, 2);
      const splitA = F.clamp(1 - Math.abs(st.view)) * F.seg(t0, 1.4, 2.4) * (1 - F.seg(t0, O - 0.4, O + 0.6));
      gSplit.attr('opacity', splitA).style('pointer-events', splitA > 0.5 ? null : 'none');
      const vis = (k) => F.clamp(1 - Math.abs(st.view - k));
      const aW = vis(0), aR = vis(1), aPr = vis(2), aPh = F.clamp(st.view - 2);
      gWait.attr('opacity', aW).style('pointer-events', aW > 0.5 ? null : 'none');
      gRates.attr('opacity', aR).style('pointer-events', aR > 0.5 ? null : 'none');
      gProb.attr('opacity', aPr).attr('transform', `translate(0,${(1 - aPr) * 30})`).style('pointer-events', aPr > 0.5 ? null : 'none');
      gPhase.attr('opacity', aPh).attr('transform', `translate(0,${(1 - aPh) * 30})`).style('pointer-events', aPh > 0.5 ? null : 'none');
      renderWaitLabels(t, aW);
      // a viewer who jumps ahead sees each view fully drawn
      if (aR > 0.001) renderRates(st.userView != null ? Math.max(t0, 29) : t0);
      if (aPr > 0.001) renderProb(st.userView != null ? Math.max(t, 33) : t);
      if (aPh > 0.001) {
        const tp = t0 - PH - O;
        const mt = st.userView == null ? F.seg(t0, 61.2, 64.8, F.ease.linear) : F.clamp(st.view - 3);
        renderPhase(st.userView != null ? Math.max(tp, 21) : tp, mt, st.userView != null ? 1 : F.seg(t0, 63.8, 65.2));
      }
    },
  });

  // ── split intro labels ───────────────────────────────────────────
  function buildSplit(L) {
    gSplit.selectAll('*').remove();
    const labels = ['First tries', 'Eligible retries', 'After full marks · judge errors'];
    const b = gSplit.selectAll('g.sb').data([0, 1, 2]).join('g').attr('class', 'sb')
      .attr('transform', (i) => `translate(${SG.xs[i]},${SG.base - Math.ceil(CAT_TOTAL[i] / SG.cols) * SG.sp - 16})`);
    b.append('rect').attr('class', 'hit').attr('y', -60).attr('width', SG.colW).attr('height', (i) => Math.ceil(CAT_TOTAL[i] / SG.cols) * SG.sp + 76);
    // the last block's labels hang from its right edge so they never leave the stage
    const ax = (i) => (i === 2 ? SG.colW : 0), anchor = (i) => (i === 2 ? 'end' : 'start');
    b.append('text').attr('class', 'big').attr('x', ax).attr('text-anchor', anchor).attr('y', -22).style('font-size', L.narrow ? '22px' : '34px').style('font-weight', 330).attr('fill', (i) => (i === 1 ? F.ember : F.ink)).text((i) => F.fmt.int(CAT_TOTAL[i]));
    b.append('text').attr('class', 'mono').attr('x', ax).attr('text-anchor', anchor).attr('y', -4).style('font-size', L.narrow ? '9px' : '10.5px').style('letter-spacing', '.08em').attr('fill', F.ink2).text((i) => (L.narrow ? labels[i].split(' · ')[0].replace('Eligible ', '') : labels[i]).toUpperCase());
    b.on('pointerenter', (e, i) => F.tip.show(F.tip.html({ kicker: labels[i], title: `${F.fmt.int(CAT_TOTAL[i])} submissions`, rows: F.HW.map((h, k) => [h, F.fmt.int(CAT[i][k])]),
      note: i === 1 ? 'Eligible retries: after a valid baseline, while the best was still below 100.' : i === 2 ? '441 after full credit and 13 internal judge errors (split by homework not published).' : 'The first scored submission on each problem sets the baseline.' }), e))
      .on('pointermove', (e) => F.tip.move(e)).on('pointerleave', () => F.tip.hide());
  }

  // ── wait-time waffle labels (the squares themselves are particles) ─
  function renderWaitLabels(t, alpha) {
    const g = geo.w, s = g.sq;
    const rateP = F.seg(t, 10.4, 12);
    waitLabels.each(function (d, i) {
      const sel = d3.select(this), x = g.xs[i], rowsN = Math.ceil(d.eligible_retries / g.cols), top = g.base - rowsN * s;
      sel.attr('opacity', F.seg(t, 1 + i * 0.15, 2 + i * 0.15) * (alpha > 0.01 ? 1 : 0));
      sel.select('.hit').attr('x', x - 10).attr('y', top - 90).attr('width', g.cols * s + 20).attr('height', g.base - top + 140);
      const nar = F.layout.narrow;
      sel.select('.lab').attr('x', x).attr('y', g.base + 22).style('font-size', nar ? '10px' : '12.5px').text(nar ? shortGap(d.label) : d.label);
      sel.select('.n').attr('x', x).attr('y', g.base + 38).attr('display', nar ? 'none' : null).text(`${d.eligible_retries} retries`);
      sel.select('.n2').attr('x', x).attr('y', g.base + 52).attr('display', nar ? 'none' : null).text(`${d.contributors} students`);
      const lit = Math.round(d.new_bests * F.seg(t, 3.2, 6.8, F.ease.linear));
      sel.select('.rate').attr('x', x).attr('y', top - (nar ? 10 : 30)).attr('opacity', rateP).style('font-size', nar ? '17px' : '34px').text(nar ? Math.round(d.improvement_pct * rateP) + '%' : F.fmt.pct(d.improvement_pct * rateP));
      sel.select('.of').attr('x', x).attr('y', top - 12).attr('display', nar ? 'none' : null).text(`${lit} new best${lit === 1 ? '' : 's'}`);
    });
  }
  const shortGap = (l) => l.replace(' or more', '+').replace('Under ', '<').replace(' hours', 'h').replace(' min', 'm');
  const gapTip = (d) => F.tip.html({ kicker: 'Gap since previous valid try', title: d.label, rows: [['Eligible retries', d.eligible_retries], ['New bests', d.new_bests], ['Rate', F.fmt.pct(d.improvement_pct)], ['Students (S)', d.contributors]], note: 'Clock time between consecutive submissions to the same problem, not study time. Events, not students.' });

  // ── Figure 11 reading view ───────────────────────────────────────
  function buildRates(L) {
    gRates.selectAll('*').remove();
    const nar = L.narrow;
    const panel = (P0, title, list, strips, kind) => {
      const g = gRates.append('g').attr('class', 'rp rp-' + kind);
      g.append('text').attr('class', 'axis-title').attr('x', P0.x0).attr('y', P0.y0 - (nar ? 8 : 22)).text(title);
      const s0 = strips[0], x = (v) => s0.x0 + (v / 100) * (s0.x1 - s0.x0), yb = strips[strips.length - 1].yc + strips[strips.length - 1].hb / 2 + 10;
      [0, 25, 50, 75, 100].forEach((v) => {
        g.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', strips[0].yc - strips[0].hb / 2 - 10).attr('y2', yb).attr('stroke', v === 0 ? 'rgba(236,231,221,.22)' : 'rgba(236,231,221,.06)');
        g.append('text').attr('class', 'mono').attr('x', x(v)).attr('y', yb + 13).attr('text-anchor', 'middle').style('font-size', '10px').attr('fill', F.muted).text(v + (v === 100 ? '%' : ''));
      });
      const rows = g.append('g').attr('data-interactive', '').selectAll('g.rr').data(list).join('g').attr('class', 'rr');
      rows.each(function (d, i) {
        const S = strips[i], r = d3.select(this), xr = x(d.improvement_pct);
        r.append('rect').attr('class', 'hit').attr('x', P0.x0).attr('y', S.yc - S.hb / 2 - 14).attr('width', P0.x1 - P0.x0).attr('height', S.hb + 28);
        if (kind === 'hw') { // SVG unit strip (the gap panel's units are the particles)
          const u = r.append('g').attr('class', 'units');
          d3.range(d.eligible_retries).forEach((k) => {
            const [ux, uy] = stripPos(S, k);
            u.append('rect').attr('x', ux - S.dot / 2).attr('y', uy - S.dot / 2).attr('width', S.dot).attr('height', S.dot)
              .attr('fill', k < d.new_bests ? F.ember : '#a3abbb').attr('fill-opacity', k < d.new_bests ? 0.95 : 0.4);
          });
        }
        r.append('line').attr('class', 'tick').attr('x1', xr).attr('x2', xr).attr('y1', S.yc - S.hb / 2 - 7).attr('y2', S.yc + S.hb / 2 + 3).attr('stroke', F.ink).attr('stroke-width', 1.3);
        r.append('path').attr('class', 'dia').attr('d', d3.symbol(d3.symbolDiamond, nar ? 34 : 54)()).attr('transform', `translate(${xr},${S.yc - S.hb / 2 - 8})`)
          .attr('fill', kind === 'hw' ? F.color[d.homework] : F.ember).attr('stroke', F.bg).attr('stroke-width', 1.2);
        const name = kind === 'hw' ? d.homework : nar ? shortGap(d.label) : d.label;
        r.append('text').attr('class', 'nm').attr('x', S.x0 - 10).attr('y', S.yc - (nar ? 2 : 4)).attr('text-anchor', 'end').style('font-size', nar ? '10.5px' : '12.5px').style('font-weight', 500)
          .attr('fill', kind === 'hw' ? F.color[d.homework] : F.ink).text(name);
        r.append('text').attr('class', 'den mono').attr('x', S.x0 - 10).attr('y', S.yc + (nar ? 9 : 11)).attr('text-anchor', 'end').style('font-size', nar ? '8.5px' : '10px').attr('fill', F.ink2)
          .text(`${d.new_bests}/${d.eligible_retries} · S=${d.contributors}`);
        r.append('text').attr('class', 'pv mono').attr('x', S.x1 + 8).attr('y', S.yc).attr('dy', '0.35em').style('font-size', nar ? '11px' : '13px').style('font-weight', 500).attr('fill', F.ink)
          .text(F.fmt.pct(d.improvement_pct));
      });
      rows.on('pointerenter', (e, d) => F.tip.show(kind === 'hw'
        ? F.tip.html({ kicker: 'Eligible retries · homework', color: F.color[d.homework], title: `${d.homework}: ${F.fmt.pct(d.improvement_pct)} set a new best`, rows: [['New bests', d.new_bests], ['Eligible retries', d.eligible_retries], ['Students (S)', d.contributors]], note: 'Event rate: students can contribute many retries.' })
        : gapTip(d), e)).on('pointermove', (e) => F.tip.move(e)).on('pointerleave', () => F.tip.hide());
      return g;
    };
    panel(RG.A, nar ? '(a) Within each homework' : '(a) Within each homework', byHw, RG.hw, 'hw');
    panel(RG.B, nar ? '(b) By gap since the previous try' : '(b) By gap since the previous valid try', gaps, RG.gap, 'gap');
    gRates.append('text').attr('class', 'note foot').attr('x', L.chart.x).attr('y', L.chart.y + L.chart.h - (nar ? 4 : 14))
      .text(nar ? '1 square = 1 eligible retry · lit = new best' : 'One square = one eligible retry · lit = new best · strip length = 100% of the group, so sparse strips have small denominators');
  }
  function renderRates(t) {
    const p = F.seg(t, 25.4, 27.2, F.ease.outExpo), lab = F.seg(t, 26.2, 27.6);
    gRates.selectAll('.rp-hw .units').attr('opacity', F.seg(t, 24.8, 26.4));
    gRates.selectAll('.rr').attr('opacity', function (d) { return d.homework ? F.la(d.homework) : 1; });
    gRates.selectAll('.tick, .dia').attr('opacity', p);
    gRates.selectAll('.nm, .den, .pv').attr('opacity', lab);
    gRates.select('.foot').attr('opacity', lab);
  }

  // ── deadline phases: counts (bars), then rates (matrix) ──────────
  let phaseGeo;
  const rateColor = d3.scaleSequential(d3.interpolateRgbBasis(['#141a23', '#2f2a26', '#7a4d1d', '#d98a2b', '#ffd38f'])).domain([0, 100]);
  function buildPhase(L) {
    gPhase.selectAll('*').remove();
    const c = L.chart, nar = L.narrow, top = c.y + 84, bottom = c.y + c.h - (nar ? 46 : 54), left = c.x + (nar ? 44 : 110), right = c.x + c.w - 10;
    const rowH = (bottom - top) / 4, colW = (right - left) / 5;
    phaseGeo = { top, bottom, left, right, rowH, colW, ch: rowH * 0.74, cw: colW - (nar ? 4 : 8), nar };
    const y = d3.scaleLinear().domain([0, d3.max(phases, (p) => p.eligible_retries || 0)]).range([0, rowH * 0.66]);
    phaseGeo.y = y;
    gPhase.selectAll('text.col').data(['0–20%', '20–40%', '40–60%', '60–80%', '80–100%']).join('text').attr('class', 'col mono')
      .attr('x', (d, i) => left + colW * (i + 0.5)).attr('y', top - 22).attr('text-anchor', 'middle').style('font-size', nar ? '9px' : '10.5px').attr('fill', F.muted).text((d, i) => (i === 4 && !nar ? d + ' · due' : d));
    gPhase.append('text').attr('class', 'axis-title').attr('x', left).attr('y', top - 44).text(nar ? 'Window elapsed →' : 'Share of the homework window elapsed · opening → deadline →');
    const rows = gPhase.selectAll('g.prow').data(F.HW).join('g').attr('class', 'prow').attr('transform', (d, i) => `translate(0,${top + rowH * i})`);
    rows.append('text').attr('class', 'mono').attr('x', c.x).attr('y', rowH * 0.42).style('font-size', '12px').style('font-weight', 500).attr('fill', (d) => F.color[d]).text((d) => d);
    rows.append('text').attr('class', 'note').attr('x', c.x).attr('y', rowH * 0.42 + 15).style('font-size', '10px')
      .text((d) => `${nar ? '' : 'phase ≈ '}${Math.round(phases.find((p) => p.homework === d).phase_hours)} h`);
    rows.append('line').attr('class', 'base').attr('x1', left).attr('x2', right).attr('y1', rowH * 0.78).attr('y2', rowH * 0.78).attr('stroke', 'rgba(236,231,221,.1)');
    phaseCells = gPhase.append('g').attr('data-interactive', '').selectAll('g.pc').data(phases).join((en) => {
      const g = en.append('g').attr('class', 'pc');
      g.append('rect').attr('class', 'hit');
      g.append('rect').attr('class', 'all').attr('rx', 2);
      g.append('rect').attr('class', 'lit').attr('rx', 2);
      g.append('text').attr('class', 'rt mono').attr('text-anchor', 'middle').style('font-size', '11px');
      g.append('text').attr('class', 'nn mono').attr('text-anchor', 'middle').style('font-size', '9.5px').attr('fill', F.muted);
      g.append('text').attr('class', 'mrt big').attr('text-anchor', 'middle').style('font-weight', 420);
      g.append('text').attr('class', 'mnn mono').attr('text-anchor', 'middle');
      g.append('text').attr('class', 'ms mono').attr('text-anchor', 'middle');
      return g;
    });
    phaseCells.attr('transform', (d) => `translate(${left + colW * (d.phase + 0.5)},${top + rowH * F.HW.indexOf(d.homework) + rowH * 0.78})`)
      .on('pointerenter', (e, d) => F.tip.show(F.tip.html({ kicker: `${d.homework} · ${d.label} of window`, color: F.color[d.homework], title: d.state === 'visible' ? `${F.fmt.pct(d.improvement_pct)} set a new best` : 'Withheld',
        rows: d.state === 'visible' ? [['Eligible retries', d.eligible_retries], ['New bests', d.new_bests], ['Students (S)', d.contributors], ['Phase length', `${F.fmt.p1(d.phase_hours)} h`]] : [['Phase length', `${F.fmt.p1(d.phase_hours)} h`]],
        note: d.state === 'visible' ? 'Equal-duration phases from opening to the configured deadline. Descriptive; no deadline effect is estimated.' : 'Fewer than five students (or a complementary mask), so values are hidden. Withheld is not zero.' }), e))
      .on('pointermove', (e) => F.tip.move(e)).on('pointerleave', () => F.tip.hide());
    // colour key for the rate matrix
    const key = gPhase.append('g').attr('class', 'mkey').attr('transform', `translate(${nar ? left : right - 300},${bottom + (nar ? 22 : 26)})`);
    key.append('rect').attr('width', nar ? 120 : 170).attr('height', 8).attr('rx', 2).attr('fill', 'url(#rate-grad)');
    key.append('text').attr('class', 'mono').attr('y', 21).style('font-size', '9.5px').attr('fill', F.muted).text('0%');
    key.append('text').attr('class', 'mono').attr('x', nar ? 120 : 170).attr('y', 21).attr('text-anchor', 'end').style('font-size', '9.5px').attr('fill', F.muted).text('100%');
    key.append('text').attr('class', 'mono').attr('y', -6).style('font-size', '9.5px').attr('fill', F.ink2).text(nar ? 'New-best rate' : 'New bests ÷ eligible retries');
    key.append('rect').attr('x', nar ? 136 : 196).attr('width', 16).attr('height', 8).attr('fill', hatchUrl).attr('stroke', 'rgba(236,231,221,.25)');
    key.append('text').attr('class', 'note').attr('x', nar ? 136 : 196).attr('y', 21).style('font-size', '9.5px').text('withheld, not zero');
  }
  /** tp: the old phase-view clock (bars rise from 17.3); mt: bars → rate matrix (0..1); txt: matrix labels. */
  function renderPhase(tp, mt, txt) {
    const g = phaseGeo, bw = Math.min(46, g.colW * 0.46);
    const norm = F.ease.inOut(F.seg(mt, 0, 0.45, F.ease.linear)), widen = F.ease.inOut(F.seg(mt, 0.35, 0.8, F.ease.linear)), fill = F.seg(mt, 0.55, 1, F.ease.linear);
    const focus = F.seg(tp, 20.5, 21.5) * (1 - norm);
    gPhase.selectAll('.base').attr('opacity', 1 - widen);
    gPhase.select('.mkey').attr('opacity', fill);
    phaseCells.each(function (d) {
      const sel = d3.select(this), i = F.HW.indexOf(d.homework);
      const p = Math.max(F.seg(tp, 17.3 + i * 0.35 + d.phase * 0.08, 18.6 + i * 0.35 + d.phase * 0.08, F.ease.outExpo), norm);
      const pl = Math.max(F.seg(tp, 18.8 + i * 0.35, 20 + i * 0.35), norm);
      const hl = d.homework === 'HW4' ? 1 : F.lerp(1, 0.35, focus);
      sel.attr('opacity', F.la(d.homework) * (F.state.lens ? 1 : hl));
      sel.select('.hit').attr('x', -g.colW / 2).attr('y', -g.rowH * 0.74).attr('width', g.colW).attr('height', g.rowH * 0.9);
      const w = F.lerp(bw, g.cw, widen), big = g.nar ? 14 : Math.min(26, g.ch * 0.26);
      if (d.state !== 'visible') {
        const h = F.lerp(g.rowH * 0.4 * p, g.ch, norm);
        sel.select('.all').attr('x', -w / 2).attr('width', w).attr('y', -h).attr('height', h).attr('fill', hatchUrl).attr('stroke', 'rgba(236,231,221,.16)');
        sel.select('.lit').attr('height', 0);
        sel.select('.rt').attr('y', -h - 8).attr('fill', F.muted).attr('opacity', p * (1 - norm)).text('withheld');
        sel.select('.nn').text('');
        sel.select('.mrt').attr('y', -g.ch / 2).attr('dy', '0.35em').style('font-size', `${g.nar ? 10 : 12}px`).attr('fill', F.ink2).attr('opacity', txt).text('Withheld');
        sel.select('.mnn').text(''); sel.select('.ms').text('');
        return;
      }
      const r = d.improvement_pct / 100, h = F.lerp(g.y(d.eligible_retries) * p, g.ch, norm), hl2 = F.lerp(g.y(d.new_bests) * p * pl, g.ch * r, norm);
      const col = d3.interpolateRgb('rgba(160,168,184,0.2)', rateColor(d.improvement_pct))(fill);
      sel.select('.all').attr('x', -w / 2).attr('width', w).attr('y', -h).attr('height', h).attr('fill', col).attr('stroke', fill > 0.5 ? 'rgba(236,231,221,.08)' : 'none');
      sel.select('.lit').attr('x', -w / 2).attr('width', w).attr('y', -hl2).attr('height', hl2).attr('fill', F.ember).attr('opacity', 1 - fill);
      sel.select('.rt').attr('y', -h - 8).attr('fill', F.ink).attr('opacity', pl * (1 - norm)).text(F.fmt.pct(d.improvement_pct).replace('.0', ''));
      sel.select('.nn').attr('y', 14).attr('opacity', p * (1 - norm)).text(`${d.new_bests}/${d.eligible_retries}`);
      const dark = d.improvement_pct > 52, tc = dark ? F.bg : F.ink, cy = -g.ch / 2;
      sel.select('.mrt').attr('y', cy - (g.nar ? 3 : big * 0.35)).style('font-size', `${big}px`).attr('fill', tc).attr('opacity', txt).text(F.fmt.pct(d.improvement_pct));
      sel.select('.mnn').attr('y', cy + (g.nar ? 10 : big * 0.62)).style('font-size', `${g.nar ? 8.5 : 11}px`).attr('fill', tc).attr('fill-opacity', 1).attr('opacity', txt).text(`${d.new_bests}/${d.eligible_retries}`);
      sel.select('.ms').attr('y', cy + (g.nar ? 20 : big * 0.62 + 15)).style('font-size', `${g.nar ? 8 : 10}px`).attr('fill', tc).attr('fill-opacity', 0.85).attr('opacity', txt * (g.nar && g.ch < 54 ? 0 : 1)).text(`S=${d.contributors}`);
    });
  }

  // ── problem scatter ──────────────────────────────────────────────
  let probGeo;
  function buildProb(L) {
    gProb.selectAll('*').remove();
    const c = L.chart, left = c.x + 50, right = c.x + c.w - 30, top = c.y + 70, bottom = c.y + c.h - 44;
    probGeo = { left, right, top, bottom };
    px = d3.scaleLog().domain([8, 160]).range([left, right]);
    py = d3.scaleLinear().domain([0, 100]).range([bottom, top]);
    pr = d3.scaleSqrt().domain([0, 25]).range([0, L.narrow ? 9 : 13]);
    const ax = gProb.append('g').attr('class', 'pax');
    [10, 20, 50, 100, 150].forEach((v) => { ax.append('line').attr('x1', px(v)).attr('x2', px(v)).attr('y1', top).attr('y2', bottom).attr('stroke', 'rgba(236,231,221,.06)'); ax.append('text').attr('class', 'mono').attr('x', px(v)).attr('y', bottom + 16).attr('text-anchor', 'middle').style('font-size', '10.5px').attr('fill', F.muted).text(v); });
    [0, 25, 50, 75, 100].forEach((v) => { ax.append('line').attr('x1', left).attr('x2', right).attr('y1', py(v)).attr('y2', py(v)).attr('stroke', 'rgba(236,231,221,.06)'); ax.append('text').attr('class', 'mono').attr('x', left - 10).attr('y', py(v)).attr('dy', '0.35em').attr('text-anchor', 'end').style('font-size', '10.5px').attr('fill', F.muted).text(v + '%'); });
    ax.append('text').attr('class', 'axis-title').attr('x', right).attr('y', bottom + 32).attr('text-anchor', 'end').text('Eligible retries on the problem (log scale) →');
    ax.append('text').attr('class', 'axis-title').attr('x', left).attr('y', top - 14).text('↑ Share of retries that set a new best');
    const ref = gProb.append('g').attr('class', 'ref');
    ref.append('line').attr('x1', left).attr('x2', right).attr('y1', py(RATE)).attr('y2', py(RATE)).attr('stroke', F.ember).attr('stroke-opacity', 0.5);
    ref.append('text').attr('class', 'mono').attr('x', right).attr('y', py(RATE) - 7).attr('text-anchor', 'end').style('font-size', '10.5px').attr('fill', F.ember).text(`all retries ${F.fmt.pct(RATE)}`);
    const q = gProb.append('g').attr('class', 'quad');
    q.append('text').attr('class', 'big').attr('x', right - 4).attr('y', bottom - 40).attr('text-anchor', 'end').style('font-size', '22px').style('font-style', 'italic').attr('fill', F.muted).text('loops');
    q.append('text').attr('class', 'note').attr('x', right - 4).attr('y', bottom - 22).attr('text-anchor', 'end').text('many retries, few new bests');
    q.append('text').attr('class', 'big').attr('x', left + 8).attr('y', top + 30).style('font-size', '22px').style('font-style', 'italic').attr('fill', F.muted).text('quick wins');
    q.append('text').attr('class', 'note').attr('x', left + 8).attr('y', top + 48).text('few retries, most set a new best');
    probDots = gProb.append('g').attr('data-interactive', '').selectAll('g.pd').data(probs.slice().sort((a, b) => b.contributors - a.contributors), (d) => d.problem_id).join((en) => {
      const g = en.append('g').attr('class', 'pd');
      g.append('circle').attr('class', 'ring').attr('fill', 'none').attr('stroke', F.ink).attr('stroke-width', 1.5);
      g.append('circle').attr('class', 'dot').attr('stroke', F.bg).attr('stroke-width', 2);
      g.append('text').attr('class', 'nm').style('font-size', '11px').attr('dy', '0.35em');
      return g;
    });
    probDots.select('.dot').attr('fill', (d) => F.color[d.homework]);
    probDots.select('.nm').text((d) => d.name);
    probDots.on('pointerenter', (e, d) => { st.hover = d; F.tip.show(probTip(d), e); }).on('pointermove', (e) => F.tip.move(e)).on('pointerleave', () => { st.hover = null; F.tip.hide(); })
      .on('click', (e, d) => F.set('selected', F.state.selected === d.problem_id ? null : d.problem_id));
    gProb.append('text').attr('class', 'note').attr('x', left).attr('y', bottom + 32).text(`${ev.by_problem.length - probs.length} problems withheld (fewer than five students)`);
  }
  function renderProb(t) {
    const g = probGeo, sel = F.state.selected, spot = sel || (t >= 36.2 ? SPOT_DEFAULT : null);
    gProb.select('.pax').attr('opacity', F.seg(t, 26.6, 27.4));
    gProb.select('.ref').attr('opacity', F.seg(t, 29.5, 30.5));
    gProb.select('.quad').attr('opacity', F.seg(t, 31, 32.2) * 0.9);
    probDots.each(function (d, i) {
      const s = d3.select(this);
      const p = F.stagger(t, 27.2, 30, i, probs.length, 0.65, F.ease.outBack);
      const isSpot = spot === d.problem_id, isHover = st.hover === d;
      const lab = LABELLED.has(d.problem_id) ? F.seg(t, 31.4, 32.4) : 0;
      s.attr('transform', `translate(${px(d.eligible_retries)},${py(d.improvement_pct)})`).attr('opacity', F.la(d.homework) * F.clamp(p * 2));
      const r = pr(d.contributors) * Math.max(0, p);
      s.select('.dot').attr('r', r * (isHover ? 1.25 : 1));
      s.select('.ring').attr('r', r + 5).attr('opacity', isSpot ? 1 : 0);
      const place = LABEL_AT[d.problem_id] || (px(d.eligible_retries) > g.right - 140 ? 'left' : 'right');
      const off = { right: [r + 6, 0, 'start'], left: [-(r + 6), 0, 'end'], above: [0, -(r + 10), 'middle'], below: [0, r + 13, 'middle'], aboveLeft: [-(r + 2), -(r + 8), 'end'] }[place];
      s.select('.nm').attr('fill', isSpot || isHover ? F.ink : F.ink2).style('font-weight', isSpot ? 600 : 400)
        .attr('opacity', Math.max(lab, isSpot || isHover ? 1 : 0)).attr('x', off[0]).attr('y', off[1]).attr('text-anchor', off[2]);
    });
  }
  function probTip(d) {
    return F.tip.html({ kicker: `${d.homework}`, color: F.color[d.homework], title: d.name,
      rows: [['Eligible retries', d.eligible_retries], ['New bests', d.new_bests], ['Share', F.fmt.pct(d.improvement_pct)], ['Students retrying', d.contributors], ['Mean first try', F.fmt.p1(d.first)]],
      note: 'Click to select; the selection is shared with Figure 03.' });
  }
})();
