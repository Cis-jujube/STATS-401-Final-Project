// Content routes: route membership and order, reading stops, deep links, legacy links, switching
// rules and the per-route Loop reels. Pure functions from assets/app/routes.js and reel.js (no DOM).
const { runInNewContext } = require('node:vm');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');

const ctx = { URLSearchParams };
ctx.window = ctx;
for (const f of ['assets/app/data.js', 'assets/app/figures.js', 'assets/app/routes.js', 'assets/app/reel.js']) runInNewContext(readFileSync(f, 'utf8'), ctx);
const R = ctx.Film.routes, { ROUTES } = R;
const core = ROUTES.core, show = ROUTES.showcase;
const figs = (r) => r.segs.filter((s) => s.fig).map((s) => s.fig);
// values built inside the VM context have that realm's prototypes: compare their serialised form
const same = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

// ── membership and order ──────────────────────────────────────────
same(figs(core), ['01', '03', '11', '12', '06'], 'Core: exactly five figure stops, in order');
same(figs(show), ['01', '02', '03', '04', '11', '12', '05', '06', '07', '08', '09', '10'], 'Showcase: all twelve, documented order');
same(core.segs.filter((s) => !s.fig).map((s) => s.key), ['opening', 'bridge', 'conclusion'], 'Core context is opening, sample switch and conclusion only');
assert.ok(!core.segs.some((s) => s.scene === 'homeworks'), 'the four-homeworks unit chart is not a Core stop');
assert.ok(show.segs.findIndex((s) => s.key === 'bridge') < show.segs.findIndex((s) => s.fig === '05'), 'Showcase introduces the sample switch before exam results');
for (const r of [core, show]) {
  r.segs.forEach((s, i) => {
    assert.ok(s.to > s.from, `${r.id} ${s.key}: positive duration`);
    if (i) assert.ok(Math.abs(s.start - r.segs[i - 1].end) < 1e-9, `${r.id} ${s.key}: contiguous timeline`);
    assert.equal(s.beats[0].at, s.from, `${r.id} ${s.key}: first caption starts with the chapter`);
    s.beats.forEach((b) => assert.ok(b.at >= s.from && b.at < s.to, `${r.id} ${s.key}: beat ${b.at} inside [${s.from}, ${s.to})`));
    if (s.fig) {
      assert.ok(s.stop > s.start && s.stop < s.end, `${r.id} figure ${s.fig}: reading stop inside its chapter`);
      assert.equal(r.stops[s.fig], s.stop);
      assert.equal(R.segAt(r, s.stop), s, `${r.id} figure ${s.fig}: stop resolves to its own chapter`);
    }
  });
}
// Core's exam chapter uses OJ associations only (Fig 06); no platform result appears in Core captions
const coreText = core.segs.flatMap((s) => s.beats.map((b) => `${b.title} ${b.body || ''}`)).join(' ');
assert.ok(!/Course Pulse|platform/i.test(coreText), 'Core captions do not present Course Pulse results');
assert.ok(core.cards.every((c) => c.figs.every((f) => core.figures.includes(f))), 'Core conclusion cites Core figures only');
assert.ok(show.cards.flatMap((c) => c.figs).sort().join() === show.figures.slice().sort().join(), 'Showcase conclusion covers all twelve');

// ── persistent captions derived from the public aggregates ────────
assert.equal(R.COHORT.homework, 'HW1–HW4 · 30 Sep 2026 snapshot · 39 submitters');
assert.equal(R.COHORT.retry, 'Eligible retry events · 468 / 1,222 set a new best');
assert.equal(R.COHORT.exam, 'Pre-exam HW1–HW3 · 26 matched grades · HW4 excluded');

// ── deep links ────────────────────────────────────────────────────
const E = (s, h) => R.resolveEntry(s, h);
let e = E('', '#figure-11');
same([e.route, e.mode, e.target.kind, e.target.fig], ['core', 'presenter', 'stop', '11'], 'figure link opens Core, Presenter, at the reading stop');
e = E('?content=core', '#figure-08');
same([e.route, e.target.fig], ['showcase', '08'], 'a Core URL naming a Showcase-only figure resolves to Showcase');
assert.match(e.notice, /Showcase/);
e = E('?content=showcase', '#figure-03');
assert.equal(e.route, 'showcase', 'an explicit route is kept when it contains the figure');
e = E('?content=core&loop', '#figure-06');
assert.equal(e.mode, 'presenter', 'figure links always open Presenter');
assert.equal(E('', '').route, 'core', 'first entry: Core');
assert.equal(E('', '').target, null, 'first entry waits on the poster');
assert.equal(E('', '#figure-99').target, null);
assert.equal(E('?content=bogus', '').route, 'core');
// legacy links keep their meaning
same([E('', '#time').route, E('', '#time').target.key], ['core', 'figure-01']);
same([E('', '#problems').route, E('', '#problems').target.key], ['core', 'figure-03']);
same([E('', '#retries').route, E('', '#retries').target.key], ['core', 'figure-11'], 'film #retries = the retry figures, not the evidence page #retries');
same([E('', '#exam').route, E('', '#exam').target.key], ['showcase', 'figure-05']);
same([E('', '#attempts').route, E('', '#homeworks').route], ['showcase', 'showcase']);
e = E('?loop&autoplay', '');
same([e.route, e.mode, e.autoplay], ['showcase', 'loop', true], 'the original reel URL still loops (Showcase)');
assert.equal(E('?content=core', '#loop').route, 'core');
e = E('?t=95', '');   // old timeline: Problems chapter, 26 s in
assert.equal(e.route, 'core');
assert.equal(R.segAt(core, R.targetTime('core', e.target)).fig, '03');
assert.ok(Math.abs(R.targetTime('core', e.target) - (core.segs.find((s) => s.fig === '03').start + 26)) < 1e-6, 'legacy ?t= lands on the same scene frame');
e = E('?t=185', ''); // old timeline: retries phase view (old 180–190 s) → Figure 12
assert.equal(R.segAt(ROUTES[E('?t=170', '').route], R.targetTime(E('?t=170', '').route, E('?t=170', '').target)).fig, '11', 'old waffle time → Figure 11');
assert.equal(R.segAt(ROUTES[e.route], R.targetTime(e.route, e.target)).fig, '12');
assert.equal(E('?content=showcase&t=30', '').target.T, 30, 'with an explicit route, t is route time');

// ── switching ─────────────────────────────────────────────────────
let sw = R.switchTarget('showcase', show.stops['08'], 'core');
assert.equal(sw.seg.fig, '06', 'Showcase-only figure → closest preceding Core figure');
assert.match(sw.notice, /no Figure 08/);
assert.equal(R.switchTarget('showcase', show.stops['02'], 'core').seg.fig, '01');
assert.equal(R.switchTarget('showcase', show.stops['04'], 'core').seg.fig, '03');
assert.equal(R.switchTarget('showcase', show.stops['05'], 'core').seg.fig, '12');
assert.equal(R.switchTarget('showcase', show.segs.find((s) => s.key === 'sample').start + 3, 'core').seg.fig, '01', 'no predecessor → Figure 01');
for (const f of core.figures) {
  sw = R.switchTarget('core', core.stops[f], 'showcase');
  assert.equal(sw.seg.fig, f, `shared figure ${f} is preserved`);
  const a = R.segAt(core, core.stops[f]), b = sw.seg;
  assert.ok(Math.abs((a.from + core.stops[f] - a.start) - (b.from + sw.T - b.start)) < 1e-6, `figure ${f}: same scene frame`);
  assert.equal(sw.notice, '');
}
assert.equal(R.switchTarget('core', 0, 'showcase').T, 0, 'the title frame stays the title frame');
assert.equal(R.switchTarget('showcase', show.segs.find((s) => s.key === 'bridge').start + 2, 'core').seg.key, 'bridge');
assert.equal(R.canonical('core', 'presenter', core.segs[2], true), '?content=core#figure-03');
assert.equal(R.canonical('showcase', 'loop', null, false), '?content=showcase#loop');
assert.equal(R.canonical('core', 'presenter', core.segs[0], false), '?content=core');

// ── Loop reels: one per route, 128 beats on the song grid, Core never cuts Showcase material ──
for (const id of ['core', 'showcase']) {
  const reel = ctx.Film.reels[id];
  assert.equal(reel.shots.reduce((s, x) => s + x.beats, 0), 128, `${id} reel is 32 bars`);
  for (const sh of reel.shots) {
    assert.ok(sh.to > sh.from, `${id} reel shot ${sh.scene} ${sh.from}`);
    const a = R.timeFor(ROUTES[id], sh.scene, sh.from + 0.01), b = R.timeFor(ROUTES[id], sh.scene, sh.to - 0.01);
    assert.ok(a && b, `${id} reel shot ${sh.scene} ${sh.from}–${sh.to} lies inside the ${id} route`);
  }
}

console.log(`PASS: routes (Core ${figs(core).join(' ')} · Showcase ${figs(show).length} figures), reading stops, captions, deep and legacy links, switching, per-route reels`);
