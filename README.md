# CS201 Homework Submission Patterns

**Timing, Retries, and Score Progression**
STATS 401 Final Project · Zaozao Wang and Zhengxiang Liu

When homework scores cluster near full marks, how do students' submission processes differ? The current progress-check page presents three implemented visualizations using actual CS201 data: a submission calendar, attempt-count boxplots, and first-to-best score dumbbells. It includes raw/processed dataset descriptions, completed cleaning steps, planned interactions and an evaluation plan.

- [Project page source](index.html) — open locally in a browser; no server is needed.
- [Dataset and methods](docs/methods.md)
- [Public aggregate data](data/summary.json)
- [Visualization design contract](docs/visualization-contract.md)

## Completed static figures

| Figure | SVG | High-resolution PNG |
|---|---|---|
| Submission timing and distinct contributors | [SVG](assets/figures/01-calendar.svg) | [PNG](assets/figures/01-calendar.png) |
| Per-student attempt distributions | [SVG](assets/figures/02-attempts.svg) | [PNG](assets/figures/02-attempts.png) |
| First and best normalized scores | [SVG](assets/figures/03-score-progression.svg) | [PNG](assets/figures/03-score-progression.png) |

All charts have separate mobile compositions and accessible HTML tables. The page has no remote runtime libraries, fonts, API calls or production database connection. Static figures are complete; analytical filters/animations and the formative user evaluation are planned.

## Reproduce from public aggregates

Python 3.9+ with the standard library is sufficient (Python 3.14 used for current generation). No package installation is required.

```sh
python3 scripts/render_figures.py
python3 scripts/build_page.py
python3 -m unittest discover -s tests -v
```

SVG is the canonical reproducible output. The committed 2×-resolution PNGs were rasterized with an existing Sharp installation. If Sharp is already available, run `node scripts/rasterize.cjs`. Otherwise set `SHARP_MODULE` to an existing installation's module path. The script does not install dependencies.

Authorized users with a private export can reproduce the aggregate data separately:

```sh
python3 scripts/prepare_data.py --input /path/outside/repository/dataset.json
```

For a private hourly calendar, supply `--private-output /path/outside/repository/hourly-private.json` to the preparation script, then `--private-hourly /path/outside/repository/hourly-private.json` to the renderer. The output remains beside that private JSON. Do not put raw data or private outputs into this repository.

## Scope and interpretation

The 20 September 2026 snapshot contains 42 roster members and 2,343 course submissions. The three homework windows retain 2,101 submissions from 39 members. Public temporal cells are four hours wide and positive cells with fewer than five contributors are masked. The source export, student pseudonyms, individual scores and linkage key are private.

Submission counts are not measures of effort; submission gaps are not study duration. Best scores cannot decrease by definition, and score progression does not establish causal learning improvement. Homework windows use configured deadlines and do not incorporate individual extensions. See the methods for denominators and normalization.

## Historical materials

The earlier cross-platform/exam-outcome scope is superseded by the current homework-process analysis. These are preserved as design history, not presented as implemented actual-data results:

- [Original proposal](proposal.md)
- [Original synthetic visualization sketches](assets/cs201-visualization-sketches.png)
- [Original sketch prompts](assets/sketchs.txt)
