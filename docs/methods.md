# Dataset, processing and interpretation

The current project studies **CS201 homework submission timing, retries and score progression**. The original cross-platform/exam proposal is historical. The first four figures use homework data only. The separate [midterm extension](midterm-methods.md) adds 26 verified grades and documents its different cohort and sources. The [Course Pulse extension](platform-methods.md) adds recorded platform use for the same partial grade cohort; AI-message effectiveness is not estimated.

## Source and grain

The local, private export is a consistent read-only snapshot taken on 20 September 2026, 11:00 UTC. It contains nine tables: metadata, course, roster, assignments, submissions, assignment_problems, problems, participations and submission_links. A submission is an event, not a student or a study session. Course scope is 42 non-staff/non-superuser roster members; no additional account exclusions were requested. Forty members have submissions in the full scoped export.

There are 2,343 course submission events across seven assignments. Three Homework assignments account for 2,171 events. Restricting each to its own configured start/end timestamp (inclusive) retains 2,101 events from 39 students. The remaining 70 events are excluded from these figures, not deleted from the source. Individual deadline extensions are not modeled. Dates use Asia/Shanghai; the stored UTC timestamps must be converted before daily/hourly grouping.

| Homework | Window in Beijing time | Problem slots | Window events | Window submitters | Excluded events |
|---|---|---:|---:|---:|---:|
| HW1 | 2026-08-26 15:00 to 2026-09-01 23:59 | 8 | 673 | 38 | 14 |
| HW2 | 2026-09-03 12:00 to 2026-09-08 23:59 | 8 | 664 | 38 | 35 |
| HW3 | 2026-09-11 11:00 to 2026-09-15 23:59 | 7 | 764 | 39 | 21 |

Participation records are not the same population as window submitters. In participation_mode=0, full-score counts are 37/40, 33/39 and 37/39. This is descriptive field-level evidence; official grading semantics still need confirmation. The charts do not rely on treating that field as official final grades.

## Completed validation and transformations

`prepare_data.py` checks class and exclusion confirmation, unique source keys, roster membership, join coverage, positive problem maxima, finite scores, and normalized score bounds. It sorts events by timestamp then submission ID. Legitimate repeated attempts are retained. An invalid score or missing required join stops processing rather than silently filling a value or dropping a row.

Normalized score = 100 × submission points **within the assignment** / that problem's maximum points **within the assignment**. Neither `assignment_score` (a participation score) nor raw `submission_score` (different problem scales) is substituted for this ratio.

For each student–homework–problem, first is the earliest normalized score; best is the maximum over the retained window. Best2 and best3 use up to the first two or three observed attempts. Students with only one attempt stay in all comparisons. Means are calculated across the same attempters of each problem, not only those who return for another attempt.

Attempt distributions have one observation per student–homework with at least one event. Quartiles use Python's `statistics.quantiles(..., method="inclusive")`; whiskers are minimum and maximum, not conventional 1.5×IQR cutoffs. No individual points are published. AC means the recorded acceptance verdict. The through-first-AC variant includes the first accepted event for each student–problem and all prior events; never-accepted pairs retain all attempts. In-window events after first AC total 318.

## Public aggregate schema

`data/summary.json` is sufficient to regenerate all public SVG figures without private source data.

- `snapshot_utc`, `timezone`: extraction time and analysis timezone.
- Cohort/event counts: explicitly scoped descriptive totals.
- `assignments`: configured windows, problem counts, event counts, descriptive participation counts, `all_attempts` and `through_first_ac` distributions. Each distribution has n/min/q1/median/q3/max.
- `calendar`: date, starting hour, bin width, state, event count and distinct contributor count. `visible` includes zero; `suppressed` means a positive cell with 1–4 contributors; `inactive` means no configured homework window overlaps the bin. Suppressed and inactive numeric values are null.
- `score_progression`: homework/problem identity and order, number of attempters, mean first/best2/best3/best normalized scores, and first-to-best difference in percentage points.
- `input_sha256`: fingerprint of the private input for reproducibility. It is not a student identifier.

Public time cells span four hours to reduce sparse groups. Fifty-one positive cells remain masked and 29 positive cells are visible. Visible positive counts sum to 1,424, not 2,101; the difference is suppressed activity, not missing source data. A full one-hour heatmap is retained outside the repository. Contributor counts are distinct **within** each cell and must not be added to obtain distinct students across a day or homework.

Pseudonyms, individual scores, raw logs and linkage materials remain outside the repository. Threshold suppression is a disclosure-reduction measure, not a formal anonymity guarantee. Do not attempt to recover small cells by publishing overlapping finer-grained summaries or filter results.

## Interpretation and next steps

Counts reflect recorded attempts, not effort or ability. Elapsed gaps are not active learning time. Best-score trajectories are nondecreasing by definition. Observed first-to-best differences are not causal treatment effects. Different homework problem counts and difficulty limit cross-homework comparisons.

Ten static figures and their mobile variants are implemented: four original homework-process views, three midterm views and three Course Pulse views. Homework filters, metric toggles and endpoint animations are planned. Retry-interval analysis and the approximately five-participant formative evaluation are future work; no user-study results have been collected or claimed.

## Actual mean score by attempt number

The fourth figure adds `attempt_score_series` to the public schema. Each student–homework–problem sequence is ordered by timestamp and submission ID. Attempt k is the kth retained event in that sequence, even when it occurs after an earlier AC. The point is the arithmetic mean of **actual normalized scores at k**, not the running maximum. Every observed student–problem event has equal weight. A student retrying several problems can contribute several observations to one point.

Each row publishes homework, attempt, mean_score, submissions (N), contributors (S) and state. If fewer than five unique students contribute, all three numeric measures are null and state is suppressed. Later points are not a fixed cohort: stopped sequences do not carry forward. The first points include 304/290/273 student–problem events and 38/38/39 distinct students for HW1/HW2/HW3. Visible points extend through attempt 13/9/14 respectively. The common displayed x range ends at the largest visible attempt (14); additional sparse tails are withheld.

No confidence bands are drawn because these are descriptive means over the observed cohort and event observations are clustered within students and problems. A future uncertainty analysis would need a justified student-level sampling/resampling approach rather than independent-event error bars. Differences across attempts can reflect selection, changing problem mix, post-acceptance submissions and other factors; they do not estimate within-student improvement.

## Implemented midterm comparison

The [midterm extension](midterm-methods.md) is now implemented with three additional figures and a separate aggregate input (`data/midterm-summary.json`). The original four figures retain their historical snapshot. The extension excludes the named test account, uses 26 supplied grades from 41 eligible roster members, and verifies that all selected homework windows precede the user-confirmed 16 September noon exam. See its methods for linkage, uncertainty and sensitivity checks.
