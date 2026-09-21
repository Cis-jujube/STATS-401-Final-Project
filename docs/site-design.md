# Website design and motion

The selected revision combines direction B's paper-colored typographic opening with the existing four dark full-screen desktop chapters. A large 37.95 → 100 comparison introduces HW3 TicTacToe, explicitly using the same 39 attempters. The title, score comparison and body copy form three visual roles. Left-hand explanations and right-hand transparent figures remain the chapter composition. Data, normalization, privacy suppression and figure artwork retain their existing definitions.

## Implementation and controls

Native HTML, CSS, SVG, Canvas and JavaScript; no additional runtime libraries, fonts or video. The opening sequences clipped title lines, staggered score entrances and a drawn arrow. Scrolling separates the score values, lifts the heading and grows the lower red rule; a red typographic transition leads into the dark chapters. Chapter text and figures arrive together, then settle at full figure scale as their stage reaches the viewport. The satin background continues its scroll-driven movement within one warm palette across chapters. Navigation underlines, directional link movement, a pointer light trail, press-and-hold feedback, dialog entrance and a reading-progress line provide smaller interactions. Numeric observations themselves do not count up or change.

Scroll remains native: no wheel interception, numbered tabs or rounded chart frames. Open a large figure directly, or hold its desktop button for 900 ms. Enter/Space activates the button; the native dialog supports Escape. The motion toggle disables decorative movement and stops active hold/trail frames; system reduced-motion takes priority. Reduced-motion and no-JavaScript modes use normal flowing sections at full figure scale. Mobile uses two score columns, a separate arrow row, no sticky hero, and text above naturally scrolling tall figures. Hover-dependent actions are not required.

This revision has passed build, syntax, data and static-resource checks. Browser rendering/interaction acceptance remains unverified: Safari capture failed and the in-app browser blocked local-file navigation. Do not infer runtime QA from the checks above.

The build entrypoint is `scripts/build_page.py`; `scripts/render_site.py` applies the presentation to the generated evidence sections. Shared fragments are under `scripts/templates/`. CSS and JavaScript are `styles.css` and `assets/site.js`. Transparent website figures come from `scripts/render_figures.py --web`; the white-background publication figures remain the download versions.

## References and scope of reuse

- [React Bits](https://www.reactbits.dev/get-started/index): studied Glow Cursor, Depth Text, Blur Text, Hold Button, Bell Toggle, Scroll Expand, Card Swap, Depth Carousel and Web Threads mechanisms. Implementations here are authored in native browser code; React Bits source components are not bundled or redistributed.
- [MotionSites Velvet Wave](https://www.motionsites.org/prompts/velvet-wave): broad dark curves and concentrated highlights informed the background. The public preview was inspected; playback was partially buffered.
- [MotionSites Dark Vertical Blinds](https://www.motionsites.org/prompts/dark-vertical-blinds): dark material depth and localized illumination informed contrast. Poster inspected; complete video playback not verified.
- [figures4papers](https://github.com/ChenLiu-1996/figures4papers/tree/main/scientific-figure-making): figure typography/export conventions. See [figure-style provenance](figure-style.md).

Background surfaces are original SVG paths and gradients; no third-party video, paid prompt or photographic asset is copied into this repository. Dense wireframe backgrounds explored earlier were rejected and remain absent.

Direction B also draws on the color/typography transition observed in [Illuminating Radioactivity](https://illuminating-radioactivity.com/) and the narrative-to-evidence progression examined in [Quanta’s infinity visual explainer](https://www.quantamagazine.org/wp-content/themes/quanta2024/frontend/vendors/webflow/visual-explainer/infinity-math-story.html). These are compositional references, not copied scenes or assets; detailed observation limits are recorded in the local round-five research notes.

## Evaluation status

The [evaluation protocol](evaluation-plan.md) includes four information tasks, interpretation checks, navigation, motion comfort and revision/retest criteria. Participant evaluation has not yet been conducted. Browser QA verifies operations and rendering, not improved comprehension or academic performance.

## Unified palette refinement

Paper #F4F2E9, vermillion #BD3D24, warm black #191614, body ink #25211E. All chapters now share this palette; material highlights and the pointer trail use warm terracotta. Homework series use brick, ochre and warm stone, with existing labels and marker shapes retained. Both story and publication figures were regenerated from unchanged public aggregates. All 16 SVGs preserve their paths, positions and text. Existing 13 tests and JavaScript syntax checks pass; browser rendering remains unverified.

## Scroll performance refinement

Scroll animation batches geometry reads before style writes, caches unchanged property values, and writes progress directly on its own element. Decorative positions follow native scroll with a 65 ms exponential response and stop scheduling when settled. Background poses interpolate continuously between document anchors, including chapter boundaries. Pointer trails retain a short stroke but omit per-segment shadow blur and full-screen blend mode; canvas backing resolution is capped at CSS-pixel resolution. Hidden tabs cancel pending work. Reduced motion resets decoration and keeps ordinary reading flow.

`node tests/test_motion.cjs` checks coalesced events, read/write ordering, reverse scroll, idle termination, reduced-motion state and hidden-tab suspension in a DOM harness. It does not measure browser frame rate. Live rendering and measured performance remain unverified.

## Distinct chart entrances

Each figure now has an individual `data-entrance`: calendar scan (vertical cover exit), distribution curtain (two opposing covers), score trace (horizontal cover exit), and attempt layers (rising sheet and staggered accent rails). Covers and rails use transforms and opacity rather than blur filters. No observation or axis value is animated. All settle at the unchanged chart; reverse scrolling reverses the presentation. Mobile triggers use the figure position rather than the preceding chapter text, and omit chart rotation. Motion-off/no-script leaves figures unobstructed; reduced-motion explicitly removes covers and transforms.

Build, 13 Python tests, JavaScript syntax and animation scheduling harness pass. Live appearance, frame rate and mobile timing remain unverified because the previously reported browser access limitation persists.

## User-requested composition and transition iteration · 21 September 2026

This revision supersedes the uniform left-copy/right-chart composition and single warm chapter palette above. The ten existing data chapters now use five layout families: atlas, reverse, offset, panorama and editorial. Calendar text leads a large figure; retry figures sit left of copy; progression is vertically offset; attempt-score panels have a wide stage with a compact introduction above. Later chapters alternate large left figures, low side notes and right figures. Mobile returns to a clear text-then-chart reading order.

Chapter surfaces move subtly from copper through ocean, olive, ink, plum, teal, clay, forest, wine and midnight. Gradients and scroll-driven wash opacity operate on backgrounds. Existing chart series colors, axes and numeric observations remain unchanged to preserve analytical meaning and comparison. No new dependencies or regenerated data assets are introduced.

The scene configuration in `render_site.py` declares layout, direction, palette and figure entrance per chapter. Native vertical scroll drives left/right push-pull, vertical and diagonal composition entries, with a stable readable hold. Directions also influence departure. This is not a wheel-intercepting horizontal carousel: document order, anchor links and standard keyboard navigation remain available. Each chapter now provides previous and next links.

Five figure entrances are used: vertical scan, horizontal push, diagonal reveal, four-piece assembly and center opening. Fragment layers reuse the same SVG, are decorative and hidden from assistive technology, and disappear once the intact original is visible. No data mark is animated as a changing observation. Reverse scroll reverses the presentation; motion-off and system reduced-motion show the original complete figure without masks or fragments.

At widths up to 1000px or heights up to 800px, chapters stop pinning to avoid clipping reading content. Mobile uses smaller motion and natural-height figures. All additions use CSS transforms, clipping and opacity; no autoplay loops or animation library. The current local revision passes build, Python tests, JavaScript syntax, and a ten-chapter DOM harness covering direction, settled geometry, reduced motion and a narrow viewport. Browser visual acceptance and measured frame rate remain unverified; no production deployment is claimed.

## Native scroll stops and whole-page covers · current revision

The user's clarified request retains normal downward scrolling, adds distinct chapter stopping points, and maps movement between those points to full-page covers. This replaces the rejected discrete Slides controller. No wheel listener, cooldown, deck selector or player controls are installed.

At desktop viewports at least 1001px wide and 650px tall, with motion enabled, the document uses native mandatory vertical scroll snapping and `scroll-snap-stop: always`. Each chart retains a real viewport-height document anchor. Its complete visual plane is positioned over the viewport, entering from its configured direction as the document approaches its anchor. Later planes cover earlier ones. Two chapters use center-opening masks. At the stop, the intact figure and copy remain stationary. The final plane leaves with the document to reveal a short link to the research companion. This is native snapping, not a guarantee of two physical wheel gestures; exact wheel feel depends on the browser and device.

Small viewports and reduced-motion/motion-off preserve ordinary content flow to avoid cutting off chart details. All figures retain full-figure dialogs. Main navigation and chapter links use real anchors. `analysis.html` now contains the full interpretations, data tables, methods and evaluation, with direct chapter links and a return link. The homepage has only a brief ending, not the full evidence appendix.

Checks: 27 Python tests, animation scheduling harness, JavaScript syntax, cross-page anchors and static resources. An attempt to inspect the previously supplied in-app browser URL returned "Tab not found"; runtime appearance and scroll feel remain unverified.

## Restore expressive scroll motion · latest user correction

The fixed whole-page cover implementation is removed. It suppressed the selected animated interlude and figure entrances, making the page feel like slides. The existing “Follow the submissions” interlude is visible again with its opposing line translations. Native scroll now uses proximity alignment rather than mandatory stops; no wheel events are intercepted.

Figure entrances (scan, push, diagonal reveal, center opening and selected fragment assemblies) run again. The figure container also expands from 82% to its settled size on desktop; mobile uses a gentler scale. Desktop figure columns increase to 1.85fr against .65fr copy columns, with larger figure height allowances. Figure data and exports remain unchanged.

Page typography uses three roles: heading, body and supporting text. Chart-embedded labels and the hero's numerical data marks retain their data-graphic roles. Analysis & Methods remains a separate page. Motion-off and system reduced-motion disable presentation transforms and preserve complete evidence.

Validation: page rebuilt, 27 Python checks, animation harness (including expansion bounds), JavaScript syntax and diff checks pass. Actual browser rendering remains unverified.

Typography clarification: the user's three-level limit applies within each scene, not across the entire website. The interlude restores its independent display scale (desktop 60–145px, mobile 46–70px). Hero and chapter titles no longer share a global forced size; panorama and editorial chapters have their own heading scales. The opposing-line interlude animation and enlarged charts are unchanged.

## Motion rhythm and soft settling

The latest refinement keeps the interlude, enlarged figures and scene-specific typography. A quintic slow-fast-slow curve replaces the earlier cubic interpolation. Complete chapter surfaces and chart expansion follow an analytically integrated damped spring (frequency 19/s, damping ratio .78); clip masks and visibility remain clamped to their valid ranges. Expansion overshoot is capped at 0.45% above the settled figure size. No numeric observation or axis changes.

The interlude retains opposing travel with eased spring-following progress. Navigation hover, header color transitions, opening typography and the focus dialog use softer acceleration and small settling accents. Animation stops at rest rather than continuously pulsing during reading. Native scroll and proximity alignment remain unchanged. Reduced-motion and the motion toggle bypass springs; returning from a hidden tab resets stale chapter velocities.

`node tests/test_motion_math.cjs` validates slow-fast-slow progression, bounded overshoot, reverse settling, and 30/60/120Hz consistency. The DOM motion harness verifies idle termination, reduced motion and scheduling. All 27 Python checks and JS syntax checks pass. These are implementation checks; live visual smoothness and device performance have not been measured.
