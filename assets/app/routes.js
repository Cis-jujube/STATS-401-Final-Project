/* Content routes: which analytical figures the film presents, in what order, with what words.
   • Core      — five essential figures, 01 → 03 → 11 → 12 → 06.
   • Showcase  — all twelve figures, with the sample context and the platform coverage before
                 its results.
   A route is a list of chapters. Each chapter plays a slice [from, to) of one scene's own
   timeline (scenes are pure functions of their local time), carries its own captions
   ("beats", in scene-local seconds) and, for an analytical figure, a deliberate reading stop.
   Figure identity, evidence anchors and downloads come from the shared manifest
   (assets/app/figures.json → figures.js); nothing here touches the DOM, so the routing,
   deep-link and switching rules can be tested in Node (tests/test_routes.cjs). */
(function () {
  const F = window.Film || (window.Film = {});
  const D = F.data || window.CS201;
  const MAN = window.CS201_FIGURES;
  const HOLD_LEAD = 0.5; // Presenter holds this long before a beat ends (player.js uses the same value)

  // ── formatting without d3 (Node-testable) ───────────────────────────
  const int = (v) => Math.round(v).toLocaleString('en-US');
  const p1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const word = (n) => WORDS[n] || String(n);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const BJ = 8 * 3600e3;
  const bj = (iso) => new Date(Date.parse(iso) + BJ); // read with UTC getters = Beijing wall clock
  const dayMon = (d) => `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;

  // ── public aggregates behind the persistent captions ────────────────
  const hw = D.homework, ev = hw.event_progress, mid = D.midterm, pl = D.platform;
  const A = hw.assignments, HW4 = A.find((a) => a.homework === 'HW4'), latest = A[A.length - 1];
  const snap = bj(hw.snapshot_utc.replace(' ', 'T') + 'Z');
  const SNAP = `${snap.getUTCDate()} ${MON[snap.getUTCMonth()]} ${snap.getUTCFullYear()}`;
  const RETRIES = ev.by_homework.reduce((s, r) => s + r.eligible_retries, 0);
  const BESTS = ev.by_homework.reduce((s, r) => s + r.new_bests, 0);
  const examAt = Date.parse(mid.exam_started_at);
  const preExam = A.filter((a) => Date.parse(a.end_local) < examAt).map((a) => a.homework);
  const postExam = A.filter((a) => Date.parse(a.end_local) >= examAt).map((a) => a.homework);
  const range = (list) => (list.length > 1 ? `${list[0]}–${list[list.length - 1]}` : list[0]);
  const PROBLEMS = A.reduce((s, a) => s + a.problems, 0);
  const ongoing = A.filter((a) => a.observation_status === 'ongoing').map((a) => a.homework);
  const ongoingNote = ongoing.length ? ` · ${ongoing.join(', ')} ongoing` : '';
  const progress = hw.score_progression;
  const gapCount = progress.filter((r) => r.best - r.best3 > 10).length;
  const largestGap = progress.slice().sort((a, b) => (b.best - b.best3) - (a.best - a.best3))[0];
  const lowestFirst = progress.slice().sort((a, b) => a.first - b.first)[0];
  const firstMin = Math.min(...progress.map((r) => r.first)), firstMax = Math.max(...progress.map((r) => r.first));
  const visibleCells = hw.calendar.filter((c) => c.state === 'visible' && c.submissions > 0);
  const peak = visibleCells.slice().sort((a, b) => b.submissions - a.submissions)[0];
  const repeatPeak = visibleCells.slice().sort((a, b) => b.submissions / b.contributors - a.submissions / a.contributors)[0];
  const withheld = hw.window_submissions - visibleCells.reduce((s, c) => s + c.submissions, 0);
  const medians = A.map((a) => a.all_attempts.median), tails = A.map((a) => a.all_attempts.max);
  const maxTail = A.slice().sort((a, b) => b.all_attempts.max - a.all_attempts.max)[0];
  const eligibility = ev.eligibility_counts;
  const hw4Retry = ev.by_homework.find((r) => r.homework === 'HW4');
  const phaseHours = ev.by_phase.map((r) => r.phase_hours);
  const phaseRange = `${p1(Math.min(...phaseHours))}–${p1(Math.max(...phaseHours))}`;
  const sampleStart = bj(A.reduce((a, b) => Date.parse(a.start_local) < Date.parse(b.start_local) ? a : b).start_local);
  const sampleEnd = bj(hw.observation_cutoff_local || new Date(snap.getTime() - BJ).toISOString());
  const problemName = (r) => r.problem_name.replace(/^\d+s\d+HW\d-/, '').replace(/^HW\d-/, '').replace(/^Exercise[\d.]+[- ]/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
  const gapCopy = (r) => `${r.label}: <b>${p1(r.improvement_pct)}%</b> (${int(r.new_bests)} of ${int(r.eligible_retries)})`;
  const observedCopy = ongoing.length ? `${ongoing.join(', ')} is ongoing: its totals and best scores are observations so far.` : 'All configured windows have closed.';
  const track0 = bj(pl.tracking_started_at), cut = bj(pl.cutoff_utc);
  const N = {
    snap: SNAP, hwRange: range(A.map((a) => a.homework)), submissions: hw.window_submissions, submitters: hw.window_submitters,
    problems: PROBLEMS, hw4: HW4?.submissions, hw4Problems: HW4?.problems, hw4Name: HW4?.homework,
    latest: latest.homework, latestSubmissions: latest.submissions, latestProblems: latest.problems,
    homeworkCount: A.length, ongoing, withheld, firstTries: eligibility.first_scores, gapCount,
    peak, lowestFirst, instantRate: ev.by_gap[0].improvement_pct,
    retries: RETRIES, bests: BESTS, rate: (100 * BESTS) / RETRIES,
    preExam: range(preExam), postExam: postExam.join(', '), grades: mid.matched, eligible: mid.eligible_roster,
    recorded: pl.recorded_users, resource: pl.resource_users,
    track: track0.getUTCMonth() === cut.getUTCMonth() ? `${track0.getUTCDate()}–${dayMon(cut)}` : `${dayMon(track0)}–${dayMon(cut)}`,
  };
  const COHORT = {
    homework: `${N.hwRange} · ${N.snap} snapshot · ${N.submitters} submitters${ongoingNote}`,
    retry: `Eligible retry events · ${int(N.bests)} / ${int(N.retries)} set a new best${ongoingNote}`,
    exam: `Pre-exam ${N.preExam} · ${N.grades} matched grades · ${N.postExam} excluded`,
    platform: `Course Pulse ${N.track} · ${N.grades} matched grades · ${N.recorded} with recorded use`,
  };

  // ── figure registry (one mapping for controls, captions, links and conclusions) ──
  const FIG = {};
  Object.entries(MAN.figures).forEach(([id, f]) => {
    FIG[id] = { ...f, id, cohortText: COHORT[f.cohort] || '',
      downloads: ['png', 'svg', 'pdf'].map((ext) => ({ ext, href: `assets/figures/${f.stem}.${ext}` })) };
  });
  const evidenceHref = (id, route) => `analysis.html?content=${route}#${FIG[id].anchor}`;
  const figureHref = (id, route) => `index.html?content=${route}#figure-${id}`;

  // ── captions ─────────────────────────────────────────────────────────
  // Beats are in scene-local seconds. Shared copy is written once; Core and Showcase differ
  // only where the route differs (opening line, Showcase-only beats, conclusion).
  const B = {
    opening: (route) => [
      { at: 0, kicker: '', title: '', noStop: true },
      { at: 3.6, kicker: 'CS201 · STATS 401 final project', title: 'The score <em>has a past.</em>',
        body: `We followed <span class="num">${int(N.submissions)}</span> in-window CS201 submissions to see what a problem’s best observed score hides. ${observedCopy}`,
        credit: `Zaozao Wang &amp; Zhengxiang Liu<br>Homework snapshot · ${N.snap} · Beijing time` },
      { at: 13, kicker: 'New in this snapshot', title: `Now through <em>${N.latest}.</em>`,
        body: `${N.latest} adds <span class="num">${int(N.latestSubmissions)}</span> submissions across <b>${word(N.latestProblems)} problem slots</b>, observed so far. HW4 now uses its revised <b>${dayMon(bj(HW4.end_local))} deadline</b>: ${int(N.hw4)} submissions. ${observedCopy}`,
        credit: route === 'core' ? 'Core route · five essential figures: 01 · 03 · 11 · 12 · 06' : 'Showcase route · all twelve figures, 01–12' },
    ],
    sample: [
      { at: 0, title: `${word(N.homeworkCount)[0].toUpperCase() + word(N.homeworkCount).slice(1)} homeworks. <em>${int(N.submissions)}</em> submissions.`,
        body: `Dots represent the homework-window totals. <b>${N.submitters} students</b> submitted to <b>${N.problems} problem slots</b> from ${dayMon(sampleStart)} through ${dayMon(sampleEnd)} ${sampleEnd.getUTCFullYear()}. ${observedCopy}` },
      { at: 8, title: 'Submissions per homework vary.',
        body: `Medians range from <span class="num">${p1(Math.min(...medians))} to ${p1(Math.max(...medians))}</span> submissions per student. The longest tail is <b>${maxTail.all_attempts.max}</b> in ${maxTail.homework}. Counts are submissions, not effort. ${observedCopy}` },
    ],
    f01: [
      { at: 0, title: 'When does the work <em>happen?</em>',
        body: 'Every submission, dropped into the four-hour window when it arrived. Each column is one day; time of day runs downward.' },
      { at: 8, title: 'A visible burst of <em>repeated submissions.</em>',
        body: `The busiest visible window: <b>${dayMon(new Date(peak.date + 'T00:00:00Z'))}, ${peak.hour}:00–${peak.hour + 4}:00</b>, <span class="num">${int(peak.submissions)}</span> submissions from <b>${peak.contributors} students</b>. This is the largest published cell; suppressed cells may conceal another peak.` },
      { at: 16, title: `<em>${int(withheld)}</em> submissions sit in withheld cells.`,
        body: 'Cells with fewer than five students are withheld for privacy. Their dots drift aside: counted, never placed. Overlapping HW4 / HW5 windows are pooled, with neutral marks; the Lens cannot divide their counts.' },
      { at: 23, title: 'Wind the calendar into a <em>clock.</em>',
        body: `Each ring is one observed day, spiralling out from ${dayMon(sampleStart)}. The angle is the time of day. The chart stops at the snapshot; ongoing homework deadlines can lie beyond it.` },
      { at: 31, title: 'Read it as heat.',
        body: 'Colour shows submissions per window. Hatched cells are withheld; dotted outlines are not yet observed. Neither means zero. Pause to hover a window or change the measure. HW5’s last observed day is partial.' },
      { at: 40, title: 'Many students, or a few <em>many times?</em>',
        body: `Each bubble is a visible four-hour cell: across, students; up, submissions per active student; area, submissions. The highest repeat intensity is <b>${p1(repeatPeak.submissions / repeatPeak.contributors)}</b> per student. Neutral marks pool overlapping homework windows. Withheld cells cannot be placed; clock time is not study time.` },
    ],
    f02: [
      { at: 0, title: `<em>${int(N.firstTries)}</em> first tries. Then it thins out.`,
        body: `Submissions stacked by their attempt number on the problem: <span class="num">${int(N.firstTries)}</span> first scored tries, then later attempts. Later tries reached by fewer than five students are withheld. ${observedCopy}` },
      { at: 9, title: 'Similar medians, <em>very different</em> tails.',
        body: `Submissions per student in each homework window, log scale. Medians range from <span class="num">${p1(Math.min(...medians))}</span> to <span class="num">${p1(Math.max(...medians))}</span>; maxima range from ${Math.min(...tails)} to ${Math.max(...tails)}. Counts are submissions, not effort. ${observedCopy}` },
      { at: 18, title: 'Some keep going after full marks.',
        body: `<span class="num">${int(eligibility.after_full_credit)}</span> submissions came after a problem was already at 100. Stop counting at each first full score to compare the shorter distributions. ${observedCopy}` },
    ],
    f03: [
      { at: 0, title: 'What does the <em>best observed</em> score hide?',
        body: `Mean best score observed for each of the <b>${N.problems} problem slots</b>, averaged over its attempters. ${observedCopy}` },
      { at: 7, title: 'First tries start far below.',
        body: `The same attempters’ mean <b>first</b> submission ranges from <span class="num">${p1(firstMin)}</span> to <span class="num">${p1(firstMax)}</span>. The thin line marks each problem’s best observed mean.` },
      { at: 14, title: 'A second and third try close most of the gap…',
        body: 'Best through two, then through three: the highest score each student had reached so far, averaged. A cumulative best can only rise; it is not the score of the actual second or third try.' },
      { at: 22, title: `…but <em>${gapCount} of ${N.problems}</em> still trail by more than 10 points.`,
        body: 'After three tries these problem slots remain more than 10 points short of their mean best observed. The orange stretch is the distance still to climb.' },
      { at: 30, title: 'The gap that the <em>100</em> conceals.',
        body: `All ${N.problems} slots, sorted by gap after three tries: ○ first, ● best through three, ▮ best observed, for the same attempters. ${problemName(largestGap)} trails by <b>${p1(largestGap.best - largestGap.best3)} points</b>. Cumulative best is not the actual third score or a causal gain. ${observedCopy}` },
    ],
    f03more: [
      { at: 40, title: `${problemName(lowestFirst)}: <em>${p1(lowestFirst.first)} → ${p1(lowestFirst.best)}.</em>`,
        body: `${lowestFirst.homework}’s ${problemName(lowestFirst)} has the lowest mean first try among ${N.problems} slots. Its ${lowestFirst.n} attempters’ best observed mean is ${p1(lowestFirst.best)}. Best observed need not be the final outcome for ongoing homework.` },
      { at: 47, title: 'Sort, filter, follow one.',
        body: 'Now sorted by total gain. Pause to change the stage or sort, use the Lens for one homework, or <b>click a problem</b> to follow it into Figure 11’s problem view.' },
    ],
    f04: [
      { at: 26.8, title: 'The mean k-th try <em>falls.</em>',
        body: 'Mean score of each student’s 1st, 2nd, 3rd … actual submission to a problem, with no carry-forward. In HW1 it falls from <span class="num">76.9</span> at the first try to <span class="num">24.4</span> by the sixth.' },
      { at: 35, title: 'Because the cohort <em>changes.</em>',
        body: 'Each point averages whichever student–problem pairs reached that try: <b>38</b> students made a first HW1 try, <b>5</b> a thirteenth. Later averages describe a smaller, changing set of pairs, including some events after full credit, not the same students getting worse.' },
    ],
    f11: [
      { at: 0, title: `Of ${int(N.submissions)} submissions, <em>${int(N.retries)}</em> were eligible retries.`,
        body: `First scored tries set baselines (<span class="num">${int(eligibility.first_scores)}</span>). <span class="num">${int(eligibility.after_full_credit)}</span> came after full marks; <span class="num">${int(eligibility.internal_errors)}</span> hit a judge error. The rest are eligible retries made below 100. ${observedCopy}` },
      { at: 7, title: `<em>${int(N.bests)}</em> of them set a new best.`,
        body: `A new best strictly beats every earlier score on that problem. Each lit square is one such retry event: <span class="num">${p1(N.rate)}%</span> of eligible retries. Events, not students: one student can contribute many.` },
      { at: 15.5, title: 'Read retry rates with <em>elapsed gaps.</em>',
        body: `${gapCopy(ev.by_gap[0])}. ${gapCopy(ev.by_gap[1])}. Gaps are clock time, not study time. These groups describe observed events; they do not estimate an effect of waiting.` },
      { at: 24, title: 'Rates differ by homework and by gap.',
        body: `New bests ÷ eligible retries, with S distinct students. HW4: <b>${hw4Retry.new_bests}/${hw4Retry.eligible_retries}</b> (${p1(hw4Retry.improvement_pct)}%). ${observedCopy} Read every denominator; observed differences do not estimate effects of waiting.` },
    ],
    f11more: [
      { at: 34, title: 'Some problems become <em>loops.</em>',
        body: 'Each visible circle is a problem: further right, more eligible retries; higher, more of them set a new best. Area shows distinct contributors. A high rate with few retries carries a different amount of evidence from a dense group.' },
      { at: 43, title: 'Pick a problem to follow.',
        body: 'Hover any circle for its counts; click to select it. A problem picked in Figure 03 stays ringed. Retries are repeated events from the same students, not independent trials.' },
    ],
    f12: (from) => [
      { at: from, title: 'Where in the window does progress <em>happen?</em>',
        body: `Each configured window has five equal-duration phases. Bars count eligible retries; the lit part set a new best. HW4 uses its revised ${dayMon(bj(HW4.end_local))} deadline. ${observedCopy} Partial phases stop at the snapshot; future phases are not observed.` },
      { at: 61, title: 'Rates by window phase, on <em>one scale.</em>',
        body: `Each cell: new bests ÷ eligible retries, with S students, on 0–100%. Phases last ${phaseRange} hours across homeworks. Hatched = withheld; dashed = not yet observed; * = partially observed at snapshot. None means zero. ${observedCopy} No deadline effect is estimated.` },
    ],
    bridge: [
      { at: 0, kicker: 'Sample switch', title: 'A different sample for the <em>exam</em> question.',
        body: `Homework views describe events through ${N.latest} at this snapshot. For the exam question, we switch to <b>${N.grades} supplied grades</b> and pre-exam <b>${N.preExam}</b>; ${N.postExam} are excluded. The retry figures are not linked to grades.` },
    ],
    f05: [
      { at: 9, title: `${N.grades} supplied grades, <em>one exam.</em>`,
        body: `Midterm grades were supplied for <b>${N.grades} of ${N.eligible}</b> eligible students; the other ${N.eligible - N.grades} were not in the excerpt, not zero. Mean <span class="num">${mid.mean}</span>, median <span class="num">${mid.median}</span>; six scored 100 or above.` },
    ],
    f06: (from) => [
      { at: from, title: 'One timing measure <em>stands apart.</em>',
        body: 'Spearman correlation with the midterm, with paired-student 95% bootstrap intervals. Share of a student’s submissions sent in the final 24 hours: <b>ρ = −0.48</b>. A lower final-day share was associated with higher midterm scores; it is the only interval entirely below zero.' },
      { at: 25, title: 'The other two intervals include <em>zero.</em>',
        body: 'Submission count (ρ +0.35) and mean first-try score (ρ −0.25) lean one way, but each 95% interval still includes no association.' },
      { at: 32, title: 'Check it <em>three ways.</em>',
        body: 'B: leaving out one student at a time keeps the late-share estimate between <b>−0.60 and −0.42</b>. C: keeping full problem coverage (n = 23) or omitting two discrepant records (n = 24) gives −0.43 and −0.47. Sensitivity checks, not confidence intervals; none fixes non-random grade availability or establishes a cause.' },
    ],
    f07: [
      { at: 40, title: 'Submission-count groups <em>overlap.</em>',
        body: 'Midterm scores by pre-exam HW1–HW3 submission count: under 35 (n = 9), 35–59 (n = 11), 60 or more (n = 6). Boxes are the middle half of scores, lines the median, dots the mean. A count is not a target.' },
    ],
    f08: [
      { at: 49, title: 'Course Pulse saw only <em>part</em> of the cohort.',
        body: `Of ${N.eligible} eligible students, ${N.grades} have supplied grades and all ${N.grades} match a Course Pulse account, but only <b>${N.recorded}</b> have recorded pre-exam use and <b>${N.resource}</b> opened resources. Tracking began ${dayMon(track0)}; the cutoff is 08:00 Beijing on exam day. No record means no observed use, not no learning.` },
    ],
    f09: [
      { at: 59, title: 'A difference to investigate, <em>not an effect.</em>',
        body: 'Recorded users (n = 11): median 94.5, mean 95.27. No recorded use (n = 15): median 87.5, mean 86.17. Who chooses a platform is not random, and off-platform study is unseen.' },
    ],
    f10: [
      { at: 68, title: 'Timing stands out. Usage remains <em>uncertain.</em>',
        body: 'Same 26 students, two sources. OJ final-day share stays negative (ρ −0.48). Platform active time, recorded days and resource opens lean positive (+0.23 to +0.32), but all three intervals cross zero, and the sources cover different periods.' },
    ],
    conclusion: (route) => [
      { at: 0, kicker: '', title: '', noStop: true },
      { at: 3.6, kicker: 'What we found', title: 'What the <em>100</em> was hiding.',
        body: route === 'core'
          ? `Five figures: ${int(N.submissions)} submissions through ${N.latest}, observed at ${N.snap}, and ${N.grades} historical exam grades. ${observedCopy}`
          : `Twelve figures: ${int(N.submissions)} submissions through ${N.latest}, ${N.grades} historical exam grades and a partial Course Pulse window. ${observedCopy}` },
      { at: 15.6, kicker: 'The score has a past', title: 'Now you have <em>seen it.</em>',
        body: 'Replay any figure, or open its evidence: methods, tables, downloads and the aggregate data behind every frame.',
        credit: `Zaozao Wang · data acquisition, cleaning, analysis<br>Zhengxiang Liu · visualization design, D3 implementation<br>STATS 401 · CS201 OJ snapshot ${N.snap} · aggregates only` },
    ],
  };

  // conclusion takeaways: each card names the figures it summarises (route-specific)
  const CARDS = {
    core: [
      { figs: ['01', '03'], h: 'One score, many roads.',
        b: `The largest visible cell contains ${int(peak.submissions)} submissions from ${peak.contributors} students. After three tries, ${gapCount} of ${N.problems} problem slots trail their best observed mean by more than 10 points. ${observedCopy}` },
      { figs: ['11', '12'], h: 'Retries progress unevenly.',
        b: `${int(N.bests)} of ${int(N.retries)} eligible retries set a new best (${p1(N.rate)}%). Rates differ by homework, elapsed gap and window phase; these are events, not students.` },
      { figs: ['06'], h: 'Timing travels with the exam.',
        b: `In ${N.grades} supplied grades, a lower final-day submission share was associated with higher midterm scores (ρ −0.48). An association, not a cause.` },
    ],
    showcase: [
      { figs: ['01', '02', '03', '04'], h: 'Bursts, tails and gaps.',
        b: `The largest visible cell: ${int(peak.submissions)} submissions from ${peak.contributors} students. ${gapCount} of ${N.problems} slots still trail after three tries; actual later-try means use changing cohorts. ${observedCopy}` },
      { figs: ['11', '12'], h: 'Retries progress unevenly.',
        b: `${int(N.bests)} of ${int(N.retries)} eligible retries set a new best (${p1(N.rate)}%), differing by homework, gap and window phase. Events, not students.` },
      { figs: ['05', '06', '07'], h: 'A partial exam cohort.',
        b: `${N.grades} of ${N.eligible} grades supplied. A lower final-day share went with higher scores (ρ −0.48), stable under leave-one-out and subset checks. Submission-count groups overlap.` },
      { figs: ['08', '09', '10'], h: 'A second, shorter window.',
        b: `Course Pulse recorded ${N.recorded} of ${N.grades} students from ${dayMon(track0)}. Recorded users scored higher on average, but every usage interval crosses zero. Not a platform effect.` },
    ],
  };

  // ── route scripts ────────────────────────────────────────────────────
  // key: stable chapter id (figure chapters use 'figure-NN'); read: scene-local time of the reading beat
  const fig = (id, scene, from, to, beats, extra = {}) => ({ key: 'figure-' + id, fig: id, scene, from, to, beats, ...extra });
  const SCRIPTS = {
    core: [
      { key: 'opening', scene: 'open', from: 0, to: 21, beats: B.opening('core'), title: 'Opening', lens: true },
      fig('01', 'time', 0, 52, B.f01, { read: 40 }),
      fig('03', 'problems', 0, 40, B.f03, { read: 30 }),
      // Core slices stop before a view crossfade into Showcase-only material begins
      fig('11', 'retries', 0, 34, B.f11, { read: 24 }),
      fig('12', 'retries', 52.2, 71, B.f12(52.2), { read: 61 }),
      { key: 'bridge', scene: 'exam', from: 0, to: 9, beats: B.bridge, title: 'Sample switch' },
      fig('06', 'exam', 18.2, 40, B.f06(18.2), { read: 32 }),
      { key: 'conclusion', scene: 'finale', from: 0, to: 25.6, beats: B.conclusion('core'), title: 'Conclusion' },
    ],
    showcase: [
      { key: 'opening', scene: 'open', from: 0, to: 21, beats: B.opening('showcase'), title: 'Opening', lens: true },
      { key: 'sample', scene: 'homeworks', from: 0, to: 16, beats: B.sample, title: 'Sample', lens: true },
      fig('01', 'time', 0, 52, B.f01, { read: 40 }),
      fig('02', 'attempts', 0, 25.4, B.f02, { read: 9 }),
      fig('03', 'problems', 0, 54, [...B.f03, ...B.f03more], { read: 30 }),
      fig('04', 'attempts', 26.8, 43, B.f04, { read: 35 }),
      fig('11', 'retries', 0, 51, [...B.f11, ...B.f11more], { read: 24 }),
      fig('12', 'retries', 51, 71, B.f12(51), { read: 61 }),
      { key: 'bridge', scene: 'exam', from: 0, to: 9, beats: B.bridge, title: 'Sample switch' },
      fig('05', 'exam', 9, 17, B.f05, { read: 9 }),
      fig('06', 'exam', 17, 40, B.f06(17), { read: 32 }),
      fig('07', 'exam', 40, 49, B.f07, { read: 40 }),
      fig('08', 'exam', 49, 59, B.f08, { read: 49 }),
      fig('09', 'exam', 59, 68, B.f09, { read: 59 }),
      fig('10', 'exam', 68, 79, B.f10, { read: 68 }),
      { key: 'conclusion', scene: 'finale', from: 0, to: 25.6, beats: B.conclusion('showcase'), title: 'Conclusion' },
    ],
  };

  /** Lay a route's chapters end to end: absolute times for chapters, beats and reading stops. */
  function build(id) {
    const man = MAN.routes[id];
    let acc = 0;
    const segs = SCRIPTS[id].map((s, i) => {
      const f = s.fig ? FIG[s.fig] : null;
      const seg = {
        ...s, route: id, index: i, dur: s.to - s.from, start: acc, end: acc + (s.to - s.from),
        title: f ? `Fig ${s.fig} · ${f.short}` : s.title, figure: f,
        kicker: f ? `Figure ${s.fig} · ${f.short}` : (s.title || ''),
        it: f ? { num: s.fig, word: f.short } : null,
        lens: f ? !!f.lens : !!s.lens,
      };
      acc = seg.end;
      return seg;
    });
    const beats = [];
    segs.forEach((seg) => {
      seg.beats.forEach((b, j) => {
        const next = seg.beats[j + 1];
        beats.push({ seg, j, beat: b, local: b.at, at: seg.start + (b.at - seg.from), end: next ? seg.start + (next.at - seg.from) : seg.end });
      });
    });
    const stops = {};
    segs.forEach((seg) => {
      if (!seg.fig) return;
      const read = seg.read ?? seg.beats[seg.beats.length - 1].at;
      const rb = beats.find((b) => b.seg === seg && b.local === read);
      seg.stop = rb.end - HOLD_LEAD;
      seg.readAt = rb.at;
      stops[seg.fig] = seg.stop;
    });
    return { id, label: man.label, detail: man.detail, figures: man.figures.slice(), segs, beats, stops, total: acc, cards: CARDS[id] };
  }
  const ROUTES = { core: build('core'), showcase: build('showcase') };
  const ORDER = ROUTES.showcase.figures;

  const segAt = (route, T) => { const s = route.segs; for (let i = s.length - 1; i >= 0; i--) if (T >= s[i].start) return s[i]; return s[0]; };
  const segByKey = (route, key) => route.segs.find((s) => s.key === key);
  /** Route time for a scene-local time, if one of the route's chapters plays it. */
  function timeFor(route, scene, local, prefer) {
    const hit = (s) => s.scene === scene && local >= s.from && local < s.to;
    const s = (prefer && hit(prefer) && prefer) || route.segs.find(hit);
    return s ? { seg: s, T: s.start + (local - s.from) } : null;
  }
  const LANDING = 2.2; // a chapter link lands once the first caption is readable

  /** Old single-timeline links (before content routes): scene order, durations and local-time moves. */
  const LEGACY = {
    order: [['open', 13], ['homeworks', 16], ['time', 40], ['problems', 44], ['attempts', 43], ['retries', 51], ['exam', 40], ['finale', 25.6]],
    remap: {
      problems: (t) => (t >= 30 ? t + 10 : t),
      retries: (t) => (t >= 24 && t < 34 ? t + 27 : t),
      exam: (t) => (t < 31 ? t + 9 : t + 28),
    },
    // #scene links: the chapter that keeps the old link's meaning
    hash: {
      open: { route: 'core', key: 'opening' }, homeworks: { route: 'showcase', key: 'sample' },
      time: { route: 'core', key: 'figure-01' }, problems: { route: 'core', key: 'figure-03' },
      attempts: { route: 'showcase', key: 'figure-02' }, retries: { route: 'core', key: 'figure-11' },
      exam: { route: 'showcase', key: 'figure-05' }, finale: { route: 'core', key: 'conclusion' },
    },
  };
  function legacyTime(T) {
    let acc = 0;
    for (const [scene, dur] of LEGACY.order) {
      if (T < acc + dur || scene === 'finale') {
        const local = Math.max(0, Math.min(dur - 0.01, T - acc));
        return { scene, local: (LEGACY.remap[scene] || ((v) => v))(local) };
      }
      acc += dur;
    }
    return { scene: 'open', local: 0 };
  }

  /** Resolve an entry URL into route, playback mode and landing position.
      Explicit figure links open Presenter, paused on the figure's complete reading view. */
  function resolveEntry(search, hash) {
    const q = new URLSearchParams(search || '');
    const h = (hash || '').replace(/^#/, '');
    let content = q.get('content');
    const notices = [];
    if (content && !ROUTES[content]) { notices.push(`Unknown content “${content}”; showing Core.`); content = null; }
    const out = { route: content || 'core', mode: 'presenter', target: null, auto: q.has('auto'), autoplay: q.has('autoplay'), notice: '' };
    const m = /^figure-(\d\d)$/.exec(h);
    if (m && FIG[m[1]]) {
      const id = m[1];
      if (!ROUTES[out.route].figures.includes(id)) {
        if (content) notices.push(`Figure ${id} is part of Showcase, not Core. Showing it in Showcase.`);
        out.route = 'showcase';
      }
      out.target = { kind: 'stop', fig: id };
    } else if (m) {
      notices.push(`There is no Figure ${m[1]}; starting at the beginning.`);
    } else if (h === 'loop' || q.has('loop')) {
      out.mode = 'loop';
      if (!content) out.route = 'showcase'; // the original reel showed Showcase material
    } else if (LEGACY.hash[h]) {
      const L = LEGACY.hash[h];
      const r = content && segByKey(ROUTES[content], L.key) ? content : L.route;
      out.route = r; out.target = { kind: 'start', key: L.key };
    } else if (h && segByKey(ROUTES[out.route], h)) {
      out.target = { kind: 'start', key: h };
    } else if (h && segByKey(ROUTES.showcase, h)) {
      out.route = 'showcase'; out.target = { kind: 'start', key: h };
    }
    if (!out.target && out.mode === 'presenter' && q.has('t')) {
      const v = Math.max(0, parseFloat(q.get('t')) || 0);
      if (content) out.target = { kind: 'time', T: Math.min(v, ROUTES[content].total - 0.01) };
      else {
        const { scene, local } = legacyTime(v);
        const hit = timeFor(ROUTES.core, scene, local) ? 'core' : 'showcase';
        const tf = timeFor(ROUTES[hit], scene, local);
        out.route = hit;
        out.target = tf ? { kind: 'time', T: tf.T } : { kind: 'time', T: 0 };
      }
    }
    out.notice = notices.join(' ');
    return out;
  }

  /** Route time for a resolved target. */
  function targetTime(routeId, target) {
    const R = ROUTES[routeId];
    if (!target) return 0;
    if (target.kind === 'time') return Math.max(0, Math.min(R.total - 0.01, target.T));
    if (target.kind === 'stop') return R.stops[target.fig];
    const s = segByKey(R, target.key);
    if (!s) return 0;
    return target.kind === 'start' ? s.start + Math.min(LANDING, s.dur * 0.4) : s.start;
  }

  /** Where to land when the viewer switches content routes from route time T.
      Keeps the current figure (same frame when the destination plays it); a Showcase-only
      figure maps to the closest preceding Core figure in Showcase order (or Figure 01). */
  function switchTarget(fromId, T, toId) {
    const from = ROUTES[fromId], to = ROUTES[toId], s = segAt(from, T), local = s.from + (T - s.start);
    if (fromId === toId) return { T, seg: s, notice: '' };
    if (T < 0.5) return { T: 0, seg: to.segs[0], notice: '' }; // still on the title frame
    if (s.fig) {
      if (to.figures.includes(s.fig)) {
        const dest = to.segs.find((x) => x.fig === s.fig);
        const tf = timeFor(to, s.scene, local, dest);
        return tf && tf.seg.fig === s.fig ? { T: tf.T, seg: tf.seg, notice: '' } : { T: to.stops[s.fig], seg: dest, notice: '' };
      }
      const i = ORDER.indexOf(s.fig);
      const prev = ORDER.slice(0, i).reverse().find((f) => to.figures.includes(f)) || to.figures[0];
      return { T: to.stops[prev], seg: to.segs.find((x) => x.fig === prev),
        notice: `${to.label} has no Figure ${s.fig}. Showing Figure ${prev}, the closest preceding ${to.label} figure.` };
    }
    const same = segByKey(to, s.key);
    if (same) {
      const tf = timeFor(to, s.scene, local, same);
      return { T: tf ? tf.T : same.start, seg: same, notice: '' };
    }
    // a Showcase-only context chapter: the next Core figure in Showcase order, from its start
    const after = from.segs.slice(s.index + 1).find((x) => x.fig && to.figures.includes(x.fig));
    const dest = to.segs.find((x) => x.fig === (after ? after.fig : to.figures[0]));
    return { T: dest.start, seg: dest, notice: `${to.label} has no ${s.title.toLowerCase()} chapter. Showing Figure ${dest.fig}.` };
  }

  /** Canonical film URL (relative) for a route, mode and chapter. */
  function canonical(routeId, mode, seg, started) {
    const hash = mode === 'loop' ? '#loop' : started && seg ? '#' + seg.key : '';
    return `?content=${routeId}${hash}`;
  }

  F.routes = { ROUTES, FIG, N, COHORT, HOLD_LEAD, LEGACY, ORDER, build, segAt, segByKey, timeFor, resolveEntry, targetTime, switchTarget, canonical, legacyTime, evidenceHref, figureHref };
})();
