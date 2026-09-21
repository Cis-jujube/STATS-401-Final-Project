# Progress-check verification

Verified locally on 20 September 2026:

- Aggregation from the private export completed with schema, linkage, score-bound and count reconciliation checks.
- Thirteen standard-library unit/artifact checks pass: timezone boundary, score scales, event ordering/running best, single-attempt retention, distinct-person suppression, cohort reconciliation, masked values, local resource references, actual nth scores, stopped-pair exclusion and event weighting.
- Four desktop and four mobile compositions generated from the published aggregate JSON, each as a 300 DPI PNG and vector SVG/PDF (24 assets total).
- Desktop (1440px) and mobile (390px) file-based browser checks: all four charts load, correct responsive image variants selected, no horizontal document overflow, no page errors, anchor targets resolve, and data-table disclosure opens.
- Visual review of figure exports and desktop/mobile page screenshots completed. Source data are descriptive; no user evaluation has yet been performed.

Generation and checks are local; this record alone does not assert GitHub push, Pages deployment or course submission. Those states must be verified separately. No persistent development server was started.

## Midterm extension — 21 September 2026

- Requeried behavior with read-only database transactions; source events have valid links and score ranges. The 39 in-window contributors and 2,101 submissions reconcile with the original aggregate snapshot.
- Joined 26 supplied Canvas grades privately. Excluded the named test account; retained two homework discrepancies and reported a sensitivity subset excluding them.
- User-confirmed exam start: 16 September at 12:00 Beijing time; all three selected homework windows end earlier.
- `uv run python -m unittest discover -s tests -v`: 21 tests passed, covering linkage errors, invalid data, sparse-group refusal, exam overlap, average ranks, deterministic bootstrap and public-artifact reconciliation.
- `node --check assets/site.js` and `git diff --check`: passed.
- Parsed new SVGs; checked seven chapter IDs, internal fragment targets, local asset existence and absence of all 26 private names from generated HTML/JSON/SVG files.
- Inspected all six desktop/mobile publication figures; adjusted label margins after visual review. PNG/PDF/SVG and transparent website SVG variants generated successfully.
- Full browser interaction verification is **not completed**. The Edge tab-creation call timed out; native navigation encountered a user tab change; the in-app browser rejected the local file URL under its URL security policy. No workaround server or alternate browser automation was started. Scroll/dialog and responsive-page behavior need a browser acceptance check; figure-level inspection is not equivalent to page-level runtime verification.
- No push or deployment performed as part of local preparation. The existing live site remains separate from this local result.

## Course Pulse extension · 21 September 2026

- Added three aggregate figure families (08–10), desktop/mobile publication PNG/PDF/SVG and transparent narrative SVG.
- Recomputed the public platform summary from private CSV inputs and confirmed exact equality; 26 unique student-name matches, 11 recorded-use students, nine resource-open students.
- All 27 tests pass, including six platform tests covering temporal boundaries, ambiguous linkage, invalid/duplicate metric cells, staff/demo exclusions, sparse-group rejection and public cohort reconciliation.
- JavaScript syntax and `git diff --check` pass. All ten chapter anchors resolve; HTML IDs are unique; all referenced local assets exist. New SVGs parse; matched student names are absent from checked public HTML, platform JSON and new SVGs.
- Visually inspected coverage mobile, grouped-score desktop and correlation mobile PNGs; labels, sample counts and caveats remain visible. Existing renderer provides sibling sizes; no new runtime dependency.
- Full browser runtime interaction remains unverified. No persistent server was started and no production database was accessed or changed. These local changes have not been pushed or deployed.
