# Retry productivity and progress timing · 30 September 2026

Figures 11 and 12 use the newly authorized read-only OJ snapshot taken at **2026-09-29 16:27:16.665506 UTC**, or **30 September 00:27:16 Beijing time**. The source export and private HMAC linkage material remain outside the repository. Public data are in `data/summary.json` under `event_progress`.

## Event definition and denominator

1. Keep only HW1–HW4 events inside their own configured opening/deadline, inclusive. Normalize assignment-linked points by that assignment problem's maximum. Validate joins and score bounds first.
2. Order each student–homework–problem sequence by timestamp, then submission ID for ties. Start the history at the opening of the configured window; events outside it do not establish the baseline or a gap.
3. Skip internal-error (`IE`) judgements. They set neither a score baseline nor the preceding timestamp. Completed compilation-error (`CE`) scores remain valid attempts. An unexpected pending judgement stops processing rather than being treated as a score.
4. The first valid score establishes a baseline. A subsequent valid event is an **eligible retry** only if the preceding running best is below 100. A **new best** strictly exceeds that running best. Ties and rebounds that do not exceed a previous maximum are not improvements. The event reaching 100 counts as an improvement; later events are excluded.
5. Each eligible retry has equal weight. A student can contribute many events, including events on several problems. Rates are not percentages of students who improved. Distinct eligible contributors (S) are reported separately and must not be summed across cells.

The 2,807 in-window events partition into 1,131 first valid scores, 13 internal-error events, 441 events after full credit, and **1,222 eligible retries**. Of those retries, **468 (38.3%)** establish a new best. This partition differs from the four descriptive homework charts, which retain all recorded events, including internal errors and attempts after acceptance. Acceptance (`AC`) and full credit are conceptually distinct even when their post-event counts coincide in this snapshot.

| Homework | New bests | Eligible retries | Distinct contributors | Rate |
|---|---:|---:|---:|---:|
| HW1 | 95 | 294 | 29 | 32.3% |
| HW2 | 125 | 278 | 32 | 45.0% |
| HW3 | 119 | 344 | 34 | 34.6% |
| HW4 | 129 | 306 | 29 | 42.2% |

## Figure 11: elapsed retry gaps

Gap = current timestamp minus the **previous valid event** for the same student, homework and problem. The bins are [0, 60 seconds), [60, 600), [600, 3,600), [3,600, 86,400), and [86,400, infinity). Simultaneous timestamps have gap zero and retain submission-ID order. Internal errors do not shorten a gap.

| Gap | New bests / eligible retries | Distinct contributors | Rate |
|---|---:|---:|---:|
| Under 1 minute | 179 / 567 | 34 | 31.6% |
| 1–10 minutes | 251 / 568 | 36 | 44.2% |
| 10–60 minutes | 27 / 59 | 22 | 45.8% |
| 1–24 hours | 7 / 20 | 10 | 35.0% |
| At least 24 hours | 4 / 8 | 6 | 50.0% |

The plot compares homework rates and pooled gap rates. The analysis companion additionally provides the per-problem table (31 slots, with two cells withheld). These comparisons do not adjust for problem difficulty, prior score, verdict or student composition. In particular, the longest-gap rate comes from just eight retries; it is not a recommendation to wait longer. Gap length is elapsed clock time, not measured study duration.

## Figure 12: equal-duration phases

For a current eligible retry, compute `phase = min(4, floor(5 × (submitted_at − opening) / (deadline − opening)))`. Phases are [0%, 20%), [20%, 40%), [40%, 60%), [60%, 80%), and [80%, 100%], with the exact configured deadline in the final phase. The current event, rather than the beginning of the retry gap, determines the phase.

Each homework has five equal exposure intervals. Their durations are approximately 30.60, 26.40, 21.80 and 26.80 hours for HW1–HW4 respectively. Equal phase widths permit within-homework timing comparisons; raw counts across homeworks are not equal hourly rates. Cells show new bests / eligible retries, S and the corresponding percentage. The color encodes the percentage on a common 0–100 scale. First-attempt full scores are deliberately outside this retry-progress question.

Configured deadlines may differ from individual extensions; no extension records were supplied. Changing students, problems and prior scores across phases can change the observed rates. The chart does not identify when students studied or estimate a deadline effect. HW4 follows the midterm and is not added to the historical exam associations.

## Disclosure controls and public schema

Positive cells need at least five distinct eligible contributors. If exactly one cell in a homework/problem partition, homework/phase partition or gap partition needs primary suppression, an additional nonempty cell with the smallest event count is suppressed. This prevents that single small cell being recovered by subtracting published siblings from a marginal total. Both primary and secondary cells have the same public `suppressed` state; all numeric outcome, event, contributor and rate fields are null. Empty visible cells publish zero counts and a null rate. Four phase cells and two problem cells are withheld in this snapshot.

The published fields are `by_homework`, `by_gap`, `by_problem`, `by_phase`, descriptive `eligibility_counts` and the `policy`. `phase_hours` and homework/problem labels are public assignment metadata. No raw event, student pseudonym, private profile identifier, score sequence or linkage key is published. Threshold masking is a disclosure-reduction measure, not a formal privacy guarantee; do not add overlapping fine-grained releases without reviewing reconstruction risk.

## Reproduction and validation

Use `prepare_data.py` with the private dataset plus previously confirmed exclusion provenance and matching private linkage key as documented in `methods.md`. The exclusion helper validates class, key length and exactly one account match, filters a copy of the relevant tables, and leaves the input export unchanged. It does not claim a new teacher review of all accounts.

Run `uv run python scripts/render_events.py` for publication PNG/PDF/SVG and add `--web` for the transparent story SVGs. Both generate desktop and mobile compositions. `tests/test_event_progress.py` checks strict historical maxima, stable ties, compilation/internal errors, pending-status failure, separate problem/student histories, gap boundaries, phase boundaries, deadline inclusion, secondary suppression and non-mutating confirmed exclusions. Public-artifact checks reconcile totals and null fields.

No independent-event error bars are shown: repeated retries cluster within students and problems. Any future uncertainty analysis requires a justified clustered design; these observed rates are descriptive.
