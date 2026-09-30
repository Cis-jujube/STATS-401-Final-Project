# Visualization contract · completed event-data refresh

The question is **what recorded submission behavior reveals beyond near-perfect homework scores**. The two previously pending event analyses are now implemented from the authorized 30 September Beijing snapshot. All six homework-process figures include HW4; exam and Course Pulse figures keep their pre-exam cohorts. The main story retains the existing supporting chapters and adds the two new views: ten featured chapters and twelve downloadable figures. No existing figure or interaction is removed.

| Research view | Current evidence and encoding | Interpretation boundary |
|---|---|---|
| Timing, reach and intensity (01) | 37 visible positive four-hour cells; contributor count versus attempts per contributor, and clock-time bin versus events. Shape identifies HW1–HW4. | 74 positive cells with 979 submissions are masked; the overall four-hour peak and study hours are unknown. |
| Problem bottlenecks (03) | First, best-through-three and best-observed means; 10 of 31 slots retain a >10 pp mean gap. Publication figures retain 31 rows; the story selects 12 on desktop and 8 on mobile. | Same attempters per row; cumulative best is not an actual third score, a count of improved students or a causal effect. |
| Productive retries (11) | New bests / eligible retries by homework and elapsed gap; numeric numerator, denominator and distinct contributors. The companion also gives a masked per-problem table. | Strict improvement above historical best, only while prior best <100. First scores, IE and post-full-credit attempts are excluded. Gaps are clock time, not study time. |
| Progress relative to deadlines (12) | Matrix of five equal-duration phases per homework. Color encodes rate on 0–100%; text gives new bests / eligible retries and contributors. Four cells are hatched and withheld. | Counts are repeated events; phase widths differ in hours across homework. Configured deadlines do not incorporate individual extensions. No deadline effect is estimated. |
| Process and midterm (06) | Paired-student bootstrap, leave-one-out and two sensitivity-cohort estimates from the existing pre-exam input. | Only 26 of the historical 41 eligible students have supplied grades. HW4 is post-exam and excluded. Associations are exploratory. |

Attempt distributions (02), actual nth-attempt scores (04) and Course Pulse context remain in the main story. Midterm distribution (05) and submission-group comparison (07) remain in the companion. The earlier five-main-figure proposal is a design option, not an instruction to remove supporting features during this refresh.

## Artifact and verification contract

- `prepare_data.py` derives only public aggregates from private inputs, applying the previously confirmed account exclusion to a copy. Full definitions and masking rules are in [methods](methods.md) and [event methods](event-methods.md).
- `render_figures.py` renders the four existing homework views; `render_events.py` renders Figures 11–12. Both produce publication PNG/PDF/SVG and transparent SVG with `--web`. The midterm/platform renderers use separate unchanged aggregate inputs.
- `build_page.py`, `homework_sections.py` and `render_site.py` derive homework captions, tables and story descriptions from the refreshed JSON. The existing continuous scroll, “Follow the submissions” interlude, motion controls and focus dialog remain.
- All views require mobile compositions, denominators, alt text, accessible tables and downloads. Private identities, raw events and linkage keys remain outside the repository. Numeric suppressed fields are null; zeros are explicit.
- Verify calculations, raw-input preservation, public privacy fields, resource/anchor integrity and rendered chart legibility. Browser interaction evidence must be reported separately from static and figure-level checks. Local output does not imply push, deployment or reader-study completion.
