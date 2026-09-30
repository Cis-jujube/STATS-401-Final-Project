/* Scene 3 · When does the work happen?
   A non-linear temporal view. 35 days × six four-hour windows appear first as a
   calendar, then wind into a spiral clock: one ring per day, angle = time of day,
   so every 23:59 deadline lands at the top. Dots are real submissions placed in
   their public window (random position inside the cell); submissions in masked
   windows (<5 students) are counted but never placed — they drift into a cloud. */
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
  const cellOf = new Int16Array(P.N).fill(-1);
  {
    const byHw = F.HW.map((h) => cells.filter((c) => c.hwName === h && c.state === 'visible' && c.submissions > 0));
    for (let i = 0; i < P.N; i++) {
      const h = P.hwIdx[i]; let j = P.rank[i];
      for (const c of byHw[h]) { if (j < c.submissions) { cellOf[i] = c.i; break; } j -= c.submissions; }
    }
  }

  // ── interaction + timeline state ──────────────────────────────────
  const st = { morph: 0, heat: 0, measure: 'submissions', userMorph: null, userHeat: null, userMeasure: null, hover: null, hlast: null, hmix: 0 };
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
    return { c, gx0, gx1, cw, rh, gy0, gy1, cx, cy, R, r0, rw, cloudG, cloudS, narrow: L.narrow };
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
    const dotA = F.lerp(0.95, 0.1, st.heat);
    const cloud = { x: F.lerp(G.cloudG.x, G.cloudS.x, st.morph), y: F.lerp(G.cloudG.y, G.cloudS.y, st.morph), r: F.lerp(G.cloudG.r, G.cloudS.r, st.morph) };
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
        o.x[i] = p[0]; o.y[i] = p[1]; o.a[i] = Math.min(1, dotA * la * ha); o.s[i] = sz; o.c[i] = P.hwIdx[i];
      } else {
        const wt = performance.now() / 1000;
        const rr = cloud.r * (1 + 0.12 * cloudEmph);
        o.x[i] = cloud.x + F.clamp(K2.gx[i], -2.4, 2.4) * rr * 0.5 + Math.sin(wt * 0.4 + K2.ph[i]) * 2;
        o.y[i] = cloud.y + F.clamp(K2.gy[i], -2.4, 2.4) * rr * 0.5 + Math.cos(wt * 0.35 + K2.ph[i]) * 2;
        o.a[i] = (0.32 + 0.5 * cloudEmph) * la * F.lerp(1, 0.5, st.heat); o.s[i] = sz * 0.9; o.c[i] = 4;
      }
    }
    o.glow = 0.35 * (1 - st.heat); o.glowSet = null; o.repel = false;
  });

  // ── SVG ──────────────────────────────────────────────────────────
  let svg, gCells, cellSel, gRails, railSel, gMarks, gLabels, gAnno, legend, ctrlView, ctrlShow, ctrlMeasure, ctrlBox, hatchUrl, cloudLabel, lastKey = '';
  const railSamples = (w) => { const n = Math.ceil((w.s1 - w.s0) * 72); return d3.range(0, n + 1).map((k) => w.s0 + (k / n) * (w.s1 - w.s0)); };

  F.scene({
    id: 'time', title: '01 · Time', duration: 40, enter: 'wipe', tint: 'rgba(255,159,58,.10)',
    beats: [
      { at: 0, kicker: '01 · Time', title: 'When does the work <em>happen?</em>',
        body: 'Every submission, dropped into the four-hour window when it arrived. Each column is one day; time of day runs downward.' },
      { at: 8, kicker: '01 · Time', title: 'A Saturday afternoon, and deadline nights.',
        body: 'The busiest visible window: <b>Sat 29 Aug, 12:00–16:00</b>, <span class="num">153</span> submissions from just <b>12 students</b>. Every deadline night (20:00–24:00) drew another <span class="num">46–82</span>.' },
      { at: 16, kicker: '01 · Time', title: `<em>${F.fmt.int(MASKED)}</em> submissions stay in the dark.`,
        body: 'Windows with fewer than five students are masked for privacy. Their dots drift aside: counted, never placed. So the true peak is unknown.' },
      { at: 23, kicker: '01 · Time', title: 'Wind the calendar into a <em>clock.</em>',
        body: 'Each ring is one day, spiralling out from 26 Aug. The angle is the time of day, so every 23:59 deadline lands at the top.' },
      { at: 31, kicker: '01 · Time', title: 'Read it as heat.',
        body: 'Colour shows submissions per window. Hatched cells are withheld, not zero. Pause to hover any window, or switch the measure to students or submissions per student.' },
    ],
    particles: [{ at: 0, form: 'clock', dur: 3.8, curl: 1.1, spread: 0.55 }],
    howto: 'Dots: one per submission, placed randomly inside its four-hour window. <b>Calendar/Clock</b> rewinds the layout; <b>Heat</b> colours each window by the chosen measure. Grey dots are submissions from masked windows.',
    onBeat() { st.userMorph = st.userHeat = st.userMeasure = null; },
    focus: () => (G && st.morph > 0.5 ? [G.cx, G.cy] : null),
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
      legend = svg.append('g');
      cloudLabel = svg.append('g').attr('pointer-events', 'none');
      cloudLabel.append('text').attr('class', 'big').style('font-size', '28px').attr('text-anchor', 'middle').attr('fill', F.ink).text(F.fmt.int(MASKED));
      cloudLabel.append('text').attr('class', 'note').attr('text-anchor', 'middle').attr('dy', 18).text('in masked windows');

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
      ctrlView = F.segmented(ctrlBox, 'View', [['0', 'Calendar'], ['1', 'Clock']], (v) => (st.userMorph = +v));
      ctrlShow = F.segmented(ctrlBox, 'Show', [['0', 'Dots'], ['1', 'Heat']], (v) => (st.userHeat = +v));
      ctrlMeasure = F.segmented(ctrlBox, '', Object.entries(MEASURES).map(([k, m]) => [k, m.label]), (v) => { st.userMeasure = v; st.userHeat = 1; });
    },
    resize(L) {
      G = geometry(L);
      Object.assign(ctrlBox.style, { left: L.chart.x + 'px', top: L.chart.y - 6 + 'px', maxWidth: L.chart.w + 'px' });
      lastKey = '';
      buildLabels();
    },
    render(t, env) {
      if (!G) return;
      const dt = env.dt || 0.016;
      // timeline-directed values, overridable by the viewer while inside a beat
      const tlMorph = F.seg(t, 23.6, 27.6, F.ease.linear), tlHeat = F.seg(t, 31.6, 33.4, F.ease.linear);
      st.morph = st.userMorph == null ? tlMorph : F.approach(st.morph, st.userMorph, dt, 3.2);
      st.heat = st.userHeat == null ? tlHeat : F.approach(st.heat, st.userHeat, dt, 5);
      st.measure = st.userMeasure || 'submissions';
      ctrlView.set(Math.round(st.userMorph ?? (tlMorph > 0.5 ? 1 : 0)));
      ctrlShow.set(Math.round(st.userHeat ?? (tlHeat > 0.5 ? 1 : 0)));
      ctrlMeasure.set(st.heat > 0.5 ? st.measure : '');
      ctrlBox.style.opacity = F.seg(t, 2.5, 3.5);

      const m = st.morph, ease = F.ease.inOut(F.clamp(m));
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
      gCells.attr('opacity', appear);
      gRails.attr('opacity', appear * 0.9);
      gMarks.attr('opacity', appear);
      gLabels.attr('opacity', appear);

      // cloud label
      const cl = { x: F.lerp(G.cloudG.x, G.cloudS.x, m), y: F.lerp(G.cloudG.y, G.cloudS.y, m), r: F.lerp(G.cloudG.r, G.cloudS.r, m) };
      const emph = F.seg(t, 16.2, 17.2) * (1 - F.seg(t, 22.6, 23.4));
      cloudLabel.attr('transform', `translate(${cl.x},${cl.y + cl.r + 30})`).attr('opacity', F.seg(t, 3, 4) * (0.55 + 0.45 * emph));
      cloudLabel.select('text.big').style('font-size', `${24 + 10 * emph}px`);

      // annotations: peak callout (beat 2), masked outline flash (beat 3)
      const pa = F.seg(t, 8.4, 9.4) * (1 - F.seg(t, 15.4, 16));
      drawPeak(pa, ease);
      legendRender(t);
    },
  });

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
      note: c.state === 'suppressed' ? 'Fewer than five students submitted here, so counts are withheld. Masked is not zero.' : c.submissions === 0 ? 'Visible window with no submissions.' : 'Submissions are events, not study time.' });
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
    legend.attr('transform', `translate(${c.x + (G.narrow ? 0 : c.w - 230)},${c.y + c.h - 30})`).attr('opacity', F.seg(t, 3, 4));
    const heat = st.heat;
    const g = legend.selectAll('g.lg').data([0]).join((en) => {
      const g = en.append('g').attr('class', 'lg');
      g.append('rect').attr('class', 'ramp').attr('width', 150).attr('height', 8).attr('rx', 2).attr('fill', 'url(#heat-grad)');
      g.append('text').attr('class', 'l0 mono').attr('y', 22).style('font-size', '10px').attr('fill', F.muted).text('0');
      g.append('text').attr('class', 'l1 mono').attr('x', 150).attr('y', 22).attr('text-anchor', 'end').style('font-size', '10px').attr('fill', F.muted);
      g.append('text').attr('class', 'lt mono').attr('y', -8).style('font-size', '10px').attr('fill', F.ink2);
      g.append('rect').attr('class', 'hs').attr('x', 170).attr('width', 14).attr('height', 8).attr('fill', hatchUrl).attr('stroke', 'rgba(236,231,221,.2)');
      g.append('text').attr('class', 'ht note').attr('x', 170).attr('y', 22).style('font-size', '10px').text('masked');
      g.append('text').attr('class', 'dots note').attr('y', 4).style('font-size', '11px').text('1 dot = 1 submission · grey = masked window');
      return g;
    });
    const M = MEASURES[st.measure];
    g.selectAll('.ramp,.l0,.l1,.lt,.hs,.ht').attr('opacity', heat);
    g.select('.l1').text(st.measure === 'intensity' ? F.fmt.p1(M.max) : M.max);
    g.select('.lt').text(`${M.label} per window (sqrt scale)`);
    g.select('.dots').attr('opacity', 1 - heat);
  }
})();
