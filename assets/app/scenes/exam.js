/* Scene 7 · And the midterm?
   26 linked grades (of 41 eligible). Spearman associations between pre-exam behavior and
   the midterm, with paired-student bootstrap 95% intervals, leave-one-out ranges and two
   subset checks. Exploratory: not causal effects, not validated predictions. */
(function () {
  const F = window.Film;
  const M = F.data.midterm, PL = F.data.platform;
  const rowsOJ = M.associations.map((a) => ({ ...a, src: 'oj' }));
  const rowsPL = PL.associations.map((a) => ({ ...a, src: 'pl' }));
  const LABELS = { attempts: 'Submission count', first_score: 'Mean first-try score', late_pct: 'Share sent in final 24 h', active_ms: 'Active time', active_days: 'Recorded days', resource_open: 'Resource opens' };
  const SHORT = { first_score: 'First-try score', late_pct: 'Last-24 h share' };
  const rows = [...rowsOJ, ...rowsPL];
  const SENS = [['all', 'All 26'], ['loo', 'Leave one out'], ['cov', 'Full coverage · 23'], ['disc', 'No discrepancies · 24']];
  const GROUPS = { oj: { label: 'Submission count', groups: M.attempt_groups }, pl: { label: 'Course Pulse use', groups: PL.groups } };
  const st = { view: 0, userView: null, sens: 'all', userSens: null, gb: 'oj', userGb: null, pts: {} };
  rows.forEach((r) => (st.pts[r.metric] = r.rho));
  let svg, geo, gDist, gForest, gGroups, x, ctrlBox, ctrlView, ctrlSens, ctrlGb, dists, frows, gbox;

  const sensValue = (r, s) => {
    if (r.src !== 'oj') return r.rho;
    if (s === 'cov') return r.complete_problem_coverage.rho;
    if (s === 'disc') return r.without_homework_discrepancies.rho;
    return r.rho;
  };

  F.scene({
    id: 'exam', title: '05 · Midterm', duration: 40, enter: 'zoom', tint: 'rgba(224,123,176,.10)',
    beats: [
      { at: 0, kicker: '05 · Midterm', title: '26 students, <em>one exam.</em>',
        body: 'Midterm grades were supplied for <b>26 of 41</b> eligible students. Mean <span class="num">90.0</span>, median <span class="num">93.3</span>; six scored 100 or more. HW4 came after the exam and is excluded.' },
      { at: 8, kicker: '05 · Midterm', title: 'One habit stands apart.',
        body: 'Spearman correlation with the midterm, with 95% bootstrap intervals. The share of a student’s submissions sent in the final 24 hours before each deadline: <b>ρ = −0.48</b>, the only interval entirely below zero.' },
      { at: 16, kicker: '05 · Midterm', title: 'Everything else <em>straddles zero.</em>',
        body: 'Submission count, first-try scores and Course Pulse usage lean one way or the other, but each interval still includes no association at all.' },
      { at: 23, kicker: '05 · Midterm', title: 'Check it three ways.',
        body: 'Leave one student out at a time, keep only students with full problem coverage, or drop two discrepant records: the late-share estimate stays between <b>−0.60 and −0.42</b>.' },
      { at: 31, kicker: '05 · Midterm', title: 'Associations, <em>not effects.</em>',
        body: 'Students with recorded Course Pulse use had a higher median midterm (<span class="num">94.5</span> vs <span class="num">87.5</span>), but who chooses to use a platform is not random. Small, partial cohort; exploratory.' },
    ],
    howto: '<b>Correlations</b>: dot = Spearman ρ with the midterm; line = paired bootstrap 95% interval; pale band = leave-one-out range. Switch the check to move the estimates. <b>Groups</b>: box = middle half, line = median, dot = mean (no minima or maxima are published).',
    onBeat() { st.userView = st.userSens = st.userGb = null; },
    snap() { st.snapNext = true; },
    mount(el) {
      svg = d3.select(el).append('svg').attr('class', 'viz');
      gDist = svg.append('g'); gForest = svg.append('g'); gGroups = svg.append('g');
      const html = d3.select(el).append('div').attr('class', 'html-layer');
      ctrlBox = html.append('div').attr('class', 'ctrls').node();
      ctrlView = F.segmented(ctrlBox, 'View', [['0', 'Scores'], ['1', 'Correlations'], ['2', 'Groups']], (v) => (st.userView = +v));
      ctrlSens = F.segmented(ctrlBox, 'Check', SENS, (v) => { st.userSens = v; st.userView = 1; });
      ctrlGb = F.segmented(ctrlBox, 'Group by', [['oj', 'Submissions'], ['pl', 'Course Pulse']], (v) => { st.userGb = v; st.userView = 2; });
    },
    resize(L) {
      const c = L.chart;
      geo = { c, top: c.y + (L.narrow ? 96 : 84), bottom: c.y + c.h - 40, narrow: L.narrow };
      Object.assign(ctrlBox.style, { left: c.x + 'px', top: c.y - 6 + 'px', maxWidth: c.w + 'px' });
      buildDist(); buildForest(); buildGroups();
    },
    render(t, env) {
      const dt = env.dt || 0.016;
      const tl = t < 7.4 ? 0 : t < 8.6 ? F.seg(t, 7.4, 8.6) : t < 30.4 ? 1 : 1 + F.seg(t, 30.4, 31.6);
      st.view = st.userView == null ? tl : F.approach(st.view, st.userView, dt, 6);
      const tlSens = t >= 23.4 && t < 25.8 ? 'loo' : t >= 25.8 && t < 28.2 ? 'cov' : t >= 28.2 && t < 30.4 ? 'disc' : 'all';
      st.sens = st.userSens || tlSens;
      st.gb = st.userGb || 'pl';
      ctrlView.set(st.userView ?? Math.round(tl));
      ctrlSens.set(st.sens); ctrlGb.set(st.gb);
      ctrlSens.el.style.display = st.view > 0.5 && st.view < 1.5 ? '' : 'none';
      ctrlGb.el.style.display = st.view >= 1.5 ? '' : 'none';
      ctrlBox.style.opacity = F.seg(t, 1, 2);
      const vis = (k) => F.clamp(1 - Math.abs(st.view - k));
      [[gDist, 0], [gForest, 1], [gGroups, 2]].forEach(([g, k]) => g.attr('opacity', vis(k)).attr('transform', `translate(0,${(1 - vis(k)) * 26})`).style('pointer-events', vis(k) > 0.5 ? null : 'none'));
      if (vis(0) > 0.001) renderDist(t);
      if (vis(1) > 0.001) renderForest(t, dt);
      if (vis(2) > 0.001) renderGroups(t, dt);
    },
  });

  // ── 26 scores as units ───────────────────────────────────────────
  function buildDist() {
    gDist.selectAll('*').remove();
    const c = geo.c, bins = M.distribution, bw = Math.min(170, (c.w - 40) / bins.length), x0 = c.x + (c.w - bw * bins.length) / 2;
    const r = Math.min(14, bw / 7), base = geo.bottom - 70;
    dists = { bins, bw, x0, r, base, dots: [] };
    bins.forEach((b, i) => d3.range(b.n).forEach((j) => dists.dots.push({ i, j, k: dists.dots.length })));
    gDist.selectAll('circle').data(dists.dots).join('circle').attr('r', r).attr('fill', (d) => (d.i === 3 ? F.ember : F.ink)).attr('fill-opacity', (d) => (d.i === 3 ? 0.95 : 0.8));
    const lab = gDist.selectAll('g.bl').data(bins).join('g').attr('class', 'bl').attr('transform', (d, i) => `translate(${x0 + bw * (i + 0.5)},${base + 30})`);
    lab.append('text').attr('text-anchor', 'middle').style('font-size', '13px').attr('fill', F.ink).text((d) => d.label);
    lab.append('text').attr('text-anchor', 'middle').attr('class', 'mono').attr('y', 18).style('font-size', '10.5px').attr('fill', F.muted).text((d) => `${d.n} students`);
    gDist.append('line').attr('x1', x0).attr('x2', x0 + bw * bins.length).attr('y1', base + 8).attr('y2', base + 8).attr('stroke', 'rgba(236,231,221,.25)');
    const big = gDist.append('g').attr('class', 'stats').attr('transform', `translate(${x0},${geo.top + 20})`);
    [['Mean', M.mean], ['Median', M.median]].forEach(([k, v], i) => {
      const g = big.append('g').attr('transform', `translate(${i * 170},0)`);
      g.append('text').attr('class', 'axis-title').text(k);
      g.append('text').attr('class', 'big val').attr('y', 46).style('font-size', '48px').style('font-weight', 300).attr('data-v', v);
    });
    big.append('text').attr('class', 'note').attr('x', 0).attr('y', 74).text(`Grades supplied for ${M.available_grades} of ${M.eligible_roster} eligible students · raw points above 100 kept`);
  }
  function renderDist(t) {
    const d = dists, cols = 2;
    gDist.selectAll('circle').each(function (p) {
      const pr = F.seg(t, 0.6 + p.k * 0.07, 1.4 + p.k * 0.07, F.ease.outBack);
      const cx = d.x0 + d.bw * (p.i + 0.5) + ((p.j % cols) - (cols - 1) / 2) * d.r * 2.4;
      const cy = d.base - d.r - Math.floor(p.j / cols) * d.r * 2.4;
      d3.select(this).attr('cx', cx).attr('cy', cy - (1 - pr) * 120).attr('opacity', F.clamp(pr * 1.5));
    });
    gDist.selectAll('text.val').each(function () { const v = +this.dataset.v; d3.select(this).text(F.fmt.p1(v * F.seg(t, 0.8, 3, F.ease.out))); });
    gDist.select('.stats').attr('opacity', F.seg(t, 0.6, 1.6));
  }

  // ── forest plot ──────────────────────────────────────────────────
  function buildForest() {
    gForest.selectAll('*').remove();
    const c = geo.c, labelW = geo.narrow ? 104 : 210;
    const left = c.x + labelW + 20, right = c.x + c.w - 30;
    x = d3.scaleLinear().domain([-1, 1]).range([left, right]);
    const items = [{ head: 'OJ submissions · HW1–HW3, before the exam' }, ...rowsOJ, { head: 'Course Pulse platform · 8–16 Sep' }, ...rowsPL];
    const rowH = Math.min(62, (geo.bottom - geo.top - 20) / items.length);
    let y = geo.top + 10;
    items.forEach((it) => { it.y = y + rowH / 2; y += rowH; });
    frows = { items, rowH, left, right };
    const ax = gForest.append('g');
    [-1, -0.5, 0, 0.5, 1].forEach((v) => {
      ax.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', geo.top).attr('y2', y).attr('stroke', v === 0 ? 'rgba(236,231,221,.45)' : 'rgba(236,231,221,.06)').attr('class', v === 0 ? 'zero' : '');
      ax.append('text').attr('class', 'mono').attr('x', x(v)).attr('y', y + 16).attr('text-anchor', 'middle').style('font-size', '10.5px').attr('fill', F.muted).text(v === 0 ? '0' : (v > 0 ? '+' : '−') + Math.abs(v));
    });
    if (!geo.narrow) {
      ax.append('text').attr('class', 'axis-title').attr('x', x(-1)).attr('y', y + 34).text('← lower midterm');
      ax.append('text').attr('class', 'axis-title').attr('x', x(1)).attr('y', y + 34).attr('text-anchor', 'end').text('higher midterm →');
    }
    ax.append('text').attr('class', 'axis-title').attr('x', x(0)).attr('y', y + 34).attr('text-anchor', 'middle').text('Spearman ρ');
    const g = gForest.append('g').attr('data-interactive', '').selectAll('g.fr').data(items).join('g').attr('class', 'fr').attr('transform', (d) => `translate(0,${d.y})`);
    g.filter((d) => d.head).append('text').attr('class', 'mono').attr('x', c.x).attr('y', 4).style('font-size', '10.5px').style('letter-spacing', '.1em').attr('fill', F.muted).text((d) => d.head.toUpperCase());
    const r = g.filter((d) => !d.head);
    r.append('rect').attr('class', 'hit').attr('x', c.x).attr('y', -rowH / 2).attr('width', right - c.x).attr('height', rowH);
    r.append('text').attr('class', 'lab').attr('x', c.x + labelW).attr('text-anchor', 'end').attr('dy', '0.35em').style('font-size', geo.narrow ? '11px' : '12.5px').text((d) => (geo.narrow && SHORT[d.metric]) || LABELS[d.metric]);
    r.append('rect').attr('class', 'loo').attr('height', 14).attr('y', -7).attr('rx', 7).attr('fill', F.ink).attr('fill-opacity', 0.1);
    r.append('line').attr('class', 'ci').attr('stroke-width', 2).attr('stroke-linecap', 'round');
    r.append('circle').attr('class', 'pt').attr('r', 7).attr('stroke', F.bg).attr('stroke-width', 2);
    r.append('text').attr('class', 'rv mono').attr('dy', '0.35em').style('font-size', '11px');
    r.on('pointerenter', (e, d) => F.tip.show(forestTip(d), e)).on('pointermove', (e) => F.tip.move(e)).on('pointerleave', () => F.tip.hide());
  }
  function renderForest(t, dt) {
    const hi = F.seg(t, 9.4, 10.4); // late share highlight
    const dim = F.seg(t, 16.4, 17.4) * (1 - F.seg(t, 22.6, 23.4));
    gForest.selectAll('g.fr').filter((d) => !d.head).each(function (d, i) {
      const g = d3.select(this);
      const ex = d.bootstrap_interval[1] < 0 || d.bootstrap_interval[0] > 0;
      const target = sensValue(d, st.sens);
      st.pts[d.metric] = st.snapNext ? target : F.approach(st.pts[d.metric], target, dt, 5);
      const v = st.pts[d.metric];
      const pIn = F.seg(t, 8.4 + i * 0.18, 9.4 + i * 0.18, F.ease.outBack), ci = F.seg(t, 9 + i * 0.18, 10.6 + i * 0.18, F.ease.outExpo);
      const col = ex ? F.lerp(0, 1, hi) > 0.5 ? F.signal : F.ink : F.ink;
      const [lo, up] = d.bootstrap_interval;
      const subset = d.src === 'oj' && (st.sens === 'cov' || st.sens === 'disc');
      g.attr('opacity', (ex ? 1 : F.lerp(1, 0.55, hi * (1 - dim)) ) * (d.src === 'pl' && subset ? 0.35 : 1));
      g.select('.lab').attr('fill', ex && hi > 0.5 ? F.ink : F.ink2).style('font-weight', ex && hi > 0.5 ? 600 : 400);
      g.select('.ci').attr('x1', x(F.lerp(d.rho, lo, ci))).attr('x2', x(F.lerp(d.rho, up, ci))).attr('stroke', col).attr('stroke-opacity', subset ? 0.25 : 0.9);
      g.select('.pt').attr('cx', x(v)).attr('r', 7 * Math.max(0, pIn)).attr('fill', col);
      const loo = d.leave_one_out_range, looA = st.sens === 'loo' ? 1 : 0.35;
      g.select('.loo').attr('opacity', loo ? looA * ci : 0).attr('x', loo ? x(loo[0]) - 7 : 0).attr('width', loo ? x(loo[1]) - x(loo[0]) + 14 : 0)
        .attr('fill', st.sens === 'loo' && ex ? F.signal : F.ink).attr('fill-opacity', st.sens === 'loo' ? 0.28 : 0.1);
      g.select('.rv').attr('x', x(up) + 14).attr('fill', ex && hi > 0.5 ? F.signal : F.ink2).attr('opacity', ci).text(`ρ ${F.fmt.rho(v)}`);
    });
    st.snapNext = false;
    gForest.selectAll('line.zero').attr('stroke', F.lerp(0, 1, hi) > 0.5 ? 'rgba(236,231,221,.6)' : 'rgba(236,231,221,.45)');
  }
  function forestTip(d) {
    const rows = [['ρ (all 26)', F.fmt.rho(d.rho)], ['95% bootstrap', `${F.fmt.rho(d.bootstrap_interval[0])} to ${F.fmt.rho(d.bootstrap_interval[1])}`]];
    if (d.leave_one_out_range) rows.push(['Leave one out', `${F.fmt.rho(d.leave_one_out_range[0])} to ${F.fmt.rho(d.leave_one_out_range[1])}`]);
    if (d.complete_problem_coverage) rows.push(['Full coverage (23)', F.fmt.rho(d.complete_problem_coverage.rho)]);
    if (d.without_homework_discrepancies) rows.push(['No discrepancies (24)', F.fmt.rho(d.without_homework_discrepancies.rho)]);
    return F.tip.html({ kicker: d.src === 'oj' ? 'OJ behavior' : 'Course Pulse', title: LABELS[d.metric], rows,
      note: `${d.valid_bootstrap_draws.toLocaleString()} paired student bootstrap draws. Exploratory association, not a causal effect.` });
  }

  // ── group boxes ──────────────────────────────────────────────────
  function buildGroups() {
    gGroups.selectAll('*').remove();
    const c = geo.c, left = c.x + 60, right = c.x + c.w - 20;
    const y = d3.scaleLinear().domain([60, 110]).range([geo.bottom - 30, geo.top + 30]);
    gbox = { y, left, right };
    const ax = gGroups.append('g');
    [60, 70, 80, 90, 100, 110].forEach((v) => {
      ax.append('line').attr('x1', left).attr('x2', right).attr('y1', y(v)).attr('y2', y(v)).attr('stroke', v === 100 ? 'rgba(255,181,71,.3)' : 'rgba(236,231,221,.06)');
      ax.append('text').attr('class', 'mono').attr('x', left - 10).attr('y', y(v)).attr('dy', '0.35em').attr('text-anchor', 'end').style('font-size', '10.5px').attr('fill', F.muted).text(v);
    });
    ax.append('text').attr('class', 'axis-title').attr('x', left).attr('y', geo.top + 10).text('Midterm score');
    gGroups.append('text').attr('class', 'note').attr('x', right).attr('y', geo.top + 10).attr('text-anchor', 'end').text('Groups of 5+ students; minima and maxima are not published.');
    gbox.g = gGroups.append('g').attr('data-interactive', '');
  }
  function renderGroups(t, dt) {
    const set = GROUPS[st.gb].groups, n = set.length, { y, left, right } = gbox;
    const bw = Math.min(110, (right - left) / (n * 2.2)), step = (right - left) / n;
    const sel = gbox.g.selectAll('g.gb').data(set, (d) => st.gb + d.label).join((en) => {
      const g = en.append('g').attr('class', 'gb');
      g.append('rect').attr('class', 'hit');
      g.append('rect').attr('class', 'box').attr('rx', 4);
      g.append('line').attr('class', 'med').attr('stroke', F.ink).attr('stroke-width', 2.5);
      g.append('circle').attr('class', 'mean').attr('r', 5).attr('fill', F.ember);
      g.append('text').attr('class', 'lab').attr('text-anchor', 'middle').style('font-size', '13px').attr('fill', F.ink);
      g.append('text').attr('class', 'nn mono').attr('text-anchor', 'middle').style('font-size', '10.5px').attr('fill', F.muted);
      g.append('text').attr('class', 'mv big').attr('text-anchor', 'middle').style('font-size', '26px').style('font-weight', 350).attr('fill', F.ink);
      g.on('pointerenter', (e, d) => F.tip.show(F.tip.html({ kicker: GROUPS[st.gb].label, title: d.label, rows: [['Students', d.n], ['Median', d.median], ['Middle half', `${d.q1}–${d.q3}`], ['Mean', d.mean]], note: 'Descriptive comparison; groups differ in ways the data cannot see.' }), e))
        .on('pointermove', (e) => F.tip.move(e)).on('pointerleave', () => F.tip.hide());
      return g;
    });
    const p0 = st.userGb ? 1 : F.seg(t, 31.2, 32.6, F.ease.outExpo);
    sel.each(function (d, i) {
      const g = d3.select(this), cx = left + step * (i + 0.5), p = F.clamp(p0 * 1.3 - i * 0.12);
      const med = y(d.median), q1 = F.lerp(med, y(d.q1), p), q3 = F.lerp(med, y(d.q3), p);
      const col = st.gb === 'pl' ? (i === 0 ? F.color.HW4 : F.withheld) : F.color[F.HW[i]];
      g.select('.hit').attr('x', cx - step / 2).attr('y', gbox.y.range()[1]).attr('width', step).attr('height', gbox.y.range()[0] - gbox.y.range()[1]);
      g.select('.box').attr('x', cx - bw / 2).attr('width', bw).attr('y', q3).attr('height', Math.max(1, q1 - q3)).attr('fill', col).attr('fill-opacity', 0.3).attr('stroke', col);
      g.select('.med').attr('x1', cx - bw / 2 - 4).attr('x2', cx + bw / 2 + 4).attr('y1', med).attr('y2', med);
      g.select('.mean').attr('cx', cx).attr('cy', F.lerp(med, y(d.mean), p)).attr('opacity', p);
      g.select('.lab').attr('x', cx).attr('y', y(60) + 26).text(d.label);
      g.select('.nn').attr('x', cx).attr('y', y(60) + 42).text(`n = ${d.n}`);
      g.select('.mv').attr('x', cx).attr('y', q3 - 14).attr('opacity', p).text(d.median);
    });
  }
})();
