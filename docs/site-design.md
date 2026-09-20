# Website design and motion

The published design uses two primary page text sizes, foreground figure cards, four navigable evidence scenes and a dark satin-style background. The background and card changes indicate which question is selected; they do not animate underlying observations or imply learning progress. Data, normalization, privacy suppression and figure artwork retain their existing definitions.

## Implementation and controls

Native HTML, CSS, SVG, Canvas and JavaScript; no remote runtime libraries, fonts, videos or production API calls. Scroll or use the scene buttons to change figures. Open a large figure directly, or hold the desktop focus button for 900 ms. Enter/Space provides direct keyboard access; Escape closes the dialog. The motion toggle disables decorative movement; system reduced-motion takes priority. Background drift pauses while reading the document details and when the tab is hidden. Without JavaScript, the page shows the full evidence document and static figures.

The build entrypoint is `scripts/build_page.py`; `scripts/render_site.py` applies the presentation to the generated evidence sections. Shared fragments are under `scripts/templates/`. CSS and JavaScript are `styles.css` and `assets/site.js`.

## References and scope of reuse

- [React Bits](https://www.reactbits.dev/get-started/index): studied Glow Cursor, Depth Text, Blur Text, Hold Button, Bell Toggle, Scroll Expand, Card Swap, Depth Carousel and Web Threads mechanisms. Implementations here are authored in native browser code; React Bits source components are not bundled or redistributed.
- [MotionSites Velvet Wave](https://www.motionsites.org/prompts/velvet-wave): broad dark curves and concentrated highlights informed the background. The public preview was inspected; playback was partially buffered.
- [MotionSites Dark Vertical Blinds](https://www.motionsites.org/prompts/dark-vertical-blinds): dark material depth and localized illumination informed contrast. Poster inspected; complete video playback not verified.
- [figures4papers](https://github.com/ChenLiu-1996/figures4papers/tree/main/scientific-figure-making): figure typography/export conventions. See [figure-style provenance](figure-style.md).

Background surfaces are original SVG paths and gradients; no third-party video, paid prompt or photographic asset is copied into this repository. Dense wireframe backgrounds explored earlier were rejected and are absent from the published design.

## Evaluation status

The [evaluation protocol](evaluation-plan.md) includes four information tasks, interpretation checks, navigation, motion comfort and revision/retest criteria. Participant evaluation has not yet been conducted. Browser QA verifies operations and rendering, not improved comprehension or academic performance.
