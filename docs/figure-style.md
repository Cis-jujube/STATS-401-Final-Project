# Figure style provenance

This revision follows the user-requested [Scientific Figure Making skill](https://github.com/ChenLiu-1996/figures4papers/blob/3c181f85e82c6f24948fcaaf3be6696102b41d8d/scientific-figure-making/SKILL.md) in Chen Liu's figures4papers repository, reviewed at commit `3c181f85e82c6f24948fcaaf3be6696102b41d8d`.

Read references: [design theory](https://github.com/ChenLiu-1996/figures4papers/blob/3c181f85e82c6f24948fcaaf3be6696102b41d8d/scientific-figure-making/references/design-theory.md) and [API conventions](https://github.com/ChenLiu-1996/figures4papers/blob/3c181f85e82c6f24948fcaaf3be6696102b41d8d/scientific-figure-making/references/api.md).

Implemented in this project's renderer:

- Consistent sans-serif font stack, clear type hierarchy and minimal top/right spines.
- Warm ink and vermilion anchors, distinct rust/gold/stone homework series, and neutral grids.
- Separate symbols as well as color; numerical annotations and frameless legends.
- Common score scales, ordered small multiples, and distinct mobile compositions.
- Shared `apply_publication_style` and `finalize_figure` helpers, noninteractive Agg backend.
- 300 DPI opaque PNG; editable SVG text and embedded TrueType PDF text.

Statistical choices are specific to this dataset: bounded 0–100 normalized homework scores, min–max boxplot whiskers, actual nth-attempt means, explicit sample counts and no unsupported uncertainty bands. Midterm scores retain raw points above 100. No upstream data, example result or claimed paper performance is reused. The skill is read by reference, not installed globally.

## Transparent website compositions

`uv run python scripts/render_figures.py --web` uses the same public homework aggregates and defaults to `assets/story/`. It writes SVG only, with a transparent canvas and light text for the dark webpage. Figure 01 compares reach with repeat intensity and plots visible bursts by Beijing clock time; the private hourly heatmap remains separate. Figure 03 ranks the mean gap between best through three attempts and best observed. The desktop story uses three-stage markers for nine selected rows; the mobile story uses compact gap bars for six selected rows; both publication versions retain all 23 rows and all three stages. Best through two remains available in the accompanying table. The boxplot retains its composition, and actual-attempt scores use three vertical panels with separate N/S rows. No raw student records are loaded by this export.
