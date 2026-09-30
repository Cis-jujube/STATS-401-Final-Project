# Dataset, processing and interpretation

The current homework analysis covers timing, attempt counts, actual scores, cumulative-best gaps, productive retries and progress relative to deadlines. All six homework views use the **30 September 2026 Beijing snapshot**. The [midterm](midterm-methods.md) and [Course Pulse](platform-methods.md) comparisons retain their separate pre-exam evidence and partial 26-grade cohort. HW4 is after the exam and is not included in those associations.

## Source, account scope and grain

The private consistent read-only snapshot was taken at **2026-09-29 16:27:16.665506 UTC**, or 30 September at 00:27:16 Beijing time. It contains metadata, course, roster, assignments, submissions, assignment_problems, problems, participations and submission_links. A submission is an event, not a student or study session.

The source export contains 43 non-staff/non-superuser roster members and 3,072 course submissions across eight assignments. For analysis, the previously confirmed test account was matched using the snapshot's private HMAC key and prior exclusion provenance. Removing that one roster member and its two practice submissions leaves **42 roster members and 3,070 course events**. This is a local, non-mutating transformation of the export, not a production deletion or a new teacher audit of every account. The current 42-member cohort differs from both the original 20 September roster (which included the test account) and the 41-member eligible midterm cohort.

Four Homework assignments account for **2,900 events**. Restricting each event to its own configured opening/deadline, inclusive, retains **2,807 events from 39 students**, across 31 problem slots. The 93 outside-window events remain in the private export. Individual extensions are unavailable. Stored UTC timestamps are converted to Asia/Shanghai before date, hour and window calculations.

| Homework | Configured window (Beijing) | Problem slots | Window events | Submitters | Outside-window events |
|---|---|---:|---:|---:|---:|
| HW1 | 2026-08-26 15:00 to 2026-09-01 23:59 | 8 | 673 | 38 | 14 |
| HW2 | 2026-09-03 12:00 to 2026-09-08 23:59 | 8 | 664 | 38 | 35 |
| HW3 | 2026-09-11 11:00 to 2026-09-15 23:59 | 7 | 764 | 39 | 44 |
| HW4 | 2026-09-24 10:00 to 2026-09-29 23:59 | 8 | 706 | 33 | 0 |

In participation_mode=0, full-score records are HW1 37/39, HW2 33/38, HW3 37/39 and HW4 33/35. Participation records and window submitters are different populations; official grading semantics still need confirmation. These fields motivate the process question but are not substituted for official final grades. There are 305 partial-credit events in the windows and 321 across all homework events.

## Validation and normalization

`prepare_data.py` checks class/exclusion confirmation, unique source keys, roster membership, assignment and problem linkage, positive problem maxima, finite scores, score bounds and total reconciliation. Required missing joins or invalid values stop the pipeline. Legitimate repeated attempts remain separate events. The private raw input fingerprint is `cf188bd44a99f59a9b3effb585e9b5d0e551965519f13a5d0cbe9904efc0ee79`; it is a file checksum, not a student identifier.

Normalized score = `100 × assignment_submission_score / assignment_problem.max_points`. Neither a participation-level `assignment_score` nor raw problem scores on different scales are substituted. Sequence ordering uses submission time followed by submission ID for ties.

For each student–homework–problem, first is the earliest retained normalized score; best is the maximum in the retained window. Best2 and best3 use up to the first two or three observed events. A one-attempt pair remains in all stages. Means use the same attempters within each problem, not only returning students. The remaining gap is mean best observed minus mean best through three.

Attempt distributions have one observation per student–homework with at least one event. Quartiles use Python's inclusive method; whiskers are observed min–max, not 1.5×IQR. Zero-submitters remain in the roster but are absent from these distributions. The through-first-AC variant includes the first acceptance and preceding attempts per pair; never-accepted pairs retain all attempts. There are 441 recorded events after a first AC in these windows. An AC verdict and normalized full credit are separate concepts.

## Public aggregate and suppression

`data/summary.json` regenerates the six homework figures without source data:

- `snapshot_utc`, `timezone`, aggregate cohort/event counts and `exclusion_policy` identify the scope without private account identifiers.
- `assignments` contains public window metadata, event counts, participation summaries and all-attempt/through-first-AC distributions.
- `calendar` contains four-hour cells with `visible`, `suppressed` or `inactive` states. Visible zero is distinct from withheld activity. Positive visible cells need five distinct contributors; suppressed and inactive numeric values are null.
- `score_progression` contains public problem labels, attempter counts and mean first/best2/best3/best scores.
- `attempt_score_series` contains actual nth-attempt means and N/S counts with sparse-point suppression.
- `event_progress` contains eligible-retry summaries by homework, gap, problem and phase. See the detailed [event methods](event-methods.md) for its different denominator, error policy and secondary suppression.
- `input_sha256` fingerprints the private snapshot used by the local pipeline.

The four-hour timing view has **37 visible positive cells** and **74 masked positive cells**. Visible cells total **1,828 submissions**; the remaining **979** are withheld activity, not missing input or zeros. The overall peak four-hour cell cannot be inferred from this public scatterplot. The observed full peak day is 29 August, with 233 events from 14 contributors. Per-cell contributor counts cannot be summed to obtain daily or homework unique students.

Private pseudonyms, individual scores, raw events, source identities and linkage materials remain outside the repository. Threshold suppression reduces disclosure; it is not a formal anonymity guarantee. Do not add overlapping finer-grained summaries or filters without a new reconstruction-risk review. The optional hourly output is private and is not generated into this website.

## Reading the six homework figures

1. **Visible peaks (01):** compare contributors with events per active contributor, and clock-time bins with event counts. Shape identifies homework; area scales with submissions. Only publishable positive cells are plotted.
2. **Attempt distributions (02):** median counts are 12.5, 13, 14 and 15 across HW1–HW4. HW4 spans 8–141 events per submitting student. Different problem counts and difficulty limit comparisons.
3. **Remaining problem gaps (03):** 10 of 31 slots retain a mean gap above ten percentage points after three attempts. HW3 EvenOrOdd has the largest remaining gap, 33.85 points (66.15 to 100, same 39 attempters). Downloads contain all 31 slots. The desktop story selects high/middle/low gap ranks per homework (12 rows); the mobile story selects the top two per homework (8 rows). These labeled selections do not represent the full distribution. Cumulative best is not an actual third score or a causal gain.
4. **Actual nth-attempt means (04):** average actual normalized scores only for pairs reaching attempt k. There is no carry-forward or running-best substitution. N counts student–problem events; S counts distinct students. Students retrying several problems contribute several events. First points have N = 304/290/273/264 and S = 38/38/39/33. Visible points extend through attempts 13/9/14/9; the common axis ends at 14. Sparse points are withheld and the line breaks at missing positions. Falling later means do not describe decline in a fixed cohort.
5. **Productive retries (11):** 468 new bests among 1,222 eligible retries. First valid scores set baselines; strict improvements count only while prior best is below 100. Internal errors and post-full-credit retries are excluded; compilation-error scores remain. Compare counts with rates, especially for the sparse long-gap groups.
6. **Progress phases (12):** five equal-duration intervals per configured homework window. Each cell reports new bests / eligible retries, distinct contributors and a rate. Four phase cells are masked, including secondary masks. Equal fractions of different windows are not equal clock durations across homeworks.

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

All figures have desktop/mobile PNG (300 DPI), vector PDF/SVG and transparent story SVG versions. The page contains ten featured chapters and twelve downloads with accessible tables. Analytical filters and the approximately five-reader formative evaluation remain planned. Local generation is separate from publication.
