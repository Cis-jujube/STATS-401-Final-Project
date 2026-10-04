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
  const A = hw.assignments, HW4 = A[A.length - 1];
  const snap = bj(hw.snapshot_utc.replace(' ', 'T') + 'Z');
  const SNAP = `${snap.getUTCDate()} ${MON[snap.getUTCMonth()]} ${snap.getUTCFullYear()}`;
  const RETRIES = ev.by_homework.reduce((s, r) => s + r.eligible_retries, 0);
  const BESTS = ev.by_homework.reduce((s, r) => s + r.new_bests, 0);
  const examAt = Date.parse(mid.exam_started_at);
  const preExam = A.filter((a) => Date.parse(a.end_local) < examAt).map((a) => a.homework);
  const postExam = A.filter((a) => Date.parse(a.end_local) >= examAt).map((a) => a.homework);
  const range = (list) => (list.length > 1 ? `${list[0]}–${list[list.length - 1]}` : list[0]);
  const PROBLEMS = A.reduce((s, a) => s + a.problems, 0);
  const track0 = bj(pl.tracking_started_at), cut = bj(pl.cutoff_utc);
  const N = {
    snap: SNAP, hwRange: range(A.map((a) => a.homework)), submissions: hw.window_submissions, submitters: hw.window_submitters,
    problems: PROBLEMS, hw4: HW4.submissions, hw4Problems: HW4.problems, hw4Name: HW4.homework,
    retries: RETRIES, bests: BESTS, rate: (100 * BESTS) / RETRIES,
    preExam: range(preExam), postExam: postExam.join(', '), grades: mid.matched, eligible: mid.eligible_roster,
    recorded: pl.recorded_users, resource: pl.resource_users,
    track: track0.getUTCMonth() === cut.getUTCMonth() ? `${track0.getUTCDate()}–${dayMon(cut)}` : `${dayMon(track0)}–${dayMon(cut)}`,
  };
  const COHORT = {
    homework: `${N.hwRange} · ${N.snap} snapshot · ${N.submitters} submitters`,
    retry: `Eligible retry events · ${int(N.bests)} / ${int(N.retries)} set a new best`,
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
        body: `Almost every CS201 homework problem ends with a mean best score near <b>100</b>. We followed <span class="num">${int(N.submissions)}</span> submissions to see what that number hides.`,
        credit: `Zaozao Wang &amp; Zhengxiang Liu<br>Homework snapshot · ${N.snap} · Beijing time` },
      { at: 13, kicker: 'New in this snapshot', title: `Now through <em>${N.hw4Name}.</em>`,
        body: `Expanded to ${N.hw4Name}: <span class="num">${int(N.hw4)}</span> submissions and <b>${word(N.hw4Problems)} additional problem slots</b>. The updated snapshot also supports two new views of retry progress (Figures 11 and 12).`,
        credit: route === 'core' ? 'Core route · five essential figures: 01 · 03 · 11 · 12 · 06' : 'Showcase route · all twelve figures, 01–12' },
    ],
    sample: [
      { at: 0, title: `Four homeworks. <em>${int(N.submissions)}</em> submissions.`,
        body: `The same dots, sorted into their homework windows. <b>${N.submitters} students</b> submitted to <b>${N.problems} problem slots</b> between 26 Aug and 29 Sep 2026. ${N.hw4Name}, new in this snapshot, adds <span class="num">${int(N.hw4)}</span>.` },
      { at: 8, title: 'Twelve to fifteen submissions per homework.',
        body: 'The median student sent <span class="num">12.5–15</span> submissions per homework. The most persistent sent <b>141</b> to HW4’s eight problems. Counts are submissions, not effort.' },
    ],
    f01: [
      { at: 0, title: 'When does the work <em>happen?</em>',
        body: 'Every submission, dropped into the four-hour window when it arrived. Each column is one day; time of day runs downward.' },
      { at: 8, title: 'A Saturday afternoon, and deadline nights.',
        body: 'The busiest visible window: <b>Sat 29 Aug, 12:00–16:00</b>, <span class="num">153</span> submissions from just <b>12 students</b>. Every deadline night (20:00–24:00) drew another <span class="num">46–82</span>.' },
      { at: 16, title: '<em>979</em> submissions sit in withheld cells.',
        body: 'Cells with fewer than five students are withheld for privacy. Their dots drift aside: counted, never placed. So the overall four-hour peak is unknown.' },
      { at: 23, title: 'Wind the calendar into a <em>clock.</em>',
        body: 'Each ring is one day, spiralling out from 26 Aug. The angle is the time of day, so every 23:59 deadline lands at the top.' },
      { at: 31, title: 'Read it as heat.',
        body: 'Colour shows submissions per window. Hatched cells are withheld, not zero. Pause to hover any window, or switch the measure to students or submissions per student.' },
      { at: 40, title: 'Many students, or a few <em>many times?</em>',
        body: 'Each bubble is one visible four-hour cell: across, how many students submitted; up, submissions per active student; area, submissions. The Saturday peak is <b>12 students × 12.75</b>. An HW3 cell reached <b>14.3</b> each from only six. Withheld cells cannot be placed, and none of this is study time.' },
    ],
    f02: [
      { at: 0, title: '<em>1,131</em> first tries. Then it thins out.',
        body: 'Every submission again, stacked by which try it was on its problem: <span class="num">1,131</span> first tries, then fewer second and third tries and a long tail. Later tries reached by fewer than five students sit in withheld cells.' },
      { at: 9, title: 'Similar medians, <em>very different</em> tails.',
        body: 'Submissions per student in each homework window, log scale. Medians sit between <span class="num">12.5</span> and <span class="num">15</span>, about two tries per problem. The longest tails reach <span class="num">62–141</span>. Counts are submissions, not effort.' },
      { at: 18, title: 'Some keep going after full marks.',
        body: '<span class="num">441</span> submissions came after a problem was already at 100. Stop counting at each first full score and HW3’s longest tail shrinks from <b>108 to 47</b>.' },
    ],
    f03: [
      { at: 0, title: 'Every problem ends near <em>100.</em>',
        body: `Mean best score for each of the <b>${N.problems} problem slots</b>, averaged over the students who attempted it. This is what the gradebook sees.` },
      { at: 7, title: 'First tries start far below.',
        body: 'The same students’ mean <b>first</b> submission ranged from <span class="num">37.9</span> to <span class="num">90.0</span>. The thin line marks where each problem ends.' },
      { at: 14, title: 'A second and third try close most of the gap…',
        body: 'Best through two, then through three: the highest score each student had reached so far, averaged. A cumulative best can only rise; it is not the score of the actual second or third try.' },
      { at: 22, title: '…but <em>10 of 31</em> still trail by more than 10 points.',
        body: 'After three tries these problem slots remain more than 10 points short of their mean best observed. The orange stretch is the distance still to climb.' },
      { at: 30, title: 'The gap that the <em>100</em> conceals.',
        body: 'All 31 problem slots, sorted by the gap left after three tries: ○ first try, ● best through three, ▮ best observed, for the same attempters in each row. EvenOrOdd still trails by <b>33.8 points</b>. A cumulative best is not the actual third score, nor a causal learning gain.' },
    ],
    f03more: [
      { at: 40, title: 'TicTacToe: <em>37.9 → 100.</em>',
        body: 'HW3’s TicTacToe had the lowest mean first try of all 31 problem slots, yet every one of its 39 attempters eventually reached full marks.' },
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
        body: 'First tries set each baseline (<span class="num">1,131</span>). <span class="num">441</span> came after full marks and <span class="num">13</span> hit an internal judge error. The rest were retries made while the best was still below 100.' },
      { at: 7, title: `<em>${int(N.bests)}</em> of them set a new best.`,
        body: `A new best strictly beats every earlier score on that problem. Each lit square is one such retry event: <span class="num">${p1(N.rate)}%</span> of eligible retries. Events, not students: one student can contribute many.` },
      { at: 15.5, title: 'Instant resubmits set new bests less often.',
        body: 'Retries sent within a minute of the previous try: <b>31.6%</b> (179 of 567). After 1–10 minutes: <b>44.2%</b> (251 of 568). Gaps are clock time, not study time, and longer gaps are rare.' },
      { at: 24, title: 'Rates differ by homework and by gap.',
        body: 'New bests ÷ eligible retries, with S distinct students. HW4 adds <b>129 of 306</b> (42.2%). The long-gap groups have small denominators (8 retries at 24 h or more), so read the counts with the rates. Observed differences, not effects of waiting.' },
    ],
    f11more: [
      { at: 34, title: 'Some problems become <em>loops.</em>',
        body: 'Each circle is a problem: further right, more eligible retries; higher, more of them set a new best. EvenOrOdd drew <b>130</b> retries at 23%. Triangle Sides had 16, and 81% set a new best.' },
      { at: 43, title: 'Pick a problem to follow.',
        body: 'Hover any circle for its counts; click to select it. A problem picked in Figure 03 stays ringed. Retries are repeated events from the same students, not independent trials.' },
    ],
    f12: (from) => [
      { at: from, title: 'Where in the window does progress <em>happen?</em>',
        body: 'Each homework window cut into five equal-duration phases. Bars count eligible retries; the lit part set a new best. In HW4 the middle phase held the most retries (<span class="num">143</span>), but 22% of them set a new best.' },
      { at: 61, title: 'Rates by window phase, on <em>one scale.</em>',
        body: 'Each cell: new bests ÷ eligible retries, with S students; colour runs 0–100%. HW4’s last two phases reached <b>62.5%</b> (40/64) and <b>59.3%</b> (35/59). Hatched cells are withheld, not zero. A phase lasts 22–31 hours depending on the homework; no deadline effect is estimated.' },
    ],
    bridge: [
      { at: 0, kicker: 'Sample switch', title: 'A different sample for the <em>exam</em> question.',
        body: `These homework views describe submission events through ${N.hw4Name}. For the exam question, we switch to <b>${N.grades} supplied grades</b> and pre-exam <b>${N.preExam}</b>; ${N.postExam} is excluded. The retry figures are not linked to grades.` },
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
          ? `Five figures: ${int(N.submissions)} submissions through ${N.hw4Name}, and ${N.grades} pre-exam exam grades.`
          : `Twelve figures: ${int(N.submissions)} submissions through ${N.hw4Name}, ${N.grades} supplied exam grades and a partial Course Pulse window.` },
      { at: 15.6, kicker: 'The score has a past', title: 'Now you have <em>seen it.</em>',
        body: 'Replay any figure, or open its evidence: methods, tables, downloads and the aggregate data behind every frame.',
        credit: `Zaozao Wang · data acquisition, cleaning, analysis<br>Zhengxiang Liu · visualization design, D3 implementation<br>STATS 401 · CS201 OJ snapshot ${N.snap} · aggregates only` },
    ],
  };

  // conclusion takeaways: each card names the figures it summarises (route-specific)
  const CARDS = {
    core: [
      { figs: ['01', '03'], h: 'One score, many roads.',
        b: 'A visible burst can be 12 students sending 153 submissions. After three tries, 10 of 31 problem slots still trailed their best observed mean by more than 10 points.' },
      { figs: ['11', '12'], h: 'Retries progress unevenly.',
        b: `${int(N.bests)} of ${int(N.retries)} eligible retries set a new best (${p1(N.rate)}%). Rates differ by homework, elapsed gap and window phase; these are events, not students.` },
      { figs: ['06'], h: 'Timing travels with the exam.',
        b: `In ${N.grades} supplied grades, a lower final-day submission share was associated with higher midterm scores (ρ −0.48). An association, not a cause.` },
    ],
    showcase: [
      { figs: ['01', '02', '03', '04'], h: 'Bursts, tails and gaps.',
        b: 'A visible burst of 153 submissions from 12 students; medians of 12.5–15 submissions with tails to 141; 10 of 31 problem slots still trailing after three tries; later-try means from a changing cohort.' },
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
