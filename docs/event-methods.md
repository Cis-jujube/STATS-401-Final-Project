# Retry productivity and progress timing · 13 October 2026

Figures 11 and 12 use the authorized read-only OJ snapshot taken at **2026-10-13 06:13:19.647089 UTC**, or **13 October 14:13:19 Beijing time**. The source export and private HMAC linkage material remain outside the repository. Public data are in `data/summary.json` under `event_progress`. The refresh includes HW1–HW5, uses HW4's revised configured deadline of 2 October 23:59, and identifies HW5 as ongoing until its configured 18 October 23:59 deadline.

## Event definition and denominator

1. Keep only HW1–HW5 events inside their own configured opening/deadline, inclusive, as observed by the snapshot. Normalize assignment-linked points by that assignment problem's maximum. Validate joins and score bounds first.
2. Order each student–homework–problem sequence by timestamp, then submission ID for ties. Start the history at the opening of the configured window; events outside it do not establish the baseline or a gap.
3. Skip internal-error (`IE`) judgements. They set neither a score baseline nor the preceding timestamp. Completed compilation-error (`CE`) scores remain valid attempts. An unexpected pending judgement stops processing rather than being treated as a score.
4. The first valid score establishes a baseline. A subsequent valid event is an **eligible retry** only if the preceding running best is below 100. A **new best** strictly exceeds that running best. Ties and rebounds that do not exceed a previous maximum are not improvements. The event reaching 100 counts as an improvement; later events are excluded.
5. Each eligible retry has equal weight. A student can contribute many events, including events on several problems. Rates are not percentages of students who improved. Distinct eligible contributors (S) are reported separately and must not be summed across cells.

The 3,359 in-window events partition into 1,356 first valid scores, 13 internal-error events, 645 events after full credit, and **1,345 eligible retries**. Of those retries, **547 (40.7%)** establish a new best. This partition differs from the four descriptive homework charts, which retain all recorded events, including internal errors and attempts after acceptance. Acceptance (`AC`) and full credit are conceptually distinct even when their post-event counts coincide in this snapshot.

| Homework | New bests | Eligible retries | Distinct contributors | Rate |
|---|---:|---:|---:|---:|
| HW1 | 95 | 294 | 29 | 32.3% |
| HW2 | 125 | 278 | 32 | 45.0% |
| HW3 | 119 | 344 | 34 | 34.6% |
| HW4 | 136 | 315 | 34 | 43.2% |
| HW5 · ongoing | 72 | 114 | 18 | 63.2% |

HW1–HW3 retain the same numerator/denominator pairs as the previous snapshot. HW4's additional observations and revised window change its pair from 129/306 to 136/315; its equal-duration phase assignments also change. HW5 contributes a provisional 72/114 at the snapshot, not a completed-assignment rate. The pooled total combines different homework windows and repeated contributors, so it is a description of these recorded events rather than a common success probability for students.

## Figure 11: elapsed retry gaps

Gap = current timestamp minus the **previous valid event** for the same student, homework and problem. The bins are [0, 60 seconds), [60, 600), [600, 3,600), [3,600, 86,400), and [86,400, infinity). Simultaneous timestamps have gap zero and retain submission-ID order. Internal errors do not shorten a gap.

| Gap | New bests / eligible retries | Distinct contributors | Rate |
|---|---:|---:|---:|
| Under 1 minute | 215 / 634 | 35 | 33.9% |
| 1–10 minutes | 291 / 618 | 37 | 47.1% |
| 10–60 minutes | 29 / 64 | 24 | 45.3% |
| 1–24 hours | 8 / 21 | 11 | 38.1% |
| At least 24 hours | 4 / 8 | 6 | 50.0% |

The plot compares homework rates and pooled gap rates. The analysis companion additionally provides the per-problem table (43 slots, with eight cells withheld). These comparisons do not adjust for problem difficulty, prior score, verdict, student composition or observation exposure. In particular, the longest-gap rate comes from just eight retries; it is not a recommendation to wait longer. Gap length is elapsed clock time, not measured study duration.

## Figure 12: equal-duration phases

For a current eligible retry, compute `phase = min(4, floor(5 × (submitted_at − opening) / (deadline − opening)))`. Phases are [0%, 20%), [20%, 40%), [40%, 60%), [60%, 80%), and [80%, 100%], with the exact configured deadline in the final phase. The current event, rather than the beginning of the retry gap, determines the phase.

Each configured homework window has five equal-duration intervals. Their full scheduled durations are approximately 30.60, 26.40, 21.80, **41.20** and **88.05** hours for HW1–HW5 respectively. HW4's old 26.80-hour phases are superseded by the revised deadline; HW5's later phases have incomplete or no observation exposure at the snapshot. Equal fractions permit within-homework timing comparisons, but raw counts across homeworks are not equal hourly rates. Cells show new bests / eligible retries, S and the corresponding percentage. The color encodes the percentage on a common 0–100 scale. First-attempt full scores are deliberately outside this retry-progress question.

Configured deadlines may differ from individual extensions; no extension records were supplied. Changing students, problems and prior scores across phases can change the observed rates. The chart does not identify when students studied or estimate a deadline effect. HW4 and HW5 follow the midterm and are excluded from the historical exam associations.

HW5 is observed only through snapshot time. Its phase boundaries use the complete configured 30 September–18 October window, but the 60–80% phase is only partially observed and the 80–100% phase has not yet been observed. The latter has state `not_observed` and null numerical fields; it is not an observed zero or a withheld result. The partial phase carries its observation status independently of any disclosure mask. Rates for HW5 describe eligible retries recorded so far and are provisional; they do not estimate its final rate or a complete-window comparison.

## Disclosure controls and public schema

Positive cells need at least five distinct eligible contributors. If exactly one cell in a homework/problem partition, homework/phase partition or gap partition needs primary suppression, an additional nonempty cell with the smallest event count is suppressed. This prevents that single small cell being recovered by subtracting published siblings from a marginal total. Both primary and secondary cells have the same public `suppressed` state; all numeric outcome, event, contributor and rate fields are null. Empty observed visible cells publish zero counts and a null rate. Six phase cells and eight problem cells are withheld in this snapshot. A future `not_observed` phase is not counted as a privacy mask and publishes no numerical fields.

The published fields are `by_homework`, `by_gap`, `by_problem`, `by_phase`, descriptive `eligibility_counts` and the `policy`. `phase_hours`, scheduled phase boundaries, observation status, observation cutoff and homework/problem labels are public assignment metadata. No raw event, student pseudonym, private profile identifier, score sequence or linkage key is published. Threshold masking is a disclosure-reduction measure, not a formal privacy guarantee; do not add overlapping fine-grained releases without reviewing reconstruction risk.

## Reproduction and validation

Use `prepare_data.py` with the private dataset plus previously confirmed exclusion provenance and matching private linkage key as documented in `methods.md`. The exclusion helper validates class, key length and exactly one account match, filters a copy of the relevant tables, and leaves the input export unchanged. It does not claim a new teacher review of all accounts.

Run `uv run python scripts/render_events.py` for publication PNG/PDF/SVG and add `--web` for the transparent story SVGs. Both generate desktop and mobile compositions. `tests/test_event_progress.py` checks strict historical maxima, stable ties, compilation/internal errors, pending-status failure, separate problem/student histories, gap boundaries, phase boundaries, deadline inclusion, secondary suppression and non-mutating confirmed exclusions. Public-artifact checks reconcile totals and null fields.

No independent-event error bars are shown: repeated retries cluster within students and problems. Any future uncertainty analysis requires a justified clustered design; these observed rates are descriptive.
