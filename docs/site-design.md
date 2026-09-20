# Website design and motion

The published design uses two primary page text sizes, four full-screen desktop chapters with left-hand text and right-hand transparent figures and a dark satin-style background. The continuous background movement and figure expansion guide reading between questions; they do not animate underlying observations or imply learning progress. Data, normalization, privacy suppression and figure artwork retain their existing definitions.

## Implementation and controls

Native HTML, CSS, SVG, Canvas and JavaScript; no remote runtime libraries, fonts, videos or production API calls. Scroll naturally through the four chapters, or follow each chapter’s next-section link. The figure grows from scale 0.72 to 1.08 during the first 46% of its pinned scroll interval, then holds steady for reading. There are no numbered tabs, rounded chart frames, stacked cards or wheel interception. Open a large figure directly, or hold its desktop text button for 900 ms. Enter/Space provides direct keyboard access; Escape closes the dialog. The motion toggle disables decorative movement; system reduced-motion takes priority. Background movement is driven by scroll rather than an endless animation. Reduced-motion and no-JavaScript modes use ordinary flowing sections at full figure scale. Mobile chapters stack text above the figure and allow tall charts to scroll at readable width.

The build entrypoint is `scripts/build_page.py`; `scripts/render_site.py` applies the presentation to the generated evidence sections. Shared fragments are under `scripts/templates/`. CSS and JavaScript are `styles.css` and `assets/site.js`. Transparent website figures come from `scripts/render_figures.py --web`; the white-background publication figures remain the download versions.

## References and scope of reuse

- [React Bits](https://www.reactbits.dev/get-started/index): studied Glow Cursor, Depth Text, Blur Text, Hold Button, Bell Toggle, Scroll Expand, Card Swap, Depth Carousel and Web Threads mechanisms. Implementations here are authored in native browser code; React Bits source components are not bundled or redistributed.
- [MotionSites Velvet Wave](https://www.motionsites.org/prompts/velvet-wave): broad dark curves and concentrated highlights informed the background. The public preview was inspected; playback was partially buffered.
- [MotionSites Dark Vertical Blinds](https://www.motionsites.org/prompts/dark-vertical-blinds): dark material depth and localized illumination informed contrast. Poster inspected; complete video playback not verified.
- [figures4papers](https://github.com/ChenLiu-1996/figures4papers/tree/main/scientific-figure-making): figure typography/export conventions. See [figure-style provenance](figure-style.md).

Background surfaces are original SVG paths and gradients; no third-party video, paid prompt or photographic asset is copied into this repository. Dense wireframe backgrounds explored earlier were rejected and are absent from the published design.

## Evaluation status

The [evaluation protocol](evaluation-plan.md) includes four information tasks, interpretation checks, navigation, motion comfort and revision/retest criteria. Participant evaluation has not yet been conducted. Browser QA verifies operations and rendering, not improved comprehension or academic performance.
