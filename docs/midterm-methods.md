# Midterm extension: partial-cohort exploratory associations

The extension adds three figures to the original four homework-process views. It uses actual supplied Canvas grades and a new read-only OJ metrics query. It does not change Canvas, the database, or the historical public aggregate file.

## Sources and linkage

- **Grades:** 26 named rows in the Canvas accessibility excerpt and screenshot supplied on 21 September 2026. The nominal exam maximum is 100; raw scores above 100 are retained without capping, rescaling or interpreting the extra-credit policy.
- **Identity:** unique full name within OJ class 13, cross-checked against HW1/HW2/HW3 grades. Two homework discrepancies remain in the private record. They do not alter the identity match or replace either source score. A sensitivity analysis excludes these two records.
- **Behavior:** OJ read-only queries on 21 September 2026, beginning 07:08:23 UTC, through the existing authenticated server terminal. Each query used a read-only transaction and ended with rollback. No tables, configuration or server files were changed.
- **Cohort:** 42 non-staff/non-superuser roster entries include one explicitly named test account. Excluding it leaves 41 eligible members. The 26 supplied grades match 26 OJ members; 15 roster members were not in the supplied excerpt. This is availability in an excerpt, not evidence of missing exams, non-attendance or zero scores.
- **Temporal boundary:** the user confirmed the exam began on Wednesday 16 September 2026 at 12:00 Asia/Shanghai. HW3's configured window ends on 15 September at 23:59; HW1 and HW2 end earlier. All included events are therefore pre-exam.

The old private export was not found at its previously documented location. This extension uses a fresh database query, not reconstructed identities inferred from aggregate data. The 39 in-window submitters and 2,101 events reconcile to the original figures. The 26 matched students contribute 1,507 events. Original figures retain their 20 September snapshot and historical 42-member roster denominator; their counts have not silently been relabeled as the new 41-member cohort.

## Metrics and unit of analysis

The analysis unit is a **student**, with one record per linked student. Each event must be inside its own assignment's configured opening/deadline window (inclusive). Assignment IDs 95, 120 and 145 are the verified HW1–HW3 identifiers. Staff, superusers and the identified test account are excluded. Personal deadline extensions are unavailable.

1. **Submission count:** all recorded in-window attempts across the three homeworks. Post-acceptance attempts remain included. Counts are not hours, effort or ability.
2. **Mean first-submission score:** rank events within student × assignment-problem by submission timestamp, breaking ties by submission ID. Normalize contest-submission points by that assignment-problem's maximum; select the first event, then average across the student's attempted slots. All slots have equal weight within each student. There are 23 possible slots; unattempted slots are not imputed as zero. A 23-student sensitivity subset attempted all 23 slots.
3. **Final-24h share:** in-window attempts occurring at or after the configured deadline minus 24 hours, divided by all of that student's in-window attempts, multiplied by 100. This measures submission concentration near deadlines, not study duration or when work began.

The source validation found no missing submission links, missing assignment-problem joins or invalid normalized-score numerators/denominators. The local input contains student-level metrics, not the full event log. Names and original OJ IDs are used only for the private join.

## Figures and inference limits

**05 / Score distribution.** Four categorical bins: below 80, 80–<90, 90–<100 and at least 100, with counts 5/5/10/6. These unequal-width categories are not a density histogram. Mean is 90.02 and median is 93.25. Counts describe the 26-row excerpt only.

**06 / Rank correlations.** Spearman correlation uses average ranks for ties. Each student's behavior and exam score remain paired. The 95% percentile bootstrap intervals use 5,000 student resamples with replacement and NumPy seed 20260921; both variables are re-ranked within each resample. Constant-variable resamples are omitted and counted; preparation rejects results if more than 5% of draws are degenerate. These are exploratory, unadjusted intervals conditional on this convenience cohort. They do not correct for selection, omitted variables or multiple comparisons, and do not demonstrate prediction accuracy or causation. No p-values are reported.

Sensitivity tables show (a) the range of correlations after leaving out each student in turn, (b) all-23-slot coverage, and (c) omission of the two homework-discrepant records. These subsets change composition; they are not missingness corrections. Lower first-submission scores may reflect draft-submission habits or problem mix; they are not a direct measure of prior knowledge.

**07 / Submission groups.** The descriptive cutoffs under 35, 35–59 and at least 60 yield n=9/11/6. These choices are not optimized or preregistered, do not establish thresholds, and are not recommendations. Bands show Q1–Q3 with linear interpolation, lines show medians, and diamonds show means. These bands describe dispersion and must not be called confidence intervals. Groups overlap, are unequal in size, and differ in attempted-problem coverage.

## Privacy and reproduction

Private inputs and the identity crosswalk stay outside the repository. Only the allowlisted aggregate result in `data/midterm-summary.json` enters the website. No student rows, scatterplot coordinates, named scores, individual extrema or drilldowns are published. Positive bins and groups require at least five students; preparation fails rather than releasing sparse groups recoverable from the total. Thresholding is not a formal anonymity guarantee.

The private input directory must contain `oj_metrics.tsv`, `canvas_midterm.csv` and `provenance.json`. The preparation script validates identities, ranges, count integrality, course scope, test-account exclusion and the exam boundary. File hashes identify the exact source versions. Inputs may be copied from an authorized private source; never place them in this public repository.

```sh
uv run python scripts/prepare_midterm.py --private-input /path/outside/repository/private-midterm
uv run python scripts/render_midterm.py
uv run python scripts/build_page.py
uv run python -m unittest discover -s tests -v
```

Public-only reproduction starts with the checked-in aggregate JSON and runs the final three commands. The renderer exports desktop/mobile SVG, PNG and PDF plus transparent SVG compositions for the website. Existing Matplotlib/NumPy dependencies are reused. The page remains static, with accessible tables, downloadable figures, ordinary section anchors, a figure-focus dialog and reduced-motion support; there is no database connection from the browser.
