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
