# Visualization contract · five featured figures

The research question is **what recorded submission behavior reveals beyond near-perfect homework scores**. The current homepage and presentation route feature five completed figures, selected for complementary analytical value. The analysis companion retains all ten figures, tables, methods and downloads.

## Current five-figure story

| Order | Figure | Why it belongs in the live explanation |
|---|---|---|
| 1 | Timing, reach and repeat intensity (01) | Separates broad participation from repeated submissions within a visible burst. |
| 2 | Problem bottlenecks (03) | Shows where the same attempters still have a gap after three attempts. |
| 3 | Actual nth-attempt scores (04) | Explains changing contributors and actual submission outcomes, complementing the cumulative-best GAP figure. |
| 4 | Process and midterm robustness (06) | Tests how stable the observed association is under resampling, leave-one-out and cohort changes. |
| 5 | Combined OJ and platform evidence (10) | Compares sources and closes with uncertainty; platform usage intervals cross zero. |

Attempt-count distributions (02), platform coverage (08), and platform score groups (09) are supporting evidence in `analysis.html`. Coverage context remains directly visible in Figure 5's note: 26 students, 11 recorded users, tracking from 8 September; no record does not mean no learning. Midterm distribution (05) and submission groups (07) also remain in the companion. This selection does not change any analytical values or image assets.

## Future event-level research roadmap

The earlier five-figure analytical roadmap below includes two analyses that still require student–problem event sequences. They are not implemented substitutes for the current figures and do not block the user's requested five-figure curation. No placeholder or synthetic result represents them.

| Target figure | Analytical question | Current evidence and encoding | Interpretation boundary |
|---|---|---|---|
| 01 · Timing, reach and repeat intensity | Is a visible submission burst broad participation or repeated activity by fewer contributors? When in the Beijing day does it occur? | Two panels use the 29 public positive four-hour cells with at least five contributors: distinct contributors versus submissions per active contributor, and clock-time bin versus submissions. Shape identifies homework; marker area reflects submissions. | Another 51 positive cells containing 677 submissions are masked. The overall busiest four-hour cell and students' study hours cannot be inferred. The observed peak **day** uses all in-window submissions. |
| 02 · Problem bottlenecks | Which problem slots retain the largest mean score gap after three attempts? | Figure 03 ranks best observed minus best through three for the same attempters. The publication and desktop story use an open circle for first, a square for best through three, and a diamond for best observed. The desktop story selects nine rows; the mobile story uses gap bars for six rows (the top two within each homework). All 23 remain in downloadable figures and the analysis table. | Cumulative best is not an actual third score; an average gap does not count students who improved or establish a learning effect. Best through two remains in the table. |
| 03 · Productive retries (pending) | What share of eligible subsequent submissions establishes a new personal best, and how does it vary by problem and retry gap? | Requires ordered student–homework–problem events with score, verdict and time. Define eligibility, denominator and privacy suppression before rendering. | Elapsed time between submissions is not time spent studying; repeated events are clustered by student. |
| 04 · Progress relative to deadlines (pending) | When do new best scores occur within each homework window, and does the timing differ by problem? | Requires the same event sequence plus configured opening/deadline, with an explicit treatment of individual extensions if available. Use fixed exposure intervals and show contributor/event denominators. | Submission-time concentration does not identify work-time concentration or a deadline effect. |
| 05 · Process and midterm | Is the final-day submission-share association stable to sampling and cohort choices? | Figure 06 places the final-24-hour metric first: A = paired-student bootstrap interval; B = leave-one-out range; C = full-problem and discrepancy-excluded subset estimates. | Only 26 of 41 eligible students have supplied grades. These are exploratory associations, not causal effects or validated predictions. |

If authorized event sequences become available and the two new analyses are verified, reconsider the main story's composition on its analytical merits. Keep supporting evidence accessible in the companion.

## Implementation and publication boundary

- `scripts/render_figures.py` and `scripts/render_midterm.py` regenerate publication PNG/PDF/SVG assets; `--web` produces transparent story SVGs. `scripts/build_page.py` assembles the analysis companion and story from published aggregate JSON.
- The page uses semantic HTML/CSS and local JavaScript for presentation. It has no runtime data API or production-server connection. Motion does not change numeric observations; reduced-motion and motion-off keep ordinary reading flow.
- Private exports, student identifiers, grades, linkage keys and event-level records stay outside the repository. Public cells with fewer than five contributors are suppressed; suppression reduces disclosure but is not a formal privacy guarantee.
- Figures must include clear denominators, direct labels, mobile compositions, alt text, accessible tables and downloadable formats. Verify aggregate claims against source JSON, inspect rendered charts, run local tests, and review the final diff before publication.

## Historical design decisions

The initial four-homework-figure milestone used a public calendar heatmap and a first-to-best score chart. The current first-round revision replaces those *published compositions* with the two analyses above. The private hourly heatmap remains an optional local export. Figure 04 still displays actual scores on the kth observed submission, with event counts N, distinct student counts S, a changing cohort and no carry-forward. Earlier sketches and proposal material remain labeled historical.
