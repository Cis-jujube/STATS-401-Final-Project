/* The exam question: a different, partial, pre-exam sample.
   26 supplied grades (of 41 eligible). OJ metrics come from pre-exam HW1–HW3 only; HW4 came
   after the exam and is excluded. Spearman associations with paired-student bootstrap 95%
   intervals; leave-one-out ranges and two subset checks are sensitivity diagnostics, a
   different kind of object. Exploratory: not causal effects, not validated predictions.
   Scene timeline (local seconds):
     0–9    bridge: the sample switch (HW4's submissions leave; 26 of 41 grades)
     9–17   Figure 05 · midterm score distribution
     17–40  Figure 06 · OJ behaviour–exam associations: A bootstrap, B leave-one-out, C subsets
     40–49  Figure 07 · midterm by submission-count group
     49–59  Figure 08 · Course Pulse observation coverage
     59–68  Figure 09 · midterm by recorded platform use
     68–79  Figure 10 · combined OJ and platform associations */
(function () {
  const F = window.Film, P = F.particles;
  const M = F.data.midterm, PL = F.data.platform, A = F.data.homework.assignments;
  const examAt = Date.parse(M.exam_started_at);
  const pre = A.filter((a) => Date.parse(a.end_local) < examAt), post = A.filter((a) => Date.parse(a.end_local) >= examAt);
  const preN = d3.sum(pre, (a) => a.submissions), postN = d3.sum(post, (a) => a.submissions);
  const postIdx = new Set(post.map((a) => F.HW.indexOf(a.homework)));
  const LABELS = { attempts: 'Submission count', first_score: 'Mean first-try score', late_pct: 'Final-24h submission share',
    active_ms: 'Platform active time', active_days: 'Platform recorded days', resource_open: 'Resource opens' };
  const SHORT = { attempts: 'Submissions', first_score: 'First-try score', late_pct: 'Last-24 h share', active_ms: 'Active time', active_days: 'Recorded days', resource_open: 'Resource opens' };
  const ORDER6 = ['late_pct', 'attempts', 'first_score'];
  const rows6 = ORDER6.map((m) => M.associations.find((a) => a.metric === m));
  const rows10 = [...PL.oj_associations.map((a) => ({ ...a, src: 'oj' })), ...PL.associations.map((a) => ({ ...a, src: 'pl' }))];
  // each view crossfades in over 1.2 s starting exactly at its chapter boundary, so a reading stop
  // (0.5 s before a boundary) never shows the next figure
  const SCHED = [[9, 10.2], [17, 18.2], [40, 41.2], [49, 50.2], [59, 60.2], [68, 69.2]];
  const tlViewAt = (t) => { let v = 0; SCHED.forEach(([a, b], k) => { if (t >= a) v = k + F.seg(t, a, b, F.ease.linear); }); return v; };
  const rho = (v) => F.fmt.rho(v);
  const upper = (s) => s.toUpperCase().replace(/Ρ/g, 'ρ'); // keep Spearman's ρ lowercase
  const st = { view: 0 };
  let svg, geo, layers, gBridge, gDist, gRob, gG7, gCov, gG9, gF10, dists;

  // ── particles: the homework dots, with the post-exam homework leaving the sample ──
  P.define('exambridge', (o, env) => {
    const g = P.stackGeom(), t = env.t, K = P.K;
    const drop = F.ease.inOut(F.seg(t, 2.2, 4.4, F.ease.linear));
    for (let i = 0; i < P.N; i++) {
      const h = P.hwIdx[i], j = P.rank[i];
      let x = g.xs[h] + (j % g.cols) * g.sp + g.sp / 2, y = g.base - Math.floor(j / g.cols) * g.sp - g.sp / 2, a = 0.95, c = h;
      if (postIdx.has(h)) { x += drop * (18 + K.u[i] * 16); y += drop * (26 + K.d[i] * 40); a = F.lerp(0.95, 0.14, drop); if (drop > 0.5) c = 4; }
      o.x[i] = x; o.y[i] = y; o.a[i] = a; o.s[i] = g.sp * 0.62; o.c[i] = c;
    }
    o.glow = 0.2; o.glowSet = null; o.repel = false;
  });

  F.scene({
    id: 'exam', title: 'Exam', duration: 79, enter: 'zoom', tint: 'rgba(224,123,176,.08)',
    particles: [{ at: 0, form: 'exambridge', dur: 2.2, curl: 0.6, spread: 0.4 }, { at: 8.6, form: 'ambient', dur: 1.8 }],
    howto: (fig) => ({
      '05': 'One dot per supplied grade (26 students), stacked in four unequal-width score categories. The 15 grades not in the excerpt are missing, not zero.',
      '06': '<b>A</b>: dot = Spearman ρ with the midterm; bar = paired-student bootstrap 95% interval. <b>B</b>: range of ρ when each student is left out in turn; hollow dot = full estimate. It is a sensitivity range, not a confidence interval. <b>C</b>: ◆ only students with full problem coverage (n = 23); ■ omitting two discrepant records (n = 24). Hover any row for exact values.',
      '07': 'Box = middle half of midterm scores in each pre-exam submission-count group; line = median; dot = mean. Minima and maxima are not published. Middle half is score dispersion, not a confidence interval.',
      '08': 'Each dot is one student in a nested subset: eligible roster, supplied grades matched to Course Pulse, recorded pre-exam use, resource opens. Below: the observation windows of the two sources differ.',
      '09': 'Box = middle half of midterm scores; line = median; dot = mean, for students with and without recorded Course Pulse use before the cutoff.',
      '10': 'Dot = Spearman ρ with the midterm for the same 26 students; line = paired-student bootstrap 95% interval. OJ rows (circles) cover HW1–HW3; platform rows (squares) cover 8–16 Sep.',
    }[fig] || 'The exam analysis uses 26 supplied grades and pre-exam HW1–HW3; HW4 is excluded.'),
    onBeat() {},
    snap() { st.snap = true; },
    mount(el) {
      svg = d3.select(el).append('svg').attr('class', 'viz');
      gBridge = svg.append('g'); gDist = svg.append('g'); gRob = svg.append('g').attr('data-interactive', '');
      gG7 = svg.append('g').attr('data-interactive', ''); gCov = svg.append('g'); gG9 = svg.append('g').attr('data-interactive', ''); gF10 = svg.append('g').attr('data-interactive', '');
      layers = [gBridge, gDist, gRob, gG7, gCov, gG9, gF10];
    },
    resize(L) {
      const c = L.chart;
      geo = { c, top: c.y + (L.narrow ? 30 : 34), bottom: c.y + c.h - (L.narrow ? 36 : 40), narrow: L.narrow };
      buildBridge(L); buildDist(); buildRobust(); buildGroups(gG7, M.attempt_groups, 'Pre-exam HW1–HW3 submissions per student', 'Submission-count group');
      buildCoverage(L); buildGroups(gG9, PL.groups, 'Recorded Course Pulse use before the cutoff', 'Course Pulse');
      buildF10();
    },
    render(t, env) {
      st.view = tlViewAt(t);
      const vis = (k) => F.clamp(1 - Math.abs(st.view - k));
      layers.forEach((g, k) => g.attr('opacity', vis(k)).attr('transform', `translate(0,${(1 - vis(k)) * 22})`).style('pointer-events', vis(k) > 0.5 ? null : 'none'));
      if (vis(0) > 0.001) renderBridge(t);
      if (vis(1) > 0.001) renderDist(t - 9);
      if (vis(2) > 0.001) renderRobust(t);
      if (vis(3) > 0.001) renderGroups(gG7, t - 40);
      if (vis(4) > 0.001) renderCoverage(t - 49);
      if (vis(5) > 0.001) renderGroups(gG9, t - 59);
      if (vis(6) > 0.001) renderF10(t - 68);
      st.snap = false;
    },
  });

  // ── bridge: the sample switch ────────────────────────────────────
  function buildBridge(L) {
    gBridge.selectAll('*').remove();
    const g = P.stackGeom(L), nar = L.narrow, last = pre.length - 1;
    const xEx = (g.xs[last] + g.colW + g.xs[last + 1]) / 2;
    const top = geo.top + (nar ? 34 : 54);
    const ex = gBridge.append('g').attr('class', 'exline');
    ex.append('line').attr('x1', xEx).attr('x2', xEx).attr('y1', top).attr('y2', g.base + 30).attr('stroke', F.signal).attr('stroke-dasharray', '4 5').attr('stroke-width', 1.2);
    ex.append('path').attr('d', d3.symbol(d3.symbolStar, 70)()).attr('transform', `translate(${xEx},${top - 10})`).attr('fill', F.signal);
    ex.append('text').attr('class', 'mono').attr('x', xEx + 10).attr('y', top - 6).style('font-size', nar ? '9px' : '10.5px').attr('fill', F.signal).text(nar ? 'MIDTERM' : 'MIDTERM · 16 SEP 12:00');
    const lab = gBridge.append('g').attr('class', 'blab');
    const pre0 = g.xs[0], pre1 = g.xs[last] + g.colW;
    lab.append('text').attr('class', 'big').attr('x', (pre0 + pre1) / 2).attr('y', g.base + (nar ? 30 : 40)).attr('text-anchor', 'middle').style('font-size', nar ? '18px' : '26px').attr('fill', F.ink).text(F.fmt.int(preN));
    lab.append('text').attr('class', 'mono').attr('x', (pre0 + pre1) / 2).attr('y', g.base + (nar ? 44 : 58)).attr('text-anchor', 'middle').style('font-size', nar ? '8.5px' : '10.5px').attr('fill', F.ink2)
      .text(`${pre[0].homework}–${pre[last].homework} · PRE-EXAM SUBMISSIONS`);
    const px = g.xs[last + 1] + g.colW / 2;
    lab.append('text').attr('class', 'big xl').attr('x', px).attr('y', g.base + (nar ? 30 : 40)).attr('text-anchor', 'middle').style('font-size', nar ? '18px' : '26px').attr('fill', F.muted).text(F.fmt.int(postN));
    lab.append('text').attr('class', 'mono xl').attr('x', px).attr('y', g.base + (nar ? 44 : 58)).attr('text-anchor', 'middle').style('font-size', nar ? '8.5px' : '10.5px').attr('fill', F.muted)
      .text(nar ? `${post.map((a) => a.homework).join(' ')} · EXCLUDED` : `${post.map((a) => a.homework).join(' ')} · AFTER THE EXAM · EXCLUDED`);
    // the unit changes: 41 eligible students, 26 grades supplied
    const stu = gBridge.append('g').attr('class', 'stu');
    const n = M.eligible_roster, sp = Math.min(nar ? 7.5 : 13, (L.chart.w * (nar ? 0.95 : 0.6)) / n), x0 = L.chart.x + (nar ? 0 : 4);
    stu.append('text').attr('class', 'mono').attr('x', x0).attr('y', geo.top - 4).style('font-size', nar ? '9px' : '10.5px').attr('fill', F.ink2)
      .text(`${M.matched} OF ${M.eligible_roster} ELIGIBLE STUDENTS HAVE A SUPPLIED GRADE`);
    stu.selectAll('circle').data(d3.range(n)).join('circle').attr('cx', (i) => x0 + sp * (i + 0.5)).attr('cy', geo.top + 12).attr('r', sp * 0.34)
      .attr('fill', (i) => (i < M.matched ? F.ink : 'none')).attr('stroke', (i) => (i < M.matched ? 'none' : F.muted)).attr('stroke-width', 1);
  }
  function renderBridge(t) {
    gBridge.select('.exline').attr('opacity', F.seg(t, 1.0, 2.0));
    gBridge.select('.blab').attr('opacity', F.seg(t, 3.4, 4.4));
    gBridge.selectAll('.stu circle').attr('opacity', (i) => F.seg(t, 4.6 + i * 0.03, 5.2 + i * 0.03));
    gBridge.select('.stu text').attr('opacity', F.seg(t, 4.6, 5.4));
  }

  // ── Figure 05 · 26 scores as units ───────────────────────────────
  function buildDist() {
    gDist.selectAll('*').remove();
    const c = geo.c, bins = M.distribution, bw = Math.min(170, (c.w - 40) / bins.length), x0 = c.x + (c.w - bw * bins.length) / 2;
    const r = Math.min(14, bw / 7), base = geo.bottom - 50;
    dists = { bins, bw, x0, r, base, dots: [] };
    bins.forEach((b, i) => d3.range(b.n).forEach((j) => dists.dots.push({ i, j, k: dists.dots.length })));
    gDist.selectAll('circle').data(dists.dots).join('circle').attr('r', r).attr('fill', (d) => (d.i === 3 ? F.ember : F.ink)).attr('fill-opacity', (d) => (d.i === 3 ? 0.95 : 0.8));
    const lab = gDist.selectAll('g.bl').data(bins).join('g').attr('class', 'bl').attr('transform', (d, i) => `translate(${x0 + bw * (i + 0.5)},${base + 30})`);
    lab.append('text').attr('text-anchor', 'middle').style('font-size', '13px').attr('fill', F.ink).text((d) => d.label);
    lab.append('text').attr('text-anchor', 'middle').attr('class', 'mono').attr('y', 18).style('font-size', '10.5px').attr('fill', F.muted).text((d) => `${d.n} students`);
    gDist.append('line').attr('x1', x0).attr('x2', x0 + bw * bins.length).attr('y1', base + 8).attr('y2', base + 8).attr('stroke', 'rgba(236,231,221,.25)');
    const big = gDist.append('g').attr('class', 'stats').attr('transform', `translate(${x0},${geo.top + 50})`);
    [['Mean', M.mean], ['Median', M.median]].forEach(([k, v], i) => {
      const g = big.append('g').attr('transform', `translate(${i * 170},0)`);
      g.append('text').attr('class', 'axis-title').text(k);
      g.append('text').attr('class', 'big val').attr('y', 46).style('font-size', geo.narrow ? '36px' : '48px').style('font-weight', 300).attr('data-v', v);
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
    gDist.selectAll('text.val').each(function () { const v = +this.dataset.v; d3.select(this).text(d3.format('.2f')(v * F.seg(t, 0.8, 3, F.ease.out))); });
    gDist.select('.stats').attr('opacity', F.seg(t, 0.6, 1.6));
  }

  // ── Figure 06 · three panels on one ρ scale ──────────────────────
  let rob;
  function buildRobust() {
    gRob.selectAll('*').remove();
    const c = geo.c, nar = geo.narrow, labelW = nar ? 84 : 196, valW = nar ? 84 : 120;
    const left = c.x + labelW + 14, right = c.x + c.w - valW, x = d3.scaleLinear().domain([-1, 1]).range([left, right]);
    const top = geo.top + 6, axisY = geo.bottom - 26;
    rob = { x, left, right, top, axisY, labelW, nar, panels: [] };
    const ax = gRob.append('g').attr('class', 'rax');
    [-1, -0.5, 0, 0.5, 1].forEach((v) => {
      ax.append('line').attr('class', v === 0 ? 'zero' : 'grid').attr('x1', x(v)).attr('x2', x(v)).attr('y1', top + 12).attr('y2', axisY)
        .attr('stroke', v === 0 ? 'rgba(236,231,221,.5)' : 'rgba(236,231,221,.06)').attr('stroke-dasharray', v === 0 ? '4 4' : null);
      ax.append('text').attr('class', 'mono').attr('x', x(v)).attr('y', axisY + 15).attr('text-anchor', 'middle').style('font-size', '10.5px').attr('fill', F.muted).text(v === 0 ? '0' : (v > 0 ? '+' : '−') + Math.abs(v));
    });
    ax.append('text').attr('class', 'axis-title').attr('x', x(0)).attr('y', axisY + 32).attr('text-anchor', 'middle').style('text-transform', 'none').text(upper('Spearman ρ with midterm score'));
    if (!nar) {
      ax.append('text').attr('class', 'axis-title').attr('x', left).attr('y', axisY + 32).text('← lower midterm');
      ax.append('text').attr('class', 'axis-title').attr('x', right).attr('y', axisY + 32).attr('text-anchor', 'end').text('higher midterm →');
    }
    const heads = nar
      ? ['A · ρ and 95% bootstrap interval', 'B · leave-one-out range', 'C · ◆ full coverage n=23  ■ no discrepancies n=24']
      : [`A · Full cohort (n = ${M.matched}) · dot = ρ, bar = 95% paired bootstrap interval`, 'B · Leave-one-out range · hollow dot = full estimate · not a confidence interval',
        'C · Subsets · ◆ full problem coverage (n = 23) · ■ omit two discrepant records (n = 24)'];
    ['A', 'B', 'C'].forEach((k, pi) => {
      const g = gRob.append('g').attr('class', 'panel p' + k);
      g.append('text').attr('class', 'mono head').style('font-size', nar ? '9px' : '10.5px').style('letter-spacing', '.06em').attr('fill', F.ink2).attr('x', c.x).text(upper(heads[pi]));
      const rows = g.selectAll('g.r').data(rows6).join('g').attr('class', 'r');
      rows.append('rect').attr('class', 'hit').attr('x', c.x).attr('width', c.w);
      rows.append('rect').attr('class', 'band').attr('x', left - 6).attr('width', right - left + 12).attr('fill', F.signal).attr('fill-opacity', (d) => (d.metric === 'late_pct' ? 0.07 : 0));
      rows.append('text').attr('class', 'lab').attr('x', c.x + labelW).attr('text-anchor', 'end').attr('dy', '0.35em').style('font-size', nar ? '10.5px' : '12.5px').attr('fill', F.ink2).text((d) => (nar ? SHORT : LABELS)[d.metric]);
      rows.append('text').attr('class', 'val mono').attr('x', right + (nar ? 8 : 12)).attr('dy', '0.35em').style('font-size', nar ? '9px' : '11.5px').attr('fill', F.ink);
      if (k === 'A') { rows.append('line').attr('class', 'ci').attr('stroke-width', 2.4).attr('stroke-linecap', 'round'); rows.append('circle').attr('class', 'pt').attr('stroke', F.bg).attr('stroke-width', 2); }
      if (k === 'B') {
        rows.append('line').attr('class', 'loo').attr('stroke', '#c9a24a').attr('stroke-width', 2);
        rows.append('line').attr('class', 'c0').attr('stroke', '#c9a24a').attr('stroke-width', 1.5); rows.append('line').attr('class', 'c1').attr('stroke', '#c9a24a').attr('stroke-width', 1.5);
        rows.append('circle').attr('class', 'hollow').attr('r', 5).attr('fill', F.bg).attr('stroke', '#c9a24a').attr('stroke-width', 1.6);
      }
      if (k === 'C') {
        rows.append('path').attr('class', 'cov').attr('d', d3.symbol(d3.symbolDiamond, 60)()).attr('fill', F.signal);
        rows.append('path').attr('class', 'dis').attr('d', d3.symbol(d3.symbolSquare, 48)()).attr('fill', '#c9a24a');
      }
      rows.on('pointerenter', (e, d) => F.tip.show(assocTip(d, M.matched), e)).on('pointermove', (e) => F.tip.move(e)).on('pointerleave', () => F.tip.hide());
      rob.panels.push(g);
    });
  }
  function robLayout(k) {
    // k = 0: panel A alone across the stage; k = 1: three equal panels (the reading view)
    const h = rob.axisY - rob.top, rowA0 = h / 4.2, pH = h / 3, rowH = pH / 3.6;
    return ['A', 'B', 'C'].map((p, i) => {
      const y0 = F.lerp(rob.top, rob.top + pH * i, k), rh = i === 0 ? F.lerp(rowA0, rowH, k) : rowH;
      return { y0, rh, rows: rows6.map((d, j) => y0 + 22 + rh * (j + 0.5)) };
    });
  }
  function renderRobust(t) {
    const x = rob.x, k = F.ease.inOut(F.seg(t, 32.2, 33.6, F.ease.linear)), lay = robLayout(k);
    const hiLate = F.seg(t, 19.4, 20.4) * (1 - F.seg(t, 24.6, 25.4)), hiOther = F.seg(t, 25.4, 26.4) * (1 - F.seg(t, 31.6, 32.4));
    rob.panels.forEach((g, pi) => {
      const L = lay[pi], show = pi === 0 ? 1 : F.seg(t, 33 + (pi - 1) * 1.3, 34.2 + (pi - 1) * 1.3);
      g.attr('opacity', show);
      g.select('.head').attr('y', L.y0 + 8).attr('opacity', pi === 0 ? F.seg(t, 17.8, 18.8) : 1);
      g.selectAll('g.r').each(function (d, j) {
        const r = d3.select(this), y = L.rows[j], late = d.metric === 'late_pct';
        const emph = late ? F.lerp(1, 0.55, hiOther) : F.lerp(1, 0.5, hiLate);
        r.attr('transform', `translate(0,${y})`).attr('opacity', emph);
        r.select('.hit').attr('y', -L.rh / 2).attr('height', L.rh);
        r.select('.band').attr('y', -L.rh * 0.42).attr('height', L.rh * 0.84);
        r.select('.lab').attr('fill', late ? F.ink : F.ink2).style('font-weight', late ? 600 : 400);
        if (pi === 0) {
          const pIn = F.seg(t, 18 + j * 0.2, 19 + j * 0.2, F.ease.outBack), ci = F.seg(t, 18.6 + j * 0.2, 20.2 + j * 0.2, F.ease.outExpo);
          const [lo, up] = d.bootstrap_interval, col = late ? F.signal : F.ink;
          r.select('.ci').attr('x1', x(F.lerp(d.rho, lo, ci))).attr('x2', x(F.lerp(d.rho, up, ci))).attr('stroke', col);
          r.select('.pt').attr('cx', x(d.rho)).attr('r', 6.5 * Math.max(0, pIn)).attr('fill', col);
          r.select('.val').attr('opacity', ci).text(rho(d.rho));
        } else if (pi === 1) {
          const p = F.seg(t, 33.4 + j * 0.15, 34.8 + j * 0.15, F.ease.outExpo), [lo, up] = d.leave_one_out_range;
          const a = x(F.lerp(d.rho, lo, p)), b = x(F.lerp(d.rho, up, p));
          r.select('.loo').attr('x1', a).attr('x2', b);
          r.select('.c0').attr('x1', a).attr('x2', a).attr('y1', -5).attr('y2', 5);
          r.select('.c1').attr('x1', b).attr('x2', b).attr('y1', -5).attr('y2', 5);
          r.select('.hollow').attr('cx', x(d.rho));
          r.select('.val').attr('opacity', p).text(`${rho(lo)}${rob.nar ? '…' : ' to '}${rho(up)}`);
        } else {
          const p = F.seg(t, 34.8 + j * 0.15, 36.2 + j * 0.15, F.ease.out);
          const cv = d.complete_problem_coverage.rho, ds = d.without_homework_discrepancies.rho;
          r.select('.cov').attr('transform', `translate(${x(F.lerp(d.rho, cv, p))},-4)`);
          r.select('.dis').attr('transform', `translate(${x(F.lerp(d.rho, ds, p))},4)`);
          r.select('.val').attr('opacity', p).text(`${rho(cv)} / ${rho(ds)}`);
        }
      });
    });
    gRob.select('.rax').attr('opacity', F.seg(t, 17.6, 18.6));
  }

  // ── Figures 07 and 09 · grouped midterm scores (neutral colours: not homework identities) ──
  function buildGroups(g, set, xTitle, kicker) {
    g.selectAll('*').remove();
    const c = geo.c, nar = geo.narrow, left = c.x + (nar ? 34 : 60), right = c.x + c.w - 20;
    const y = d3.scaleLinear().domain([60, 110]).range([geo.bottom - 40, geo.top + 40]);
    const n = set.length, step = (right - left) / n, bw = Math.min(110, step * 0.42);
    const ax = g.append('g').attr('class', 'gax');
    [60, 70, 80, 90, 100, 110].forEach((v) => {
      ax.append('line').attr('x1', left).attr('x2', right).attr('y1', y(v)).attr('y2', y(v)).attr('stroke', v === 100 ? 'rgba(255,181,71,.3)' : 'rgba(236,231,221,.06)');
      ax.append('text').attr('class', 'mono').attr('x', left - 10).attr('y', y(v)).attr('dy', '0.35em').attr('text-anchor', 'end').style('font-size', '10.5px').attr('fill', F.muted).text(v);
    });
    ax.append('text').attr('class', 'axis-title').attr('x', left).attr('y', geo.top + 22).text('Midterm score');
    ax.append('text').attr('class', 'axis-title').attr('x', right).attr('y', y(60) + 62).attr('text-anchor', 'end').text(xTitle);
    if (!nar) ax.append('text').attr('class', 'note').attr('x', right).attr('y', geo.top + 22).attr('text-anchor', 'end').text('Groups of 5+ students · minima and maxima not published · middle half ≠ confidence interval');
    const sel = g.selectAll('g.gb').data(set).join('g').attr('class', 'gb');
    sel.append('rect').attr('class', 'hit').attr('x', (d, i) => left + step * i).attr('y', y(110)).attr('width', step).attr('height', y(60) - y(110));
    sel.append('rect').attr('class', 'box').attr('rx', 4).attr('fill', '#a3abbb').attr('fill-opacity', 0.22).attr('stroke', '#a3abbb');
    sel.append('line').attr('class', 'med').attr('stroke', F.ink).attr('stroke-width', 2.5);
    sel.append('circle').attr('class', 'mean').attr('r', 5).attr('fill', F.ember);
    sel.append('text').attr('class', 'lab').attr('text-anchor', 'middle').style('font-size', nar ? '11px' : '13px').attr('fill', F.ink).text((d) => d.label);
    sel.append('text').attr('class', 'nn mono').attr('text-anchor', 'middle').style('font-size', '10.5px').attr('fill', F.muted).text((d) => `n = ${d.n}`);
    sel.append('text').attr('class', 'mv mono').attr('text-anchor', 'middle').style('font-size', nar ? '9px' : '11px').attr('fill', F.ink2);
    sel.on('pointerenter', (e, d) => F.tip.show(F.tip.html({ kicker, title: d.label, rows: [['Students', d.n], ['Median', d.median], ['Middle half', `${d.q1}–${d.q3}`], ['Mean', d.mean]], note: 'Descriptive comparison; groups differ in ways the data cannot see.' }), e))
      .on('pointermove', (e) => F.tip.move(e)).on('pointerleave', () => F.tip.hide());
    g.node().__geo = { y, left, step, bw };
  }
  function renderGroups(g, t) {
    const { y, left, step, bw } = g.node().__geo;
    g.select('.gax').attr('opacity', F.seg(t, 0.2, 1));
    g.selectAll('g.gb').each(function (d, i) {
      const s = d3.select(this), cx = left + step * (i + 0.5), p = F.seg(t, 0.8 + i * 0.25, 2.2 + i * 0.25, F.ease.outExpo);
      const med = y(d.median), q1 = F.lerp(med, y(d.q1), p), q3 = F.lerp(med, y(d.q3), p);
      s.select('.box').attr('x', cx - bw / 2).attr('width', bw).attr('y', q3).attr('height', Math.max(1, q1 - q3));
      s.select('.med').attr('x1', cx - bw / 2 - 4).attr('x2', cx + bw / 2 + 4).attr('y1', med).attr('y2', med).attr('opacity', F.seg(t, 0.4 + i * 0.25, 1 + i * 0.25));
      s.select('.mean').attr('cx', cx).attr('cy', F.lerp(med, y(d.mean), p)).attr('opacity', p);
      s.select('.lab').attr('x', cx).attr('y', y(60) + 24);
      s.select('.nn').attr('x', cx).attr('y', y(60) + 40);
      s.select('.mv').attr('x', cx).attr('y', q3 - 12).attr('opacity', p).text(geo.narrow ? `${d.median} · ${d.mean}` : `median ${d.median} · mean ${d.mean}`);
    });
  }

  // ── Figure 08 · who and when Course Pulse observed ───────────────
  let cov;
  function buildCoverage(L) {
    gCov.selectAll('*').remove();
    const c = geo.c, nar = geo.narrow, labelW = nar ? 0 : 250;
    const SUB = [['Eligible OJ roster', M.eligible_roster, '#a3abbb'], ['Supplied grades, matched to Course Pulse', PL.matched, F.ink],
      ['Recorded pre-exam platform use', PL.recorded_users, F.signal], ['Recorded resource opens', PL.resource_users, F.signal]];
    const top = geo.top + (nar ? 14 : 26), rowsH = (geo.bottom - geo.top) * (nar ? 0.5 : 0.56), rowH = rowsH / SUB.length;
    const x0 = c.x + labelW + (nar ? 0 : 16), sp = Math.min(17, (c.x + c.w - x0 - (nar ? 30 : 70)) / M.eligible_roster), r = sp * 0.36;
    cov = { rows: [] };
    SUB.forEach(([label, n, col], i) => {
      const y = top + rowH * (i + 0.5) + (nar ? 8 : 0), g = gCov.append('g').attr('class', 'crow').attr('transform', `translate(0,${y})`);
      g.append('text').attr('class', 'lab').attr('x', nar ? c.x : c.x + labelW).attr('y', nar ? -(r + 9) : 0).attr('dy', '0.35em').attr('text-anchor', nar ? 'start' : 'end')
        .style('font-size', nar ? '10.5px' : '12.5px').attr('fill', i === 0 ? F.ink2 : F.ink).text(label);
      g.selectAll('circle').data(d3.range(n)).join('circle').attr('cx', (k) => x0 + sp * (k + 0.5)).attr('r', r).attr('fill', col).attr('fill-opacity', i === 0 ? 0.55 : 0.92);
      g.append('text').attr('class', 'big cnt').attr('x', x0 + sp * n + 10).attr('dy', '0.35em').style('font-size', nar ? '17px' : '24px').attr('fill', col === '#a3abbb' ? F.ink2 : col).text(n);
      cov.rows.push(g);
    });
    gCov.append('text').attr('class', 'note').attr('x', nar ? c.x : x0).attr('y', top - (nar ? 4 : 10)).text('Nested subsets · one dot = one student');
    // observation windows: OJ homework windows vs Course Pulse tracking vs the exam
    const day0 = Date.parse('2026-08-26T00:00:00+08:00'), day1 = Date.parse('2026-09-17T00:00:00+08:00');
    const tx = d3.scaleTime().domain([day0, day1]).range([nar ? c.x : x0, c.x + c.w - (nar ? 6 : 40)]);
    const ty0 = top + rowsH + (nar ? 46 : 56), tl = gCov.append('g').attr('class', 'tline');
    tl.append('text').attr('class', 'axis-title').attr('x', nar ? c.x : c.x).attr('y', ty0 - 22).text('Observation windows · Beijing time');
    const lanes = [['OJ homework windows', 0], ['Course Pulse tracking', 1]];
    lanes.forEach(([label, k]) => tl.append('text').attr('class', 'mono').attr('x', nar ? c.x : x0 - 16).attr('y', ty0 + k * 30 + (nar ? -14 : 0)).attr('dy', '0.35em').attr('text-anchor', nar ? 'start' : 'end')
      .style('font-size', nar ? '9px' : '10.5px').attr('fill', F.ink2).text(label.toUpperCase()));
    pre.forEach((a) => {
      const xa = tx(Date.parse(a.start_local)), xb = tx(Date.parse(a.end_local));
      tl.append('rect').attr('class', 'win').attr('x', xa).attr('y', ty0 - 6).attr('height', 12).attr('rx', 3).attr('fill', F.color[a.homework]).attr('fill-opacity', 0.55).attr('data-w', xb - xa);
      tl.append('text').attr('class', 'mono').attr('x', (xa + xb) / 2).attr('y', ty0 + 1).attr('dy', '0.35em').attr('text-anchor', 'middle').style('font-size', '9px').attr('fill', F.bg).text(a.homework);
    });
    const ts = Date.parse(PL.tracking_started_at), cu = Date.parse(PL.cutoff_utc), exT = Date.parse(PL.exam_utc);
    tl.append('rect').attr('class', 'win pulse').attr('x', tx(ts)).attr('y', ty0 + 24).attr('height', 12).attr('rx', 3).attr('fill', F.signal).attr('fill-opacity', 0.8).attr('data-w', tx(cu) - tx(ts));
    tl.append('line').attr('x1', tx(exT)).attr('x2', tx(exT)).attr('y1', ty0 - 18).attr('y2', ty0 + 46).attr('stroke', F.signal).attr('stroke-dasharray', '3 4');
    tl.append('path').attr('d', d3.symbol(d3.symbolStar, 60)()).attr('transform', `translate(${tx(exT)},${ty0 - 24})`).attr('fill', F.signal);
    tl.append('text').attr('class', 'mono').attr('x', tx(exT) - 8).attr('y', ty0 - 24).attr('dy', '0.35em').attr('text-anchor', 'end').style('font-size', '9.5px').attr('fill', F.signal).text(nar ? 'EXAM' : 'EXAM 16 SEP 12:00');
    if (!nar) {
      tl.append('text').attr('class', 'note').attr('x', tx(ts)).attr('y', ty0 + 52).text('tracking from 8 Sep 13:49');
      tl.append('text').attr('class', 'note').attr('x', tx(cu)).attr('y', ty0 + 66).attr('text-anchor', 'end').text('cutoff 16 Sep 08:00');
    }
    [day0, Date.parse('2026-09-02T00:00:00+08:00'), Date.parse('2026-09-09T00:00:00+08:00'), Date.parse('2026-09-16T00:00:00+08:00')].forEach((d, i) => {
      const dt = new Date(d + 8 * 3600e3);
      tl.append('text').attr('class', 'mono').attr('x', tx(d)).attr('y', ty0 + (nar ? 52 : 86)).attr('text-anchor', nar && i === 0 ? 'start' : 'middle').style('font-size', '9.5px').attr('fill', F.muted)
        .text(`${dt.getUTCDate()} ${['Aug', 'Sep'][dt.getUTCMonth() - 7]}`);
    });
  }
  function renderCoverage(t) {
    cov.rows.forEach((g, i) => {
      const t0 = 0.6 + i * 0.9;
      g.selectAll('circle').attr('opacity', (k) => F.seg(t, t0 + k * 0.025, t0 + 0.4 + k * 0.025));
      g.select('.lab').attr('opacity', F.seg(t, t0 - 0.2, t0 + 0.4));
      g.select('.cnt').attr('opacity', F.seg(t, t0 + 0.8, t0 + 1.3));
    });
    const p = F.seg(t, 4.2, 6.2, F.ease.inOut);
    gCov.select('.tline').attr('opacity', F.seg(t, 3.8, 4.6));
    gCov.selectAll('.tline rect.win').attr('width', function () { return +this.dataset.w * p; });
  }

  // ── Figure 10 · combined forest ──────────────────────────────────
  let f10;
  function buildF10() {
    gF10.selectAll('*').remove();
    const c = geo.c, nar = geo.narrow, labelW = nar ? 96 : 210, left = c.x + labelW + 18, right = c.x + c.w - (nar ? 46 : 80);
    const x = d3.scaleLinear().domain([-1, 1]).range([left, right]);
    const items = [{ head: nar ? 'OJ · HW1–HW3' : 'OJ submissions · HW1–HW3, before the exam' }, ...rows10.filter((r) => r.src === 'oj'),
      { head: nar ? 'Course Pulse · 8–16 Sep' : 'Course Pulse · 8 Sep 13:49 → 16 Sep 08:00' }, ...rows10.filter((r) => r.src === 'pl')];
    const rowH = Math.min(58, (geo.bottom - geo.top - 50) / items.length);
    let y = geo.top + 14; items.forEach((it) => { it.y = y + rowH / 2; y += rowH; });
    f10 = { x, items, rowH };
    const ax = gF10.append('g').attr('class', 'fax');
    [-1, -0.5, 0, 0.5, 1].forEach((v) => {
      ax.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', geo.top).attr('y2', y).attr('stroke', v === 0 ? 'rgba(236,231,221,.5)' : 'rgba(236,231,221,.06)').attr('stroke-dasharray', v === 0 ? '4 4' : null);
      ax.append('text').attr('class', 'mono').attr('x', x(v)).attr('y', y + 16).attr('text-anchor', 'middle').style('font-size', '10.5px').attr('fill', F.muted).text(v === 0 ? '0' : (v > 0 ? '+' : '−') + Math.abs(v));
    });
    ax.append('text').attr('class', 'axis-title').attr('x', x(0)).attr('y', y + 34).attr('text-anchor', 'middle').style('text-transform', 'none').text(upper(nar ? 'Spearman ρ with midterm score' : 'Spearman ρ with midterm score · same 26 students'));
    const g = gF10.selectAll('g.fr').data(items).join('g').attr('class', 'fr').attr('transform', (d) => `translate(0,${d.y})`);
    g.filter((d) => d.head).append('text').attr('class', 'mono').attr('x', c.x).attr('y', 4).style('font-size', '10.5px').style('letter-spacing', '.1em').attr('fill', F.muted).text((d) => d.head.toUpperCase());
    const r = g.filter((d) => !d.head);
    r.append('rect').attr('class', 'hit').attr('x', c.x).attr('y', -rowH / 2).attr('width', c.w).attr('height', rowH);
    r.append('text').attr('class', 'lab').attr('x', c.x + labelW).attr('text-anchor', 'end').attr('dy', '0.35em').style('font-size', nar ? '10.5px' : '12.5px')
      .attr('fill', (d) => (d.metric === 'late_pct' ? F.ink : F.ink2)).style('font-weight', (d) => (d.metric === 'late_pct' ? 600 : 400)).text((d) => { const l = (nar ? SHORT : LABELS)[d.metric]; return d.src === 'oj' ? 'OJ ' + l[0].toLowerCase() + l.slice(1) : l; });
    r.append('line').attr('class', 'ci').attr('stroke-width', 2.2).attr('stroke-linecap', 'round').attr('stroke', (d) => (d.metric === 'late_pct' ? F.signal : F.ink));
    r.append('path').attr('class', 'pt').attr('d', (d) => d3.symbol(d.src === 'oj' ? d3.symbolCircle : d3.symbolSquare, 110)()).attr('fill', (d) => (d.metric === 'late_pct' ? F.signal : F.ink)).attr('stroke', F.bg).attr('stroke-width', 2);
    r.append('text').attr('class', 'rv mono').attr('x', right + 12).attr('dy', '0.35em').style('font-size', '11.5px').attr('fill', F.ink).text((d) => rho(d.rho));
    r.on('pointerenter', (e, d) => F.tip.show(assocTip(d, PL.matched), e)).on('pointermove', (e) => F.tip.move(e)).on('pointerleave', () => F.tip.hide());
  }
  function renderF10(t) {
    const x = f10.x;
    gF10.select('.fax').attr('opacity', F.seg(t, 0.2, 1));
    let j = 0;
    gF10.selectAll('g.fr').each(function (d) {
      const s = d3.select(this);
      if (d.head) { s.attr('opacity', F.seg(t, 0.4, 1.2)); return; }
      const pIn = F.seg(t, 0.8 + j * 0.25, 1.8 + j * 0.25, F.ease.outBack), ci = F.seg(t, 1.2 + j * 0.25, 2.8 + j * 0.25, F.ease.outExpo); j++;
      const [lo, up] = d.bootstrap_interval;
      s.select('.ci').attr('x1', x(F.lerp(d.rho, lo, ci))).attr('x2', x(F.lerp(d.rho, up, ci)));
      s.select('.pt').attr('transform', `translate(${x(d.rho)},0) scale(${Math.max(0, pIn)})`);
      s.select('.rv').attr('opacity', ci);
    });
  }

  function assocTip(d, n) {
    const rows = [[`ρ (all ${n})`, rho(d.rho)], ['95% bootstrap', `${rho(d.bootstrap_interval[0])} to ${rho(d.bootstrap_interval[1])}`]];
    if (d.leave_one_out_range) rows.push(['Leave one out', `${rho(d.leave_one_out_range[0])} to ${rho(d.leave_one_out_range[1])}`]);
    if (d.complete_problem_coverage) rows.push(['Full coverage (23)', rho(d.complete_problem_coverage.rho)]);
    if (d.without_homework_discrepancies) rows.push(['No discrepancies (24)', rho(d.without_homework_discrepancies.rho)]);
    return F.tip.html({ kicker: d.src === 'pl' ? 'Course Pulse · 8–16 Sep' : 'OJ behaviour · pre-exam HW1–HW3', title: LABELS[d.metric], rows,
      note: `${d.valid_bootstrap_draws.toLocaleString()} paired-student bootstrap draws. Exploratory association, not a causal effect.` });
  }
})();
