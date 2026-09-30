/* Scene 8 · Finale: three takeaways, then the numeral re-forms — now with its past visible. */
(function () {
  const F = window.Film;
  const R = 3.6; // length of the rewind montage
  const TAKE = [
    { n: '01', h: 'Work comes in bursts.', b: 'One Saturday afternoon held 153 submissions from 12 students. Every deadline night drew another 46–82. Masked windows keep the true peak unknown.', go: 'time' },
    { n: '02', h: 'One score, many roads.', b: 'Mean first tries ranged from 38 to 90. After three tries, 10 of 31 problems were still more than 10 points short, and some problems became loops of 70–130 retries.', go: 'problems' },
    { n: '03', h: 'Pauses and early starts travel with progress.', b: 'Retries after a 1–10 minute pause set new bests more often than instant resubmits (44% vs 32%). A smaller share of last-day submissions went with higher midterms (ρ −0.48). Associations, not causes.', go: 'exam' },
  ];
  let wrap, cards, end;
  F.scene({
    id: 'finale', title: 'Finale', duration: 22 + R, captionMode: 'finale', enter: 'fade', tint: 'rgba(255,106,61,.10)',
    // rewind montage: hard cuts back through the film, each frame played in reverse
    montage: { dur: R, cuts: [['exam', 20], ['retries', 18], ['attempts', 6.5], ['problems', 34], ['time', 38], ['homeworks', 13], ['open', 11]] },
    beats: [
      { at: 0, kicker: '', title: '', noStop: true },
      { at: R, kicker: 'What we found', title: 'What the <em>100</em> was hiding.', body: 'Three patterns from 2,807 submissions, 31 problems and 26 exam scores.' },
      { at: 12 + R, kicker: 'The score has a past', title: 'Now you have <em>seen it.</em>',
        body: 'Replay any chapter, or read the methods, tables and aggregate data behind every frame.',
        credit: 'Zaozao Wang · data acquisition, cleaning, analysis<br>Zhengxiang Liu · visualization design, D3 implementation<br>STATS 401 · CS201 OJ snapshot 30 Sep 2026 · aggregates only' },
    ],
    particles: [
      { at: R, form: 'hundred', dur: 4.2, alpha: 0.16, glow: 0.2, curl: 1.2, box: (L) => L.chart },
      { at: 12 + R, form: 'hundred', dur: 2.4, alpha: 0.95, glow: 1, curl: 0.4, box: (L) => L.chart },
    ],
    howto: 'Click a takeaway to jump back to the chapter that shows it. <b>Replay</b> restarts the film.',
    mount(el) {
      const html = d3.select(el).append('div').attr('class', 'html-layer');
      wrap = html.append('div').style('position', 'absolute').style('display', 'grid').style('gap', '14px');
      cards = wrap.selectAll('button.take').data(TAKE).join('button').attr('class', 'take').attr('type', 'button')
        .style('text-align', 'left').style('padding', '20px 22px').style('border-radius', '16px').style('border', '1px solid rgba(236,231,221,.14)')
        .style('background', 'rgba(12,15,21,.72)').style('backdrop-filter', 'blur(14px)').style('-webkit-backdrop-filter', 'blur(14px)').style('cursor', 'pointer')
        .on('click', (e, d) => { const s = F.scenes.find((x) => x.id === d.go); F.seek(s.start + 0.01); F.play(); });
      cards.append('div').style('font', '500 11px/1 var(--mono)').style('letter-spacing', '.14em').style('color', 'var(--signal)').text((d) => d.n + ' · replay chapter ↺');
      cards.append('div').style('font', '380 clamp(22px, 2vw, 30px)/1.1 var(--display)').style('margin', '10px 0 8px').style('color', 'var(--ink)').text((d) => d.h);
      cards.append('div').style('font', '400 14px/1.55 var(--sans)').style('color', 'var(--ink-2)').text((d) => d.b);
      end = html.append('div').style('position', 'absolute').style('display', 'flex').style('gap', '10px').style('flex-wrap', 'wrap');
      const btn = (label, href, primary) => end.append(href ? 'a' : 'button').attr('href', href).attr('type', href ? null : 'button')
        .style('font', '500 13px/1 var(--sans)').style('padding', '13px 18px').style('border-radius', '999px').style('text-decoration', 'none')
        .style('border', '1px solid rgba(236,231,221,.25)').style('background', primary ? 'var(--ink)' : 'rgba(12,15,21,.7)').style('color', primary ? 'var(--bg)' : 'var(--ink)').text(label);
      btn('↺  Replay the film', null, true).on('click', () => { F.seek(0); F.play(); });
      btn('Methods & tables ↗', 'analysis.html');
      btn('Aggregate data ↗', 'data/summary.json');
      btn('Source code ↗', 'https://github.com/Cis-jujube/STATS-401-Final-Project');
    },
    resize(L) {
      const c = L.chart;
      wrap.style('left', c.x + 'px').style('top', c.y + 10 + 'px').style('width', Math.min(640, c.w) + 'px');
      end.style('left', c.x + 'px').style('top', c.y + c.h - 40 + 'px');
    },
    render(t0, env = {}) {
      const t = t0 - R, reel = !!env.reel; // the Loop reel shows the numeral, not the buttons
      cards.each(function (d, i) {
        const p = F.seg(t, 1.2 + i * 1.1, 2.4 + i * 1.1, F.ease.outExpo), out = F.seg(t, 11.2, 12);
        this.style.opacity = p * (1 - out);
        this.style.transform = `translateY(${(1 - p) * 30 - out * 20}px)`;
        this.style.pointerEvents = p > 0.5 && out < 0.5 ? 'auto' : 'none';
      });
      const pe = reel ? 0 : F.seg(t, 14, 15.2, F.ease.outExpo);
      end.style('opacity', pe).style('transform', `translateY(${(1 - pe) * 16}px)`).style('pointer-events', pe > 0.5 ? 'auto' : 'none');
    },
  });
})();
