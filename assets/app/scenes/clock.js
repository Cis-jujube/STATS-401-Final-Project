/* Figure 01 · Timing, reach and repeat intensity.
   A non-linear temporal view. 35 days × six four-hour windows appear first as a
   calendar, then wind into a spiral clock: one ring per day, angle = time of day,
   so every 23:59 deadline lands at the top. Dots are aggregate units, one per published
   submission, placed in their public window (random position inside the cell); submissions
   in withheld windows (<5 students) are counted but never placed — they drift into a cloud.
   The reading view (t ≥ 40) is the published two-panel figure: each visible cell's dots
   gather into a bubble (area = submissions) at (students submitting, submissions per active
   student), beside the time of day of each visible burst. */
(function () {
  const F = window.Film, P = F.particles;
  const hw = F.data.homework;
  const DAY = 86400000;
  const T0 = Date.parse('2026-08-26T00:00:00+08:00');
  const dates = [...new Set(hw.calendar.map((c) => c.date))].sort();
  const ND = dates.length; // 35
  const sOf = (iso) => (Date.parse(iso) - T0) / DAY;
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayLabel = (d) => { const dt = new Date(dates[d] + 'T00:00:00Z'); return `${WD[dt.getUTCDay()]} ${dt.getUTCDate()} ${dt.toLocaleString('en', { month: 'short', timeZone: 'UTC' })}`; };
  const windows = hw.assignments.map((a, h) => ({ ...a, h, s0: sOf(a.start_local), s1: sOf(a.end_local) }));

  // cells with homework ownership
  const cells = hw.calendar.map((c, i) => {
    const d = dates.indexOf(c.date), b = c.hour / 4;
    const s0 = d + b / 6, s1 = s0 + 1 / 6;
    const win = windows.find((w) => s1 > w.s0 && s0 < w.s1);
    return { ...c, i, d, b, s0, s1, win, hwName: win ? win.homework : null };
  });
  const visibleByHw = F.HW.map((h) => d3.sum(cells.filter((c) => c.hwName === h && c.state === 'visible'), (c) => c.submissions));
  const maskedByHw = P.counts.map((n, h) => n - visibleByHw[h]);
  const MASKED = d3.sum(maskedByHw);
  const peak = cells.reduce((a, c) => (c.state === 'visible' && c.submissions > (a ? a.submissions : -1) ? c : a), null);

  // particle → cell assignment (deterministic): each homework fills its visible cells in time order
  const cellOf = new Int16Array(P.N).fill(-1), inCell = new Uint16Array(P.N);
  {
    const byHw = F.HW.map((h) => cells.filter((c) => c.hwName === h && c.state === 'visible' && c.submissions > 0));
    for (let i = 0; i < P.N; i++) {
      const h = P.hwIdx[i]; let j = P.rank[i];
      for (const c of byHw[h]) { if (j < c.submissions) { cellOf[i] = c.i; inCell[i] = j; break; } j -= c.submissions; }
    }
  }
  const VIS = cells.filter((c) => c.state === 'visible' && c.submissions > 0);
  VIS.forEach((c) => (c.ratio = c.submissions / c.contributors));
  const VMAX = d3.max(VIS, (c) => c.submissions), RMAX = d3.max(VIS, (c) => c.ratio);
  const GA = Math.PI * (3 - Math.sqrt(5)); // golden angle: phyllotaxis packing inside a bubble

  // ── interaction + timeline state ──────────────────────────────────
  const st = { morph: 0, heat: 0, reach: 0, measure: 'submissions', userMorph: null, userHeat: null, userReach: null, userMeasure: null, hover: null, hlast: null, hmix: 0, rhover: null };
  const MEASURES = {
    submissions: { label: 'Submissions', get: (c) => c.submissions, max: d3.max(cells, (c) => c.submissions) },
    contributors: { label: 'Students', get: (c) => c.contributors, max: d3.max(cells, (c) => c.contributors) },
    intensity: { label: 'Per student', get: (c) => (c.contributors ? c.submissions / c.contributors : 0), max: d3.max(cells, (c) => (c.contributors ? c.submissions / c.contributors : 0)) },
  };

  // ── geometry ─────────────────────────────────────────────────────
  let G = null;
  function geometry(L) {
    const c = L.chart, top = c.y + 52;
    const hAvail = c.y + c.h - top;
    // calendar
    const gx0 = c.x + (L.narrow ? 34 : 54), gx1 = c.x + c.w - 6, cw = (gx1 - gx0) / ND;
    const rh = Math.min(L.narrow ? 30 : 48, (hAvail * 0.58) / 6), gy0 = top + (L.narrow ? 6 : 22), gy1 = gy0 + rh * 6;
    const cloudG = { x: c.x + c.w * (L.narrow ? 0.5 : 0.3), y: gy1 + Math.min(140, (c.y + c.h - gy1) * 0.5), r: Math.min(60, (c.y + c.h - gy1) * 0.28) };
    // spiral
    const R = Math.min(L.narrow ? c.w * 0.47 : c.w * 0.36, hAvail / 2 - 10);
    const cx = L.narrow ? c.x + c.w / 2 : c.x + Math.min(c.w * 0.42, R + 60), cy = top + hAvail / 2;
    const r0 = R * 0.15, rw = (R - r0) / (ND + 1);
    const cloudS = L.narrow ? { x: c.x + c.w - 50, y: c.y + c.h - 40, r: 40 } : { x: Math.min(c.x + c.w - 90, cx + R + 150), y: cy + R * 0.45, r: Math.min(70, R * 0.3) };
    return { c, gx0, gx1, cw, rh, gy0, gy1, cx, cy, R, r0, rw, cloudG, cloudS, narrow: L.narrow, ...reachGeom(L, top) };
  }
  /** Reading view: (a) reach × repeat intensity, (b) time of day of each visible burst. */
  function reachGeom(L, top) {
    const c = L.chart, bottom = c.y + c.h - (L.narrow ? 30 : 46);
    let a, b, cloudR;
    if (!L.narrow) {
      const aw = c.w * 0.52, gap = c.w * 0.12;
      a = { x0: c.x + 50, x1: c.x + aw, y0: top + 30, y1: bottom };
      b = { x0: c.x + aw + gap, x1: c.x + c.w - 8, y0: top + 30, y1: bottom };
      cloudR = { x: c.x + aw + gap * 0.52, y: top + (bottom - top) * 0.3, r: Math.min(30, gap * 0.26) };
    } else {
      const mid = top + (bottom - top) * 0.6;
      a = { x0: c.x + 30, x1: c.x + c.w - 8, y0: top + 22, y1: mid - 26 };
      b = { x0: c.x + 30, x1: c.x + c.w - 8, y0: mid + 34, y1: bottom };
      cloudR = { x: c.x + c.w - 34, y: top + 30, r: 16 };
    }
    const xa = d3.scaleLinear().domain([4.5, 12.5]).range([a.x0, a.x1]);
    const ya = d3.scaleLinear().domain([0, Math.ceil(RMAX + 2)]).range([a.y1, a.y0]);
    const xb = d3.scaleBand().domain(d3.range(6)).range([b.x0, b.x1]).paddingInner(0.18);
    const yb = d3.scaleLinear().domain([0, 180]).range([b.y1, b.y0]);
    const rMax = Math.max(9, Math.min(L.narrow ? 15 : 30, (a.y1 - a.y0) * 0.085));
    const sp = rMax / (0.62 * Math.sqrt(VMAX)); // phyllotaxis spacing: the biggest cell gets rMax
    const rOf = (n) => 0.62 * sp * Math.sqrt(n) + sp * 0.5;
    VIS.forEach((v) => {
      v.ax = xa(v.contributors); v.ay = ya(v.ratio); v.rr = rOf(v.submissions);
      v.bx = xb(v.b) + xb.bandwidth() * (0.5 + (F.HW.indexOf(v.hwName) - 1.5) * 0.2); v.by = yb(v.submissions);
    });
    return { ra: a, rb: b, cloudR, xa, ya, xb, yb, sp, rOf };
  }
  const gridPt = (s, frac) => { // s: day-time position; frac: 0..1 across the column
    const d = Math.floor(s), within = s - d;
    return [G.gx0 + (d + 0.1 + 0.8 * frac) * G.cw, G.gy0 + within * 6 * G.rh];
  };
  const spiralPt = (s, frac) => {
    const th = 2 * Math.PI * (s - Math.floor(s)) - Math.PI / 2, r = G.r0 + s * G.rw + frac * G.rw * 0.86;
    return [G.cx + Math.cos(th) * r, G.cy + Math.sin(th) * r];
  };
  const mixPt = (s, frac, m) => {
    const a = gridPt(s, frac), b = spiralPt(s, frac);
    return [a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m];
  };
  const cellMorph = (c) => F.ease.inOut(F.clamp(st.morph * 1.35 - (c.d / ND) * 0.35));
  const K = 9;
  function cellPath(c, m) {
    const pts = [];
    for (let k = 0; k < K; k++) { const s = c.s0 + (k / (K - 1)) * (c.s1 - c.s0) * 0.999 + 0.0002; pts.push(mixPt(s, 0.04, m)); }
    for (let k = K - 1; k >= 0; k--) { const s = c.s0 + (k / (K - 1)) * (c.s1 - c.s0) * 0.999 + 0.0002; pts.push(mixPt(s, 0.96, m)); }
    // calendar cells are inset a little for a gap
    return 'M' + pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + 'Z';
  }
  const cellCenter = (c, m) => mixPt((c.s0 + c.s1) / 2, 0.5, m);

  // ── particles: register the clock formation ──────────────────────
  P.define('clock', (o, env) => {
    if (!G) return;
    const t = env.t, K2 = P.K;
    const dotA = F.lerp(0.95, 0.1, st.heat), R = st.reach, RH = st.rhover;
    const cloud0 = { x: F.lerp(G.cloudG.x, G.cloudS.x, st.morph), y: F.lerp(G.cloudG.y, G.cloudS.y, st.morph), r: F.lerp(G.cloudG.r, G.cloudS.r, st.morph) };
    const cloud = { x: F.lerp(cloud0.x, G.cloudR.x, R), y: F.lerp(cloud0.y, G.cloudR.y, R), r: F.lerp(cloud0.r, G.cloudR.r, R) };
    const cloudEmph = F.seg(t, 16.2, 17.2) * (1 - F.seg(t, 22.6, 23.4));
    const sz = G.narrow ? 1.5 : 1.9;
    for (let i = 0; i < P.N; i++) {
      const ci = cellOf[i], hName = F.HW[P.hwIdx[i]], la = F.la(hName);
      if (ci >= 0) {
        const c = cells[ci], m = cellMorph(c);
        const s = c.s0 + (0.08 + 0.84 * K2.u[i]) * (c.s1 - c.s0);
        const p = mixPt(s, 0.12 + 0.76 * K2.v[i], m);
        let ha = 1;
        if (st.hmix > 0.01 && st.hlast) ha = c.d === st.hlast.d || c.b === st.hlast.b ? 1 + 0.3 * st.hmix : F.lerp(1, 0.18, st.hmix);
        let x = p[0], y = p[1], a = Math.min(1, dotA * la * ha), z = sz;
        if (R > 0.001) { // gather into the cell's bubble: phyllotaxis, so the bubble's area counts its dots
          const k = inCell[i], rad = 0.62 * G.sp * Math.sqrt(k + 0.5), ang = k * GA;
          const q = F.ease.inOut(F.clamp(R * 1.45 - K2.d[i] * 0.45));
          x = F.lerp(x, c.ax + Math.cos(ang) * rad, q); y = F.lerp(y, c.ay + Math.sin(ang) * rad, q);
          a = F.lerp(a, 0.9 * la * (RH && RH !== c ? 0.25 : 1), q); z = F.lerp(z, G.sp * 0.8, q);
        }
        o.x[i] = x; o.y[i] = y; o.a[i] = a; o.s[i] = z; o.c[i] = P.hwIdx[i];
      } else {
        const wt = performance.now() / 1000;
        const rr = cloud.r * (1 + 0.12 * cloudEmph);
        o.x[i] = cloud.x + F.clamp(K2.gx[i], -2.4, 2.4) * rr * 0.5 + Math.sin(wt * 0.4 + K2.ph[i]) * 2;
        o.y[i] = cloud.y + F.clamp(K2.gy[i], -2.4, 2.4) * rr * 0.5 + Math.cos(wt * 0.35 + K2.ph[i]) * 2;
        o.a[i] = (0.32 + 0.5 * cloudEmph) * la * F.lerp(1, 0.5, st.heat) * F.lerp(1, 0.75, R); o.s[i] = sz * F.lerp(0.9, 0.7, R); o.c[i] = 4;
      }
    }
    o.glow = 0.35 * (1 - st.heat) * (1 - 0.5 * R); o.glowSet = null; o.repel = false;
  });

  // ── SVG ──────────────────────────────────────────────────────────
  let svg, gCells, cellSel, gRails, railSel, gMarks, gLabels, gAnno, legend, ctrlView, ctrlShow, ctrlMeasure, ctrlBox, hatchUrl, cloudLabel, gReach, lastKey = '';
  const railSamples = (w) => { const n = Math.ceil((w.s1 - w.s0) * 72); return d3.range(0, n + 1).map((k) => w.s0 + (k / n) * (w.s1 - w.s0)); };

  F.scene({
    id: 'time', title: 'Timing', duration: 52, enter: 'wipe', tint: 'rgba(255,159,58,.10)',
    particles: [{ at: 0, form: 'clock', dur: 3.8, curl: 1.1, spread: 0.55 }],
    howto: 'Dots: one per published submission, placed at random inside its four-hour window. <b>Calendar/Clock</b> rewinds the layout; <b>Heat</b> colours each window by the chosen measure; hatched = withheld, not zero. <b>Reach</b>: one bubble per visible cell (area = submissions), across = students submitting, up = submissions per active student. Grey dots sit in withheld cells and are never placed.',
    onBeat() { st.userMorph = st.userHeat = st.userMeasure = st.userReach = null; },
    focus: () => (G && st.reach > 0.5 ? [(G.ra.x0 + G.ra.x1) / 2, (G.ra.y0 + G.ra.y1) / 2] : G && st.morph > 0.5 ? [G.cx, G.cy] : null),
    mount(el) {
      svg = d3.select(el).append('svg').attr('class', 'viz');
      const defs = svg.append('defs');
      hatchUrl = F.hatch(defs, 'hatch-clock', '#8a91a2', 0.5, 4);
      const lg = defs.append('linearGradient').attr('id', 'heat-grad');
      d3.range(0, 1.01, 0.1).forEach((v) => lg.append('stop').attr('offset', v).attr('stop-color', F.ember_ramp(v)));
      gRails = svg.append('g');
      gCells = svg.append('g');
      gMarks = svg.append('g');
      gLabels = svg.append('g');
      gAnno = svg.append('g').attr('pointer-events', 'none');
      gReach = svg.append('g').attr('class', 'reach');
      legend = svg.append('g');
      cloudLabel = svg.append('g').attr('pointer-events', 'none');
      cloudLabel.append('text').attr('class', 'big').style('font-size', '28px').attr('text-anchor', 'middle').attr('fill', F.ink).text(F.fmt.int(MASKED));
      cloudLabel.append('text').attr('class', 'note l1').attr('text-anchor', 'middle').attr('dy', 18).text('in withheld cells');
      cloudLabel.append('text').attr('class', 'note l2').attr('text-anchor', 'middle').attr('dy', 32).text('counted, never placed');

      railSel = gRails.selectAll('path').data(windows).join('path').attr('fill', 'none').attr('stroke', (d) => F.color[d.homework]).attr('stroke-width', 1.6).attr('stroke-linecap', 'round');
      cellSel = gCells.attr('data-interactive', '').selectAll('path').data(cells).join('path').attr('class', 'cell').attr('stroke-width', 0.8)
        .on('pointerenter', (ev, c) => { st.hover = c; F.tip.show(tipHtml(c), ev); })
        .on('pointermove', (ev) => F.tip.move(ev))
        .on('pointerleave', () => { st.hover = null; F.tip.hide(); });

      // deadline and exam markers
      gMarks.selectAll('g.due').data(windows).join('g').attr('class', 'due').call((g) => {
        g.append('line').attr('stroke', F.ink).attr('stroke-opacity', 0.55).attr('stroke-width', 1);
        g.append('text').attr('class', 'mono').style('font-size', '10px').attr('fill', F.ink).text((d) => d.homework + ' due');
      });
      gMarks.append('g').attr('class', 'exam').call((g) => {
        g.append('path').attr('d', d3.symbol(d3.symbolStar, 70)()).attr('fill', F.signal);
        g.append('text').attr('class', 'mono').style('font-size', '10px').attr('fill', F.signal).attr('x', 9).attr('dy', '0.35em').text('Midterm');
      });

      // controls
      const html = d3.select(el).append('div').attr('class', 'html-layer');
      ctrlBox = html.append('div').attr('class', 'ctrls').node();
      ctrlView = F.segmented(ctrlBox, 'View', [['cal', 'Calendar'], ['clock', 'Clock'], ['reach', 'Reach']], (v) => {
        if (v === 'reach') st.userReach = 1; else { st.userReach = 0; st.userMorph = v === 'clock' ? 1 : 0; }
      });
      ctrlShow = F.segmented(ctrlBox, 'Show', [['0', 'Dots'], ['1', 'Heat']], (v) => { st.userHeat = +v; st.userReach = 0; });
      ctrlMeasure = F.segmented(ctrlBox, '', Object.entries(MEASURES).map(([k, m]) => [k, m.label]), (v) => { st.userMeasure = v; st.userHeat = 1; st.userReach = 0; });
    },
    resize(L) {
      G = geometry(L);
      Object.assign(ctrlBox.style, { left: L.chart.x + 'px', top: L.chart.y - 6 + 'px', maxWidth: L.chart.w + 'px' });
      lastKey = '';
      buildLabels();
      buildReach(L);
    },
    render(t, env) {
      if (!G) return;
      const dt = env.dt || 0.016;
      // timeline-directed values, overridable by the viewer while inside a beat
      const tlMorph = F.seg(t, 23.6, 27.6, F.ease.linear), tlReach = F.seg(t, 40.6, 44, F.ease.linear);
      const tlHeat = F.seg(t, 31.6, 33.4, F.ease.linear) * (1 - F.seg(t, 40, 41, F.ease.linear));
      st.morph = st.userMorph == null ? tlMorph : F.approach(st.morph, st.userMorph, dt, 3.2);
      st.reach = st.userReach == null ? tlReach : F.approach(st.reach, st.userReach, dt, 3.2);
      st.heat = st.userHeat == null ? tlHeat : F.approach(st.heat, st.userHeat, dt, 5);
      if (st.reach > 0.02) st.heat = Math.min(st.heat, 1 - st.reach); // the reach view replaces the cells
      st.measure = st.userMeasure || 'submissions';
      const reachOn = st.userReach != null ? st.userReach > 0.5 : tlReach > 0.5;
      ctrlView.set(reachOn ? 'reach' : (st.userMorph ?? (tlMorph > 0.5 ? 1 : 0)) > 0.5 ? 'clock' : 'cal');
      ctrlShow.set(reachOn ? '' : Math.round(st.userHeat ?? (tlHeat > 0.5 ? 1 : 0)));
      ctrlMeasure.set(st.heat > 0.5 ? st.measure : '');
      ctrlShow.el.style.opacity = ctrlMeasure.el.style.opacity = reachOn ? 0.4 : 1;
      ctrlBox.style.opacity = F.seg(t, 2.5, 3.5);

      const m = st.morph, ease = F.ease.inOut(F.clamp(m)), R = st.reach, keep = 1 - R;
      if (st.hover) st.hlast = st.hover;
      st.hmix = F.approach(st.hmix, st.hover ? 1 : 0, dt, 12);
      const H = st.hmix > 0.01 ? st.hlast : null;
      const key = [m.toFixed(4), st.heat.toFixed(3), st.measure, F.HW.map((h) => F.la(h).toFixed(2)).join(), G.gx0, G.cx, st.hover ? st.hover.i : -1, st.hmix.toFixed(2)].join('|');
      const appear = F.seg(t, 2.2, 3.6);
      if (key !== lastKey) {
        lastKey = key;
        const M = MEASURES[st.measure];
        cellSel.attr('d', (c) => cellPath(c, cellMorph(c)))
          .attr('fill', (c) => {
            if (c.state === 'suppressed') return hatchUrl;
            if (c.state === 'inactive') return 'transparent';
            const v = M.get(c);
            return v ? F.ember_ramp(Math.sqrt(v / M.max)) : '#10141b';
          })
          .attr('fill-opacity', (c) => (c.state === 'suppressed' ? 0.25 + 0.75 * st.heat : c.state === 'visible' ? st.heat : 0) * (c.hwName ? F.la(c.hwName) : 1)
            * (H && !(c.d === H.d || c.b === H.b) ? F.lerp(1, 0.3, st.hmix) : 1))
          // polar crosshair: the hovered window, plus its whole day (ring) and its time of day (spoke)
          .attr('stroke', (c) => (H === c ? F.ink : H && (c.d === H.d || c.b === H.b) ? `rgba(255,181,71,${0.55 * st.hmix})` : c.state === 'inactive' ? 'rgba(236,231,221,.035)' : 'rgba(236,231,221,.09)'))
          .attr('stroke-width', (c) => (H === c ? 1.8 : H && (c.d === H.d || c.b === H.b) ? 1.1 : 0.8));
        drawHand(H, ease);
        railSel.attr('d', (w) => d3.line()(railSamples(w).map((s) => {
          const a = [G.gx0 + s * G.cw, G.gy1 + 12], th = 2 * Math.PI * (s - Math.floor(s)) - Math.PI / 2, r = G.r0 + s * G.rw - G.rw * 0.07;
          const b = [G.cx + Math.cos(th) * r, G.cy + Math.sin(th) * r];
          return [F.lerp(a[0], b[0], ease), F.lerp(a[1], b[1], ease)];
        }))).attr('opacity', (w) => F.la(w.homework) * F.lerp(1, 0.38, ease));
        placeMarks(ease);
        placeLabels(ease);
      }
      gCells.attr('opacity', appear * keep).style('pointer-events', R > 0.5 ? 'none' : null);
      gRails.attr('opacity', appear * 0.9 * keep);
      gMarks.attr('opacity', appear * keep);
      gLabels.attr('opacity', appear * keep);
      gAnno.attr('opacity', keep);

      // cloud label: beside the calendar/clock, then beside the reach panels
      const c0 = { x: F.lerp(G.cloudG.x, G.cloudS.x, m), y: F.lerp(G.cloudG.y, G.cloudS.y, m), r: F.lerp(G.cloudG.r, G.cloudS.r, m) };
      const cl = { x: F.lerp(c0.x, G.cloudR.x, R), y: F.lerp(c0.y, G.cloudR.y, R), r: F.lerp(c0.r, G.cloudR.r, R) };
      const emph = Math.max(F.seg(t, 16.2, 17.2) * (1 - F.seg(t, 22.6, 23.4)), 0.6 * R);
      const narrowReach = G.narrow && R > 0.5;
      cloudLabel.attr('transform', narrowReach ? `translate(${cl.x - cl.r - 10},${cl.y - 6})` : `translate(${cl.x},${cl.y + cl.r + 30})`)
        .attr('opacity', F.seg(t, 3, 4) * (0.55 + 0.45 * emph));
      cloudLabel.selectAll('text').attr('text-anchor', narrowReach ? 'end' : 'middle');
      cloudLabel.select('text.big').style('font-size', `${(narrowReach ? 18 : 24) + 10 * emph * (narrowReach ? 0 : 1)}px`);
      cloudLabel.select('.l2').attr('opacity', R).attr('display', narrowReach ? 'none' : null);

      // annotations: peak callout (beat 2)
      const pa = F.seg(t, 8.4, 9.4) * (1 - F.seg(t, 15.4, 16));
      drawPeak(pa, ease);
      legendRender(t);
      renderReach(t, R, dt);
    },
  });

  // ── reading view: reach × repeat intensity, and when the visible bursts happened ──
  function buildReach(L) {
    gReach.selectAll('*').remove();
    const { ra: a, rb: b, xa, ya, xb, yb } = G, nar = L.narrow;
    const ax = gReach.append('g').attr('class', 'rx');
    ax.append('text').attr('class', 'axis-title ptitle').attr('x', a.x0 - (nar ? 26 : 40)).attr('y', a.y0 - (nar ? 10 : 16)).text(nar ? '(a) Reach × repeat intensity' : '(a) Reach versus repeat intensity');
    ax.append('text').attr('class', 'axis-title ptitle').attr('x', b.x0 - (nar ? 26 : 40)).attr('y', b.y0 - (nar ? 8 : 16)).text('(b) When visible bursts occurred');
    d3.range(5, 13).forEach((v) => {
      ax.append('line').attr('x1', xa(v)).attr('x2', xa(v)).attr('y1', a.y0).attr('y2', a.y1).attr('stroke', 'rgba(236,231,221,.06)');
      ax.append('text').attr('class', 'mono').attr('x', xa(v)).attr('y', a.y1 + 14).attr('text-anchor', 'middle').style('font-size', '10px').attr('fill', F.muted).text(v);
    });
    ya.ticks(nar ? 3 : 5).forEach((v) => {
      ax.append('line').attr('x1', a.x0).attr('x2', a.x1).attr('y1', ya(v)).attr('y2', ya(v)).attr('stroke', 'rgba(236,231,221,.06)');
      ax.append('text').attr('class', 'mono').attr('x', a.x0 - 8).attr('y', ya(v)).attr('dy', '0.35em').attr('text-anchor', 'end').style('font-size', '10px').attr('fill', F.muted).text(v);
    });
    ax.append('text').attr('class', 'axis-title').attr('x', a.x1).attr('y', a.y1 + (nar ? 26 : 32)).attr('text-anchor', 'end').text(nar ? 'Students in the cell →' : 'Distinct students submitting in the cell →');
    ax.append('text').attr('class', 'axis-title').attr('transform', `translate(${a.x0 - (nar ? 22 : 34)},${a.y0 + (nar ? 4 : 10)})`).text(nar ? '↑ per student' : '↑ Submissions per active student');
    // panel b: time of day
    d3.range(6).forEach((k) => ax.append('text').attr('class', 'mono').attr('x', xb(k) + xb.bandwidth() / 2).attr('y', b.y1 + 14).attr('text-anchor', 'middle').style('font-size', nar ? '9px' : '10px').attr('fill', F.muted)
      .text(nar ? String(k * 4).padStart(2, '0') : `${String(k * 4).padStart(2, '0')}–${String(k * 4 + 4).padStart(2, '0')}`));
    yb.ticks(nar ? 2 : 4).forEach((v) => {
      ax.append('line').attr('x1', b.x0).attr('x2', b.x1).attr('y1', yb(v)).attr('y2', yb(v)).attr('stroke', 'rgba(236,231,221,.06)');
      ax.append('text').attr('class', 'mono').attr('x', b.x0 - 8).attr('y', yb(v)).attr('dy', '0.35em').attr('text-anchor', 'end').style('font-size', '10px').attr('fill', F.muted).text(v);
    });
    ax.append('text').attr('class', 'axis-title').attr('x', b.x1).attr('y', b.y1 + (nar ? 26 : 32)).attr('text-anchor', 'end').text(nar ? 'Beijing time →' : 'Beijing time · four-hour cell →');
    ax.append('text').attr('class', 'axis-title').attr('transform', `translate(${b.x0 - (nar ? 22 : 34)},${b.y0 + (nar ? 4 : 10)})`).text(nar ? '' : '↑ Submissions in cell');
    // marks: outlines for panel (a) (the dots inside are the particles), discs for panel (b)
    const hit = (sel) => sel.on('pointerenter', (ev, c) => { st.rhover = c; F.tip.show(tipHtml(c), ev); }).on('pointermove', (ev) => F.tip.move(ev)).on('pointerleave', () => { st.rhover = null; F.tip.hide(); });
    gReach.append('g').attr('class', 'ra').attr('data-interactive', '').selectAll('circle').data(VIS).join('circle')
      .attr('cx', (c) => c.ax).attr('cy', (c) => c.ay).attr('r', (c) => c.rr + 1.5).attr('fill', 'transparent')
      .attr('stroke', (c) => F.color[c.hwName]).attr('stroke-width', 1).call(hit);
    gReach.append('g').attr('class', 'rb').attr('data-interactive', '').selectAll('circle').data(VIS.slice().sort((p, q) => q.submissions - p.submissions)).join('circle')
      .attr('cx', (c) => c.bx).attr('cy', (c) => c.by).attr('r', (c) => c.rr * (nar ? 0.7 : 0.8)).attr('fill', (c) => F.color[c.hwName]).attr('fill-opacity', 0.55)
      .attr('stroke', (c) => F.color[c.hwName]).attr('stroke-width', 1).call(hit);
    // callouts: the busiest visible cell, and the most repeated
    const pk = VIS.reduce((p, c) => (c.submissions > p.submissions ? c : p)), rp = VIS.reduce((p, c) => (c.ratio > p.ratio ? c : p));
    const call = gReach.append('g').attr('class', 'call').attr('pointer-events', 'none');
    const label = (c, x, y, anchor, lines) => {
      const g = call.append('g').attr('transform', `translate(${x},${y})`);
      lines.forEach((l, i) => g.append('text').attr('class', i ? 'mono' : 'mono k').attr('y', i * 13).attr('text-anchor', anchor).style('font-size', i ? '10px' : '10.5px').attr('fill', i ? F.ink2 : F.ember).text(l));
    };
    label(pk, pk.ax + pk.rr * 0.4, pk.ay + pk.rr + (nar ? 12 : 18), 'end', nar ? ['153 / 12'] : ['SAT 29 AUG · 12–16H', '153 submissions · 12 students']);
    label(rp, rp.ax + rp.rr + 8, rp.ay - 2, 'start', nar ? ['14.3 each'] : [`${dayLabel(rp.d).toUpperCase()} · ${rp.hour}–${rp.hour + 4}H`, `${rp.submissions} from ${rp.contributors} · ${F.fmt.p1(rp.ratio)} each`]);
    if (!nar) label(pk, pk.bx + pk.rr * 0.8 + 8, pk.by + 4, 'start', ['153 / 12']);
    if (!nar) gReach.append('text').attr('class', 'note rnote').attr('x', a.x0 - 40).attr('y', a.y1 + 50).text(`${VIS.length} visible cells (≥5 students) · bubble area = submissions · withheld cells are not placed`);
  }
  function renderReach(t, R, dt) {
    gReach.attr('opacity', R).style('pointer-events', R > 0.6 ? null : 'none');
    gReach.select('.ra').selectAll('circle').attr('stroke-opacity', (c) => (st.rhover && st.rhover !== c ? 0.15 : 0.55) * F.la(c.hwName)).attr('opacity', F.seg(R, 0.7, 1));
    gReach.select('.rb').selectAll('circle').attr('opacity', (c) => F.seg(t, 42.6 + (c.b / 6) * 0.8, 43.6 + (c.b / 6) * 0.8) * F.la(c.hwName) * (st.rhover && st.rhover !== c ? 0.25 : 1));
    gReach.select('.call').attr('opacity', Math.max(F.seg(t, 44, 45), st.userReach ? 1 : 0));
    gReach.select('.rnote').attr('opacity', Math.max(F.seg(t, 44.4, 45.4), st.userReach ? 1 : 0));
  }

  function tipHtml(c) {
    const when = `${dayLabel(c.d)} · ${String(c.hour).padStart(2, '0')}:00–${String(c.hour + 4).padStart(2, '0')}:00`;
    if (c.state === 'inactive') return F.tip.html({ kicker: 'Outside homework windows', title: when, note: 'No homework window was open.' });
    const w = c.win, hrs = w ? Math.max(0, (w.s1 - c.s1) * 24) : null;
    const rows = [];
    if (c.state === 'visible') {
      rows.push(['Submissions', c.submissions], ['Students', c.contributors]);
      if (c.contributors) rows.push(['Per student', F.fmt.p1(c.submissions / c.contributors)]);
    }
    if (w) rows.push(['Deadline in', hrs < 1 ? 'under 1 h' : `${Math.round(hrs)} h`]);
    return F.tip.html({ kicker: w ? w.homework + ' window' : '', color: w ? F.color[w.homework] : null, title: when, rows,
      note: c.state === 'suppressed' ? 'Fewer than five students submitted here, so counts are withheld. Withheld is not zero.' : c.submissions === 0 ? 'Visible window with no submissions.' : 'Submissions are events, not study time.' });
  }

  function placeMarks(e) {
    gMarks.selectAll('g.due').each(function (w) {
      const s = w.s1;
      const ga = [G.gx0 + s * G.cw, G.gy0 - 4], gb = [G.gx0 + s * G.cw, G.gy1 + 4];
      const r1 = G.r0 + s * G.rw + G.rw, sa = [G.cx, G.cy - (r1 - G.rw * 0.2)], sb = [G.cx, G.cy - (r1 + 6)];
      const a = [F.lerp(ga[0], sa[0], e), F.lerp(ga[1], sa[1], e)], b = [F.lerp(gb[0], sb[0], e), F.lerp(gb[1], sb[1], e)];
      const sel = d3.select(this).attr('opacity', F.la(w.homework));
      sel.select('line').attr('x1', a[0]).attr('y1', a[1]).attr('x2', b[0]).attr('y2', b[1]);
      // label: above the calendar column / to the right of the spiral's noon line
      const lg = [ga[0], G.gy0 - 10], ls = [G.cx + 8 + 0 * w.h, G.cy - r1 - 2];
      sel.select('text').attr('x', F.lerp(lg[0], ls[0], e)).attr('y', F.lerp(lg[1], ls[1], e))
        .attr('text-anchor', e < 0.5 ? 'middle' : 'start').attr('opacity', G.narrow ? 0 : e < 0.5 ? 1 : w.h === 3 || w.h === 0 ? 1 : 0.0);
    });
    const ex = sOf('2026-09-16T12:00:00+08:00');
    const p = mixPt(ex, 0.5, e);
    gMarks.select('g.exam').attr('transform', `translate(${p[0]},${p[1]})`);
  }

  function buildLabels() {
    gLabels.selectAll('*').remove();
    // hour labels (calendar: left; clock: around the rim)
    const hours = d3.range(6);
    gLabels.selectAll('text.hr').data(hours).join('text').attr('class', 'hr mono').style('font-size', '10px').attr('fill', F.muted)
      .text((b) => (G.narrow ? String(b * 4).padStart(2, '0') : `${String(b * 4).padStart(2, '0')}:00`));
    // date ticks (calendar) — every 7 days from 26 Aug
    const weeks = d3.range(0, ND, 7);
    gLabels.selectAll('text.dt').data(weeks).join('text').attr('class', 'dt mono').style('font-size', '10px').attr('fill', F.muted).attr('text-anchor', 'start').text((d) => dayLabel(d).slice(4));
    // ring labels (clock)
    gLabels.selectAll('text.ring').data([0, ND - 1]).join('text').attr('class', 'ring mono').style('font-size', '10px').attr('fill', F.muted).text((d) => dayLabel(d).slice(4));
  }
  function placeLabels(e) {
    gLabels.selectAll('text.hr').each(function (b) {
      const ga = [G.gx0 - 8, G.gy0 + (b + 0.5) * G.rh];
      const th = 2 * Math.PI * (b / 6) - Math.PI / 2, rr = G.R + 18;
      const sa = [G.cx + Math.cos(th) * rr, G.cy + Math.sin(th) * rr];
      d3.select(this).attr('x', F.lerp(ga[0], sa[0], e)).attr('y', F.lerp(ga[1], sa[1], e)).attr('dy', '0.35em')
        .attr('text-anchor', e < 0.5 ? 'end' : Math.abs(Math.cos(th)) < 0.2 ? 'middle' : Math.cos(th) > 0 ? 'start' : 'end');
    });
    gLabels.selectAll('text.dt').attr('x', (d) => G.gx0 + d * G.cw + 2).attr('y', G.gy1 + 32).attr('opacity', 1 - e);
    gLabels.selectAll('text.ring').each(function (d, i) {
      const s = d + 0.75, p = spiralPt(s, 0.5);
      d3.select(this).attr('x', Math.max(G.c.x + 34, p[0] - 8)).attr('y', p[1]).attr('dy', '0.35em').attr('text-anchor', 'end').attr('opacity', e);
    });
  }

  /** Clock hand for the hovered time-of-day window (spiral), with ring and spoke labels. */
  function drawHand(H, e) {
    const g = gAnno.selectAll('g.hand').data([0]).join((en) => {
      const g = en.append('g').attr('class', 'hand');
      g.append('path').attr('class', 'spoke').attr('fill', 'rgba(255,181,71,.06)').attr('stroke', 'rgba(255,181,71,.35)').attr('stroke-width', 1);
      g.append('line').attr('class', 'needle').attr('stroke', F.ember).attr('stroke-width', 1.4).attr('stroke-linecap', 'round');
      g.append('circle').attr('class', 'hub').attr('r', 3.5).attr('fill', F.ember);
      g.append('text').attr('class', 'lab mono').style('font-size', '10.5px').attr('fill', F.ember);
      return g;
    });
    if (!H) { g.attr('opacity', 0); return; }
    const a = st.hmix * e; // only in clock layout
    g.attr('opacity', a);
    const th0 = 2 * Math.PI * (H.b / 6) - Math.PI / 2, th1 = th0 + (2 * Math.PI) / 6, mid = (th0 + th1) / 2;
    const r0 = G.r0 * 0.6, r1 = G.R + 6;
    g.select('.spoke').attr('d', d3.arc().innerRadius(r0).outerRadius(r1).startAngle(th0 + Math.PI / 2).endAngle(th1 + Math.PI / 2)()).attr('transform', `translate(${G.cx},${G.cy})`);
    g.select('.needle').attr('x1', G.cx).attr('y1', G.cy).attr('x2', G.cx + Math.cos(mid) * (r1 + 10)).attr('y2', G.cy + Math.sin(mid) * (r1 + 10));
    g.select('.hub').attr('cx', G.cx).attr('cy', G.cy);
    const lx = G.cx + Math.cos(mid) * (r1 + 18), ly = G.cy + Math.sin(mid) * (r1 + 18);
    g.select('.lab').attr('x', lx).attr('y', ly).attr('dy', '0.35em').attr('text-anchor', Math.cos(mid) >= 0 ? 'start' : 'end')
      .text(`${String(H.hour).padStart(2, '0')}–${String(H.hour + 4).padStart(2, '0')}h · every day`);
  }

  function drawPeak(alpha) {
    const c = peak, p = cellCenter(c, cellMorph(c));
    const sel = gAnno.selectAll('g.peak').data([c]).join((en) => {
      const g = en.append('g').attr('class', 'peak');
      g.append('circle').attr('fill', 'none').attr('stroke', F.ember).attr('stroke-width', 1.4);
      g.append('path').attr('fill', 'none').attr('stroke', F.ember).attr('stroke-width', 1);
      g.append('text').attr('class', 'big').style('font-size', '30px').attr('fill', F.ember);
      g.append('text').attr('class', 'sub mono').style('font-size', '10.5px').attr('fill', F.ink2);
      return g;
    });
    const r = 14 + 8 * (1 - alpha);
    const lx = p[0] + 70, ly = Math.max(G.c.y + 60, p[1] - 90);
    sel.attr('opacity', alpha);
    sel.select('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', r);
    sel.select('path').attr('d', `M${p[0] + r * 0.7},${p[1] - r * 0.7}L${lx - 6},${ly + 8}H${lx + 150}`);
    sel.select('text.big').attr('x', lx).attr('y', ly).text(Math.round(153 * F.clamp(alpha * 1.2)));
    sel.select('text.sub').attr('x', lx).attr('y', ly + 22).text('Sat 29 Aug · 12–16h · 12 students');
  }

  function legendRender(t) {
    const L = F.layout, c = L.chart;
    legend.attr('transform', `translate(${c.x + (G.narrow ? 0 : c.w - 230)},${c.y + c.h - 30})`).attr('opacity', F.seg(t, 3, 4) * (1 - st.reach));
    const heat = st.heat;
    const g = legend.selectAll('g.lg').data([0]).join((en) => {
      const g = en.append('g').attr('class', 'lg');
      g.append('rect').attr('class', 'ramp').attr('width', 150).attr('height', 8).attr('rx', 2).attr('fill', 'url(#heat-grad)');
      g.append('text').attr('class', 'l0 mono').attr('y', 22).style('font-size', '10px').attr('fill', F.muted).text('0');
      g.append('text').attr('class', 'l1 mono').attr('x', 150).attr('y', 22).attr('text-anchor', 'end').style('font-size', '10px').attr('fill', F.muted);
      g.append('text').attr('class', 'lt mono').attr('y', -8).style('font-size', '10px').attr('fill', F.ink2);
      g.append('rect').attr('class', 'hs').attr('x', 170).attr('width', 14).attr('height', 8).attr('fill', hatchUrl).attr('stroke', 'rgba(236,231,221,.2)');
      g.append('text').attr('class', 'ht note').attr('x', 170).attr('y', 22).style('font-size', '10px').text('withheld');
      g.append('text').attr('class', 'dots note').attr('y', 4).style('font-size', '11px').text('1 dot = 1 submission · grey = withheld cell');
      return g;
    });
    const M = MEASURES[st.measure];
    g.selectAll('.ramp,.l0,.l1,.lt,.hs,.ht').attr('opacity', heat);
    g.select('.l1').text(st.measure === 'intensity' ? F.fmt.p1(M.max) : M.max);
    g.select('.lt').text(`${M.label} per window (sqrt scale)`);
    g.select('.dots').attr('opacity', 1 - heat);
  }
})();
