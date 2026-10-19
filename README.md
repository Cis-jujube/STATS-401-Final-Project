# The Score Has a Past

**CS201 homework submission patterns**

STATS 401 Final Project · Zaozao Wang and Zhengxiang Liu

When homework scores cluster near full marks, what do submission timing, retries, and score histories reveal?

For CS201 students and teaching staff, similar final scores can hide different revision histories and problem-level difficulties. This project uses coordinated visualizations to examine those processes, then asks how pre-exam submission behavior relates to the available midterm grades. The goal is to support reflection and discussion about homework, with explicit limits on what activity logs can tell us.

**[Website](https://cis-jujube.github.io/STATS-401-Final-Project/)** · [Core: five figures](https://cis-jujube.github.io/STATS-401-Final-Project/?content=core) · [Showcase: all twelve](https://cis-jujube.github.io/STATS-401-Final-Project/?content=showcase) · [Analysis and tables](https://cis-jujube.github.io/STATS-401-Final-Project/analysis.html) · [Poster](https://cis-jujube.github.io/STATS-401-Final-Project/poster.html) · [A1 PDF](assets/poster/the-score-has-a-past-poster-A1.pdf)

## The visualization story

Core follows **timing → problem gaps → retry outcomes → progress within homework windows → exam associations**. Each stop answers a different part of the research question.

| Figure | Question | Representation and purpose |
|---|---|---|
| [01 · Timing and reach](https://cis-jujube.github.io/STATS-401-Final-Project/?content=core#figure-01) | When do submission bursts happen, and do they reflect many students or repeated attempts? | Calendar and spiral-clock views reveal temporal patterns; bubble plots separate contributor counts from submissions per contributor. |
| [03 · Problem gaps](https://cis-jujube.github.io/STATS-401-Final-Project/?content=core#figure-03) | What difficulty remains hidden by high final scores? | Ranked connected dots compare mean first score, cumulative best through three tries, and best observed for each problem. |
| [11 · Productive retries](https://cis-jujube.github.io/STATS-401-Final-Project/?content=core#figure-11) | How often does an eligible retry set a new personal best? | Unit displays and proportion strips compare homework and elapsed-gap groups, keeping rates beside their denominators. |
| [12 · Progress phases](https://cis-jujube.github.io/STATS-401-Final-Project/?content=core#figure-12) | Where within the homework window do new-best retries occur? | Count views and an annotated phase matrix compare five equal-duration phases, with explicit withheld, partial, and unobserved states. |
| [06 · Exam associations](https://cis-jujube.github.io/STATS-401-Final-Project/?content=core#figure-06) | How do pre-exam behaviors relate to the supplied grades, and how stable are those associations? | Coefficient plots share one correlation scale across bootstrap intervals, leave-one-out ranges, and subset checks. |

The spiral clock provides a **non-linear temporal representation**: successive days form turns, while clock time determines angle. It helps compare daily rhythms; the calendar and settled plots support more direct reading. Showcase adds seven figures on submission distributions, actual attempt scores, exam distributions, and Course Pulse coverage and comparisons.

Presenter pauses at each finished chart; Auto continues through the route; Loop is a highlight reel. Every figure links to its methods, accessible tables, and downloads. The analysis companion works without JavaScript. Animated particles represent aggregate quantities, not identifiable student histories.

## Interactions for exploration

- **Coordinate homework highlighting:** use the Lens to follow one homework across the process views without recalculating aggregates or splitting pooled cells.
- **Change temporal views:** switch Calendar, Clock, and Reach to compare dates, daily rhythms, and participation versus repeat intensity.
- **Change the timing measure:** compare submissions, students, and submissions per student to distinguish a broad burst from intensive retrying.
- **Sort problem rows:** rank by course order, first score, total gain, or gap after three tries to locate different kinds of difficulty.
- **Change the score stage:** move from first try through best by two, best by three, and best observed to inspect cumulative score histories.
- **Compare counts with rates:** switch retry and phase views to see whether a high percentage is supported by many events.

Hover details expose exact values, denominators, and observation states. Chapter navigation and playback controls let readers return to a complete chart and take time to inspect it.

## Data and methods

The sources are existing CS201 online-judge records, supplied Canvas midterm grades, and Course Pulse activity records. The processing code validates joins and score ranges, excludes the confirmed test account, restricts submissions to configured homework windows, normalizes homework points to 0–100, orders retries within student–problem histories, and publishes disclosure-controlled aggregates.

The homework snapshot is **13 October 2026, 14:13 Beijing time**: **3,359 in-window submissions, 39 submitters, HW1–HW5, and 43 problem slots**. HW4 uses its revised 2 October deadline. **HW5 was still open at the snapshot**; its results are provisional and later intervals are unobserved. This bounded course dataset is below the brief's suggested 10,000-item target for original data collection.

Exam and Course Pulse comparisons retain separate pre-exam inputs: **26 supplied grades among 41 eligible students**, with homework behavior restricted to HW1–HW3. HW4 and HW5 are excluded; the 15 grades not supplied are not treated as zero.

- Methods: [homework](docs/methods.md) · [retries and phases](docs/event-methods.md) · [midterm](docs/midterm-methods.md) · [Course Pulse](docs/platform-methods.md)
- Public processed data: [homework](data/summary.json) · [midterm](data/midterm-summary.json) · [Course Pulse](data/platform-summary.json)

## Findings and limits

- **High final scores conceal different paths:** 13 of 43 problem slots retain a mean gap above ten percentage points between best through three tries and best observed. The latter is still provisional for HW5.
- **A retry does not always set a new best:** 547 of 1,345 eligible retries do so (**40.7%**). This is an event rate; students can contribute repeatedly.
- **More deadline-concentrated submissions accompany lower exam scores in this sample:** among the 26 supplied-grade students, final-24h submission share correlates negatively with midterm score (Spearman ρ = −0.48; 95% paired-student bootstrap interval −0.78 to −0.07). This exploratory association is not causal or a validated prediction.

Submission counts do not measure effort, elapsed gaps do not measure study time, and cumulative best is not an actual kth-attempt score. Withheld and unobserved values are distinct from zero. Labels, denominators, and accessible tables support careful interpretation, but small samples and disclosure controls limit detail. [Reader evaluation](docs/evaluation-plan.md) remains planned; comprehension benefits have not been established.

## Implementation and reproduction

The frontend uses HTML, CSS, JavaScript, vendored D3 v7, SVG, and Canvas; Python and Matplotlib generate static figures. The film approach follows [mexicat/pdoom-video](https://github.com/mexicat/pdoom-video); [figure-style credits](docs/figure-style.md) document the print conventions.

Download or clone the repository and open `index.html`, `analysis.html`, or `poster.html` in a browser. No frontend installation, build step, or server is required. To prepare the locked Python environment, rebuild bundled public data, and run the existing checks:

```sh
uv sync --locked
uv run --frozen python scripts/build_app_data.py
uv run --frozen python -m unittest discover -s tests -v
node tests/test_routes.cjs
node tests/test_poster.cjs
```

Figure-generation commands are in the methods documents. Source code is in [assets/app](assets/app) and [scripts](scripts); [design rationale](docs/visualization-contract.md) and the [validation record](docs/validation.md) provide supporting evidence. The selected A1 PDF is a fixed print edition and differs from the latest HTML poster layout.

## Course submission materials

This repository provides visualization and processing code, public aggregates, figure exports, website, poster, and methods. Source and student-level cleaned datasets belong in the private course submission: [the source-copy script](scripts/anonymize_sources.py) prepares pseudonymous copies outside the repository. Exact timestamps and grades remain sensitive, so those copies must not be published.

The separate **~1,500-word final report**, including screenshots, a What–Why–How design critique, and **confirmed individual contributions**, is not yet included in this repository. The [original proposal](proposal.md) records planned roles, not a final contribution statement.
