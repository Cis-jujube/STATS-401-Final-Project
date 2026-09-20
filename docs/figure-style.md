# Figure style provenance

This revision follows the user-requested [Scientific Figure Making skill](https://github.com/ChenLiu-1996/figures4papers/blob/3c181f85e82c6f24948fcaaf3be6696102b41d8d/scientific-figure-making/SKILL.md) in Chen Liu's figures4papers repository, reviewed at commit `3c181f85e82c6f24948fcaaf3be6696102b41d8d`.

Read references: [design theory](https://github.com/ChenLiu-1996/figures4papers/blob/3c181f85e82c6f24948fcaaf3be6696102b41d8d/scientific-figure-making/references/design-theory.md) and [API conventions](https://github.com/ChenLiu-1996/figures4papers/blob/3c181f85e82c6f24948fcaaf3be6696102b41d8d/scientific-figure-making/references/api.md).

Implemented in this project's renderer:

- Consistent sans-serif font stack, clear type hierarchy and minimal top/right spines.
- Blue anchor palette, distinct blue/teal/red homework series, neutral grids and masked regions.
- Separate symbols as well as color; numerical annotations and frameless legends.
- Common score scales, ordered small multiples, and distinct mobile compositions.
- Shared `apply_publication_style` and `finalize_figure` helpers, noninteractive Agg backend.
- 300 DPI opaque PNG; editable SVG text and embedded TrueType PDF text.

Statistical choices are specific to this dataset: bounded 0–100 scores, min–max boxplot whiskers, actual nth-attempt means, explicit sample counts and no unsupported uncertainty bands. No upstream data, example result or claimed paper performance is reused. The skill is read by reference, not installed globally.
