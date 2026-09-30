/* Scene 1 · Cold open: scattered submissions converge into the score everyone sees. */
(function () {
  const F = window.Film;
  let svg, legend;
  F.scene({
    id: 'open', title: 'Opening', duration: 13, captionMode: 'hero', enter: 'fade', captionAlign: 0.5,
    tint: 'rgba(255,106,61,.10)',
    beats: [
      { at: 0, kicker: '', title: '' },
      { at: 3.6, kicker: 'CS201 · STATS 401 final project', title: 'The score <em>has a past.</em>',
        body: 'Almost every CS201 homework problem ends with a mean best score near <b>100</b>. We followed <span class="num">2,807</span> submissions to see what that number hides.',
        credit: 'Zaozao Wang &amp; Zhengxiang Liu<br>Homework snapshot · 30 Sep 2026 · Beijing time' },
    ],
    particles: [
      { at: 0, form: 'star', alpha: 0.6 },
      { at: 1.0, form: 'hundred', dur: 3.8, curl: 1.4, spread: 0.55 },
    ],
    howto: 'Each dot is one of the <b>2,807</b> homework submissions made inside a homework window, coloured by homework. Move the pointer through the numeral to disturb it.',
    mount(el) {
      svg = d3.select(el).append('svg').attr('class', 'viz');
      legend = svg.append('g').attr('class', 'legend');
      const items = legend.selectAll('g').data(F.HW).join('g');
      items.append('circle').attr('r', 3.5).attr('fill', (d) => F.color[d]);
      items.append('text').attr('x', 9).attr('dy', '0.35em').attr('class', 'mono').style('font-size', '11px').text((d) => d);
      legend.append('text').attr('class', 'note lead').attr('dy', '0.35em').text('One dot = one submission');
    },
    resize(L) {
      const c = L.chart;
      legend.attr('transform', `translate(${c.x + c.w / 2},${c.y + c.h - (L.narrow ? 30 : 8)})`);
      legend.select('.lead').attr('display', L.narrow ? 'none' : null);
      const lead = legend.select('.lead'), w = 70;
      lead.attr('x', -(4 * w) / 2 - 12).attr('text-anchor', 'end');
      legend.selectAll('g').attr('transform', (d, i) => `translate(${-(4 * w) / 2 + i * w + 8},0)`);
    },
    render(t) {
      legend.attr('opacity', F.seg(t, 5.2, 6.4));
    },
  });
})();
