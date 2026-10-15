// Research poster: the numbers and prose claims derive from the public aggregates, the five Core
// figures appear in route order, and the site-link QR code is well formed. Pure functions from
// assets/poster/poster.js and qr.js (no DOM); the printed layout needs separate runtime evidence.
const { runInNewContext } = require('node:vm');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');

const ctx = { TextEncoder };
ctx.window = ctx;
for (const f of ['assets/app/data.js', 'assets/app/figures.js', 'assets/poster/qr.js', 'assets/poster/poster.js']) runInNewContext(readFileSync(f, 'utf8'), ctx);
const D = ctx.CS201, hw = D.homework, ev = hw.event_progress, mid = D.midterm;
const M = ctx.Poster.model(D), T = M.T;
const html = readFileSync('poster.html', 'utf8');
const digits = (s) => Number(String(s).replace(/,/g, ''));

// ── the five Core figures, in route order, each with its film cross-reference ──
const cited = [...html.matchAll(/Film · Figure (\d\d)/g)].map((m) => m[1]);
assert.equal(cited.join(), ctx.CS201_FIGURES.routes.core.figures.join(), 'poster shows the Core figures in Core order');
assert.equal([...html.matchAll(/data-chart="(\w+)"/g)].map((m) => m[1]).join(), 'reach,gaps,retries,phases,exam', 'one chart per Core figure');

// ── every bound value exists; none is left for the page to invent ──
const keys = [...new Set([...html.matchAll(/data-t="(\w+)"/g)].map((m) => m[1]))];
keys.forEach((k) => assert.ok(k in T, `poster.html binds "${k}", which the model does not provide`));
keys.filter((k) => !k.startsWith('ongoing')).forEach((k) => assert.ok(String(T[k]).length, `"${k}" is empty`));

// ── units and denominators reconcile with the aggregate ──
assert.equal(digits(T.submissions), hw.window_submissions);
assert.equal(digits(T.problems), hw.score_progression.length, 'problem slots = score rows');
const e = ev.eligibility_counts;
assert.equal(e.first_scores + e.internal_errors + e.after_full_credit + M.retries, hw.window_submissions, 'eligible retries complete the submission partition');
assert.equal(M.bests, ev.by_gap.reduce((s, r) => s + r.new_bests, 0), 'new bests agree between the homework and gap partitions');
assert.equal(M.retries, ev.by_gap.reduce((s, r) => s + r.eligible_retries, 0));
assert.equal(M.visibleSubs + M.withheld, hw.window_submissions, 'every in-window submission is either placed or withheld');
assert.equal(M.cells.length, hw.calendar_policy.visible_positive_cells);
assert.equal(M.withheldCells, hw.calendar_policy.suppressed_positive_cells);
assert.equal(M.bins.reduce((s, b) => s + b.withheld, 0), M.withheldCells);
assert.ok(M.cells.every((c) => c.students >= hw.calendar_policy.minimum_distinct_contributors), 'no window below the disclosure threshold is drawn');
assert.equal(M.rows.length, hw.score_progression.length, 'all problem slots are listed');
assert.equal(digits(T.gapCount), hw.score_progression.filter((r) => r.best - r.best3 > 10).length);
assert.equal(digits(T.grades), mid.matched);
assert.equal(digits(T.eligible), mid.eligible_roster);

// ── withheld and unobserved values stay states: never zero, never reconstructed ──
const phaseCells = M.phases.flatMap((p) => p.cells);
assert.equal(phaseCells.length, ev.by_phase.length);
phaseCells.filter((c) => c.state !== 'visible').forEach((c) => assert.equal(c.pct, null, 'a withheld or unobserved phase carries no rate'));
assert.equal(phaseCells.filter((c) => c.state === 'suppressed').length, ev.by_phase.filter((r) => r.state === 'suppressed').length);
assert.equal(phaseCells.filter((c) => c.state === 'not_observed').length, ev.by_phase.filter((r) => r.state === 'not_observed').length);

// ── the exam figure keeps its historical pre-exam sample ──
assert.equal(T.preExam, 'HW1–HW3', 'post-exam homeworks are not part of the exam sample');
assert.equal(M.exam[0].key, 'late_pct');
assert.equal(M.exam.length, mid.associations.length);

// ── statements made in the poster's prose; a data refresh that breaks one must be rewritten ──
Object.entries(M.claims).forEach(([name, holds]) => assert.ok(holds, `poster text relies on "${name}", which the current data no longer supports`));
assert.ok(/only interval that excludes zero/.test(html) && M.claims.lateIntervalExcludesZero && M.claims.otherIntervalsIncludeZero);
assert.ok(/improved least often/.test(html) && M.claims.quickRetriesImproveLeast);
const ongoing = hw.assignments.filter((a) => a.observation_status === 'ongoing').map((a) => a.homework);
assert.equal(Boolean(T.ongoingNote), ongoing.length > 0, 'the open-homework note appears exactly while a window is open');
ongoing.forEach((name) => assert.ok(T.ongoingNote.includes(name) && T.ongoingRows.includes(name)));

// ── QR code for the published site ──
const link = html.match(/data-qr="([^"]+)"/)[1];
assert.ok(html.includes(`href="${link}"`), 'the QR code and its link share one address');
const QR = ctx.PosterQR, q = QR.encode(link);
assert.equal(QR.formatBits(0), 0x5412, 'format word, level M mask 0');
assert.equal(QR.formatBits(1), 0x5125, 'format word, level M mask 1');
assert.equal(q.size, 17 + 4 * q.version);
const finder = (x0, y0) => { for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) { const d = Math.max(Math.abs(x - 3), Math.abs(y - 3)); assert.equal(q.modules[y0 + y][x0 + x], d !== 2, 'finder pattern'); } };
finder(0, 0); finder(q.size - 7, 0); finder(0, q.size - 7);
for (let i = 8; i < q.size - 8; i++) { assert.equal(q.modules[6][i], i % 2 === 0, 'timing row'); assert.equal(q.modules[i][6], i % 2 === 0, 'timing column'); }
assert.equal(q.modules[q.size - 8][8], true, 'dark module');
assert.throws(() => QR.encode('x'.repeat(200)), /longer/);

console.log(`PASS: poster (Core ${cited.join(' ')}), ${keys.length} bound values, ${Object.keys(M.claims).length} prose claims, QR v${q.version}`);
