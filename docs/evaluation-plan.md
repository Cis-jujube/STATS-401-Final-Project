# Evaluation plan

Status: planned, not conducted. This plan evaluates the visualization and page, not students' learning or academic performance. Test the current published layout; keep task wording and timing consistent across participants.

## Questions

1. Can readers accurately extract timing, distribution and score information?
2. Can readers distinguish submissions from people, actual scores from best scores, and masked values from zero?
3. Can readers explain the changing cohort in the nth-attempt chart without inferring individual decline or causal learning gains?
4. Can readers find methods, data tables and figure downloads on desktop and mobile?

## Participants and session

Recruit approximately five volunteers: ideally three classmates and two teaching assistants; confirm availability rather than assuming those roles are secured. Run one pilot with a separate volunteer to check wording and timing; exclude that pilot from the five-session summary. Target three desktop and two mobile sessions to discover device-specific issues, not to compare devices statistically. Record prior familiarity with boxplots and with this project, without collecting names or grades.

Allow 15–20 minutes per session: consent and orientation (2 min), four information tasks (up to 90 seconds each), interpretation questions (3 min), download/navigation task (2 min), retrospective feedback (3–5 min). Ask participants to work silently during timed tasks; ask about their reasoning afterward so think-aloud does not systematically extend task times. Start timing when the task is shown; stop at the submitted answer, requested help, or 90-second cap. Record help and timeout separately; do not silently drop unfinished tasks.

## Tasks and facilitator answer key

| Task prompt | Answer key from the current aggregate snapshot | Scoring (0–2) |
|---|---|---|
| T1. In the public calendar, find the visible four-hour cell with the most submissions. Report its date, time, submissions and distinct contributors. | 29 August, 12:00–16:00 Beijing time; 153 submissions; 12 people. This is the largest visible cell, not a claim about suppressed cells. | 2: all four elements correct. 1: cell located correctly but one metric omitted/misread. 0: wrong cell or people/events confused. |
| T2. Which homework has the highest median submission count? Which has the widest observed min–max range? | HW3 for both. Median 14; range 7–108 (width 101). Compare HW1 8–98 and HW2 3–62. | 2: both choices and supporting values correct. 1: correct choices without values or only one correct comparison. 0: neither correct. |
| T3. Which problem has the largest mean first-to-best score difference? Estimate its size. | HW3 TicTacToe: 37.95 → 100, approximately 62.05 percentage points. Accept 60–64 points from visual estimation. | 2: correct problem and acceptable difference. 1: correct problem but wrong/missing difference. 0: wrong problem. |
| T4. Compare HW1's first and second actual-attempt means. Does the lower second mean show that the same group got worse? Use the N/S rows. | 76.93 → 64.53; N 304 → 106 and S 38 → 34. No: only pairs reaching attempt 2 remain; this is a changing cohort. | 2: correct direction plus explicit changing-cohort explanation supported by N or S. 1: correct direction but insufficient explanation. 0: incorrect direction or individual-decline claim. |

Two additional interpretation probes (record explanations, not an aggregate score):

- Does a hatched calendar cell mean no submissions? Expected: no; it withholds a positive count from fewer than five contributors.
- Do longer submission gaps prove more studying, or more attempts prove learning improvement? Expected: neither; gaps are elapsed time and these descriptive comparisons do not identify causation.

Navigation task: find the method defining normalized score and open/download Figure 04 as PDF. Record success, time, route, keyboard/touch difficulties and errors. On mobile also check table access and chart zoom/download discoverability. Do not require a download to a particular private directory.

## Data and analysis

Use session codes P01–P05. Record device/viewport, familiarity, task answer, 0–2 score, elapsed seconds, timeout, assistance, confidence (1–5), exact confusing label and suggested improvement. Record observations in a CSV; optional anonymous quotes require participant permission. No names, identifiers, student scores or production-server access are needed. Participation is voluntary and feedback is not a course assessment; participants may skip a question or stop.

Report each task's number fully correct (out of five), partial/wrong answers, assistance and timeouts. Summarize median and range of unassisted successful-task times, explicitly giving the successful denominator; list capped/failed attempts separately. Summarize recurring misconception themes and navigation problems. Do not use n=5 for significance claims or generalize to all students.

Revision triggers are design heuristics: fewer than 4/5 fully correct on a task, the same misconception in two sessions, or any blocked keyboard/mobile operation leads to a targeted revision. Accessibility blockers and causal misreadings receive priority. These are improvement triggers, not pre-established proof of usability or learning efficacy.

After revisions, retest changed tasks with fresh participants if feasible. If reusing participants, use comparable alternate tasks and document familiarity/practice effects; do not interpret faster repeat performance alone as proof of design improvement. Keep a change log linking observed issue → revision → retest evidence.

## Separate verification tracks

Data/engineering checks validate normalized scores, cohort definitions, privacy suppression, asset loading, responsive layout and downloads. They do not replace reader evaluation. Future midterm-score comparisons concern the research dataset, not the usability study. No evaluation results or midterm results are claimed yet.

## Motion-specific checks (after the four information tasks)

Ask the reader to move to the third chart and back, open a figure at large size, and disable motion. Record completion, assistance, accidental scene changes, loss of reading position and any discomfort. Ask whether the animated exchange seemed to change the data itself. A scene transition only changes the presented figure; it is not a time-series animation of student learning.

Run the same operations once with reduced-motion enabled during technical QA. Any inaccessible chart/control is a revision trigger. Repeated confusion about navigation or about whether scores animate is also a revision trigger. Collect an optional 1–5 comfort rating and open comments. Report this separately from accuracy and do not claim that animation improves comprehension without a comparative study. These checks are planned, not conducted participant research.
