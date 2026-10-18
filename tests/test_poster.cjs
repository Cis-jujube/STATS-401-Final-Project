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

// ── the five Core figures, each with its film cross-reference, read down the left column
//    (the process: 01, 11, 12) and then the right (the outcomes: 03, 06) ──
const cited = [...html.matchAll(/Film · Figure (\d\d)/g)].map((m) => m[1]);
assert.equal(cited.slice().sort().join(), ctx.CS201_FIGURES.routes.core.figures.slice().sort().join(), 'poster shows exactly the Core figures');
assert.equal(cited.join(), '01,11,12,03,06', 'process figures first, then outcomes');
assert.equal([...html.matchAll(/<p class="fig-k"><b>(\d)<\/b>/g)].map((m) => m[1]).join(), '1,2,3,4,5', 'numbered in reading order');
assert.equal([...html.matchAll(/data-chart="(\w+)"/g)].map((m) => m[1]).join(), 'reach,retries,phases,gaps,exam', 'one chart per Core figure');
const column = (cls) => html.slice(html.indexOf(`<div class="col ${cls}">`), html.indexOf('</div>\n\n', html.indexOf(`<div class="col ${cls}">`) + 1));
assert.equal([...column('col-l').matchAll(/Film · Figure (\d\d)/g)].map((m) => m[1]).join(), '01,11,12', 'the left column holds the process figures');
assert.equal([...html.slice(html.indexOf('<div class="col col-r">')).matchAll(/Film · Figure (\d\d)/g)].map((m) => m[1]).join(), '03,06', 'the right column holds the outcomes');
// every figure answers the same three reader questions, in order
const sections = [...html.matchAll(/<section class="fig f\d"[\s\S]*?<\/section>/g)].map((m) => m[0]);
assert.equal(sections.length, 5);
sections.forEach((sec, i) => assert.deepEqual([...sec.matchAll(/<span class="k">([^<]+)<\/span>/g)].map((m) => m[1]), ['How to read', 'What we see', 'Careful'], `figure ${i + 1} reading guide`));

// ── every bound value exists; none is left for the page to invent ──
const keys = [...new Set([...html.matchAll(/data-t="(\w+)"/g)].map((m) => m[1]))];
keys.forEach((k) => assert.ok(k in T, `poster.html binds "${k}", which the model does not provide`));
keys.filter((k) => !k.startsWith('ongoing')).forEach((k) => assert.ok(String(T[k]).length, `"${k}" is empty`));

// ── the opening states why, the questions and the data, and each question names its figures ──
['Why it matters', 'Questions', 'Data &amp; method'].forEach((label) => assert.ok(html.includes(`<p class="label">${label}</p>`), `opening panel "${label}"`));
assert.deepEqual([...html.matchAll(/<li><span>[^<]+<\/span><i>(Fig [^<]+)<\/i><\/li>/g)].map((m) => m[1]), ['Fig 1', 'Fig 2 · 3', 'Fig 4', 'Fig 5'], 'each question points at its figures');

// ── the title band's spiral clock places exactly the visible submissions and greys the withheld windows ──
assert.equal(M.spiral.cells.filter((c) => c.state === 'visible').reduce((s, c) => s + c.n, 0), M.visibleSubs);
assert.equal(M.spiral.cells.filter((c) => c.state === 'suppressed').length, M.withheldCells);
assert.ok(M.spiral.cells.every((c) => c.t0 >= 0 && c.t1 <= M.spiral.days && c.t1 > c.t0), 'every window sits inside the spiral');

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
assert.ok(/the only bar entirely below 0/.test(html) && M.claims.lateIntervalExcludesZero && M.claims.otherIntervalsIncludeZero);
assert.ok(/set a new best least often/.test(html) && M.claims.quickRetriesImproveLeast);
assert.ok(/Last-minute rushing went with lower midterm scores/.test(html) && M.exam[0].rho < 0 && M.claims.lateIntervalExcludesZero, 'the rushing headline needs a negative final-24h association whose interval excludes zero');
assert.ok(/Leaving out any one student keeps it between/.test(html) && M.claims.subsetsKeepTheSign);
assert.ok(/Every published window falls between noon and midnight/.test(html) && M.claims.visibleWindowsAfterNoon);
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
