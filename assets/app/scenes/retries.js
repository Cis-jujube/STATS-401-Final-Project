/* Scene 6 · Which retries pay off?
   Eligible retry = a completed in-window resubmission after a valid baseline while the
   prior best was below 100. New best = strictly beats every earlier score.
   View A (wait): 1,222 retries as squares, grouped by clock time since the previous try.
   View B (phase): retries and new bests in five equal slices of each homework window.
   View C (problem): one circle per problem — retries (x, log) vs share that set a new best. */
(function () {
  const F = window.Film;
  const ev = F.data.homework.event_progress;
  const gaps = ev.by_gap;
  const TOTAL = d3.sum(gaps, (g) => g.eligible_retries), BESTS = d3.sum(gaps, (g) => g.new_bests), RATE = (100 * BESTS) / TOTAL;
  const probs = ev.by_problem.filter((p) => p.state === 'visible').map((p) => ({ ...p, name: F.problemName(p.problem_name), first: F.progress[p.problem_id].first }));
  const phases = ev.by_phase;
  const SPOT_DEFAULT = 169; // EvenOrOdd: the largest loop
  const LABELLED = new Set([169, 851, 871, 366, 1279, 1354]);
  const LABEL_AT = { 169: 'aboveLeft', 851: 'below', 871: 'left' };

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

  const st = { view: 0, userView: null, hover: null };
  const O = 7; // the split intro comes first; the waffle and later views keep their timings shifted by O
  let svg, geo, gSplit, gWait, gPhase, gProb, waitLabels, phaseCells, probDots, ctrlView, ctrlBox, px, py, pr, hatchUrl;

  // ── particles: every submission is a first try, a retry, or came after full marks ──
  // Per homework: first tries = attempt-1 events, retries = eligible retries; the rest came
  // after full credit (441) or hit a judge error (13). Totals reconcile to 2,807 exactly.
  const P = F.particles, N = P.N, hwData = F.data.homework;
  const firstH = F.HW.map((h) => hwData.attempt_score_series.find((r) => r.homework === h && r.attempt === 1).submissions);
  const retryH = F.HW.map((h) => ev.by_homework.find((r) => r.homework === h).eligible_retries);
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
    if (!SG || !geo) return;
    const t = env.t, tw = t - O, g = geo.w, K = P.K, C = P.C;
    P.forms.star(AMB, { T: env.T, kf: { alpha: 0.14 } });
    const aW = F.clamp(1 - Math.abs(st.view)); // the wait-time view owns the particles
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
      } else {
        x = F.lerp(sx, AMB.x[i], pi); y = F.lerp(sy, AMB.y[i], pi); a = F.lerp(sa, AMB.a[i], pi); sz = F.lerp(SG.sp * 0.66, AMB.s[i], pi); col = P.hwIdx[i];
      }
      const pv = F.ease.inOut(F.clamp(aW * 1.5 - K.d[i] * 0.5));
      o.x[i] = F.lerp(AMB.x[i], x, pv); o.y[i] = F.lerp(AMB.y[i], y, pv); o.a[i] = F.lerp(AMB.a[i], a, pv); o.s[i] = F.lerp(AMB.s[i], sz, pv); o.c[i] = pv > 0.5 ? col : P.hwIdx[i];
    }
    o.glow = toWaffle > 0.5 ? aW : 0.25 * aW; o.glowSet = toWaffle > 0.5 ? [C.EMBER, C.FLASH] : null; o.repel = false;
  });

  function waffleGeom(L) {
    const c = L.chart, cols = L.narrow ? 10 : 14, top = c.y + 110, bottom = c.y + c.h - 70;
    const maxRows = Math.ceil(d3.max(gaps, (g) => g.eligible_retries) / cols);
    const gw = (c.w - 40) / gaps.length;
    const sq = Math.max(3, Math.min(11, (bottom - top) / maxRows, (gw - 24) / cols));
    const xs = gaps.map((g, i) => c.x + 20 + i * gw + (gw - cols * sq) / 2);
    return { cols, sq, xs, base: bottom, gw };
  }

  F.scene({
    id: 'retries', title: '04 · Retries', duration: 44 + O, enter: 'wipe', tint: 'rgba(255,181,71,.10)',
    particles: [{ at: 0, form: 'retries', dur: 3.0, curl: 1.0, spread: 0.5 }],
    beats: [
      { at: 0, kicker: '04 · Retries', title: `Of 2,807 submissions, <em>${F.fmt.int(TOTAL)}</em> were retries.`,
        body: `First tries set each baseline (<span class="num">${F.fmt.int(CAT_TOTAL[0])}</span>). <span class="num">441</span> came after full marks and <span class="num">13</span> hit a judge error. The rest were real attempts to improve.` },
      { at: O, kicker: '04 · Retries', title: `<em>${BESTS}</em> of them set a new best.`,
        body: `A retry counts while the student’s best on that problem is still below 100, and sets a <b>new best</b> when it beats every earlier score. Each lit square is one: <span class="num">${F.fmt.pct(RATE)}</span> of retries.` },
      { at: 8.5 + O, kicker: '04 · Retries', title: 'Instant resubmits pay off less.',
        body: 'Retries sent within a minute of the previous try set a new best <b>31.6%</b> of the time; after 1–10 minutes, <b>44.2%</b>. Gaps are clock time, not study time, and longer gaps are rare.' },
      { at: 17 + O, kicker: '04 · Retries', title: 'Progress arrives late in the window.',
        body: 'Each homework window cut into five equal slices. Bars count retries; the lit part set a new best. In HW4 the middle slice held the most retries (<span class="num">143</span>) at 22%; the last two slices reached <b>59–63%</b>.' },
      { at: 27 + O, kicker: '04 · Retries', title: 'Some problems become <em>loops.</em>',
        body: 'Each circle is a problem: further right, more retries; higher, more of them paid off. EvenOrOdd drew <b>130</b> retries at 23%. Triangle Sides needed 16, and 81% set a new best.' },
      { at: 36 + O, kicker: '04 · Retries', title: 'Pick a problem to follow.',
        body: 'Hover any circle for its counts; click to select it. A problem picked in the previous chapter stays ringed. Retries are repeated events from the same students, not independent trials.' },
    ],
    howto: '<b>Wait time</b>: one square per eligible retry; lit squares set a new best. <b>Deadline phase</b>: bar height = retries in that fifth of the window, lit part = new bests; hatched = withheld. <b>Problems</b>: x = retries (log), y = share of new bests, size = students.',
    onBeat() { st.userView = null; },
    mount(el) {
      svg = d3.select(el).append('svg').attr('class', 'viz');
      const defs = svg.append('defs');
      hatchUrl = F.hatch(defs, 'hatch-phase', '#8a91a2', 0.55, 5);
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
      waitLabels.on('pointerenter', (e, d) => F.tip.show(F.tip.html({ kicker: 'Gap since previous try', title: d.label, rows: [['Eligible retries', d.eligible_retries], ['New bests', d.new_bests], ['Rate', F.fmt.pct(d.improvement_pct)], ['Students', d.contributors]], note: 'Clock time between consecutive submissions to the same problem, not study time.' }), e))
        .on('pointermove', (e) => F.tip.move(e)).on('pointerleave', () => F.tip.hide());

      gPhase = svg.append('g');
      gProb = svg.append('g');

      const html = d3.select(el).append('div').attr('class', 'html-layer');
      ctrlBox = html.append('div').attr('class', 'ctrls').node();
      ctrlView = F.segmented(ctrlBox, 'View', [['0', 'Wait time'], ['1', 'Deadline phase'], ['2', 'Problems']], (v) => (st.userView = +v));
    },
    resize(L) {
      const c = L.chart;
      Object.assign(ctrlBox.style, { left: c.x + 'px', top: c.y - 6 + 'px', maxWidth: c.w + 'px' });
      geo = { c, w: waffleGeom(L) };
      SG = splitGeom(L); buildSplit(L);
      buildPhase(L); buildProb(L);
    },
    render(t0, env) {
      const dt = env.dt || 0.016, t = t0 - O;
      const tlView = t < 17 ? 0 : t < 27 ? 1 : 2;
      st.view = st.userView == null ? (t < 16.4 ? 0 : t < 17.6 ? F.seg(t, 16.4, 17.6) : t < 26.4 ? 1 : 1 + F.seg(t, 26.4, 27.6)) : F.approach(st.view, st.userView, dt, 6);
      ctrlView.set(st.userView ?? tlView);
      ctrlBox.style.opacity = F.seg(t0, 1, 2);
      const splitA = F.clamp(1 - Math.abs(st.view)) * F.seg(t0, 1.4, 2.4) * (1 - F.seg(t0, O - 0.4, O + 0.6));
      gSplit.attr('opacity', splitA).style('pointer-events', splitA > 0.5 ? null : 'none');
      const vis = (k) => F.clamp(1 - Math.abs(st.view - k));
      const aW = vis(0), aP = vis(1), aR = vis(2);
      gWait.attr('opacity', aW).style('pointer-events', aW > 0.5 ? null : 'none');
      gPhase.attr('opacity', aP).attr('transform', `translate(0,${(1 - aP) * 30})`).style('pointer-events', aP > 0.5 ? null : 'none');
      gProb.attr('opacity', aR).attr('transform', `translate(0,${(1 - aR) * 30})`).style('pointer-events', aR > 0.5 ? null : 'none');
      renderWaitLabels(t, aW);
      // a viewer who jumps ahead sees each view fully drawn
      if (aP > 0.001) renderPhase(st.userView != null ? Math.max(t, 21) : t);
      if (aR > 0.001) renderProb(st.userView != null ? Math.max(t, 33) : t);
    },
  });

  // ── split intro labels ───────────────────────────────────────────
  function buildSplit(L) {
    gSplit.selectAll('*').remove();
    const labels = ['First tries', 'Retries', 'After full marks · judge errors'];
    const b = gSplit.selectAll('g.sb').data([0, 1, 2]).join('g').attr('class', 'sb')
      .attr('transform', (i) => `translate(${SG.xs[i]},${SG.base - Math.ceil(CAT_TOTAL[i] / SG.cols) * SG.sp - 16})`);
    b.append('rect').attr('class', 'hit').attr('y', -60).attr('width', SG.colW).attr('height', (i) => Math.ceil(CAT_TOTAL[i] / SG.cols) * SG.sp + 76);
    // the last block's labels hang from its right edge so they never leave the stage
    const ax = (i) => (i === 2 ? SG.colW : 0), anchor = (i) => (i === 2 ? 'end' : 'start');
    b.append('text').attr('class', 'big').attr('x', ax).attr('text-anchor', anchor).attr('y', -22).style('font-size', L.narrow ? '22px' : '34px').style('font-weight', 330).attr('fill', (i) => (i === 1 ? F.ember : F.ink)).text((i) => F.fmt.int(CAT_TOTAL[i]));
    b.append('text').attr('class', 'mono').attr('x', ax).attr('text-anchor', anchor).attr('y', -4).style('font-size', L.narrow ? '9px' : '10.5px').style('letter-spacing', '.08em').attr('fill', F.ink2).text((i) => (L.narrow ? labels[i].split(' · ')[0] : labels[i]).toUpperCase());
    b.on('pointerenter', (e, i) => F.tip.show(F.tip.html({ kicker: labels[i], title: `${F.fmt.int(CAT_TOTAL[i])} submissions`, rows: F.HW.map((h, k) => [h, F.fmt.int(CAT[i][k])]),
      note: i === 1 ? 'Eligible retries: after a valid baseline, while the best was still below 100.' : i === 2 ? '441 after full credit and 13 internal judge errors (split by homework not published).' : 'The first scored submission on each problem sets the baseline.' }), e))
      .on('pointermove', (e) => F.tip.move(e)).on('pointerleave', () => F.tip.hide());
  }

  // ── wait-time waffle labels (the squares themselves are particles) ─
  function renderWaitLabels(t, alpha) {
    const g = geo.w, s = g.sq;
    // labels
    const rateP = F.seg(t, 10.4, 12);
    waitLabels.each(function (d, i) {
      const sel = d3.select(this), x = g.xs[i], rowsN = Math.ceil(d.eligible_retries / g.cols), top = g.base - rowsN * s;
      sel.attr('opacity', F.seg(t, 1 + i * 0.15, 2 + i * 0.15) * (alpha > 0.01 ? 1 : 0));
      sel.select('.hit').attr('x', x - 10).attr('y', top - 90).attr('width', g.cols * s + 20).attr('height', g.base - top + 140);
      const nar = F.layout.narrow;
      sel.select('.lab').attr('x', x).attr('y', g.base + 22).style('font-size', nar ? '10px' : '12.5px').text(nar ? d.label.replace(' or more', '+').replace('Under ', '<').replace(' hours', 'h').replace(' min', 'm') : d.label);
      sel.select('.n').attr('x', x).attr('y', g.base + 38).attr('display', nar ? 'none' : null).text(`${d.eligible_retries} retries`);
      sel.select('.n2').attr('x', x).attr('y', g.base + 52).attr('display', nar ? 'none' : null).text(`${d.contributors} students`);
      const lit = Math.round(d.new_bests * F.seg(t, 3.2, 6.8, F.ease.linear));
      sel.select('.rate').attr('x', x).attr('y', top - (nar ? 10 : 30)).attr('opacity', rateP).style('font-size', nar ? '17px' : '34px').text(nar ? Math.round(d.improvement_pct * rateP) + '%' : F.fmt.pct(d.improvement_pct * rateP));
      sel.select('.of').attr('x', x).attr('y', top - 12).attr('display', nar ? 'none' : null).text(`${lit} new best${lit === 1 ? '' : 's'}`);
    });
  }

  // ── deadline phases ──────────────────────────────────────────────
  let phaseGeo;
  function buildPhase(L) {
    gPhase.selectAll('*').remove();
    const c = L.chart, top = c.y + 84, bottom = c.y + c.h - 40, left = c.x + (L.narrow ? 44 : 110), right = c.x + c.w - 10;
    const rowH = (bottom - top) / 4, colW = (right - left) / 5;
    phaseGeo = { top, bottom, left, right, rowH, colW };
    const y = d3.scaleLinear().domain([0, d3.max(phases, (p) => p.eligible_retries || 0)]).range([0, rowH * 0.66]);
    phaseGeo.y = y;
    gPhase.selectAll('text.col').data(['0–20%', '20–40%', '40–60%', '60–80%', '80–100%']).join('text').attr('class', 'col mono')
      .attr('x', (d, i) => left + colW * (i + 0.5)).attr('y', top - 22).attr('text-anchor', 'middle').style('font-size', '10.5px').attr('fill', F.muted).text((d, i) => (i === 4 ? d + ' · due' : d));
    gPhase.append('text').attr('class', 'axis-title').attr('x', left).attr('y', top - 44).text('Share of the homework window elapsed →');
    const rows = gPhase.selectAll('g.prow').data(F.HW).join('g').attr('class', 'prow').attr('transform', (d, i) => `translate(0,${top + rowH * i})`);
    rows.append('text').attr('class', 'mono').attr('x', c.x).attr('y', rowH * 0.62).style('font-size', '12px').style('font-weight', 500).attr('fill', (d) => F.color[d]).text((d) => d);
    rows.append('text').attr('class', 'note').attr('x', c.x).attr('y', rowH * 0.62 + 16).style('font-size', '10px')
      .text((d) => (L.narrow ? '' : `fifth ≈ ${Math.round(phases.find((p) => p.homework === d).phase_hours)} h`));
    rows.append('line').attr('x1', left).attr('x2', right).attr('y1', rowH * 0.78).attr('y2', rowH * 0.78).attr('stroke', 'rgba(236,231,221,.1)');
    phaseCells = gPhase.append('g').attr('data-interactive', '').selectAll('g.pc').data(phases).join((en) => {
      const g = en.append('g').attr('class', 'pc');
      g.append('rect').attr('class', 'hit');
      g.append('rect').attr('class', 'all').attr('rx', 2);
      g.append('rect').attr('class', 'lit').attr('rx', 2);
      g.append('text').attr('class', 'rt mono').attr('text-anchor', 'middle').style('font-size', '11px');
      g.append('text').attr('class', 'nn mono').attr('text-anchor', 'middle').style('font-size', '9.5px').attr('fill', F.muted);
      return g;
    });
    phaseCells.attr('transform', (d) => `translate(${left + colW * (d.phase + 0.5)},${top + rowH * F.HW.indexOf(d.homework) + rowH * 0.78})`)
      .on('pointerenter', (e, d) => F.tip.show(F.tip.html({ kicker: `${d.homework} · ${d.label} of window`, color: F.color[d.homework], title: d.state === 'visible' ? `${F.fmt.pct(d.improvement_pct)} set a new best` : 'Withheld',
        rows: d.state === 'visible' ? [['Eligible retries', d.eligible_retries], ['New bests', d.new_bests], ['Students', d.contributors], ['Slice length', `${F.fmt.p1(d.phase_hours)} h`]] : [['Slice length', `${F.fmt.p1(d.phase_hours)} h`]],
        note: d.state === 'visible' ? 'Equal-duration slices from opening to the configured deadline. Descriptive; no deadline effect is estimated.' : 'Fewer than five students (or a complementary mask), so values are hidden.' }), e))
      .on('pointermove', (e) => F.tip.move(e)).on('pointerleave', () => F.tip.hide());
  }
  function renderPhase(t) {
    const g = phaseGeo, bw = Math.min(46, g.colW * 0.46);
    const focus = F.seg(t, 20.5, 21.5);
    phaseCells.each(function (d) {
      const sel = d3.select(this), i = F.HW.indexOf(d.homework);
      const p = F.seg(t, 17.3 + i * 0.35 + d.phase * 0.08, 18.6 + i * 0.35 + d.phase * 0.08, F.ease.outExpo);
      const pl = F.seg(t, 18.8 + i * 0.35, 20 + i * 0.35);
      const hl = d.homework === 'HW4' ? 1 : F.lerp(1, 0.35, focus);
      sel.attr('opacity', F.la(d.homework) * (F.state.lens ? 1 : hl));
      sel.select('.hit').attr('x', -g.colW / 2).attr('y', -g.rowH * 0.74).attr('width', g.colW).attr('height', g.rowH * 0.9);
      if (d.state !== 'visible') {
        const h = g.rowH * 0.4 * p;
        sel.select('.all').attr('x', -bw / 2).attr('width', bw).attr('y', -h).attr('height', h).attr('fill', hatchUrl).attr('stroke', 'rgba(236,231,221,.16)');
        sel.select('.lit').attr('height', 0);
        sel.select('.rt').attr('y', -h - 8).attr('fill', F.muted).attr('opacity', p).text('withheld');
        sel.select('.nn').text('');
        return;
      }
      const h = g.y(d.eligible_retries) * p, hl2 = g.y(d.new_bests) * p * pl;
      sel.select('.all').attr('x', -bw / 2).attr('width', bw).attr('y', -h).attr('height', h).attr('fill', 'rgba(160,168,184,.2)').attr('stroke', 'none');
      sel.select('.lit').attr('x', -bw / 2).attr('width', bw).attr('y', -hl2).attr('height', hl2).attr('fill', F.ember);
      sel.select('.rt').attr('y', -h - 8).attr('fill', F.ink).attr('opacity', pl).text(F.fmt.pct(d.improvement_pct).replace('.0', ''));
      sel.select('.nn').attr('y', 14).attr('opacity', p).text(`${d.new_bests}/${d.eligible_retries}`);
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
    q.append('text').attr('class', 'note').attr('x', left + 8).attr('y', top + 48).text('few retries, most pay off');
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
    const note = gProb.append('text').attr('class', 'note').attr('x', left).attr('y', bottom + 32).text(`${ev.by_problem.length - probs.length} problems withheld (fewer than five students)`);
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
      note: 'Click to select; the selection is shared with the Problems chapter.' });
  }
})();
