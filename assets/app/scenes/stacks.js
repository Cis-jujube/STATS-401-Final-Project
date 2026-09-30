/* Scene 2 · The raw material: a unit chart of every submission, stacked by homework. */
(function () {
  const F = window.Film, P = F.particles;
  const A = F.data.homework.assignments;
  const fmtDay = d3.timeFormat('%-d %b');
  let svg, cols;
  F.scene({
    id: 'homeworks', title: '00 · Four homeworks', duration: 16, enter: 'rise',
    tint: 'rgba(57,135,229,.12)',
    beats: [
      { at: 0, kicker: '00 · The raw material', title: 'Four homeworks. <em>2,807</em> submissions.',
        body: 'The same dots, sorted into their homework windows. <b>39 students</b> submitted to <b>31 problems</b> between 26 Aug and 29 Sep 2026.' },
      { at: 8, kicker: '00 · The raw material', title: 'Twelve to fifteen tries for eight problems.',
        body: 'The median student sent <span class="num">12.5–15</span> submissions per homework. The most persistent sent <b>141</b> to HW4’s eight problems.' },
    ],
    particles: [{ at: 0, form: 'stacks', dur: 3.6, curl: 0.9, spread: 0.5 }],
    howto: 'Column height is the number of in-window submissions (one dot each). Hover a column for its window, students and attempt spread; use the <b>Lens</b> to isolate one homework.',
    mount(el) {
      svg = d3.select(el).append('svg').attr('class', 'viz');
      cols = svg.selectAll('g.col').data(A).join('g').attr('class', 'col');
      cols.append('rect').attr('class', 'hit');
      cols.append('line').attr('class', 'base').attr('stroke', F.ink).attr('stroke-opacity', 0.35);
      cols.append('text').attr('class', 'hw mono').style('font-size', '12px').style('font-weight', 500).attr('fill', (d) => F.color[d.homework]).text((d) => d.homework);
      cols.append('text').attr('class', 'count big').style('font-size', '34px').style('font-weight', 350);
      cols.append('text').attr('class', 'meta note');
      cols.append('text').attr('class', 'meta2 note');
      cols.append('text').attr('class', 'median mono').style('font-size', '11px').attr('fill', F.ink2);
      cols
        .on('pointerenter', (ev, d) => F.tip.show(F.tip.html({
          kicker: d.homework, color: F.color[d.homework], title: `${fmtDay(new Date(d.start_local))} – ${fmtDay(new Date(d.end_local))}`,
          rows: [['In-window submissions', F.fmt.int(d.submissions)], ['Outside the window', d.outside_window], ['Students submitting', d.all_attempts.n], ['Problems', d.problems],
            ['Median per student', d.all_attempts.median], ['Middle half', `${d.all_attempts.q1}–${d.all_attempts.q3}`], ['Range', `${d.all_attempts.min}–${d.all_attempts.max}`]],
          note: 'Counts are submissions, not study time or effort.' }), ev))
        .on('pointermove', (ev) => F.tip.move(ev))
        .on('pointerleave', () => F.tip.hide())
        .on('click', (ev, d) => F.set('lens', F.state.lens === d.homework ? null : d.homework));
    },
    resize() {},
    render(t) {
      const g = P.stackGeom();
      cols.each(function (d, h) {
        const x = g.xs[h], w = g.colW, top = g.base - g.heights[h];
        const sel = d3.select(this).attr('opacity', F.la(d.homework));
        const pIn = F.seg(t, 1.6 + h * 0.18, 3.4 + h * 0.18, F.ease.out);
        sel.select('.hit').attr('x', x - 6).attr('y', top - 70).attr('width', w + 12).attr('height', g.base - top + 110);
        sel.select('.base').attr('x1', x).attr('x2', x + w * pIn).attr('y1', g.base + 6).attr('y2', g.base + 6);
        sel.select('.hw').attr('x', x).attr('y', g.base + 26).attr('opacity', pIn);
        const nar = F.layout.narrow;
        sel.select('.count').attr('x', x).attr('y', top - (nar ? 10 : 16)).style('font-size', nar ? '24px' : '34px').attr('opacity', F.seg(t, 2.2, 3)).text(F.fmt.int(Math.round(d.submissions * F.seg(t, 1.2 + h * 0.15, 4.2 + h * 0.15, F.ease.out))));
        sel.select('.hw').attr('y', g.base + (nar ? 22 : 26));
        sel.select('.meta').attr('x', x).attr('y', g.base + (nar ? 37 : 44)).style('font-size', nar ? '10px' : null).attr('opacity', pIn).text(`${fmtDay(new Date(d.start_local))} – ${fmtDay(new Date(d.end_local))}`);
        sel.select('.meta2').attr('x', x).attr('y', g.base + 60).attr('display', nar ? 'none' : null).attr('opacity', pIn).text(`${d.problems} problems · ${d.all_attempts.n} students`);
        const pm = F.seg(t, 8.4 + h * 0.2, 9.4 + h * 0.2, F.ease.out);
        sel.select('.median').attr('x', x).attr('y', top - (nar ? 40 : 58)).style('font-size', nar ? '9.5px' : '11px').attr('opacity', pm)
          .text(nar ? `max ${Math.round(d.all_attempts.max * pm)}` : `median ${d.all_attempts.median} · max ${Math.round(d.all_attempts.max * pm)}`);
      });
    },
  });
})();
