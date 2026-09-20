# CS201 Homework Submission Patterns

**Timing, Retries, and Score Progression**
STATS 401 Final Project · Zaozao Wang and Zhengxiang Liu

When homework scores cluster near full marks, how do students' submission processes differ? The current progress-check page presents four implemented visualizations using actual CS201 data: a submission calendar, attempt-count boxplots, first-to-best score dumbbells, and actual mean score by within-problem attempt number. It includes raw/processed dataset descriptions, completed cleaning steps, planned interactions and an evaluation plan.

- [Live project website](https://cis-jujube.github.io/STATS-401-Final-Project/) — GitHub Pages, published from `main` / root.
- [Project page source](index.html) — open locally in a browser; no server is needed.
- [Dataset and methods](docs/methods.md)
- [Public aggregate data](data/summary.json)
- [Visualization design contract](docs/visualization-contract.md)

## Completed static figures

| Figure | SVG | 300 DPI PNG | Vector PDF |
|---|---|---|---|
| Submission timing and distinct contributors | [SVG](assets/figures/01-calendar.svg) | [PNG](assets/figures/01-calendar.png) | [PDF](assets/figures/01-calendar.pdf) |
| Per-student attempt distributions | [SVG](assets/figures/02-attempts.svg) | [PNG](assets/figures/02-attempts.png) | [PDF](assets/figures/02-attempts.pdf) |
| First and best normalized scores | [SVG](assets/figures/03-score-progression.svg) | [PNG](assets/figures/03-score-progression.png) | [PDF](assets/figures/03-score-progression.pdf) |
| Actual mean score by attempt | [SVG](assets/figures/04-attempt-scores.svg) | [PNG](assets/figures/04-attempt-scores.png) | [PDF](assets/figures/04-attempt-scores.pdf) |

All charts have separate mobile compositions and accessible HTML tables. The page has no remote runtime libraries, fonts, API calls or production database connection. Static figures are complete; analytical filters/animations and the formative user evaluation are planned.

## Reproduce from public aggregates

Python 3.13 and Matplotlib 3.11.2 are captured by `.python-version`, `pyproject.toml` and `uv.lock`. The user approved the project-local dependency. No global installation is needed.

```sh
uv sync --locked
uv run python scripts/render_figures.py
uv run python scripts/build_page.py
uv run python -m unittest discover -s tests -v
```

The renderer exports eight compositions (four desktop + four mobile), each as a 300 DPI PNG and vector SVG/PDF. It follows [figures4papers / scientific-figure-making](https://github.com/ChenLiu-1996/figures4papers/tree/3c181f85e82c6f24948fcaaf3be6696102b41d8d/scientific-figure-making): shared sans-serif typography, minimal spines, consistent colors, frameless legends and vector text. See [style provenance](docs/figure-style.md). The previous optional Sharp rasterizer is retained for historical compatibility; it is not required for the current pipeline.

Authorized users with a private export can reproduce the aggregate data separately:

```sh
uv run python scripts/prepare_data.py --input /path/outside/repository/dataset.json
```

For a private hourly calendar, supply `--private-output /path/outside/repository/hourly-private.json` to the preparation script, then `--private-hourly /path/outside/repository/hourly-private.json` to the renderer. The output remains beside that private JSON. Do not put raw data or private outputs into this repository.

## Scope and interpretation

The 20 September 2026 snapshot contains 42 roster members and 2,343 course submissions. The three homework windows retain 2,101 submissions from 39 members. Public temporal cells are four hours wide and positive cells with fewer than five contributors are masked. The source export, student pseudonyms, individual scores and linkage key are private.

Submission counts are not measures of effort; submission gaps are not study duration. Best scores cannot decrease by definition, and score progression does not establish causal learning improvement. Homework windows use configured deadlines and do not incorporate individual extensions. See the methods for denominators and normalization.

## Planned extension: midterm examination scores

After authorized midterm examination scores become available, we will add comparisons between **pre-exam homework submission behavior and midterm performance**. This is future work: the current dataset contains no midterm scores and this project makes no exam-related findings yet.

We will verify the exam scale, align the cohort via private pseudonymous records, document matched/missing cases, and restrict behavioral measures to observations before the exam. Candidate comparisons include per-student submission counts, timing summaries and score progression. We will assess ceiling effects and influential observations, report sample sizes, and describe associations without claiming causation. Private grades and linkage keys will not be published.

## Reading the new attempt-score figure

For each homework, attempt k means the kth submission by the same student to the same problem within its configured window. We average that event's normalized score across pairs that actually reach k, with equal weight per event. Students retrying multiple problems can contribute multiple events. The N row counts events; S counts unique students. There is **no carry-forward and no running-best substitution**. Later points represent a smaller, different set of student–problem pairs; a falling mean does not show that a fixed group got worse. Points with fewer than five students are withheld.

## Historical materials

The earlier cross-platform/exam-outcome scope is superseded by the current homework-process analysis. These are preserved as design history, not presented as implemented actual-data results:

- [Original proposal](proposal.md)
- [Original synthetic visualization sketches](assets/cs201-visualization-sketches.png)
- [Original sketch prompts](assets/sketchs.txt)
