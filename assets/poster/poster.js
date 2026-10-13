/* Research poster: the five Core figures (01, 03, 11, 12, 06) drawn for print from the public
   aggregates in assets/app/data.js. model() is pure and derives every number and checked claim;
   the rest renders SVG whose user units are millimetres on the A0 sheet. */
(function () {
  const root = typeof window !== 'undefined' ? window : globalThis;

  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const BJ = 8 * 3600e3; // Beijing has no daylight saving time
  const bj = (iso) => new Date(Date.parse(iso) + BJ);
  const pad = (n) => String(n).padStart(2, '0');
  const dayMon = (d) => `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
  const int = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const p1 = (v) => v.toFixed(1);
  const rho = (v) => (v < 0 ? '−' : '+') + Math.abs(v).toFixed(2);
  const sum = (list, f) => list.reduce((s, r) => s + f(r), 0);
  const maxBy = (list, f) => list.reduce((a, b) => (f(b) > f(a) ? b : a));
  /** Human-readable problem name: strip course prefixes, split camel case (same rule as the film). */
  const problemName = (name) => name.replace(/^\d+s\d+HW\d-/, '').replace(/^HW\d-/, '').replace(/^Exercise[\d.]+[- ]/, '')
    .replace(/Consective/, 'Consecutive').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();

  function model(D) {
    const hw = D.homework, mid = D.midterm, ev = hw.event_progress, A = hw.assignments;
    const snap = bj(hw.snapshot_utc.replace(' ', 'T') + 'Z');
    const ongoing = A.filter((a) => a.observation_status === 'ongoing');
    const isOngoing = (name) => ongoing.some((a) => a.homework === name);
    const problems = sum(A, (a) => a.problems);
    const range = (list) => (list.length > 1 ? `${list[0]}–${list[list.length - 1]}` : list[0]);

    // Figure 01 · visible four-hour windows
    const cells = hw.calendar.filter((c) => c.state === 'visible' && c.submissions > 0)
      .map((c) => ({ date: c.date, hour: c.hour, submissions: c.submissions, students: c.contributors, each: c.submissions / c.contributors }));
    const visibleSubs = sum(cells, (c) => c.submissions), withheld = hw.window_submissions - visibleSubs;
    const withheldCells = hw.calendar.filter((c) => c.state === 'suppressed');
    const peak = maxBy(cells, (c) => c.submissions), repeat = maxBy(cells, (c) => c.each);
    const bins = [0, 4, 8, 12, 16, 20].map((hour) => ({ hour, cells: cells.filter((c) => c.hour === hour), withheld: withheldCells.filter((c) => c.hour === hour).length }));
    const when = (c) => `${dayMon(new Date(c.date + 'T00:00:00Z'))}, ${pad(c.hour)}:00–${pad(c.hour + 4)}:00`;
    const visibleHours = bins.filter((b) => b.cells.length).map((b) => b.hour);

    // Figure 03 · problem slots, sorted by the gap that remains after three tries
    const rows = hw.score_progression.map((r) => ({ hw: r.homework, name: problemName(r.problem_name), n: r.n, first: r.first, best3: r.best3, best: r.best, gap: r.best - r.best3, ongoing: isOngoing(r.homework) }))
      .sort((a, b) => b.gap - a.gap || a.first - b.first);
    const gapCount = rows.filter((r) => r.gap > 10).length;

    // Figure 11 · eligible retries
    const rate = (r) => ({ n: r.new_bests, N: r.eligible_retries, S: r.contributors, pct: r.improvement_pct, visible: r.state === 'visible' });
    const byHomework = ev.by_homework.map((r) => ({ label: r.homework, ongoing: isOngoing(r.homework), ...rate(r) }));
    const byGap = ev.by_gap.map((r) => ({ label: r.label, ...rate(r) }));
    const retries = sum(byHomework, (r) => r.N), bests = sum(byHomework, (r) => r.n);

    // Figure 12 · five equal-duration phases per homework window
    const phases = A.map((a) => ({ hw: a.homework, ongoing: isOngoing(a.homework),
      cells: ev.by_phase.filter((r) => r.homework === a.homework).sort((x, y) => x.phase - y.phase)
        .map((r) => ({ label: r.label, hours: r.phase_hours, state: r.state, partial: r.observation_status === 'partial', ...rate(r) })) }));
    const phaseCells = phases.flatMap((p) => p.cells), seen = phaseCells.filter((c) => c.state === 'visible');
    const phaseHours = phases.map((p) => p.cells[0].hours);

    // Figure 06 · pre-exam behaviour and the midterm (a separate, historical sample)
    const NAME = { late_pct: 'Final-24h submission share', attempts: 'Submission count', first_score: 'Mean first-try score' };
    const exam = ['late_pct', 'attempts', 'first_score'].map((key) => {
      const a = mid.associations.find((r) => r.metric === key);
      return { key, label: NAME[key], rho: a.rho, ci: a.bootstrap_interval, loo: a.leave_one_out_range,
        full: a.complete_problem_coverage, clean: a.without_homework_discrepancies };
    });
    const late = exam[0], examAt = Date.parse(mid.exam_started_at);
    const preExam = A.filter((a) => Date.parse(a.end_local) < examAt).map((a) => a.homework);

    // statements the poster makes in prose; tests/test_poster.cjs fails if a refresh breaks one
    const claims = {
      lateIntervalExcludesZero: late.ci[1] < 0,
      otherIntervalsIncludeZero: exam.slice(1).every((a) => a.ci[0] < 0 && a.ci[1] > 0),
      quickRetriesImproveLeast: byGap.every((r) => r.visible) && byGap.slice(1).every((r) => r.pct > byGap[0].pct),
      quickRetriesAreLargestGroup: byGap.slice(1).every((r) => r.N < byGap[0].N),
      everySlotNearFullMarks: rows.every((r) => r.best >= 90),
      visibleWindowsAfterNoon: visibleHours.every((h) => h >= 12),
    };

    const end = ongoing.length ? bj(ongoing[0].end_local) : null;
    const T = {
      submissions: int(hw.window_submissions), submitters: int(hw.window_submitters), problems: int(problems),
      homeworkWord: WORD[A.length] || String(A.length), hwRange: range(A.map((a) => a.homework)),
      fullSlots: int(rows.filter((r) => r.best >= 99.995).length),
      retries: int(retries), bests: int(bests), rate: p1((100 * bests) / retries),
      grades: int(mid.matched), eligible: int(mid.eligible_roster), preExam: range(preExam),
      peakSubs: int(peak.submissions), peakStudents: int(peak.students),
      repeatSubs: int(repeat.submissions), repeatStudents: int(repeat.students), repeatEach: p1(repeat.each),
      withheld: int(withheld), withheldCells: int(withheldCells.length),
      gapCount: int(gapCount), largestGap: p1(rows[0].gap), largestGapName: rows[0].name,
      quickShare: String(Math.round((100 * byGap[0].N) / retries)), quickRate: p1(byGap[0].pct), shortRate: p1(byGap[1].pct),
      phaseMin: p1(Math.min(...seen.map((c) => c.pct))), phaseMax: p1(Math.max(...seen.map((c) => c.pct))),
      phaseHours: `${Math.round(Math.min(...phaseHours))}–${Math.round(Math.max(...phaseHours))}`,
      lateRho: rho(late.rho), lateLo: rho(late.ci[0]), lateHi: rho(late.ci[1]), looLo: rho(late.loo[0]), looHi: rho(late.loo[1]),
      snapshot: `${snap.getUTCDate()} ${MON[snap.getUTCMonth()]} ${snap.getUTCFullYear()}, ${pad(snap.getUTCHours())}:${pad(snap.getUTCMinutes())} Beijing time`,
      ongoingRows: ongoing.length ? `* ${ongoing.map((a) => a.homework).join(', ')} is still open: its rows are the scores observed so far.` : '',
      ongoingNote: ongoing.length ? `${ongoing.map((a) => a.homework).join(', ')} is still open until ${dayMon(end)}: its numbers are observations so far.` : '',
    };

    return { T, claims, snap, ongoing: ongoing.map((a) => a.homework), submissions: hw.window_submissions,
      cells, visibleSubs, withheld, withheldCells: withheldCells.length, peak, repeat, bins, when,
      rows, gapCount, byHomework, byGap, retries, bests, rate: (100 * bests) / retries, phases, exam, grades: mid.matched };
  }

  root.Poster = { model, problemName };
  if (typeof document === 'undefined') return;

  // ── rendering ──────────────────────────────────────────────────────
  const d3 = root.d3, M = model(root.CS201);
  const C = { ink: '#14171d', ink2: '#474c57', muted: '#7b808b', axis: '#b9b5aa', paper: '#fcfbf8', blue: '#2a78d6', deep: '#184f95',
    track: '#d9e7fa', orange: '#eb6834', wash: '#fdf0e8', hatchBg: '#efece4', hatch: '#a59f92' };
  let uid = 0;

  function chart(name, w, h, label) {
    const el = document.querySelector(`[data-chart="${name}"]`);
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('width', `${w}mm`).attr('height', `${h}mm`)
      .attr('role', 'img').attr('aria-label', label);
    return svg;
  }
  /** Diagonal hatch for withheld values: a state, never a magnitude. Drawn as clipped vector
      lines because SVG pattern fills are rasterized at low resolution in the PDF export. */
  function hatched(g, x, y, w, h, rx = 0) {
    const id = `clip-${++uid}`, step = 3.1, box = (el) => el.attr('x', x).attr('y', y).attr('width', w).attr('height', h).attr('rx', rx);
    box(g.append('clipPath').attr('id', id).append('rect'));
    box(g.append('rect')).attr('fill', C.hatchBg);
    let d = '';
    for (let t = -h; t < w; t += step) d += `M${x + t},${y + h}L${x + t + h},${y}`;
    g.append('path').attr('d', d).attr('fill', 'none').attr('stroke', C.hatch).attr('stroke-width', 0.45).attr('clip-path', `url(#${id})`);
  }
  const text = (g, x, y, str, cls, anchor) => g.append('text').attr('x', x).attr('y', y).attr('class', cls).attr('text-anchor', anchor || 'start').text(str);
  const halo = (t) => t.attr('paint-order', 'stroke').attr('stroke', C.paper).attr('stroke-width', 1.6).attr('stroke-linejoin', 'round');

  // Figure 01 · reach and repeat intensity, time of day, and what stays withheld
  function reach() {
    const W = 292, H = 194, svg = chart('reach', W, H,
      `Bubble chart of ${M.cells.length} visible four-hour windows: students submitting against submissions per student, and the time of day of each window.`);
    const top = 15, bottom = 130, ax0 = 15, ax1 = 168, bx0 = 198, bx1 = 290;
    const x = d3.scaleLinear([4.3, 12.7], [ax0, ax1]), y = d3.scaleLinear([0, 16], [bottom, top]);
    const r = (s) => 0.69 * Math.sqrt(s);
    const hi = (c) => c === M.peak || c === M.repeat;

    // (a)
    const a = svg.append('g');
    text(a, ax0, 5.6, 'Each bubble is one visible four-hour window', 't-panel');
    text(a, ax0, 11.5, '↑ submissions per active student', 't-axis');
    [0, 5, 10, 15].forEach((v) => {
      a.append('line').attr('class', v ? 'grid' : 'axis').attr('x1', ax0).attr('x2', ax1).attr('y1', y(v)).attr('y2', y(v));
      text(a, ax0 - 3, y(v) + 1.7, v, 't-tick', 'end');
    });
    d3.range(5, 13).forEach((v) => text(a, x(v), bottom + 6.5, v, 't-tick', 'middle'));
    text(a, ax1, bottom + 13.5, 'students submitting in the window →', 't-axis', 'end');
    a.selectAll('circle.b').data(M.cells.slice().sort((p, q) => q.submissions - p.submissions)).join('circle').attr('class', 'b')
      .attr('cx', (c) => x(c.students)).attr('cy', (c) => y(c.each)).attr('r', (c) => r(c.submissions))
      .attr('fill', (c) => (hi(c) ? C.orange : C.blue)).attr('fill-opacity', (c) => (hi(c) ? 0.92 : 0.5))
      .attr('stroke', C.paper).attr('stroke-width', 0.5);
    // the two named windows: one label beside its bubble, the other beneath, so they never meet
    const note = (c, below, lines) => {
      const rad = r(c.submissions), px = x(c.students) + (below ? rad : rad + 2.6), py = y(c.each) + (below ? rad + 6.4 : -0.6);
      lines.forEach((s, i) => halo(text(a, px, py + i * 5.9, s, i ? 't-note' : 't-anno', below ? 'end' : 'start')));
    };
    note(M.peak, M.peak.students > 8.5, [M.when(M.peak), `${int(M.peak.submissions)} submissions · ${M.peak.students} students`]);
    if (M.repeat !== M.peak) note(M.repeat, M.repeat.students > 8.5, [M.when(M.repeat), `${int(M.repeat.submissions)} submissions · ${M.repeat.students} students · ${p1(M.repeat.each)} each`]);
    // bubble-size key
    const key = svg.append('g').attr('transform', `translate(${ax0}, ${bottom + 26})`);
    text(key, 0, 1.7, 'bubble area = submissions', 't-sub');
    let kx = 62;
    [25, 75, 150].forEach((s) => {
      kx += r(s);
      key.append('circle').attr('cx', kx).attr('cy', 0).attr('r', r(s)).attr('fill', 'none').attr('stroke', C.muted).attr('stroke-width', 0.35);
      text(key, kx + r(s) + 1.4, 1.7, s, 't-sub');
      kx += r(s) + 10;
    });

    // (b)
    const b = svg.append('g'), bw = (bx1 - bx0) / 6, by = d3.scaleLinear([0, 160], [bottom, top]);
    text(b, bx0, 5.6, 'When those windows fell', 't-panel');
    text(b, bx0, 11.5, '↑ submissions in the window', 't-axis');
    [0, 50, 100, 150].forEach((v) => {
      b.append('line').attr('class', v ? 'grid' : 'axis').attr('x1', bx0).attr('x2', bx1).attr('y1', by(v)).attr('y2', by(v));
      text(b, bx0 - 3, by(v) + 1.7, v, 't-tick', 'end');
    });
    d3.range(0, 7).forEach((i) => {
      text(b, bx0 + i * bw, bottom + 6.5, pad(i * 4), 't-tick', 'middle');
      if (i) b.append('line').attr('class', 'grid').attr('x1', bx0 + i * bw).attr('x2', bx0 + i * bw).attr('y1', top).attr('y2', bottom);
    });
    text(b, bx1, bottom + 13.5, 'time of day, Beijing →', 't-axis', 'end');
    M.bins.forEach((bin, i) => {
      const cx = bx0 + (i + 0.5) * bw, placed = [];
      bin.cells.slice().sort((p, q) => q.submissions - p.submissions).forEach((c) => {
        // beeswarm: the nearest free offset from the bin centre
        const cy = by(c.submissions), rad = hi(c) ? 2.3 : 1.75;
        let dx = 0;
        for (let k = 0; k < 40; k++) {
          dx = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.9;
          if (Math.abs(dx) > bw / 2 - rad - 0.6) { dx = 0; break; } // stay inside the bin; overlap rather than migrate
          if (placed.every((q) => Math.hypot(q.x - (cx + dx), q.y - cy) > q.r + rad + 0.3)) break;
        }
        placed.push({ x: cx + dx, y: cy, r: rad });
        b.append('circle').attr('cx', cx + dx).attr('cy', cy).attr('r', rad).attr('fill', hi(c) ? C.orange : C.blue)
          .attr('fill-opacity', hi(c) ? 0.95 : 0.7).attr('stroke', C.paper).attr('stroke-width', 0.4);
        if (hi(c)) halo(text(b, cx + dx + rad + 1.6, cy + 1.7, int(c.submissions), 't-anno'));
      });
      hatched(b, bx0 + i * bw + 0.8, bottom + 21.5, bw - 1.6, 8.4, 1);
      halo(text(b, cx, bottom + 27.5, bin.withheld, 't-count', 'middle')).attr('stroke-width', 2.4);
    });
    text(b, bx0 - 3, bottom + 24.8, 'windows', 't-sub', 'end');
    text(b, bx0 - 3, bottom + 29.8, 'withheld', 't-sub', 'end');

    // disclosure bar: every in-window submission is either placed above or withheld
    const g = svg.append('g'), x0 = ax0, full = bx1 - ax0, vis = (full * M.visibleSubs) / M.submissions, by0 = bottom + 50;
    g.append('rect').attr('x', x0).attr('y', by0).attr('width', vis - 0.5).attr('height', 7).attr('fill', C.blue).attr('fill-opacity', 0.7);
    hatched(g, x0 + vis + 0.5, by0, full - vis - 0.5, 7);
    const l1 = text(g, x0, by0 - 3, '', 't-note');
    l1.append('tspan').attr('font-weight', 600).attr('fill', C.ink).text(int(M.visibleSubs));
    l1.append('tspan').text(` submissions placed above, in ${M.cells.length} visible windows`);
    const l2 = text(g, bx1, by0 - 3, '', 't-note', 'end');
    l2.append('tspan').attr('font-weight', 600).attr('fill', C.ink).text(int(M.withheld));
    l2.append('tspan').text(` withheld, in ${M.withheldCells} windows with fewer than five students`);
  }

  // Figure 03 · first try, best within three tries and best observed, per problem slot
  function gaps() {
    const head = M.rows.filter((r) => r.gap > 10), tail = M.rows.filter((r) => r.gap <= 10);
    const W = 307, P = 13, Q = 5.3, y0 = 21, yTail = y0 + head.length * P + 13, yEnd = yTail + tail.length * Q;
    const H = yEnd + 15, svg = chart('gaps', W, H,
      `Dot plot of ${M.rows.length} problem slots sorted by the gap after three tries: mean first try, best within three tries and best observed.`);
    const lx = 94, x = d3.scaleLinear([30, 100], [100, 262]);

    // key
    const k = svg.append('g').attr('transform', 'translate(0, 4.5)');
    let kx = 0;
    const item = (draw, label, w) => { draw(k.append('g').attr('transform', `translate(${kx}, 0)`)); text(k, kx + 8, 1.7, label, 't-note'); kx += w; };
    item((g) => g.append('circle').attr('cx', 3.5).attr('r', 2.1).attr('fill', C.paper).attr('stroke', C.ink).attr('stroke-width', 0.6), 'mean first try', 44);
    item((g) => g.append('circle').attr('cx', 3.5).attr('r', 2.3).attr('fill', C.ink), 'best within three tries', 62);
    item((g) => g.append('rect').attr('x', 2.9).attr('y', -3.5).attr('width', 1.2).attr('height', 7).attr('fill', C.ink), 'best observed', 43);
    item((g) => g.append('line').attr('x1', 0).attr('x2', 7).attr('stroke', C.orange).attr('stroke-width', 2.6), 'still to climb after three tries', 0);

    [40, 60, 80, 100].forEach((v) => {
      svg.append('line').attr('class', 'grid').attr('x1', x(v)).attr('x2', x(v)).attr('y1', y0 - 3).attr('y2', yEnd + 2);
      text(svg, x(v), y0 - 5, v, 't-tick', 'middle');
      text(svg, x(v), yEnd + 7.5, v, 't-tick', 'middle');
    });
    text(svg, x(100) + 9, y0 - 5, 'gap', 't-axis');
    text(svg, W, yEnd + 13.5, 'mean score out of 100 · same students in each row · axis starts at 30', 't-axis', 'end');

    const row = (g, r, big) => {
      const s = big ? 1 : 0.55;
      g.append('line').attr('x1', x(r.first)).attr('x2', x(r.best3)).attr('stroke', C.axis).attr('stroke-width', big ? 0.9 : 0.5);
      if (r.gap > 0.05) g.append('line').attr('x1', x(r.best3)).attr('x2', x(r.best)).attr('stroke', C.orange).attr('stroke-width', big ? 2.6 : 1.5);
      g.append('rect').attr('x', x(r.best) - 0.6 * (big ? 1 : 0.75)).attr('y', -3.5 * s).attr('width', 1.2 * (big ? 1 : 0.75)).attr('height', 7 * s).attr('fill', C.ink);
      g.append('circle').attr('cx', x(r.first)).attr('r', 2.1 * s).attr('fill', C.paper).attr('stroke', C.ink).attr('stroke-width', big ? 0.6 : 0.45);
      g.append('circle').attr('cx', x(r.best3)).attr('r', 2.3 * s).attr('fill', C.ink).attr('stroke', C.paper).attr('stroke-width', big ? 0.5 : 0.3);
    };
    head.forEach((r, i) => {
      const g = svg.append('g').attr('transform', `translate(0, ${y0 + i * P + P / 2})`);
      const t = text(g, lx, 1.9, '', 't-label', 'end');
      t.append('tspan').attr('class', 't-sub').text(`${r.hw}${r.ongoing ? '*' : ''}  `);
      t.append('tspan').text(r.name);
      row(g, r, true);
      text(g, x(100) + 4, 2.1, `+${p1(r.gap)}`, 't-value');
      text(g, W, 1.7, `n = ${r.n}`, 't-sub', 'end');
    });
    const mid = yTail - 6.5;
    svg.append('line').attr('class', 'axis').attr('x1', 0).attr('x2', W).attr('y1', mid - 4.6).attr('y2', mid - 4.6);
    text(svg, lx, mid + 1.6, `${tail.length} more problem slots`, 't-anno', 'end');
    halo(text(svg, x(30) + 2, mid + 1.6, 'within 10 points of their best after three tries', 't-note'));
    tail.forEach((r, i) => {
      const g = svg.append('g').attr('transform', `translate(0, ${yTail + i * Q + Q / 2})`);
      text(g, lx, 1.3, `${r.hw}${r.ongoing ? '*' : ''} · ${r.name}`, 't-tail', 'end');
      row(g, r, false);
      text(g, x(100) + 4, 1.3, `+${p1(r.gap)}`, 't-tail');
    });
  }

  // Figure 11 · share of eligible retries that set a new best, beside the counts behind each share
  function retries() {
    const W = 292, P = 13, panelH = 92, H = panelH * 2 - 1, svg = chart('retries', W, H,
      `Bars of the share of eligible retries that set a new personal best, by homework and by time since the previous attempt, with counts.`);
    const lx = 60, x = d3.scaleLinear([0, 100], [66, 190]), cx0 = 202, nMax = Math.max(...M.byHomework.concat(M.byGap).map((r) => r.N));
    const cw = d3.scaleLinear([0, nMax], [0, 58]);

    const panel = (rows, title, sub, oy, first) => {
      const g = svg.append('g').attr('transform', `translate(0, ${oy})`), y0 = 17, y1 = y0 + rows.length * P;
      text(g, 0, 5.6, title, 't-panel');
      text(g, x(0), 12.5, 'share that set a new best', 't-axis');
      text(g, cx0, 12.5, 'new bests of eligible retries', 't-axis');
      // the pooled rate across all eligible retries: a reference that shows between the bars
      g.append('line').attr('x1', x(M.rate)).attr('x2', x(M.rate)).attr('y1', y0 - 1.5).attr('y2', y1 + 0.8).attr('stroke', C.ink).attr('stroke-width', 0.4);
      rows.forEach((r, i) => {
        const cy = y0 + i * P + P / 2 - 0.6, bar = 7;
        text(g, lx, cy + (sub(r) ? -0.6 : 1.9), r.label + (r.ongoing ? '*' : ''), 't-label', 'end');
        if (sub(r)) text(g, lx, cy + 4.4, sub(r), 't-sub', 'end');
        if (!r.visible) {
          hatched(g, x(0), cy - bar / 2, x(100) - x(0), bar);
          halo(text(g, x(50), cy + 1.7, 'withheld', 't-note', 'middle'));
          return;
        }
        g.append('rect').attr('x', x(0)).attr('y', cy - bar / 2).attr('width', x(100) - x(0)).attr('height', bar).attr('fill', C.track);
        g.append('rect').attr('x', x(0)).attr('y', cy - bar / 2).attr('width', x(r.pct) - x(0)).attr('height', bar).attr('fill', C.blue);
        const inside = r.pct >= 22; // room for the label inside the filled part
        text(g, x(r.pct) + (inside ? -2.2 : 2.2), cy + 2.3, `${p1(r.pct)}%`, 't-value', inside ? 'end' : 'start').style('fill', inside ? '#fff' : C.ink);
        g.append('rect').attr('x', cx0).attr('y', cy - 1.7).attr('width', Math.max(cw(r.N), 0.6)).attr('height', 3.4).attr('fill', C.track);
        g.append('rect').attr('x', cx0).attr('y', cy - 1.7).attr('width', Math.max(cw(r.n), 0.4)).attr('height', 3.4).attr('fill', C.blue);
        text(g, cx0 + cw(r.N) + 2.4, cy + 1.7, `${int(r.n)} of ${int(r.N)}`, 't-count');
      });
      if (first) text(g, x(M.rate), y1 + 5.6, `all eligible retries: ${p1(M.rate)}%`, 't-sub', 'middle').style('fill', C.ink2);
      else [0, 25, 50, 75, 100].forEach((v) => text(g, x(v), y1 + 5.6, v === 100 ? '100%' : v, 't-tick', 'middle'));
    };
    panel(M.byHomework, 'By homework', (r) => `${r.S} students${r.ongoing ? ' · still open' : ''}`, 0, true);
    panel(M.byGap, 'By time since the previous attempt', (r) => `${r.S} students`, panelH, false);
  }

  // Figure 12 · the same share inside five equal-duration phases of each homework window
  function phases() {
    const W = 300, x0 = 42, gap = 1.6, cw = (W - x0 - 4 * gap) / 5, ch = 26, y0 = 15;
    const yEnd = y0 + M.phases.length * (ch + gap) - gap, H = yEnd + 37, svg = chart('phases', W, H,
      `Matrix of ${M.phases.length} homeworks by five window phases: the share of eligible retries that set a new best, with counts; withheld and unobserved phases are marked.`);
    const ramp = d3.scaleSequential(d3.piecewise(d3.interpolateLab, ['#f4f8fe', '#cde2fb', '#86b6ef', '#3987e5', '#1c5cab', '#0d366b'])).domain([0, 100]);
    const dark = (c) => d3.lab(c).l < 58;

    text(svg, x0, 4, 'share of the homework window elapsed · opening → deadline', 't-axis');
    M.phases[0].cells.forEach((c, i) => text(svg, x0 + i * (cw + gap) + cw / 2, 11.5, c.label, 't-tick', 'middle'));
    M.phases.forEach((p, j) => {
      const y = y0 + j * (ch + gap), cy = y + ch / 2;
      text(svg, 0, cy - 0.4, p.hw + (p.ongoing ? '*' : ''), 't-panel');
      text(svg, 0, cy + 5.2, `≈ ${Math.round(p.cells[0].hours)} h per phase`, 't-sub');
      p.cells.forEach((c, i) => {
        const x = x0 + i * (cw + gap), cx = x + cw / 2;
        if (c.state === 'visible') {
          const col = ramp(c.pct), ink = dark(col) ? '#fff' : C.ink;
          svg.append('rect').attr('x', x).attr('y', y).attr('width', cw).attr('height', ch).attr('fill', col);
          text(svg, cx, cy + 0.6, `${p1(c.pct)}%${c.partial ? '*' : ''}`, 't-cell', 'middle').style('fill', ink);
          text(svg, cx, cy + 7.6, `${int(c.n)} of ${int(c.N)} · S = ${c.S}`, 't-cell-s', 'middle').style('fill', ink).style('fill-opacity', 0.88);
        } else if (c.state === 'suppressed') {
          hatched(svg, x, y, cw, ch);
          halo(text(svg, cx, cy + 1.6, 'withheld', 't-note', 'middle')).attr('stroke-width', 2.4);
        } else {
          svg.append('rect').attr('x', x + 0.3).attr('y', y + 0.3).attr('width', cw - 0.6).attr('height', ch - 0.6).attr('fill', 'none')
            .attr('stroke', C.axis).attr('stroke-width', 0.6).attr('stroke-dasharray', '0.1 1.7').attr('stroke-linecap', 'round');
          text(svg, cx, cy + 1.6, 'not yet observed', 't-note', 'middle').style('fill', C.muted);
        }
      });
    });

    // keys: the colour scale, then the two states that are not values
    const ky = yEnd + 12, gid = `ramp-${++uid}`;
    const grad = svg.append('defs').append('linearGradient').attr('id', gid);
    d3.range(0, 101, 10).forEach((v) => grad.append('stop').attr('offset', `${v}%`).attr('stop-color', ramp(v)));
    text(svg, x0, ky - 4, 'share of eligible retries that set a new best', 't-axis');
    svg.append('rect').attr('x', x0).attr('y', ky).attr('width', 96).attr('height', 5).attr('fill', `url(#${gid})`).attr('stroke', C.axis).attr('stroke-width', 0.2);
    [[0, '0%', 'start'], [50, '50%', 'middle'], [100, '100%', 'end']].forEach(([v, s, a]) => text(svg, x0 + (96 * v) / 100, ky + 10.5, s, 't-tick', a));
    const sx = x0 + 112;
    hatched(svg, sx, ky - 1.5, 11, 6);
    text(svg, sx + 14, ky + 3.2, 'withheld: fewer than five students, not zero', 't-note');
    const hasFuture = M.phases.some((p) => p.cells.some((c) => c.state === 'not_observed'));
    const hasPartial = M.phases.some((p) => p.cells.some((c) => c.partial));
    if (hasFuture) {
      svg.append('rect').attr('x', sx + 0.3).attr('y', ky + 9).attr('width', 10.4).attr('height', 5.4).attr('fill', 'none')
        .attr('stroke', C.axis).attr('stroke-width', 0.6).attr('stroke-dasharray', '0.1 1.7').attr('stroke-linecap', 'round');
      text(svg, sx + 14, ky + 13.4, `not yet observed${hasPartial ? ' · * partly observed at the snapshot' : ''}`, 't-note');
    }
    text(svg, 0, ky + 22, 'n of N = new bests of eligible retries · S = students contributing', 't-sub');
  }

  // Figure 06 · three pre-exam behaviours and the midterm score, with two robustness checks
  function exam() {
    const W = 307, P = 25, y0 = 22, H = y0 + M.exam.length * P + 20, svg = chart('exam', W, H,
      `Spearman correlations between three pre-exam homework behaviours and the midterm score for ${M.grades} students, with bootstrap intervals, leave-one-out ranges and subset checks.`);
    const lx = 86, x = d3.scaleLinear([-1, 1], [92, 248]), yEnd = y0 + M.exam.length * P;
    const diamond = (g, cx, cy, s, c) => g.append('path').attr('d', `M${cx},${cy - s}L${cx + s},${cy}L${cx},${cy + s}L${cx - s},${cy}Z`).attr('fill', c).attr('stroke', C.paper).attr('stroke-width', 0.3);
    const square = (g, cx, cy, s, c) => g.append('rect').attr('x', cx - s).attr('y', cy - s).attr('width', 2 * s).attr('height', 2 * s).attr('fill', c).attr('stroke', C.paper).attr('stroke-width', 0.3);
    const bracket = (g, a, b, cy, c) => {
      g.append('line').attr('x1', a).attr('x2', b).attr('y1', cy).attr('y2', cy).attr('stroke', c).attr('stroke-width', 0.6);
      [a, b].forEach((v) => g.append('line').attr('x1', v).attr('x2', v).attr('y1', cy - 1.5).attr('y2', cy + 1.5).attr('stroke', c).attr('stroke-width', 0.6));
    };

    // key, two rows
    const k = svg.append('g').attr('transform', 'translate(0, 1.4)');
    k.append('line').attr('x1', 0).attr('x2', 12).attr('y1', 3).attr('y2', 3).attr('stroke', C.ink2).attr('stroke-width', 1.5).attr('stroke-linecap', 'round');
    k.append('circle').attr('cx', 6).attr('cy', 3).attr('r', 2.2).attr('fill', C.ink2).attr('stroke', C.paper).attr('stroke-width', 0.4);
    text(k, 15, 4.7, 'Spearman ρ and 95% bootstrap interval', 't-note');
    bracket(k, 112, 123, 3, C.ink2);
    text(k, 126, 4.7, 'range when one student is left out', 't-note');
    diamond(k, 2.2, 10.6, 1.9, C.ink2);
    text(k, 7, 12.3, `all problem slots attempted, n = ${M.exam[0].full.n}`, 't-note');
    square(k, 113.7, 10.6, 1.6, C.ink2);
    text(k, 118, 12.3, `two discrepant records omitted, n = ${M.exam[0].clean.n}`, 't-note');

    svg.append('rect').attr('x', 0).attr('y', y0 + 0.8).attr('width', W).attr('height', P - 1.6).attr('fill', C.wash);
    [-1, -0.5, 0, 0.5, 1].forEach((v) => {
      svg.append('line').attr('class', v ? 'grid' : 'zero').attr('x1', x(v)).attr('x2', x(v)).attr('y1', y0 - 2).attr('y2', yEnd);
      text(svg, x(v), yEnd + 6, v ? rho(v).replace('.50', '.5').replace('.00', '') : '0', 't-tick', 'middle');
    });
    text(svg, x(0) - 4, yEnd + 13.5, '← goes with lower midterm scores', 't-axis', 'end');
    text(svg, x(0) + 4, yEnd + 13.5, 'goes with higher midterm scores →', 't-axis');

    M.exam.forEach((a, i) => {
      const g = svg.append('g'), cy = y0 + i * P + P / 2, lead = i === 0, c = lead ? C.orange : C.ink2;
      text(g, lx, cy - 3.6, a.label, 't-label', 'end').style('font-weight', lead ? 600 : 400);
      g.append('line').attr('x1', x(a.ci[0])).attr('x2', x(a.ci[1])).attr('y1', cy - 5.6).attr('y2', cy - 5.6).attr('stroke', c).attr('stroke-width', 1.5).attr('stroke-linecap', 'round');
      g.append('circle').attr('cx', x(a.rho)).attr('cy', cy - 5.6).attr('r', 2.4).attr('fill', c).attr('stroke', lead ? C.wash : C.paper).attr('stroke-width', 0.5);
      bracket(g, x(a.loo[0]), x(a.loo[1]), cy + 0.4, c);
      diamond(g, x(a.full.rho), cy + 4.9, 1.8, c);
      square(g, x(a.clean.rho), cy + 8.8, 1.5, c);
      text(g, 254, cy - 3.2, rho(a.rho), 't-value');
      text(g, 254, cy + 3.2, `${rho(a.ci[0])} to ${rho(a.ci[1])}`, 't-count');
    });
  }

  function qr() {
    const el = document.querySelector('[data-qr]'), code = root.PosterQR.encode(el.dataset.qr), q = 2, n = code.size + 2 * q;
    let d = '';
    code.modules.forEach((row, y) => row.forEach((on, x) => { if (on) d += `M${x + q},${y + q}h1v1h-1z`; }));
    d3.select(el).select('.qr-code').append('svg').attr('viewBox', `0 0 ${n} ${n}`).attr('shape-rendering', 'crispEdges')
      .append('path').attr('d', d).attr('fill', C.ink);
  }

  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = M.T[el.dataset.t] ?? ''; });
  reach(); gaps(); retries(); phases(); exam(); qr();

  // screen view: scale the finished sheet to the window; print always uses the physical size
  const sheet = document.getElementById('poster'), stage = sheet.parentElement;
  const fit = () => {
    const s = Math.min(1, document.documentElement.clientWidth / sheet.offsetWidth);
    sheet.style.transform = `scale(${s})`;
    stage.style.height = `${sheet.offsetHeight * s}px`;
  };
  fit();
  root.addEventListener('resize', fit);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { document.documentElement.dataset.ready = '1'; });
})();
