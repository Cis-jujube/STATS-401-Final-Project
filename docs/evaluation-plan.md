# Evaluation plan

Status: planned, not conducted. This plan evaluates the visualization and page, not students' learning or academic performance. Test the current locally built layout after publication is verified; keep task wording and timing consistent across participants.

## Questions

1. Can readers accurately extract timing, distribution and score information?
2. Can readers distinguish submissions from people, actual scores from cumulative-best scores, and masked values from zero?
3. Can readers explain the changing cohort in the nth-attempt chart without inferring individual decline or causal learning gains?
4. Can readers find methods, data tables and figure downloads on desktop and mobile?

## Participants and session

Recruit approximately five volunteers: ideally three classmates and two teaching assistants; confirm availability rather than assuming those roles are secured. Run one pilot with a separate volunteer to check wording and timing; exclude that pilot from the five-session summary. Target three desktop and two mobile sessions to discover device-specific issues, not to compare devices statistically. Record prior familiarity with boxplots and with this project, without collecting names or grades.

Allow 15–20 minutes per session: consent and orientation (2 min), four information tasks (up to 90 seconds each), interpretation questions (3 min), download/navigation task (2 min), retrospective feedback (3–5 min). Ask participants to work silently during timed tasks; ask about their reasoning afterward so think-aloud does not systematically extend task times. Start timing when the task is shown; stop at the submitted answer, requested help, or 90-second cap. Record help and timeout separately; do not silently drop unfinished tasks.

## Tasks and facilitator answer key

| Task prompt | Answer key from the current aggregate snapshot | Scoring (0–2) |
|---|---|---|
| T1. In Figure 01's visible-cell scatterplots, find the plotted four-hour cell with the most submissions. Report its date, time, submissions and distinct contributors. | 29 August, 12:00–16:00 Beijing time; 153 submissions; 12 people. This is the largest *visible* cell; masked cells prevent an overall four-hour peak claim. | 2: all four elements correct. 1: cell located correctly but one metric omitted/misread. 0: wrong cell or people/events confused. |
| T2. Which homework has the highest median submission count? Which has the widest observed min–max range? | HW4 for both. Median 15; range 8–141 (width 133). Compare HW1 8–98, HW2 3–62 and HW3 7–108. | 2: both choices and supporting values correct. 1: correct choices without values or only one correct comparison. 0: neither correct. |
| T3. In Figure 03, which problem has the largest mean gap remaining after three attempts? Read the best-through-three and best-observed means. Is best-through-three the actual third submission score? | HW3 EvenOrOdd: 66.15 → 100, a 33.85 percentage-point remaining mean gap across the same 39 attempters. Best-through-three is a cumulative maximum, not the actual third score. | 2: correct problem, values and cumulative-best interpretation. 1: correct problem but misses a value or its meaning. 0: wrong problem or calls cumulative best an actual attempt score. |
| T4. Compare HW1's first and second actual-attempt means. Does the lower second mean show that the same group got worse? Use the N/S rows. | 76.93 → 64.53; N 304 → 106 and S 38 → 34. No: only pairs reaching attempt 2 remain; this is a changing cohort. | 2: correct direction plus explicit changing-cohort explanation supported by N or S. 1: correct direction but insufficient explanation. 0: incorrect direction or individual-decline claim. |

Two additional interpretation probes (record explanations, not an aggregate score):

- Do unplotted four-hour cells mean no submissions? Expected: no; 74 positive cells with fewer than five contributors are masked, so the figure includes only publishable positive cells.
- Do longer submission gaps prove more studying, or more attempts prove learning improvement? Expected: neither; gaps are elapsed time and these descriptive comparisons do not identify causation.

Navigation task: find the method defining normalized score and open/download Figure 04 as PDF. Record success, time, route, keyboard/touch difficulties and errors. On mobile also check table access and chart zoom/download discoverability. Do not require a download to a particular private directory.

## Data and analysis

Use session codes P01–P05. Record device/viewport, familiarity, task answer, 0–2 score, elapsed seconds, timeout, assistance, confidence (1–5), exact confusing label and suggested improvement. Record observations in a CSV; optional anonymous quotes require participant permission. No names, identifiers, student scores or production-server access are needed. Participation is voluntary and feedback is not a course assessment; participants may skip a question or stop.

Report each task's number fully correct (out of five), partial/wrong answers, assistance and timeouts. Summarize median and range of unassisted successful-task times, explicitly giving the successful denominator; list capped/failed attempts separately. Summarize recurring misconception themes and navigation problems. Do not use n=5 for significance claims or generalize to all students.

Revision triggers are design heuristics: fewer than 4/5 fully correct on a task, the same misconception in two sessions, or any blocked keyboard/mobile operation leads to a targeted revision. Accessibility blockers and causal misreadings receive priority. These are improvement triggers, not pre-established proof of usability or learning efficacy.

After revisions, retest changed tasks with fresh participants if feasible. If reusing participants, use comparable alternate tasks and document familiarity/practice effects; do not interpret faster repeat performance alone as proof of design improvement. Keep a change log linking observed issue → revision → retest evidence.

## Separate verification tracks

Data/engineering checks validate normalized scores, cohort definitions, privacy suppression, asset loading, responsive layout and downloads. They do not replace reader evaluation. Midterm-score comparisons concern the research dataset, not the usability study. No reader-evaluation results are claimed.

## Motion-specific checks (after the four information tasks)

Ask the reader to move to the third chart and back, open a figure at large size, and disable motion. Record completion, assistance, accidental scene changes, loss of reading position and any discomfort. Ask whether the animated exchange seemed to change the data itself. A scene transition only changes the presented figure; it is not a time-series animation of student learning.

Run the same operations once with reduced-motion enabled during technical QA. Any inaccessible chart/control is a revision trigger. Repeated confusion about navigation or about whether scores animate is also a revision trigger. Collect an optional 1–5 comfort rating and open comments. Report this separately from accuracy and do not claim that animation improves comprehension without a comparative study. These checks are planned, not conducted participant research.

## Midterm extension tasks (21 September; planned, not conducted)

- Identify coverage: 26 matched grades from 41 eligible roster members; the 15 not in the excerpt are not assigned zero.
- Interpret the final-24h association across Figure 06's panels: A shows Spearman rho approximately −0.48 with a 95% paired-student bootstrap interval of approximately −0.78 to −0.07; B shows a leave-one-out range of approximately −0.60 to −0.42, which is not a confidence interval; C shows all-23-problem and discrepancy-excluded subset estimates of approximately −0.43 and −0.47. These checks do not remove partial-cohort selection or prove causality. Count and first-score bootstrap intervals cross zero.
- Explain the submission-group bands: middle 50% of scores, not confidence intervals. The middle group has the highest mean, while the highest-count group has the highest median. No submission-count target follows from this comparison.

Use the existing 0–2 scoring scheme. The seven information tasks may require extending the session beyond the original four-task timing estimate; pilot the revised protocol before recruiting readers. No evaluation results are claimed.

## Course Pulse extension tasks

8. Explain the nested coverage counts 41 → 26 → 11 → 9; distinguish unavailable grades from no recorded activity and identify the late tracking start.
9. Read the two platform groups (means 95.27 / 86.17; n=11 / 15). Explain why their 9.11-point difference is not a causal platform effect, and why quartile bands are not confidence intervals.
10. Identify that all three platform correlation intervals cross zero. Explain differing source windows, unmeasured prior ability and the exploratory status of all associations.

These are planned reader tasks, not completed evaluation results.

## Event-progress tasks · 30 September (planned)

11. Read the HW4 productive-retry rate: 129 new bests out of 306 eligible retries, 42.2%, from 29 distinct eligible contributors. Explain why this is a percentage of retries, not students. First scores establish baselines; equal scores do not count; attempts after full credit are excluded.
12. Read the HW4 60–80% window phase: 40 new bests out of 64 eligible retries, 62.5%, S=10. Each phase is 26.8 hours for HW4. A hatched cell is withheld, not zero; timing does not identify a deadline effect.

Use the same 0–2 rubric and pilot the expanded twelve-task protocol before fixing session duration. These additions do not imply that reader evaluation has occurred.
