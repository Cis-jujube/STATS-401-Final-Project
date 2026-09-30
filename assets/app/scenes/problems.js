/* Scene 4 · Same 100, different roads.
   31 problems. Each dot starts at the problem's mean best score (the gradebook view),
   falls to the mean first-submission score, then climbs through best-of-2, best-of-3
   and the final best. The same attempters are averaged at every stage. */
(function () {
  const F = window.Film;
  const rows = F.data.homework.score_progression.map((r) => ({
    ...r, name: F.problemName(r.problem_name), v: [r.first, r.best2, r.best3, r.best], gap3: r.best - r.best3,
    y: 0, a: 1, ev: F.byProblem[r.problem_id],
  }));
  const courseOrder = rows.slice().sort((a, b) => a.homework.localeCompare(b.homework) || a.problem_order - b.problem_order);
  courseOrder.forEach((r, i) => (r.ci = i));
  const SORTS = {
    course: { label: 'Course order', cmp: (a, b) => a.ci - b.ci },
    first: { label: 'First try', cmp: (a, b) => a.first - b.first },
    gain: { label: 'Total gain', cmp: (a, b) => b.best - b.first - (a.best - a.first) },
    gap3: { label: 'Gap after 3', cmp: (a, b) => b.gap3 - a.gap3 },
  };
  const STAGES = ['First try', 'Best of 2', 'Best of 3', 'Final best'];
  const GAP_ROWS = rows.filter((r) => r.gap3 > 10).length;
  const SPOT = 1354; // HW3 TicTacToe

  const st = { s: 3, userStage: null, userSort: null, sort: 'course', hover: null, init: false };
  let svg, gRows, rowSel, gHead, headSel, gAxis, x, geo, spot, ctrlStage, ctrlSort, ctrlBox, glowUrl;

  function layoutRows(sortKey) {
    const order = rows.slice().sort(SORTS[sortKey].cmp);
    const grouped = sortKey === 'course';
    let y = 0; const pos = new Map(); const heads = [];
    order.forEach((r, i) => {
      if (grouped && (i === 0 || order[i - 1].homework !== r.homework)) { if (i) y += 0.6; heads.push({ hw: r.homework, y }); y += 1; }
      pos.set(r, y); y += 1;
    });
    return { pos, heads, total: y, order };
  }

  function tl(t) { // timeline-directed stage for row index i (stagger handled by caller)
    return t;
  }

  F.scene({
    id: 'problems', title: '02 · Problems', duration: 44, enter: 'iris', flash: true, tint: 'rgba(57,135,229,.12)',
    beats: [
      { at: 0, kicker: '02 · Problems', title: 'Every problem ends near <em>100.</em>',
        body: 'Mean best score for each of the <b>31 problems</b>, averaged over the students who attempted it. This is what the gradebook sees.' },
      { at: 7, kicker: '02 · Problems', title: 'First tries start far below.',
        body: 'The same students’ mean <b>first</b> submission ranged from <span class="num">37.9</span> to <span class="num">90.0</span>. The thin line marks where each problem ends.' },
      { at: 14, kicker: '02 · Problems', title: 'A second and third try close most of the gap…',
        body: 'Best of two, then best of three: the highest score each student had reached so far, averaged. It can only rise.' },
      { at: 22, kicker: '02 · Problems', title: `…but <em>${GAP_ROWS} of 31</em> still trail by more than 10 points.`,
        body: 'After three tries these problems remain more than 10 points short of their final mean best. The orange stretch is the distance still to climb.' },
      { at: 30, kicker: '02 · Problems', title: 'TicTacToe: <em>37.9 → 100.</em>',
        body: 'HW3’s TicTacToe had the lowest mean first try of all 31 problems, yet every one of its 39 attempters eventually reached full marks.' },
      { at: 37, kicker: '02 · Problems', title: 'Sort, filter, follow one.',
        body: 'Now sorted by total gain. Pause to change the stage or sort, use the Lens for one homework, or <b>click a problem</b> to follow it into the retry chapter.' },
    ],
    howto: 'Each row is a problem. The dot is the mean score at the chosen stage; the thin line runs from first try to final best; the tick marks the final best. Hover for exact values and retry statistics. Click to select a problem across scenes.',
    onBeat() { st.userStage = null; st.userSort = null; },
    snap() { st.init = false; }, // a hard cut in the Loop reel lands rows exactly, no slide
    mount(el) {
      svg = d3.select(el).append('svg').attr('class', 'viz');
      glowUrl = F.glow(svg.append('defs'), 'glow-prob', 3);
      gAxis = svg.append('g');
      gHead = svg.append('g');
      gRows = svg.append('g').attr('data-interactive', '');
      rowSel = gRows.selectAll('g.row').data(rows, (d) => d.problem_id).join((en) => {
        const g = en.append('g').attr('class', 'row');
        g.append('rect').attr('class', 'hit');
        g.append('text').attr('class', 'name').attr('text-anchor', 'end').attr('dy', '0.35em').style('font-size', '11.5px');
        g.append('line').attr('class', 'track').attr('stroke', F.ink).attr('stroke-opacity', 0.14);
        g.append('line').attr('class', 'road').attr('stroke-width', 2.2).attr('stroke-linecap', 'round');
        g.append('line').attr('class', 'gap').attr('stroke', F.signal).attr('stroke-width', 2.2).attr('stroke-linecap', 'round');
        g.append('line').attr('class', 'best').attr('stroke', F.ink).attr('stroke-width', 1.2);
        g.append('circle').attr('class', 'ring').attr('fill', 'none').attr('stroke', F.ink).attr('stroke-width', 1.4);
        g.append('circle').attr('class', 'dot');
        g.append('text').attr('class', 'val mono').attr('dy', '0.35em').style('font-size', '10.5px');
        return g;
      });
      rowSel.select('.road').attr('stroke', (d) => F.color[d.homework]);
      rowSel.select('.dot').attr('fill', (d) => F.color[d.homework]);
      rowSel.select('.name').text((d) => d.name);
      rowSel
        .on('pointerenter', (ev, d) => { st.hover = d; F.tip.show(tipHtml(d), ev); })
        .on('pointermove', (ev) => F.tip.move(ev))
        .on('pointerleave', () => { st.hover = null; F.tip.hide(); })
        .on('click', (ev, d) => { F.set('selected', F.state.selected === d.problem_id ? null : d.problem_id); });

      spot = svg.append('g').attr('class', 'spot').attr('pointer-events', 'none');
      spot.append('text').attr('class', 'k mono').style('font-size', '10.5px').attr('fill', F.color.HW3).text('HW3 · TICTACTOE · 39 ATTEMPTERS');
      spot.append('text').attr('class', 'big a').style('font-size', '54px').style('font-weight', 300);
      spot.append('text').attr('class', 'big arrow').style('font-size', '40px').style('font-weight', 300).attr('fill', F.muted).text('→');
      spot.append('text').attr('class', 'big b').style('font-size', '54px').style('font-weight', 400).attr('fill', F.ember).text('100');

      const html = d3.select(el).append('div').attr('class', 'html-layer');
      ctrlBox = html.append('div').attr('class', 'ctrls').node();
      ctrlStage = F.stageSlider(ctrlBox, ['First', '2 tries', '3 tries', 'Final'], (v, drag) => { st.userStage = v; st.dragging = drag; });
      ctrlSort = F.segmented(ctrlBox, 'Sort', Object.entries(SORTS).map(([k, s]) => [k, s.label]), (v) => (st.userSort = v));
    },
    resize(L) {
      const c = L.chart, labelW = Math.min(L.narrow ? 120 : 200, c.w * 0.3);
      Object.assign(ctrlBox.style, { left: c.x + 'px', top: c.y - 6 + 'px', maxWidth: c.w + 'px' });
      const ctrlH = ctrlBox.offsetHeight || 44; // controls may wrap onto two rows on mid-size screens
      geo = { c, labelW, x0: c.x + labelW + 18, x1: c.x + c.w - (L.narrow ? 40 : 70), top: c.y - 6 + ctrlH + (L.narrow ? 26 : 22), bottom: c.y + c.h - 34 };
      x = d3.scaleLinear().domain([30, 100]).range([geo.x0, geo.x1]);
      Object.assign(ctrlBox.style, { left: c.x + 'px', top: c.y - 6 + 'px', maxWidth: c.w + 'px' });
      gAxis.selectAll('*').remove();
      const ticks = d3.range(40, 101, 10);
      gAxis.selectAll('line').data(ticks).join('line').attr('x1', x).attr('x2', x).attr('y1', geo.top - 6).attr('y2', geo.bottom)
        .attr('stroke', (d) => (d === 100 ? 'rgba(255,181,71,.35)' : 'rgba(236,231,221,.06)'));
      gAxis.selectAll('text.tk').data(ticks).join('text').attr('class', 'tk mono').attr('x', x).attr('y', geo.bottom + 16).attr('text-anchor', 'middle').style('font-size', '10.5px').attr('fill', F.muted).text((d) => d);
      gAxis.append('text').attr('class', 'axis-title').attr('x', geo.x1).attr('y', geo.bottom + 32).attr('text-anchor', 'end').text('Mean score among attempters (0–100)');
      st.init = false;
    },
    render(t, env) {
      const dt = env.dt || 0.016;
      // sort
      st.sort = st.userSort || (t >= 37.4 ? 'gain' : 'course');
      const lay = layoutRows(st.sort);
      const rowH = Math.min(22, (geo.bottom - geo.top) / lay.total);
      const yOf = (r) => geo.top + lay.pos.get(r) * rowH + rowH / 2;
      rows.forEach((r) => { const ty = yOf(r); r.y = st.init ? F.approach(r.y, ty, dt, 7) : ty; });
      st.init = true;
      // stage
      const tlStage = (i) => {
        if (t < 7.6) return 3;
        if (t < 14.6) return 3 - 3 * F.stagger(t, 7.6, 10.2, i, rows.length, 0.5, F.ease.outBack);
        if (t < 18.2) return F.seg(t, 14.6, 16.2);
        if (t < 30.6) return 1 + F.seg(t, 18.2, 19.8);
        return 2 + F.seg(t, 30.6, 33.2);
      };
      if (st.userStage != null) st.s = st.dragging ? st.userStage : F.approach(st.s, st.userStage, dt, 6);
      ctrlStage.set(st.userStage != null ? st.s : F.clamp(tlStage(0), 0, 3));
      ctrlSort.set(st.sort);
      ctrlBox.style.opacity = F.seg(t, 1, 2);

      const roadA = Math.max(F.seg(t, 9.4, 10.8), st.userStage != null ? 1 : 0);
      const gapPhase = F.seg(t, 22.3, 23.3) * (1 - F.seg(t, 29.6, 30.4));
      const spotPhase = F.seg(t, 30.2, 31) * (1 - F.seg(t, 36.6, 37.4));
      const enter = F.seg(t, 0.3, 2.2);

      rowSel.each(function (r, i) {
        const g = d3.select(this);
        const oi = lay.order.indexOf(r);
        let s = st.userStage != null ? st.s : tlStage(oi);
        const s0 = Math.max(0, Math.min(2, Math.floor(s))), f = s - s0;
        const val = r.v[s0] + (r.v[Math.min(3, s0 + 1)] - r.v[s0]) * f;
        const isGap = r.gap3 > 10, isSpot = r.problem_id === SPOT, isSel = F.state.selected === r.problem_id, isHover = st.hover === r;
        let a = F.la(r.homework);
        a *= F.lerp(1, isGap ? 1 : 0.3, gapPhase);
        a *= F.lerp(1, isSpot ? 1 : 0.22, spotPhase);
        const rowIn = F.stagger(t, 0.2, 2.4, oi, rows.length, 0.6, F.ease.out);
        g.attr('transform', `translate(0,${r.y})`).attr('opacity', a * rowIn);
        g.select('.hit').attr('x', geo.c.x).attr('y', -rowH / 2).attr('width', geo.x1 - geo.c.x + 50).attr('height', rowH);
        const named = !F.layout.narrow || isSel || isHover || isSpot * spotPhase > 0.5 || (isGap && gapPhase > 0.5);
        g.select('.name').attr('x', geo.c.x + geo.labelW).style('font-size', `${Math.min(11.5, Math.max(9, rowH * 0.9))}px`).attr('opacity', named ? 1 : 0)
          .text(F.layout.narrow && r.name.length > 15 ? r.name.slice(0, 14) + '…' : r.name).attr('fill', isSel || isHover || isSpot * spotPhase > 0.5 ? F.ink : F.ink2).style('font-weight', isSel ? 600 : 400);
        g.select('.track').attr('x1', x(r.first)).attr('x2', x(r.best)).attr('opacity', roadA);
        g.select('.road').attr('x1', x(r.first)).attr('x2', x(Math.max(r.first, val))).attr('opacity', roadA);
        g.select('.best').attr('x1', x(r.best)).attr('x2', x(r.best)).attr('y1', -rowH * 0.3).attr('y2', rowH * 0.3).attr('opacity', roadA * 0.7);
        g.select('.gap').attr('x1', x(r.best3)).attr('x2', x(r.best)).attr('opacity', isGap ? gapPhase : 0);
        const rad = Math.min(5.2, rowH * 0.28) * (isSpot ? 1 + 0.5 * spotPhase : 1) * (isHover ? 1.3 : 1);
        g.select('.dot').attr('cx', x(val)).attr('r', rad * (0.3 + 0.7 * rowIn)).attr('filter', isSpot && spotPhase > 0.1 ? glowUrl : null);
        g.select('.ring').attr('cx', x(val)).attr('r', rad + 4).attr('opacity', isSel ? 1 : 0);
        const showVal = isHover || isSel || (isSpot && spotPhase > 0.2) || (isGap && gapPhase > 0.2);
        g.select('.val').attr('x', x(val) + rad + 7).attr('opacity', showVal ? 1 : 0)
          .attr('fill', isGap && gapPhase > 0.2 ? F.signal : F.ink)
          .text(isGap && gapPhase > 0.2 && !isHover && !isSel ? `${F.fmt.p1(r.gap3)} to go` : F.fmt.p1(val));
      });

      // group headers
      gHead.selectAll('text').data(lay.heads, (d) => d.hw).join((en) => en.append('text').attr('class', 'mono').style('font-size', '10.5px').style('letter-spacing', '.12em'))
        .attr('x', geo.c.x).attr('y', (d) => geo.top + d.y * rowH + rowH * 0.62).attr('fill', (d) => F.color[d.hw])
        .attr('opacity', (d) => enter * F.la(d.hw) * (1 - spotPhase * 0.8) * (1 - gapPhase * 0.6))
        .text((d) => `${d.hw} · ${F.assign[d.hw].problems} PROBLEMS`);
      gAxis.attr('opacity', enter);

      // TicTacToe spotlight counter
      const r = rows.find((d) => d.problem_id === SPOT);
      const cur = r.v[2] + (r.v[3] - r.v[2]) * F.seg(t, 30.6, 33.2);
      const sx = geo.x0 + 10, sy = geo.top + (geo.bottom - geo.top) * 0.18;
      spot.attr('opacity', spotPhase).attr('transform', `translate(${sx},${sy})`);
      spot.select('.k').attr('y', -52);
      spot.select('.a').attr('y', 0).attr('fill', F.ink).text('37.9');
      spot.select('.arrow').attr('x', 118).attr('y', -6);
      spot.select('.b').attr('x', 168).attr('y', 0).text(F.fmt.p1(Math.max(cur, 73.8)).replace('.0', ''));
    },
  });

  function tipHtml(d) {
    const e = d.ev;
    const rows = [['Attempters', d.n], ['First try', F.fmt.p1(d.first)], ['Best of 2', F.fmt.p1(d.best2)], ['Best of 3', F.fmt.p1(d.best3)], ['Final best', F.fmt.p1(d.best)], ['Gap after 3', F.fmt.p1(d.gap3)]];
    if (e && e.state === 'visible') rows.push(['Retries → new best', `${e.new_bests} / ${e.eligible_retries} (${F.fmt.pct(e.improvement_pct)})`]);
    return F.tip.html({ kicker: `${d.homework} · problem ${d.problem_order}`, color: F.color[d.homework], title: d.name, rows,
      note: e && e.state !== 'visible' ? 'Retry statistics withheld (fewer than five students).' : 'Means over the same attempters. Click to follow this problem.' });
  }
})();
