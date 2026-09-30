# Presentation and full-story playback

Implemented locally on 29 September 2026; full-story playback added on 30 September. The default page still uses native scrolling. **Play full story** starts a continuous 70.1-second edit from the opening. **Start presentation** enters at the currently visible chapter; one **Continue** plays one authored transition and automatically stops at the next complete figure. There is no timer for the speaker's explanation in presentation mode.

## Full-story playback

The red **Play full story** button in the opening starts the entire sequence after all five responsive figure images have decoded. **More → Play full story from the start** is also available during a presentation. Every transition, decorative canvas, card and camera move uses the same playhead. There is no embedded video, video dependency, synthetic data animation, or independent background animation timer.

| Scene | Entrance | Reading time |
| --- | ---: | ---: |
| Opening | — | 2.2 s |
| Timing | 6.0 s | 6.5 s |
| Problem bottlenecks | 4.6 s | 7.5 s |
| Actual attempt scores | 3.4 s | 7.0 s |
| Process and exam | 5.2 s | 9.0 s |
| Combined evidence | 3.8 s | 8.5 s |
| Research archive | 3.2 s | 3.2 s |

- **Pause / Resume** and Space stop and resume both entrances and reading time. Paused time does not accumulate.
- The whole-story progress bar seeks in 10 ms increments. Seeking stays paused; Resume continues from that position. Small tick marks locate complete chapters. Native keyboard controls remain available on the slider.
- **Hold for explanation** completes the incoming figure and pauses there indefinitely. Resume continues the film with the figure's full reading interval.
- Previous, chapter directory, full figure, replay entrance, and Finish transition remain available. Jumps land paused. At the ending, the primary button becomes **Replay film**; there is no automatic loop.
- Tall scenes pan vertically during the middle of their reading interval. Wheel or touch input pauses the film before native manual inspection. Motion off disables this automatic pan and all optical transitions while retaining the timed sequence.
- Opening the menu or figure dialog, leaving the tab/window, changing viewport or fullscreen pauses playback. It never resumes merely because focus returns.
- Preloading failure exposes Retry play. Exit, pause and new navigation invalidate pending preparation; a late decode cannot restart an exited story.

The latest visual revision uses six different mechanisms: a zero-counter portal containing the opposing **Follow the submissions** lines; a rigid press with three strikes; a camera drop outside architectural slabs; a single moving folio over stationary evidence; lateral parallax between incomplete frames; and a quiet rule leading to the archive link. Complete figures stay in their final geometry beneath these surfaces. All effects disappear at the readable stop. Real chart marks, scales, labels and counts are unchanged.

`assets/film-clock.js` defines the seekable edit independently of the DOM. `assets/presentation-choreography.js` produces the same numeric channels for any given scene and playhead position, including reverse seeking. `assets/presentation-effects.js` projects bounded decorative geometry at a maximum 1.5× pixel ratio: seven slabs for the drop, or four incomplete frames on desktop and three on mobile for parallax. Neither module owns a timer. The presenter schedules the only RAF and stops at pause/end. `scripts/presentation_markup.py` holds the edit durations and chapter typography.

## Operation

- Seven stops: opening, five featured figures, research archive. The Follow interlude is part of the opening transition, not another stop.
- **Continue / Pause / Resume** controls the current segment. **Previous** shows the previous complete figure; during A → B it returns to A. The ending does not loop.
- Space operates playback when focus is on the presentation stage/transport region. Right/PageDown advances only from a stop; Left/PageUp returns. Focused links, buttons, selects, and the native figure dialog retain their keyboard behavior. Repeated keydown and rapid clicks do not queue extra scenes.
- **More** includes a figure directory, full figure, replay, finish current transition, fullscreen, and motion toggle. Opening More pauses. Closing it does not resume.
- A figure dialog, window blur, hidden tab, or resize pauses a running segment. Resume is explicit. Escape closes the dialog/menu first, then leaves presentation; fullscreen Escape follows the browser's native behavior.
- On small or short screens, scroll inside the current scene to inspect the whole figure; scrolling never advances the presentation. The transport strip remains outside the scrolling area. A scroll hint appears when needed.
- Exit restores the current completed scene in the reading document and focuses its figure control. Exiting a partially played A → B segment returns to A.
- Motion off and system reduced-motion retain the same stops with direct jumps. Without JavaScript, the five featured figures remain in the document and the presentation entry stays hidden.

## Five-figure curation

The main route is Timing → Problem bottlenecks → Actual attempt scores → Process and exam → Combined evidence. It asks when submissions cluster, which problems retain a gap, how changing cohorts affect retry means, whether the exam association is stable, and what remains uncertain across sources. Attempts, platform coverage, and platform score groups remain on the analysis page; coverage limits are also visible beside the final main figure. The metadata, directory, counter and previous/next links all follow this same five-scene list.

## Visual sequence and factual boundaries

Manual presentation retains its shorter 4.2-second opening and 2.0–3.2-second later entrances. Full-story playback uses the longer edit in the table above. Both modes share the same deterministic choreography. The complete underlying scene changes only while a foreground surface covers it; its controls stay inert until that surface is clear. The slabs and parallax frames are unnumbered decoration and encode neither observations nor sample sizes.

The GAP transition uses **HW3 EvenOrOdd, the same 39 attempters**: first 40.51, best through three 66.15, and best observed 100.00. It then resolves to the existing selected-row ranking. These labels come from `data/summary.json`, not copied constants in the JavaScript. Best through three is a cumulative maximum, not the actual third submission.

The robustness transition previews one metric—final-day submission share—across three distinct checks. Bootstrap interval, leave-one-out range, and sensitivity cohorts use the original public values on a shared −1 to +1 scale. It then resolves to the original complete A/B/C figure, including all three metrics and definitions. The range is explicitly distinguished from a confidence interval. No observational values are interpolated during movement.

The original data files and all figure assets are unchanged. The analysis companion keeps its ten complete evidence sections; its introduction now describes the five featured chapters. The transient captions and mini-plots are decorative, noninteractive, and hidden from assistive technology; the complete existing figures remain the accessible evidence.

The visual reference is [pdoom-video](https://github.com/mexicat/pdoom-video), studied through its scene and timeline source. The web implementation uses original native HTML/CSS/JS code and the website's own public aggregate figures. No video engine, third-party scene assets, audio, or new runtime dependency was imported.

## Implementation

| File | Responsibility |
| --- | --- |
| `assets/presentation-clock.js` | Pure, explicit-time HOLD / PLAYING / PAUSED state; named stops; no timer or DOM dependencies |
| `assets/presentation.js` | Resource preparation, bounded RAF loop, inputs, pause policy, focus, layout, and fullscreen |
| `assets/presentation.css` | Opt-in stage and transport layouts; timed bridge layers; responsive complete-figure states |
| `assets/site.js` | Reading/presentation ownership handoff, cached-style invalidation, and native figure-dialog integration |
| `scripts/presentation_markup.py` | Scene durations, controls, and aggregate-derived transient captions |
| `scripts/render_site.py` | One scene/content source for reading and presenting; generated metadata and script order |

There is one active time source. Entering presentation cancels the reader's queued frame and its scroll-snap/landing behavior. Exiting invalidates the reader's cached CSS writes and spring states before restoring reading. The presenter stops scheduling frames at HOLD and PAUSED. A token invalidates stale decode work after another choice, pause, or exit. Failed figure decoding leaves the current readable figure in place and offers retry/directory/exit recovery.

Browser API references checked for this implementation: [inert](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/inert), [visibilitychange](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event), and [requestFullscreen](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen).

## Verification

Run the dependency-free state checks and existing repository checks:

```sh
uv run python scripts/build_page.py
uv run python -m unittest discover -s tests -v
node tests/test_presentation.cjs
node tests/test_motion_math.cjs
node tests/test_motion.cjs
node tests/test_cinema.cjs
node tests/test_film.cjs
node tests/test_film_effects.cjs
node tests/test_choreography.cjs
node --check assets/presentation.js
node --check assets/presentation-clock.js
git diff --check
```

`tests/test_presentation_browser.cjs` is an additional real Chrome suite. It uses an **already available** Playwright installation and starts no server. Set `NODE_PATH` to that installation's node_modules when it is not already on the module search path, and `PRESENTATION_URL` to an authorized running HTTP preview. Do not use its legacy `file://` fallback in this environment. No dependency declaration or lockfile was changed. Screenshots default to `/tmp/cs201-presentation-qa`; override with `PRESENTATION_QA_DIR`.

Both browser suites also support `PRESENTATION_URL` for an already-running HTTP preview; the new `tests/test_film_browser.cjs` requires it. Neither suite starts a server. The full-story revision passed 33 Python tests and six JavaScript suites, including 48 pure clock assertions and deterministic optical-frame checks. Its newly added browser suite covers four viewport sizes, complete playback, two-minute pause, seek, explanation hold, chapter arrivals, mobile panning, blur, ending/replay and reduced motion. **The new browser suite and updated visual appearance are awaiting runtime verification; the following 193-assertion and performance results describe the previous revision, not this full-story upgrade.**

The five-figure revision passed **32 Python tests, four JavaScript suites, and 193 real-browser assertions**, including the new route and supporting-evidence retention checks. The prior eight-figure run had 259 browser assertions because it visited three additional scenes across each viewport. Local verification covers all seven current stops at 1440×900, 1366×768, 1024×650 and 390×844; actual complete-figure resources; no horizontal overflow; reachable tall figures; inactive scenes excluded from focus; bounded transitions; simulated two-minute HOLD/PAUSED intervals; keyboard repeats; mid-transition return; dialogs; blur and resize; repeated entry/exit; loading failure/retry; reduced motion; no-script fallback; and zero presenter RAF scheduling while stopped. Python tests also reconcile the transient captions and scene metadata with public aggregates. Browser tests use controlled time for long waits; this is distinct from performance measurement.

A separate real-time headless Chrome 152.0.7977.83 run on macOS arm64, 1440×900 at DPR 1 measured:

| Scenario | Sampled frames | Frame interval p50 | p95 | Long tasks ≥50 ms |
| --- | ---: | ---: | ---: | ---: |
| Original reading page, 5-second scroll sweep | 300 | 16.7 ms | 16.7 ms | 0 |
| Updated reading page, same sweep | 300 | 16.7 ms | 16.8 ms | 0 |
| Presentation opening, 4.2 seconds | 250 | 16.7 ms | 16.7 ms | 0 |

These are local headless samples, not a claim about projector performance, Safari/iOS, every device, or a participant study. New presentation JS/CSS totals roughly 32 KB uncompressed / 9 KB gzip, before the small generated HTML addition. The stage uses the existing graph images and canvas budget.

An initial local browser recording covered opening, GAP and robustness playback before the five-figure curation; it is historical and is not bundled with the public website. Native projector/fullscreen behavior, physical presenter remotes, and an actual spoken rehearsal remain to be checked on the target equipment. Optional within-figure steps and future event-level analyses remain outside this first implementation. Push and deployment are separate actions.

## Earlier motion revision, 30 September (historical)

Before the later request for a ten-agent design discussion, the motion layer was revised after re-reading pdoom-video's `hook`, `dense-press`, `stack` and `ilya` source. `assets/presentation-choreography.js` now gives the six entrances distinct portal / press / stack / papers / seam / archive profiles. The changes add full-frame title impact, alternating type walls, stronger forward camera motion, staged card entry, and field-to-seam or curtain handoffs. This is original native web code; no reference audio, fonts or engine were imported.

The update passes 33 Python tests and seven JavaScript suites. The choreography suite samples 6,006 frames for finite values, opacity bounds, repeatable seeking and fully settled figure landings. Actual browser appearance and performance of this revision remain unverified. Run `node tests/test_choreography.cjs` in addition to the commands above.

At that point the proposed multi-agent review had not run. It subsequently ran with three subagents and a primary agent; the following revision supersedes the earlier motion design.

## Actual multi-agent revision, 30 September

Three subagents independently proposed motions, then each criticized both other proposals. The primary agent selected and integrated the sequence: four participants in total. An extra platform shutter was rejected to avoid repeating the portal, press and folio openings. A proposed semantic reading of parallax was also rejected: viewpoint changes are decorative and do not imply that the matched student sources become independent.

The generic radial streaks, repeated word walls, common giant slate and whole-chart entrances were removed from presentation mode. Native reading and its Follow interlude remain. No dependency was declared or installed. The five featured charts, ten analysis charts, manual indefinite stops, 70.1-second full story, and uncertainty/coverage statements are preserved.

Current real-browser runs passed 193 manual-mode assertions and 290 full-story assertions at 1440×900, 1366×768, 1024×650 and 390×844. Spatial titles received a dark backing after screenshot review found low contrast over light geometry; eight subsequent desktop/mobile frames confirmed readable, contained titles. `scripts/capture_presentation.cjs` then captured real 70.1-second playback, paused frames and every complete-chart stop. Chrome 154.0.8037.58 at 1440×900 recorded 4,201 frame intervals, with p50/p95 of 16.7 ms, no observed long tasks and no page errors. This is one local headless sample, not a device-wide performance guarantee; generated recordings and samples remain local.

Both suites initially encountered an entry button still hidden. Independent HTTP checks found no resource or JavaScript failures; subsequent full runs passed without an initialization-code change. The initial failure was not reproduced or assigned a proven cause. Safari/iOS, projector/remotes and a spoken rehearsal remain unverified. These checks do not establish a participant-study outcome.

To reproduce the browser checks, use an existing HTTP preview, or start one when appropriate with `uv run python -m http.server 8765 --bind 127.0.0.1` and stop it with Ctrl-C. Set `PRESENTATION_URL=http://127.0.0.1:8765/index.html` and `NODE_PATH` to an available Playwright installation, then run both browser test files or `node scripts/capture_presentation.cjs`. The scripts do not start a service or install dependencies.
