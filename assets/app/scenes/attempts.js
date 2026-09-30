/* Scene 5 · How many tries does 100 take?
   View A: submissions per student per homework (box = middle half, whiskers = range, log x).
   View B: the mean score of the k-th submission to a problem, beside the number of
   students still submitting at k — the cohort thins, which is why the mean falls. */
(function () {
  const F = window.Film;
  const hw = F.data.homework;
  const A = hw.assignments;
  const series = F.HW.map((h) => ({ hw: h, pts: hw.attempt_score_series.filter((r) => r.homework === h && r.state === 'visible') }));
  const KMAX = d3.max(series, (s) => d3.max(s.pts, (p) => p.attempt));
  const O = 9; // the particle "tries" beat comes first; the older views keep their timings shifted by O
  const st = { view: 0, userView: null, measure: 0, userMeasure: null, hoverK: null };
  let svg, gTries, gBox, gCo, boxRows, x, geo, ctrlView, ctrlMeasure, ctrlBox, mBox, co, TG;

  // ── particles: every submission stacked by which try it was (same student, same problem) ──
  const P = F.particles, N = P.N;
  const perK = d3.range(KMAX + 1).map((k) => F.HW.map((h) => { const r = series[F.HW.indexOf(h)].pts.find((p) => p.attempt === k); return r ? r.submissions : 0; }));
  const colTotal = perK.map((row) => d3.sum(row));
  const triesK = new Uint8Array(N), triesPos = new Uint16Array(N);
  let MASKED_TAIL = 0;
  for (let i = 0; i < N; i++) {
    const h = P.hwIdx[i]; let j = P.rank[i], k = 1;
    for (; k <= KMAX; k++) { const n = perK[k][h]; if (j < n) break; j -= n; }
    if (k > KMAX) { triesK[i] = 0; triesPos[i] = MASKED_TAIL++; }
    else { triesK[i] = k; triesPos[i] = d3.sum(perK[k].slice(0, h)) + j; }
  }
  const AMB = { x: new Float32Array(N), y: new Float32Array(N), a: new Float32Array(N), s: new Float32Array(N), c: new Uint8Array(N) };
  function triesGeom(L) {
    const c = L.chart, top = c.y + (L.narrow ? 90 : 118), base = c.y + c.h - 46, cloudW = L.narrow ? 70 : 170;
    const slotW = (c.w - 30 - cloudW) / KMAX;
    // largest dot spacing whose tallest column (the 1,131 first tries) still fits the box
    let best = null;
    for (let sp = 0.9; sp <= 7; sp += 0.05) {
      const cols = Math.floor((slotW - 4) / sp); if (cols < 2) break;
      if (Math.ceil(colTotal[1] / cols) * sp <= base - top) best = { sp, cols };
    }
    best = best || { sp: 0.9, cols: Math.max(2, Math.floor((slotW - 4) / 0.9)) };
    return { ...best, slotW, x0: c.x + 20, base, top, cloud: { x: c.x + c.w - cloudW / 2, y: base - Math.min(120, (base - top) * 0.3), r: Math.min(58, cloudW * 0.34) } };
  }
  P.define('tries', (o, env) => {
    const g = TG; if (!g) return;
    P.forms.star(AMB, { T: env.T, kf: { alpha: 0.16 } });
    const vis = F.clamp(1 - Math.abs(st.view)), K = P.K;
    for (let i = 0; i < N; i++) {
      const k = triesK[i], la = F.la(F.HW[P.hwIdx[i]]);
      let tx, ty, ta, tc = P.hwIdx[i];
      if (k) {
        const pos = triesPos[i], col = pos % g.cols, row = Math.floor(pos / g.cols);
        tx = g.x0 + (k - 1) * g.slotW + 2 + col * g.sp + g.sp / 2; ty = g.base - row * g.sp - g.sp / 2; ta = 0.95 * la;
      } else {
        tx = g.cloud.x + F.clamp(K.gx[i], -2.3, 2.3) * g.cloud.r * 0.45; ty = g.cloud.y + F.clamp(K.gy[i], -2.3, 2.3) * g.cloud.r * 0.45; ta = 0.5 * la; tc = 4;
      }
      const p = F.ease.inOut(F.clamp(vis * 1.5 - K.d[i] * 0.5));
      o.x[i] = F.lerp(AMB.x[i], tx, p); o.y[i] = F.lerp(AMB.y[i], ty, p);
      o.a[i] = F.lerp(AMB.a[i], ta, p); o.s[i] = F.lerp(AMB.s[i], g.sp * 0.7, p); o.c[i] = p > 0.5 ? tc : P.hwIdx[i];
    }
    o.glow = 0.3 * vis; o.glowSet = null; o.repel = false;
  });

  const lerpLog = (a, b, p) => Math.exp(F.lerp(Math.log(a), Math.log(b), p));

  F.scene({
    id: 'attempts', title: '03 · Attempts', duration: 34 + O, enter: 'blinds', tint: 'rgba(25,158,112,.10)',
    particles: [{ at: 0, form: 'tries', dur: 3.4, curl: 1.1, spread: 0.55 }],
    beats: [
      { at: 0, kicker: '03 · Attempts', title: `<em>${F.fmt.int(colTotal[1])}</em> first tries. Then it thins out.`,
        body: `Every submission again, stacked by which try it was on its problem. <span class="num">${colTotal[2]}</span> second tries, <span class="num">${colTotal[3]}</span> third tries, then a long tail; <span class="num">${MASKED_TAIL}</span> later tries sit in masked cells.` },
      { at: O, kicker: '03 · Attempts', title: 'Similar medians, <em>very different</em> tails.',
        body: 'Submissions per student, log scale. Medians sit between <span class="num">12.5</span> and <span class="num">15</span>, about two tries per problem. The longest tails reach <span class="num">62–141</span>.' },
      { at: 9 + O, kicker: '03 · Attempts', title: 'Some keep going after full marks.',
        body: '<span class="num">441</span> submissions came after a problem was already at 100. Stop counting at each first full score and HW3’s longest tail shrinks from <b>108 to 47</b>.' },
      { at: 17 + O, kicker: '03 · Attempts', title: 'The average k-th try gets <em>worse.</em>',
        body: 'Mean score of each student’s 1st, 2nd, 3rd … submission to a problem. In HW1 it falls from <span class="num">76.9</span> at the first try to <span class="num">24.4</span> by the sixth.' },
      { at: 26 + O, kicker: '03 · Attempts', title: 'Because the cohort changes.',
        body: 'Students who solve a problem stop submitting. Later tries come only from those still stuck: <b>38</b> students made a first HW1 try, <b>5</b> a thirteenth. It is not one group getting worse.' },
    ],
    howto: '<b>Tries</b>: one dot per submission, stacked by try number and coloured by homework; grey = masked later tries. <b>Spread</b>: box = middle half of students, line = median, whiskers = fewest to most submissions (log scale). <b>Cohort</b>: top, mean score of the k-th submission; bottom, students still submitting. Hover the cohort chart for every homework at one try.',
    onBeat() { st.userView = null; st.userMeasure = null; },
    mount(el) {
      svg = d3.select(el).append('svg').attr('class', 'viz');
      gTries = svg.append('g').attr('data-interactive', '');
      gBox = svg.append('g');
      gCo = svg.append('g');
      // box view
      gBox.append('g').attr('class', 'axis');
      boxRows = gBox.append('g').attr('data-interactive', '').selectAll('g.brow').data(A).join((en) => {
        const g = en.append('g').attr('class', 'brow');
        g.append('rect').attr('class', 'hit');
        g.append('line').attr('class', 'ghostw').attr('stroke', F.ink).attr('stroke-opacity', 0.18);
        g.append('rect').attr('class', 'ghostb').attr('fill', 'none').attr('stroke', F.ink).attr('stroke-opacity', 0.22).attr('rx', 3);
        g.append('line').attr('class', 'whisk').attr('stroke', F.ink).attr('stroke-opacity', 0.55);
        g.append('line').attr('class', 'cap0').attr('stroke', F.ink).attr('stroke-opacity', 0.55);
        g.append('line').attr('class', 'cap1').attr('stroke', F.ink).attr('stroke-opacity', 0.55);
        g.append('rect').attr('class', 'box').attr('rx', 3);
        g.append('line').attr('class', 'med').attr('stroke', F.ink).attr('stroke-width', 2.4);
        g.append('text').attr('class', 'hwl mono').style('font-size', '12px').style('font-weight', 500);
        g.append('text').attr('class', 'sub note');
        g.append('text').attr('class', 'medl mono').attr('text-anchor', 'middle').style('font-size', '11px').attr('fill', F.ink);
        g.append('text').attr('class', 'maxl big').style('font-size', '22px');
        g.append('line').attr('class', 'floor').attr('stroke', F.signal).attr('stroke-width', 1.4);
        return g;
      });
      boxRows.select('.box').attr('fill', (d) => F.color[d.homework]).attr('fill-opacity', 0.28).attr('stroke', (d) => F.color[d.homework]);
      boxRows.select('.hwl').attr('fill', (d) => F.color[d.homework]).text((d) => d.homework);
      boxRows.select('.sub').text((d) => `${d.problems} problems · ${d.all_attempts.n} students`);
      boxRows.on('pointerenter', (ev, d) => F.tip.show(boxTip(d), ev)).on('pointermove', (ev) => F.tip.move(ev)).on('pointerleave', () => F.tip.hide());
      mBox = gBox.append('g').attr('class', 'floorlab');
      mBox.append('text').attr('class', 'mono').style('font-size', '10px').attr('fill', F.signal).text('▲ one try per problem');

      // cohort view
      co = {};
      co.axes = gCo.append('g');
      co.clip = svg.append('defs').append('clipPath').attr('id', 'co-clip').append('rect');
      co.lines = gCo.append('g').attr('clip-path', 'url(#co-clip)');
      co.score = co.lines.selectAll('path.sc').data(series).join('path').attr('class', 'sc').attr('fill', 'none').attr('stroke-width', 2).attr('stroke', (d) => F.color[d.hw]);
      co.dots = co.lines.selectAll('g.dots').data(series).join('g').attr('class', 'dots').attr('fill', (d) => F.color[d.hw]);
      co.dots.selectAll('circle').data((d) => d.pts).join('circle');
      co.who = co.lines.selectAll('path.who').data(series).join('path').attr('class', 'who').attr('fill', 'none').attr('stroke-width', 1.6).attr('stroke', (d) => F.color[d.hw]);
      co.head = gCo.append('line').attr('stroke', F.ember).attr('stroke-width', 1);
      co.headLab = gCo.append('text').attr('class', 'mono').style('font-size', '10.5px').attr('fill', F.ember);
      co.ends = gCo.selectAll('text.end').data(series).join('text').attr('class', 'end mono').style('font-size', '10.5px').attr('fill', (d) => F.color[d.hw]).text((d) => d.hw);
      co.anno = gCo.append('g').attr('pointer-events', 'none');
      co.anno.append('circle').attr('r', 12).attr('fill', 'none').attr('stroke', F.ember).attr('stroke-width', 1.3);
      co.anno.append('text').attr('class', 'mono').style('font-size', '10.5px').attr('fill', F.ember);
      co.hover = gCo.append('line').attr('stroke', F.ink).attr('stroke-opacity', 0.4).attr('pointer-events', 'none');
      co.hit = gCo.append('rect').attr('class', 'hit').attr('data-interactive', '')
        .on('pointermove', (ev) => { const k = Math.round(co.x.invert(d3.pointer(ev)[0])); st.hoverK = F.clamp(k, 1, KMAX); F.tip.show(cohortTip(st.hoverK), ev); })
        .on('pointerleave', () => { st.hoverK = null; F.tip.hide(); });

      const html = d3.select(el).append('div').attr('class', 'html-layer');
      ctrlBox = html.append('div').attr('class', 'ctrls').node();
      ctrlView = F.segmented(ctrlBox, 'View', [['0', 'Tries'], ['1', 'Spread'], ['2', 'Cohort']], (v) => (st.userView = +v));
      ctrlMeasure = F.segmented(ctrlBox, 'Count', [['0', 'All submissions'], ['1', 'Until first full score']], (v) => { st.userMeasure = +v; st.userView = 1; });
    },
    resize(L) {
      const c = L.chart;
      TG = triesGeom(L); buildTries(L);
      geo = { c, top: c.y + 70, bottom: c.y + c.h - 40, x0: c.x + (L.narrow ? 70 : 130), x1: c.x + c.w - (L.narrow ? 40 : 80) };
      Object.assign(ctrlBox.style, { left: c.x + 'px', top: c.y - 6 + 'px', maxWidth: c.w + 'px' });
      x = d3.scaleLog().domain([2, 200]).range([geo.x0, geo.x1]);
      const ax = gBox.select('.axis'); ax.selectAll('*').remove();
      const ticks = [2, 5, 10, 20, 50, 100, 200];
      ax.selectAll('line').data(ticks).join('line').attr('x1', x).attr('x2', x).attr('y1', geo.top - 10).attr('y2', geo.bottom).attr('stroke', 'rgba(236,231,221,.06)');
      ax.selectAll('text').data(ticks).join('text').attr('class', 'mono').attr('x', x).attr('y', geo.bottom + 16).attr('text-anchor', 'middle').style('font-size', '10.5px').attr('fill', F.muted).text((d) => d);
      ax.append('text').attr('class', 'axis-title').attr('x', geo.x1).attr('y', geo.bottom + 32).attr('text-anchor', 'end').text('Submissions per student in the window (log scale)');
      // cohort geometry
      const split = geo.top + (geo.bottom - geo.top) * 0.62;
      co.x = d3.scaleLinear().domain([1, KMAX]).range([geo.x0 - (L.narrow ? 30 : 60), geo.x1]);
      co.y = d3.scaleLinear().domain([0, 100]).range([split - 18, geo.top]);
      co.y2 = d3.scaleLinear().domain([0, 40]).range([geo.bottom, split + 26]);
      co.r = d3.scaleSqrt().domain([0, 304]).range([0, 8]);
      co.axes.selectAll('*').remove();
      const gx = co.axes;
      gx.selectAll('line.gy').data([0, 25, 50, 75, 100]).join('line').attr('class', 'gy').attr('x1', co.x.range()[0]).attr('x2', co.x.range()[1]).attr('y1', co.y).attr('y2', co.y).attr('stroke', 'rgba(236,231,221,.06)');
      gx.selectAll('text.ty').data([0, 25, 50, 75, 100]).join('text').attr('class', 'ty mono').attr('x', co.x.range()[0] - 10).attr('y', co.y).attr('dy', '0.35em').attr('text-anchor', 'end').style('font-size', '10.5px').attr('fill', F.muted).text((d) => d);
      gx.selectAll('line.gy2').data([0, 20, 40]).join('line').attr('class', 'gy2').attr('x1', co.x.range()[0]).attr('x2', co.x.range()[1]).attr('y1', co.y2).attr('y2', co.y2).attr('stroke', 'rgba(236,231,221,.06)');
      gx.selectAll('text.ty2').data([0, 20, 40]).join('text').attr('class', 'ty2 mono').attr('x', co.x.range()[0] - 10).attr('y', co.y2).attr('dy', '0.35em').attr('text-anchor', 'end').style('font-size', '10.5px').attr('fill', F.muted).text((d) => d);
      gx.selectAll('text.tx').data(d3.range(1, KMAX + 1)).join('text').attr('class', 'tx mono').attr('x', co.x).attr('y', geo.bottom + 16).attr('text-anchor', 'middle').style('font-size', '10.5px').attr('fill', F.muted).text((d) => d);
      gx.append('text').attr('class', 'axis-title').attr('x', co.x.range()[0]).attr('y', geo.top - 14).text('Mean score of the k-th submission');
      gx.append('text').attr('class', 'axis-title').attr('x', co.x.range()[0]).attr('y', split + 12).text('Students still submitting at try k');
      gx.append('text').attr('class', 'axis-title').attr('x', co.x.range()[1]).attr('y', geo.bottom + 32).attr('text-anchor', 'end').text('Try number k (same student, same problem)');
      co.score.attr('d', (s) => d3.line().x((p) => co.x(p.attempt)).y((p) => co.y(p.mean_score)).curve(d3.curveMonotoneX)(s.pts));
      co.who.attr('d', (s) => d3.line().x((p) => co.x(p.attempt)).y((p) => co.y2(p.contributors)).curve(d3.curveMonotoneX)(s.pts));
      co.dots.selectAll('circle').attr('cx', (p) => co.x(p.attempt)).attr('cy', (p) => co.y(p.mean_score)).attr('r', (p) => co.r(p.submissions));
      co.ends.attr('x', (s) => co.x(s.pts[s.pts.length - 1].attempt) + 10).attr('y', (s) => co.y2(s.pts[s.pts.length - 1].contributors)).attr('dy', '0.35em');
      co.hit.attr('x', co.x.range()[0] - 10).attr('y', geo.top).attr('width', co.x.range()[1] - co.x.range()[0] + 20).attr('height', geo.bottom - geo.top);
      co.split = split;
    },
    render(t0, env) {
      const dt = env.dt || 0.016, t = t0 - O;
      const tlView = t0 < 8.4 ? 0 : t0 < 9.6 ? F.seg(t0, 8.4, 9.6) : t < 16.4 ? 1 : 1 + F.seg(t, 16.4, 17.8);
      st.view = st.userView == null ? tlView : F.approach(st.view, st.userView, dt, 6);
      const tlMeasure = F.seg(t, 9.6, 11.4);
      st.measure = st.userMeasure == null ? tlMeasure : F.approach(st.measure, st.userMeasure, dt, 6);
      ctrlView.set(st.userView ?? Math.round(tlView));
      ctrlMeasure.set(st.userMeasure ?? Math.round(tlMeasure));
      const vis = (k) => F.clamp(1 - Math.abs(st.view - k));
      const aT = vis(0), aS = vis(1), aC = vis(2);
      ctrlMeasure.el.style.opacity = aS;
      ctrlBox.style.opacity = F.seg(t0, 1, 2);
      gTries.attr('opacity', aT).attr('transform', `translate(${-70 * st.view},0)`).style('pointer-events', aT > 0.5 ? null : 'none');
      gBox.attr('opacity', aS).attr('transform', `translate(${-70 * (st.view - 1)},0)`).style('pointer-events', aS > 0.5 ? null : 'none');
      gCo.attr('opacity', aC).attr('transform', `translate(${70 * (2 - st.view)},0)`).style('pointer-events', aC > 0.5 ? null : 'none');
      // a viewer who jumps ahead sees each view fully drawn
      if (aT > 0.001) renderTries(t0);
      if (aS > 0.001) renderBox(st.userView != null ? Math.max(t, 6) : t);
      if (aC > 0.001) renderCohort(st.userView != null ? Math.max(t, 23.4) : t);
    },
  });

  function renderBox(t) {
    const band = (geo.bottom - geo.top) / A.length, m = F.ease.inOut(F.clamp(st.measure));
    boxRows.each(function (d, i) {
      const g = d3.select(this), y = geo.top + band * (i + 0.5);
      const a0 = d.all_attempts, a1 = d.through_first_ac;
      const s = {}; ['min', 'q1', 'median', 'q3', 'max'].forEach((k) => (s[k] = lerpLog(a0[k], a1[k], m)));
      const pb = F.seg(t, 0.8 + i * 0.25, 2.4 + i * 0.25, F.ease.outExpo), pw = F.seg(t, 1.8 + i * 0.25, 3.8 + i * 0.25, F.ease.outExpo);
      const med = s.median, lo = lerpLog(med, s.q1, pb), hi = lerpLog(med, s.q3, pb), wl = lerpLog(med, s.min, pw), wh = lerpLog(med, s.max, pw);
      const bh = Math.min(26, band * 0.34);
      g.attr('opacity', F.la(d.homework) * F.seg(t, 0.4 + i * 0.2, 1.2 + i * 0.2));
      g.select('.hit').attr('x', geo.c.x).attr('y', y - band / 2).attr('width', geo.x1 - geo.c.x + 60).attr('height', band);
      g.select('.hwl').attr('x', geo.c.x).attr('y', y - 2);
      g.select('.sub').attr('x', geo.c.x).attr('y', y + 14);
      g.select('.whisk').attr('x1', x(wl)).attr('x2', x(wh)).attr('y1', y).attr('y2', y);
      g.select('.cap0').attr('x1', x(wl)).attr('x2', x(wl)).attr('y1', y - 6).attr('y2', y + 6);
      g.select('.cap1').attr('x1', x(wh)).attr('x2', x(wh)).attr('y1', y - 6).attr('y2', y + 6);
      g.select('.box').attr('x', x(lo)).attr('width', Math.max(1, x(hi) - x(lo))).attr('y', y - bh / 2).attr('height', bh);
      g.select('.med').attr('x1', x(med)).attr('x2', x(med)).attr('y1', y - bh / 2 - 3).attr('y2', y + bh / 2 + 3);
      g.select('.medl').attr('x', x(med)).attr('y', y - bh / 2 - 9).attr('opacity', pb).text(F.fmt.p1(med).replace('.0', ''));
      g.select('.maxl').attr('x', x(wh) + 12).attr('y', y).attr('dy', '0.35em').attr('opacity', pw).attr('fill', F.ink).text(Math.round(wh));
      g.select('.ghostw').attr('x1', x(a0.min)).attr('x2', x(a0.max)).attr('y1', y + bh / 2 + 8).attr('y2', y + bh / 2 + 8).attr('opacity', m);
      g.select('.ghostb').attr('x', x(a0.q1)).attr('width', x(a0.q3) - x(a0.q1)).attr('y', y - bh / 2).attr('height', bh).attr('opacity', m);
      g.select('.floor').attr('x1', x(d.problems)).attr('x2', x(d.problems)).attr('y1', y + bh / 2 + 4).attr('y2', y + bh / 2 + 12).attr('opacity', F.seg(t, 4, 5));
    });
    const y4 = geo.top + ((geo.bottom - geo.top) / A.length) * 3.5 + Math.min(26, ((geo.bottom - geo.top) / A.length) * 0.34) / 2 + 26;
    mBox.attr('transform', `translate(${x(8) - 4},${y4})`).attr('opacity', F.seg(t, 4.4, 5.4));
  }

  function renderCohort(t) {
    const t0 = 17.6, p = F.seg(t, t0, t0 + 5.6, F.ease.inOut);
    const k = 1 + (KMAX - 1) * p;
    const xr = co.x.range();
    co.clip.attr('x', xr[0] - 20).attr('y', geo.top - 20).attr('height', geo.bottom - geo.top + 40).attr('width', co.x(k) - xr[0] + 22);
    const focus = F.seg(t, 26.3, 27.2); // beat 4: HW1 emphasis
    const emph = (h) => F.la(h) * (F.state.lens ? 1 : F.lerp(1, h === 'HW1' ? 1 : 0.2, focus));
    co.score.attr('opacity', (s) => emph(s.hw)).attr('stroke-width', (s) => (s.hw === 'HW1' ? 2 + focus : 2));
    co.dots.attr('opacity', (s) => emph(s.hw) * 0.9);
    co.who.attr('opacity', (s) => emph(s.hw) * 0.85).attr('stroke-width', (s) => (s.hw === 'HW1' ? 1.6 + 1.2 * focus : 1.6));
    co.ends.attr('opacity', (s) => emph(s.hw) * F.seg(t, t0 + 5, t0 + 6));
    const headOn = p > 0 && p < 1 ? 1 : 0;
    co.head.attr('x1', co.x(k)).attr('x2', co.x(k)).attr('y1', geo.top - 4).attr('y2', geo.bottom).attr('opacity', headOn * 0.8);
    co.headLab.attr('x', co.x(k) + 6).attr('y', geo.top + 4).attr('opacity', headOn).text(`try ${Math.floor(k)}`);
    co.axes.attr('opacity', F.seg(t, 16.6, 17.6));
    // annotation: HW1 try 6 (beat 3) → HW1 cohort (beat 4)
    const s1 = series[0];
    const pA = s1.pts.find((d) => d.attempt === 6), pB = s1.pts[s1.pts.length - 1];
    const aA = F.seg(t, 21.5, 22.3) * (1 - F.seg(t, 25.4, 26));
    const aB = F.seg(t, 27.4, 28.2);
    const pt = aB > 0 ? [co.x(pB.attempt), co.y2(pB.contributors)] : [co.x(pA.attempt), co.y(pA.mean_score)];
    co.anno.attr('opacity', Math.max(aA, aB)).attr('transform', `translate(${pt[0]},${pt[1]})`);
    co.anno.select('text').attr('x', aB > 0 ? -18 : 16).attr('y', aB > 0 ? -18 : 22).attr('text-anchor', aB > 0 ? 'end' : 'start').text(aB > 0 ? `HW1, try 13: 5 students (from 38)` : 'HW1, try 6: mean 24.4');
    co.hover.attr('opacity', st.hoverK ? 1 : 0).attr('x1', co.x(st.hoverK || 1)).attr('x2', co.x(st.hoverK || 1)).attr('y1', geo.top).attr('y2', geo.bottom);
  }

  function buildTries(L) {
    gTries.selectAll('*').remove();
    const g = TG;
    const cols = gTries.selectAll('g.tk').data(d3.range(1, KMAX + 1)).join('g').attr('class', 'tk')
      .attr('transform', (k) => `translate(${g.x0 + (k - 1) * g.slotW + 2},0)`);
    cols.append('rect').attr('class', 'hit').attr('x', -2).attr('y', g.top - 40).attr('width', g.slotW).attr('height', g.base - g.top + 70);
    cols.append('text').attr('class', 'k mono').attr('x', (g.cols * g.sp) / 2).attr('y', g.base + 16).attr('text-anchor', 'middle').style('font-size', '10.5px').attr('fill', F.muted).text((k) => k);
    cols.append('text').attr('class', 'n mono').attr('x', (g.cols * g.sp) / 2).attr('text-anchor', 'middle').style('font-size', L.narrow ? '9px' : '10.5px').attr('fill', F.ink)
      .attr('y', (k) => g.base - Math.ceil(colTotal[k] / g.cols) * g.sp - 8).text((k) => (L.narrow && k > 6 ? '' : F.fmt.int(colTotal[k])));
    cols.on('pointerenter', (ev, k) => F.tip.show(F.tip.html({ kicker: `Try ${k}`, title: `${F.fmt.int(colTotal[k])} submissions`,
      rows: F.HW.map((h, i) => [h, perK[k][i] ? F.fmt.int(perK[k][i]) : 'masked']), note: 'k-th submission by the same student to the same problem. Tries reached by fewer than five students are masked.' }), ev))
      .on('pointermove', (ev) => F.tip.move(ev)).on('pointerleave', () => F.tip.hide());
    gTries.append('text').attr('class', 'axis-title').attr('x', g.x0).attr('y', g.base + 34).text(L.narrow ? 'Try number →' : 'Try number on a problem (same student, same problem) →');
    const cl = gTries.append('g').attr('class', 'cl').attr('transform', `translate(${g.cloud.x},${g.cloud.y + g.cloud.r + 26})`);
    cl.append('text').attr('class', 'big').attr('text-anchor', 'middle').style('font-size', '26px').attr('fill', F.ink).text(MASKED_TAIL);
    cl.append('text').attr('class', 'note').attr('text-anchor', 'middle').attr('dy', 18).text(L.narrow ? 'masked' : 'later tries, masked');
    const lead = gTries.append('g').attr('class', 'lead');
    lead.append('text').attr('class', 'big').style('font-size', L.narrow ? '26px' : '40px').style('font-weight', 300).attr('fill', F.ember).text(F.fmt.int(colTotal[1]));
    lead.append('text').attr('class', 'mono').attr('y', 18).style('font-size', '10.5px').attr('fill', F.ink2).text('FIRST TRIES');
    lead.attr('transform', `translate(${g.x0 + g.cols * g.sp + 18},${g.base - Math.ceil(colTotal[1] / g.cols) * g.sp + 34})`);
  }
  function renderTries(t0) {
    gTries.selectAll('g.tk').attr('opacity', (k) => F.seg(t0, 1.6 + k * 0.08, 2.4 + k * 0.08));
    gTries.select('.lead').attr('opacity', F.seg(t0, 3, 3.8));
    gTries.select('.cl').attr('opacity', F.seg(t0, 3.4, 4.2));
  }

  function boxTip(d) {
    const a = d.all_attempts, b = d.through_first_ac;
    return F.tip.html({ kicker: d.homework, color: F.color[d.homework], title: `${a.n} students · ${d.problems} problems`,
      rows: [['', 'All · Until full'], ['Median', `${a.median} · ${b.median}`], ['Middle half', `${a.q1}–${a.q3} · ${b.q1}–${b.q3}`], ['Range', `${a.min}–${a.max} · ${b.min}–${b.max}`]],
      note: '“Until full” stops counting a problem at the student’s first full score. Counts do not measure effort.' });
  }
  function cohortTip(k) {
    const rows = [];
    series.forEach((s) => { const p = s.pts.find((d) => d.attempt === k); rows.push([s.hw, p ? `${F.fmt.p1(p.mean_score)} · ${p.contributors} st.` : 'withheld']); });
    return F.tip.html({ kicker: `Try ${k}`, title: 'Mean score · students', rows, note: 'Averages over the submissions that reached try k (N events; S students). Fewer than five students: withheld.' });
  }
})();
