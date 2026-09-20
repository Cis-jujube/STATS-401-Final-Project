# Interim visualization contract

User-approved analytical direction: **CS201 Homework Submission Patterns: Timing, Retries, and Score Progression**. Deliver the first three recommended figures; retry-interval analysis is a future extension. This is a straightforward statistical report, not a concept-first/advanced art-directed composition.

## Reading path and ownership

All specialist passes are local; no delegation was requested. Statistical/uncertainty guidance owns denominators, distributions and paired score cohorts; report/export guidance owns durable assets; accessibility guidance owns direct labels and tabular alternatives.

| Figure | Question / grain | Encoding | Evidence and QA |
|---|---|---|---|
| Calendar | When do submissions occur, and how broad is participation? Date × time bin, Beijing time, all three homework windows | Sequential heatmaps for submissions and distinct contributors; separate scales; zero, masked and inactive distinguished | Sum private hourly bins to 2,101; public cells with 1–4 contributors masked. Public bins are four hours to reduce sparse-group exposure. Full hourly version stays local. |
| Attempts | How variable are per-student homework attempt counts? Student × homework, positive submitters only | Boxplots; median, inclusive quartiles, min–max whiskers; no individual dots | n=38/38/39; medians=12.5/13/14; no inference about effort/ability; 8/8/7 assigned problems |
| Score progression | How far apart are first and best observed normalized scores? Student × homework × problem, then problem means | First score as an open circle, best as a filled diamond; connected pair per problem; x=0–100 | Same attempters at both endpoints; score=assignment submission points / assignment problem maximum; all n≥5; best is nondecreasing by definition |

## Implementation design

- Python standard-library aggregation reads a private external export. Only approved aggregate JSON enters this repository.
- Figure renderer owns axes, text, scales and marks; durable SVG plus high-resolution PNG, with independent mobile compositions rather than unreadably shrinking desktop artwork.
- Plain semantic HTML/CSS, three figure sections, no remote fonts or runtime API, no server or credentials. Standard library HTML generation shares aggregate data with figures to prevent numeric drift.
- Three primary figures; small mobile variants and private hourly export. No animation, client state or URL filter state in this milestone. HTML anchors support deep links. Planned interactions are labeled as planned.
- One column on 390px mobile, bounded text width on desktop, chart evidence above long methods, 44px download targets, readable text tables in native disclosure controls, image alt text and captions. Color is not the sole discriminator.
- Color roles: dark ink/text; teal/high activity and best-score endpoint; light outlined circles/first score; neutral connectors; gray and hatch for excluded/suppressed cells. No decorative imagery.
- QA: input/schema/foreign-key checks; meaningful unit tests for timezones, score scales, same-cohort best scores, suppression; image inspection; file-based desktop/mobile browser checks; public artifact privacy scan; final Git diff review.

## Publication boundary

No student pseudonyms, raw IDs, linkage key, raw JSON, transfer text, individual grades or individual dots are shipped. Suppression is a practical disclosure reduction, not a formal privacy guarantee. Per-problem score summaries are across 30+ students; rare temporal groups remain masked. Original proposal and synthetic sketches remain labeled historical; the interim page is the current direction.
