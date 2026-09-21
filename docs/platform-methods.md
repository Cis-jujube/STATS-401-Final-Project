# Course Pulse extension: sources and reproduction

The 21 September 2026 local Course Pulse export is read only. No production database connection or modification is needed. The public page contains aggregates only. Names, account IDs, individual grades, message contents, code and linkage tables remain outside this repository.

## Cohort and identity

The 26 available Canvas grades previously joined to OJ are matched to unique Course Pulse student display names after case folding and removal of non-alphanumeric characters. Ambiguous or unmatched names fail closed. This is a name-based link, not institutional-ID verification. All 26 are enabled student accounts in the course scope; staff and demo usage are excluded. Fifteen eligible OJ roster members lack supplied grades. Results are conditional on this partial, non-random sample.

No-record students remain in the 26-person cohort with zero **recorded** usage, not zero learning. Positive activity of any included metric qualifies for the descriptive recorded/no-record comparison; even a brief visit qualifies. Groups are self-selected and prior ability, motivation and off-platform work are unknown.

## Time and measurement

Migration 3 records the start of personal tracking as 2026-09-08T05:49:32.270Z (13:49 Beijing). Daily account metrics are UTC aggregates by account, role, route and metric. Their `count` values are summed, not treated as individual events.

The confirmed exam starts at 2026-09-16T04:00:00Z (12:00 Beijing). The main analysis uses days before 2026-09-16 UTC, ending at 08:00 Beijing on exam day. A sensitivity analysis adds only exam-day cells whose last-seen timestamp is strictly before the exam. Cells spanning the boundary are excluded entirely; their earlier components cannot be recovered. Thus the sensitivity analysis is also incomplete, not an exact reconstruction.

Active milliseconds estimate foreground engagement with a 60-second idle limit and bounded batches. They are not attention, attendance or total study time. Recorded days count UTC days with any positive account metric. Resource opens are logged events, not unique resources or verified reading. OJ metrics cover the configured HW1–HW3 windows; platform metrics begin later and are not time-matched exposure measures.

## Statistics and disclosure

Platform correlations use average-tie Spearman ranks on 26 students. Intervals are paired-student percentile bootstrap intervals: 5,000 draws, seed 20260921. They describe resampling variability conditional on this sample and do not address selection bias, confounding or multiple comparisons. OJ correlations are reused from the verified midterm aggregate on the same grade cohort; these are marginal, not independent or adjusted effects.

Group bands are linearly interpolated quartiles; marks indicate median and mean. They are dispersion summaries, not confidence intervals. Raw scores above 100 remain uncapped. Groups must contain at least five students; individual points, minima and maxima are not released. This threshold is disclosure reduction, not a formal anonymity guarantee.

Message records mix users, assistants, staff and unresolved identities. Grade overlap is sparse, and linked student activity is concentrated on one date. Practice drafts are latest snapshots, not edit histories, and the export has no submitted practice outcomes. These sources are not used to estimate AI or practice effectiveness. Editable reported usage totals are excluded.

## Reproduction

Use the existing locked project environment; no additional dependencies are needed. Private inputs must remain outside the repository.

```sh
uv run python scripts/prepare_platform.py --export /private/course-pulse-export --grades /private/canvas_midterm.csv
uv run python scripts/render_platform.py
uv run python scripts/build_page.py
uv run python -m unittest discover -s tests -v
```

`data/platform-summary.json` includes SHA-256 hashes of the three source CSVs, cohort counts, group summaries, correlations and cutoff sensitivity results. It contains no private paths or linkage identities. Static desktop and mobile versions are generated in PNG/PDF/SVG for download and transparent SVG for the narrative website.
