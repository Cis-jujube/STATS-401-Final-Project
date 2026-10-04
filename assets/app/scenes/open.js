/* Opening: scattered submissions converge into the score everyone sees; then the newest
   homework lights up inside the numeral — the HW4 refresh in this snapshot. Captions live in
   routes.js (each content route has its own opening line). */
(function () {
  const F = window.Film;
  const A = F.data.homework.assignments, last = A[A.length - 1], li = A.length - 1;
  let svg, legend, sum;
  F.scene({
    id: 'open', title: 'Opening', duration: 21, captionMode: 'hero', enter: 'fade', captionAlign: 0.5,
    tint: 'rgba(255,106,61,.10)',
    particles: [
      { at: 0, form: 'star', alpha: 0.6 },
      { at: 1.0, form: 'hundred', dur: 3.8, curl: 1.4, spread: 0.55 },
      { at: 13.2, form: 'hundred', emph: li, dur: 1.4, curl: 0, spread: 0.3 },
    ],
    howto: `Each dot is one of the <b>${F.fmt.int(F.data.homework.window_submissions)}</b> homework submissions made inside a homework window, coloured by homework. In the last beat, ${last.homework}’s <b>${F.fmt.int(last.submissions)}</b> stay lit. Move the pointer through the numeral to disturb it.`,
    mount(el) {
      svg = d3.select(el).append('svg').attr('class', 'viz');
      legend = svg.append('g').attr('class', 'legend');
      const items = legend.selectAll('g').data(F.HW).join('g');
      items.append('circle').attr('r', 3.5).attr('fill', (d) => F.color[d]);
      items.append('text').attr('x', 9).attr('dy', '0.35em').attr('class', 'mono').style('font-size', '11px').text((d) => d);
      legend.append('text').attr('class', 'note lead').attr('dy', '0.35em').text('One dot = one submission');
      // the snapshot as a sum: the newest homework's share of the dots
      sum = svg.append('g').attr('class', 'hw-sum').attr('pointer-events', 'none');
      const line = sum.append('text').attr('class', 'big eq').attr('text-anchor', 'middle');
      A.forEach((a, i) => {
        line.append('tspan').attr('fill', F.color[a.homework]).style('font-weight', i === li ? 500 : 330).text(F.fmt.int(a.submissions));
        line.append('tspan').attr('fill', F.muted).text(i < li ? ' + ' : ' = ');
      });
      line.append('tspan').attr('fill', F.ink).text(F.fmt.int(F.data.homework.window_submissions));
      sum.append('text').attr('class', 'mono sub').attr('text-anchor', 'middle').attr('y', 24).style('font-size', '10.5px').style('letter-spacing', '.12em')
        .attr('fill', F.color[last.homework]).text(`${last.homework.toUpperCase()} · NEW IN THIS SNAPSHOT · ${last.problems} PROBLEM SLOTS`);
    },
    resize(L) {
      const c = L.chart;
      legend.attr('transform', `translate(${c.x + c.w / 2},${c.y + c.h - (L.narrow ? 30 : 8)})`);
      legend.select('.lead').attr('display', L.narrow ? 'none' : null);
      const lead = legend.select('.lead'), w = 70;
      lead.attr('x', -(4 * w) / 2 - 12).attr('text-anchor', 'end');
      legend.selectAll('g').attr('transform', (d, i) => `translate(${-(4 * w) / 2 + i * w + 8},0)`);
      sum.attr('transform', `translate(${c.x + c.w / 2},${c.y + c.h - (L.narrow ? 40 : 30)})`);
      sum.select('.eq').style('font-size', L.narrow ? '19px' : '30px');
      sum.select('.sub').style('font-size', L.narrow ? '9px' : '10.5px');
    },
    render(t) {
      const s = F.seg(t, 13.4, 14.6);
      legend.attr('opacity', F.seg(t, 5.2, 6.4) * (1 - s));
      sum.attr('opacity', s);
    },
  });
})();
