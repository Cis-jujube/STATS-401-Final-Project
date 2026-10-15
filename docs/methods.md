# Dataset, processing and interpretation

The current homework analysis covers timing, attempt counts, actual scores, cumulative-best gaps, productive retries and progress relative to deadlines. All six homework views use the **13 October 2026 Beijing snapshot** and include HW1–HW5. HW4 is recalculated using its revised configured deadline; HW5 is still ongoing, so its observations are provisional. The [midterm](midterm-methods.md) and [Course Pulse](platform-methods.md) comparisons retain their separate pre-exam evidence and partial 26-grade cohort. HW4 and HW5 are after the exam and are excluded from those associations.

## Source, account scope and grain

The private consistent read-only snapshot was taken at **2026-10-13 06:13:19.647089 UTC**, or 13 October at 14:13:19 Beijing time. It contains metadata, course, roster, assignments, submissions, assignment_problems, problems, participations and submission_links. A submission is an event, not a student or study session.

The source export contains 43 non-staff/non-superuser roster members and 3,624 course submissions across nine linked assignments, including practice assignments. For analysis, the previously confirmed test account was matched using the snapshot's private HMAC key and prior exclusion provenance. Removing that one roster member and its two practice submissions leaves **42 roster members and 3,622 course events**. This is a local, non-mutating transformation of the export, not a production deletion or a new teacher audit of every account. The current 42-member cohort differs from both the original 20 September roster (which included the test account) and the 41-member eligible midterm cohort.

Five Homework assignments account for **3,452 events**. Restricting each event to its own configured opening/deadline, inclusive, retains **3,359 events from 39 students**, across 43 problem slots. The 93 outside-window events remain in the private export. Individual extensions are unavailable. Stored UTC timestamps are converted to Asia/Shanghai before date, hour and window calculations.

| Homework | Configured window (Beijing) | Problem slots | Window events | Submitters | Outside-window events |
|---|---|---:|---:|---:|---:|
| HW1 | 2026-08-26 15:00 to 2026-09-01 23:59 | 8 | 673 | 38 | 14 |
| HW2 | 2026-09-03 12:00 to 2026-09-08 23:59 | 8 | 664 | 38 | 35 |
| HW3 | 2026-09-11 11:00 to 2026-09-15 23:59 | 7 | 764 | 39 | 44 |
| HW4 | 2026-09-24 10:00 to 2026-10-02 23:59 | 8 | 756 | 38 | 0 |
| HW5 | 2026-09-30 15:45 to 2026-10-18 23:59 | 12 | 502 | 23 | 0 |

HW4's configured deadline changed from 29 September 23:59 to 2 October 23:59. Both event inclusion and the five phase boundaries are recomputed from the new window; the older phase assignments are not reused. Relative to the previous source snapshot, HW4 contributes 50 additional submissions and HW5 contributes 502. All 3,072 previously exported submission IDs remain present, with the compared timestamp, assignment, problem, judgement and score fields unchanged.

HW5 remains open at this snapshot. Its deadline is 18 October 23:59, but observations stop at 13 October 14:13:19. The published HW5 totals, student–problem histories, attempt distributions and best-observed scores are therefore intermediate results. They must not be ranked as completed outcomes against the closed assignments without this qualification. A scheduled phase entirely after the snapshot is unobserved, not a zero or a privacy mask; a phase intersecting the snapshot is partially observed. The public calendar ends on the snapshot date instead of drawing future dates as if they had been observed.

In participation_mode=0, full-score records are HW1 37/39, HW2 33/38, HW3 37/39, HW4 38/38 and HW5 11/27 at the snapshot. Participation records and window submitters are different populations; official grading semantics still need confirmation. These fields motivate the process question but are not substituted for official final grades, and HW5's participation records are provisional. There are 400 partial-credit events in the windows and 416 across all homework events.

## Validation and normalization

`prepare_data.py` checks class/exclusion confirmation, unique source keys, roster membership, assignment and problem linkage, positive problem maxima, finite scores, score bounds and total reconciliation. Required missing joins or invalid values stop the pipeline. Legitimate repeated attempts remain separate events. The private filtered analysis-input fingerprint is `3374b5b43147c944bd7b3aadd62b05af7db53fcbabaa2f25a0c6260b8da3731c`. It identifies the input used by `prepare_data.py` after the established local test-account exclusion, not the unfiltered original export, which remains unchanged. This is a file checksum, not a student identifier.

Normalized score = `100 × assignment_submission_score / assignment_problem.max_points`. Neither a participation-level `assignment_score` nor raw problem scores on different scales are substituted. Sequence ordering uses submission time followed by submission ID for ties.

For each student–homework–problem, first is the earliest retained normalized score; best is the maximum in the retained window. Best2 and best3 use up to the first two or three observed events. A one-attempt pair remains in all stages. Means use the same attempters within each problem, not only returning students. The remaining gap is mean best observed minus mean best through three.

Attempt distributions have one observation per student–homework with at least one event. Quartiles use Python's inclusive method; whiskers are observed min–max, not 1.5×IQR. Zero-submitters remain in the roster but are absent from these distributions. The through-first-AC variant includes the first acceptance and preceding attempts per pair; never-accepted pairs retain all attempts. There are 645 recorded events after a first AC in these windows. An AC verdict and normalized full credit are separate concepts.

## Public aggregate and suppression

`data/summary.json` regenerates the six homework figures without source data:

- `snapshot_utc`, `timezone`, aggregate cohort/event counts and `exclusion_policy` identify the scope without private account identifiers.
- `assignments` contains public window metadata, observation status, event counts, participation summaries and all-attempt/through-first-AC distributions. `ongoing` identifies HW5 and qualifies its summaries as snapshot observations.
- `calendar` contains four-hour cells with `visible`, `suppressed`, `inactive` or `not_observed` states. Visible zero is distinct from withheld activity and an interval not yet observed. Positive visible cells need five distinct contributors; suppressed, inactive and unobserved numeric values are null. Observation metadata identifies partially observed snapshot-day intervals.
- `score_progression` contains public problem labels, attempter counts and mean first/best2/best3/best scores.
- `attempt_score_series` contains actual nth-attempt means and N/S counts with sparse-point suppression.
- `event_progress` contains eligible-retry summaries by homework, gap, problem and phase. See the detailed [event methods](event-methods.md) for its different denominator, error policy and secondary suppression.
- `input_sha256` fingerprints the private filtered analysis input used by the local pipeline, rather than the unfiltered original export.

The four-hour timing view has **38 visible positive cells** and **118 masked positive cells**. Visible cells total **1,874 submissions**; the remaining **1,485** are withheld activity, not missing input or zeros. HW4 and HW5 overlap from 30 September through 2 October, so calendar cells in the overlap pool their events without releasing per-homework subcounts. The overall peak four-hour cell cannot be inferred from this public scatterplot. The observed full peak day is 29 August, with 233 events from 14 contributors. Per-cell contributor counts cannot be summed to obtain daily or homework unique students.

Private pseudonyms, individual scores, raw events, source identities and linkage materials remain outside the repository. Threshold suppression reduces disclosure; it is not a formal anonymity guarantee. Do not add overlapping finer-grained summaries or filters without a new reconstruction-risk review. The optional hourly output is private and is not generated into this website.

## Reading the six homework figures

1. **Visible peaks (01):** compare contributors with events per active contributor, and clock-time bins with event counts. Shape identifies homework; area scales with submissions. Only publishable positive cells are plotted.
2. **Attempt distributions (02):** median counts are 12.5, 13, 14, 12 and 14 across HW1–HW5. HW4 spans 8–141 events per submitting student; ongoing HW5 currently spans 1–209. Different problem counts, difficulty and the incomplete HW5 observation window limit comparisons.
3. **Remaining problem gaps (03):** 13 of 43 slots retain a mean gap above ten percentage points after three attempts. HW3 EvenOrOdd has the largest remaining gap, 33.85 points (66.15 to 100, same 39 attempters). Downloads and the film reading view contain all 43 slots. The classic desktop story selects high/middle/low gap ranks per homework (15 rows); the mobile story selects the top two per homework (10 rows). These labeled selections do not represent the full distribution. Cumulative best is not an actual third score or a causal gain; HW5's best observed is an intermediate maximum.
4. **Actual nth-attempt means (04):** average actual normalized scores only for pairs reaching attempt k. There is no carry-forward or running-best substitution. N counts student–problem events; S counts distinct students. Students retrying several problems contribute several events. First points have N = 304/290/273/304/185 and S = 38/38/39/38/23. Visible points extend through attempts 13/9/14/9/5; the common axis ends at 14. Sparse points are withheld and the line breaks at missing positions. Falling later means do not describe decline in a fixed cohort. HW5's available attempt history is still growing.
5. **Productive retries (11):** 547 new bests among 1,345 eligible retries (40.7%). First valid scores set baselines; strict improvements count only while prior best is below 100. Internal errors and post-full-credit retries are excluded; compilation-error scores remain. Compare counts with rates, especially for the sparse long-gap groups and the provisional HW5 rate.
6. **Progress phases (12):** five equal-duration intervals per configured homework window. Each observed publishable cell reports new bests / eligible retries, distinct contributors and a rate. Six phase cells are masked, including secondary masks. HW5's 60–80% phase is partial and its 80–100% phase is not yet observed. Equal fractions of different windows are not equal clock durations across homeworks.

These are descriptive views. Counts do not measure effort or ability, gaps are not study duration, and repeated-event rates are not percentages of students. No independent-event uncertainty bands are supplied. A future uncertainty analysis would require a justified student-clustered approach; observation timing and selection do not establish causality.

## Reproduction

With already-authorized private inputs outside the repository:

```sh
uv run python scripts/prepare_data.py --input /private/dataset.json \
  --exclusion-provenance /private/confirmed-provenance.json \
  --linkage-key /private/linkage-key.private
```

The key and provenance must correspond to this snapshot and previously confirmed account policy; failed matches stop processing. The raw file is not modified. A legacy bundle with already verified exclusions can omit both policy arguments. To regenerate only the public artifacts:

```sh
uv run python scripts/render_figures.py
uv run python scripts/render_figures.py --web
uv run python scripts/render_events.py
uv run python scripts/render_events.py --web
uv run python scripts/build_page.py
uv run python -m unittest discover -s tests -v
```

All figures have desktop/mobile PNG (300 DPI), vector PDF/SVG and transparent story SVG versions. The film has five Core stops and twelve Showcase stops; the classic page retains ten featured chapters. The analysis companion keeps all twelve figures, accessible tables and downloads. The approximately five-reader formative evaluation remains planned. Local generation is separate from publication.
