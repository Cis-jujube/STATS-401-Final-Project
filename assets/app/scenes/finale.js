/* Conclusion: a rewind montage through the route's reading stops (cut list built by the
   player from the active route), the route's takeaways, then the numeral re-forms — now with
   its past visible. Cards and links come from routes.js, so Core never concludes with a
   Showcase-only result. */
(function () {
  const F = window.Film;
  const R = 3.6; // length of the rewind montage
  let wrap, end, cur = null, cols = 1;
  const DATA = [['Homework data ↗', 'data/summary.json'], ['Midterm data ↗', 'data/midterm-summary.json'], ['Platform data ↗', 'data/platform-summary.json']];
  F.scene({
    id: 'finale', title: 'Conclusion', duration: 22 + R, captionMode: 'finale', enter: 'fade', tint: 'rgba(255,106,61,.10)',
    montage: { dur: R }, // cuts: the active route's figure stops, played backwards (player.js)
    particles: [
      { at: R, form: 'hundred', dur: 4.2, alpha: 0.16, glow: 0.2, curl: 1.2, box: (L) => L.chart },
      { at: 12 + R, form: 'hundred', dur: 2.4, alpha: 0.95, glow: 1, curl: 0.4, box: (L) => L.chart },
    ],
    howto: 'Each card summarises figures from this route; a figure button replays that chapter. <b>Replay</b> restarts the route. The evidence links open the methods, accessible tables, downloads and aggregate data.',
    onChapter(seg) { if (seg) build(seg.route); },
    mount(el) {
      const html = d3.select(el).append('div').attr('class', 'html-layer');
      wrap = html.append('div').attr('class', 'takes');
      end = html.append('div').attr('class', 'end-links');
      build('core');
    },
    resize(L) {
      const c = L.chart, n = wrap.selectAll('.take').size();
      cols = n > 3 && c.w > 700 ? 2 : 1;
      wrap.style('left', c.x + 'px').style('top', c.y + 4 + 'px').style('width', Math.min(cols === 2 ? 860 : 640, c.w) + 'px')
        .style('grid-template-columns', cols === 2 ? '1fr 1fr' : '1fr').style('max-height', c.h - 56 + 'px');
      end.style('left', c.x + 'px').style('top', c.y + c.h - 40 + 'px').style('max-width', c.w + 'px');
    },
    render(t0, env = {}) {
      const t = t0 - R, reel = !!env.reel; // the Loop reel shows the numeral, not the buttons
      wrap.selectAll('.take').each(function (d, i) {
        const p = F.seg(t, 1.2 + i * 0.9, 2.4 + i * 0.9, F.ease.outExpo), out = F.seg(t, 11.2, 12);
        this.style.opacity = p * (1 - out);
        this.style.transform = `translateY(${(1 - p) * 30 - out * 20}px)`;
        this.style.pointerEvents = p > 0.5 && out < 0.5 ? 'auto' : 'none';
        this.style.visibility = p * (1 - out) > 0.01 ? 'visible' : 'hidden';
      });
      const pe = reel ? 0 : F.seg(t, 14, 15.2, F.ease.outExpo);
      end.style('opacity', pe).style('transform', `translateY(${(1 - pe) * 16}px)`).style('pointer-events', pe > 0.5 ? 'auto' : 'none').style('visibility', pe > 0.01 ? 'visible' : 'hidden');
    },
  });

  function build(route) {
    if (cur === route || !F.routes) return;
    cur = route;
    const RT = F.routes.ROUTES[route], FIG = F.routes.FIG;
    wrap.selectAll('*').remove();
    const cards = wrap.selectAll('.take').data(RT.cards).join('div').attr('class', 'take');
    cards.append('div').attr('class', 'take-k').text((d) => `Figure${d.figs.length > 1 ? 's' : ''} ${d.figs.join(' · ')}`);
    cards.append('div').attr('class', 'take-h').text((d) => d.h);
    cards.append('div').attr('class', 'take-b').text((d) => d.b);
    const figs = cards.append('div').attr('class', 'take-figs');
    figs.selectAll('button').data((d) => d.figs).join('button').attr('type', 'button')
      .attr('aria-label', (f) => `Replay Figure ${f}: ${FIG[f].title}`).text((f) => `↺ ${f}`)
      .on('click', (e, f) => { e.stopPropagation(); F.replayFigure && F.replayFigure(f); });
    end.selectAll('*').remove();
    end.append('button').attr('type', 'button').attr('class', 'end-btn primary').text('↺  Replay the film').on('click', (e) => { e.stopPropagation(); F.seek(0); F.play(); });
    end.append('a').attr('class', 'end-btn').attr('href', `analysis.html?content=${route}`).text('Evidence & methods ↗');
    // Core uses the homework and midterm aggregates; Showcase also uses the platform aggregate
    DATA.slice(0, route === 'core' ? 2 : 3).forEach(([label, href]) => end.append('a').attr('class', 'end-btn').attr('href', href).text(label));
    end.append('a').attr('class', 'end-btn').attr('href', 'https://github.com/Cis-jujube/STATS-401-Final-Project').text('Source code ↗');
    if (F.layout && F.layout.chart) F.scenes.find((s) => s.id === 'finale').resize(F.layout);
  }
})();
