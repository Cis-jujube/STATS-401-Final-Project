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

## Earlier analytical figure revision · 26 September 2026

- At that revision, Figure 03 used first-to-best ranking. Its later 29 September redesign and verification are recorded below.
- Regenerated Figure 06 with `uv run python scripts/render_midterm.py` from the checked-in midterm aggregate. Desktop and mobile PNGs were inspected. The main bootstrap interval, leave-one-out range and sensitivity subsets use distinct panels and labels; the range is explicitly not described as a confidence interval.
- Rebuilt `index.html` and `analysis.html` with `uv run python scripts/build_page.py`. Eight chapters remain in the main story; all ten figures, exact tables and downloads remain in the analysis companion. A public-artifact test verifies internal anchors and local figure links. Figure 03's mobile focus dialog now allows the full-height chart to scroll, with a persistent close control.
- `uv run python -m unittest discover -s tests -v`: 28 tests passed. `node --check assets/site.js`, `node tests/test_motion.cjs`, `node tests/test_motion_math.cjs`, XML parsing of all modified SVG variants, and `git diff --check` passed.
- Browser runtime review of the local `file://` page was rejected by the browser tool's URL security policy. The rendered figure previews and static checks do not verify live scrolling, dialog behavior or page layout. No production data was queried, and no push or deployment was performed in this revision.

## Five-figure revision, first local pass · 29 September 2026

- Rebuilt Figures 01 and 03 from the checked-in public homework aggregate, and Figure 06 from the checked-in midterm aggregate. Figure 01 shows only 29 positive publishable four-hour cells; its 677 masked submissions prevent an overall four-hour peak claim. Figure 03 ranks best observed minus best through three; nine of 23 problem slots exceed 10 percentage points. The desktop story selects nine three-stage rows and the mobile story uses six compact gap bars, with the full 23-row version retained in the analysis companion and downloads. Figure 06 separates bootstrap uncertainty, leave-one-out ranges and two subset estimates.
- Inspected desktop/mobile publication PNGs for Figures 01, 03 and 06 after regeneration, plus a 340px dark-background static preview of the six-bar mobile story figure. Parsed all 12 changed publication/story SVG variants as XML. Rebuilt `index.html` and `analysis.html` from the source scripts and checked generated resources and figure claims through the public-artifact tests.
- `uv run python -m unittest discover -s tests -q`: 29 tests passed. `node --check assets/site.js`, both motion test scripts, Python compilation and `git diff --check` passed. The browser tool again rejected local `file://` review under its URL security policy, so runtime layout, scrolling and dialog behavior remain unverified.
- No private source was queried. The two event-level figures await authorized source access. The local eight-chapter story has not been reduced to five, pushed or deployed.

## Five-figure cinematic story · 30 September 2026

- The implemented main route now contains five figures, plus opening and archive; the analysis companion retains ten figures. Native reading, manual indefinite chart stops and a seekable 70.1-second full story share the existing static evidence.
- 33 Python tests and seven JavaScript suites passed. Choreography checks sample 6,006 frames; geometry checks sample 606 frames. All 83 public data/chart assets matched the pre-motion-redesign baseline.
- Real HTTP browser runs passed 193 manual-presentation assertions and 290 full-story assertions across 1440×900, 1366×768, 1024×650 and 390×844. Tests cover pause/hold, reverse seeking, focus, mobile scrolling, image recovery and reduced-motion/no-script fallbacks.
- Complete playback and chapter-stop screenshots were captured and visually reviewed. A spatial-title contrast issue was corrected and checked in eight additional desktop/mobile samples. No private data, new runtime dependency, database or deployment configuration was changed.
- See [presentation verification](presentation-mode.md) for performance measurements, the initial unreproduced test-entry failure and device limitations. Repository push, hosted deployment and course submission remain separate verification states.
