# CS201 Homework Submission Patterns

**Timing, Retries, Score Progression, and Midterm Outcomes**
STATS 401 Final Project · Zaozao Wang and Zhengxiang Liu

When homework scores cluster near full marks, how do students' submission processes differ? The current page presents ten implemented visualizations using actual CS201 data: the original four homework-process views plus a partial-cohort midterm score distribution, behavior–exam rank correlations with bootstrap intervals, and exam-score dispersion by submission-count group. Three Course Pulse views add coverage, observed-use score groups and cross-platform associations. It includes raw/processed dataset descriptions, completed cleaning steps, planned interactions and an evaluation plan.

- [Live project website](https://cis-jujube.github.io/STATS-401-Final-Project/) — GitHub Pages, published from `main` / root.
- [Project page source](index.html) — open locally in a browser; no server is needed.
- [Dataset and methods](docs/methods.md)
- [Public homework aggregate data](data/summary.json)
- [Public midterm aggregate data](data/midterm-summary.json) · [Midterm methods](docs/midterm-methods.md)
- [Visualization design contract](docs/visualization-contract.md)
- [Evaluation protocol and answer key](docs/evaluation-plan.md) · [Blank observation sheet](docs/evaluation-record-template.csv)
- [Website design and motion references](docs/site-design.md)

## Completed static figures

| Figure | SVG | 300 DPI PNG | Vector PDF |
|---|---|---|---|
| Submission timing and distinct contributors | [SVG](assets/figures/01-calendar.svg) | [PNG](assets/figures/01-calendar.png) | [PDF](assets/figures/01-calendar.pdf) |
| Per-student attempt distributions | [SVG](assets/figures/02-attempts.svg) | [PNG](assets/figures/02-attempts.png) | [PDF](assets/figures/02-attempts.pdf) |
| First and best normalized scores | [SVG](assets/figures/03-score-progression.svg) | [PNG](assets/figures/03-score-progression.png) | [PDF](assets/figures/03-score-progression.pdf) |
| Actual mean score by attempt | [SVG](assets/figures/04-attempt-scores.svg) | [PNG](assets/figures/04-attempt-scores.png) | [PDF](assets/figures/04-attempt-scores.pdf) |
| Midterm distribution | [SVG](assets/figures/05-midterm-distribution.svg) | [PNG](assets/figures/05-midterm-distribution.png) | [PDF](assets/figures/05-midterm-distribution.pdf) |
| Behavior–exam associations | [SVG](assets/figures/06-midterm-associations.svg) | [PNG](assets/figures/06-midterm-associations.png) | [PDF](assets/figures/06-midterm-associations.pdf) |
| Exam scores by submission group | [SVG](assets/figures/07-midterm-attempt-groups.svg) | [PNG](assets/figures/07-midterm-attempt-groups.png) | [PDF](assets/figures/07-midterm-attempt-groups.pdf) |

All charts have separate mobile compositions and accessible HTML tables. The page has no remote runtime libraries, fonts, API calls or production database connection. Static figures and continuous scene navigation are implemented. Each desktop chapter fills a screen with text on the left and a transparent figure on the right. Scroll expansion, a moving satin background, large-figure dialog, pointer glow and motion controls are implemented; there are no numbered tabs or chart cards. Analytical chart filters and the formative reader evaluation remain planned. All ten figures and their tables remain readable without JavaScript.

## Reproduce from public aggregates

Python 3.13 and Matplotlib 3.11.2 are captured by `.python-version`, `pyproject.toml` and `uv.lock`. The user approved the project-local dependency. No global installation is needed.

```sh
uv sync --locked
uv run python scripts/render_figures.py
uv run python scripts/render_figures.py --web
uv run python scripts/render_midterm.py
uv run python scripts/build_page.py
uv run python -m unittest discover -s tests -v
```

The page builder assembles the same aggregate evidence with `scripts/render_site.py` and the HTML fragments in `scripts/templates/`. `styles.css` and `assets/site.js` provide the native CSS/JavaScript presentation. The `--web` figure export writes eight transparent SVG compositions to `assets/story/`; the publication PNG/PDF/SVG files remain in `assets/figures/`. No frontend install or development server is required.

The renderer exports eight compositions (four desktop + four mobile), each as a 300 DPI PNG and vector SVG/PDF. It follows [figures4papers / scientific-figure-making](https://github.com/ChenLiu-1996/figures4papers/tree/3c181f85e82c6f24948fcaaf3be6696102b41d8d/scientific-figure-making): shared sans-serif typography, minimal spines, consistent colors, frameless legends and vector text. See [style provenance](docs/figure-style.md). The previous optional Sharp rasterizer is retained for historical compatibility; it is not required for the current pipeline.

Authorized users with a private export can reproduce the aggregate data separately:

```sh
uv run python scripts/prepare_data.py --input /path/outside/repository/dataset.json
```

For a private hourly calendar, supply `--private-output /path/outside/repository/hourly-private.json` to the preparation script, then `--private-hourly /path/outside/repository/hourly-private.json` to the renderer. The output remains beside that private JSON. Do not put raw data or private outputs into this repository.

## Scope and interpretation

The 20 September 2026 snapshot contains 42 roster members and 2,343 course submissions. The three homework windows retain 2,101 submissions from 39 members. Public temporal cells are four hours wide and positive cells with fewer than five contributors are masked. The source export, student pseudonyms, individual scores and linkage key are private.

Submission counts are not measures of effort; submission gaps are not study duration. Best scores cannot decrease by definition, and score progression does not establish causal learning improvement. Homework windows use configured deadlines and do not incorporate individual extensions. See the methods for denominators and normalization.

## Implemented extension: midterm examination scores

The 21 September extension links the **26 grades supplied in a Canvas excerpt** to verified OJ course members. There are 41 eligible members after excluding a named test account; the other 15 grades were not supplied, not assumed zero or absent. The new behavior extract reconciles to the historical 2,101 in-window submissions; matched students contribute 1,507. The original four charts retain their old 42-entry roster denominator, explicitly distinguished from the new eligible cohort.

The exam began on **16 September 2026 at 12:00 Beijing time**, confirmed by the user. All included homework windows ended before the exam. Mean midterm score is 90.02 and median is 93.25; raw points above 100 are preserved. Associations are exploratory, with paired student bootstrap intervals, leave-one-out sensitivity, full-problem-coverage sensitivity and omission of the two homework-discrepant records. They are not causal effects or validated predictions.

The extension publishes aggregate figures and accessible tables only. Private grades and linkage records remain outside this repository. For exact definitions, partial-cohort limitations, privacy rules and reproducible commands, see [midterm methods](docs/midterm-methods.md).

## Reading the new attempt-score figure

For each homework, attempt k means the kth submission by the same student to the same problem within its configured window. We average that event's normalized score across pairs that actually reach k, with equal weight per event. Students retrying multiple problems can contribute multiple events. The N row counts events; S counts unique students. There is **no carry-forward and no running-best substitution**. Later points represent a smaller, different set of student–problem pairs; a falling mean does not show that a fixed group got worse. Points with fewer than five students are withheld.

## Historical materials

The earlier cross-platform/exam-outcome scope is superseded by the current homework-process analysis. These are preserved as design history, not presented as implemented actual-data results:

- [Original proposal](proposal.md)
- [Original synthetic visualization sketches](assets/cs201-visualization-sketches.png)
- [Original sketch prompts](assets/sketchs.txt)

## Course Pulse extension · 21 September 2026

The site now contains ten completed static figures. Chapters 08–10 add linked-cohort coverage, exam-score dispersion by observed platform use, and OJ/platform correlations with bootstrap intervals. Personal tracking starts on 8 September; main platform analysis ends at 08:00 Beijing on exam day. No recorded usage does not mean no learning, and group differences are not platform effects.

See [platform methods](docs/platform-methods.md) for private-input reproduction, identity matching, UTC cutoff sensitivity and exclusions. Only `data/platform-summary.json` and aggregate figures are published. No raw exports, names, account identifiers, messages or code belong in this repository. Local generation does not constitute GitHub push or deployment.

## Scroll narrative and analysis companion

The main page retains native downward scrolling. Desktop chapters now have native scroll-snap stops and full-page directional cover transitions; this is not a discrete slide player and does not intercept wheel events. Narrow/short screens and reduced-motion settings retain normal reading flow. Detailed interpretations, tables, sources and methods live in `analysis.html`, linked from each chart. Live scroll feel remains unverified.

Latest visual refinement restores the animated “Follow the submissions” interlude and chart expansion/reveals. The main page uses gentle proximity alignment, not mandatory stops or fixed slide planes. Charts have a larger share of the layout; page text uses three levels. The separate analysis companion is retained.
