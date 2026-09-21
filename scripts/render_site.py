"""Render a continuous, fullscreen visual narrative from the public evidence."""
from html import escape
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SCENES = [
    ('timing', '01-calendar', 'Timing', '233 submissions.<br>14 people.',
     'On 29 August, activity volume and participation told different stories. A busy period does not mean the whole class was working.',
     'Four-hour cells · Beijing time · groups below five masked'),
    ('retries', '02-attempts', 'Retries', 'Similar medians.<br>Different paths.',
     'Typical counts are 12.5, 13 and 14. Behind those medians, the observed ranges are 8–98, 3–62 and 7–108.',
     'Window submitters only · counts do not measure effort'),
    ('scores', '03-score-progression', 'First to best', 'The endpoint<br>leaves things out.',
     'For HW3 TicTacToe, the same 39 attempters average 37.95 first and 100 best. The final score hides that difference.',
     'Same attempters · normalized scores · no causal claim'),
    ('attempt-scores', '04-attempt-scores', 'Actual attempt scores', 'A new attempt.<br>A different cohort.',
     'Each point averages the actual nth submission to a problem. Pairs that stop submitting leave the later points.',
     'N = events · S = students · no carry-forward'),
]


def render_page(source: str, midterm: dict) -> str:
    scenes = SCENES + [
        ('midterm-distribution', '05-midterm-distribution', 'Midterm scores', 'Same homework.<br>A wider spread.',
         f"The {midterm['matched']} available exam scores average {midterm['mean']:.2f}. This is a partial cohort: 15 eligible roster members are not in the supplied grade excerpt.",
         'Raw exam points · scores above 100 retained · 26 of 41 members'),
        ('midterm-associations', '06-midterm-associations', 'Process and exam', 'An association.<br>Not an explanation.',
         f"Final-day submission share has a negative rank association with exam scores (ρ = {midterm['associations'][2]['rho']:+.2f}). Count and first-score intervals cross zero.",
         'Paired student bootstrap · partial cohort · no causal claim'),
        ('midterm-attempt-groups', '07-midterm-attempt-groups', 'Overlapping outcomes', 'More attempts.<br>No simple rule.',
         'Exam-score ranges overlap across submission groups. The middle group has the highest mean; the highest-count group has the highest median.',
         'Bands = middle 50% · line = median · diamond = mean'),
    ]
    scenes += [
        ('platform-coverage', '08-platform-coverage', 'Platform coverage', 'A second window.<br>Only part of the story.',
         'All 26 grade records match Course Pulse accounts, but only 11 have recorded pre-exam usage. Personal tracking begins on 8 September.',
         'Nested subsets · no record does not mean no learning'),
        ('platform-groups', '09-platform-groups', 'Platform and scores', 'A difference.<br>Not a platform effect.',
         'Recorded users average 95.27 points, compared with 86.17 for those without records. Prior ability and off-platform study remain unknown.',
         '11 recorded / 15 without records · bands = middle 50%'),
        ('platform-associations', '10-platform-associations', 'Combined evidence', 'Timing stands out.<br>Usage is less certain.',
         'Platform time, recorded days and resource opens show positive associations, but all three intervals cross zero. OJ final-day share remains negative.',
         'Same 26 students · different tracking windows · exploratory'),
    ]
    sections = re.findall(r'<section\b.*?</section>', source, re.S)

    def evidence(section_id):
        section = next(s for s in sections if f'id="{section_id}"' in s)
        return section.replace('<br>', ' ')

    # User-requested iteration: each chapter has a distinct composition and motion.
    art = [
        ('atlas', 'down', 'copper', 'scan'),
        ('reverse', 'left', 'ocean', 'push'),
        ('offset', 'diagonal', 'olive', 'diagonal'),
        ('panorama', 'right', 'ink', 'shards'),
        ('reverse', 'up', 'plum', 'iris'),
        ('editorial', 'left', 'teal', 'push'),
        ('offset', 'right', 'clay', 'shards'),
        ('reverse', 'diagonal', 'forest', 'diagonal'),
        ('editorial', 'up', 'wine', 'iris'),
        ('atlas', 'left', 'midnight', 'push'),
    ]
    chapters = []
    for i, (section_id, file, topic, title, description, note) in enumerate(scenes):
        layout, direction, palette, entrance = art[i]
        previous_id = 'scene-' + scenes[i - 1][0] if i else 'main'
        next_id = 'scene-' + scenes[i + 1][0] if i < len(scenes) - 1 else 'evidence'
        next_label = 'Next: ' + scenes[i + 1][2] if i < len(scenes) - 1 else 'Methods & evidence'
        chapters.append(f'''
<section class="story-chapter" id="scene-{section_id}" data-scene="{i}" data-layout="{layout}" data-direction="{direction}" data-palette="{palette}" aria-labelledby="title-{section_id}">
  <div class="chapter-stage">
    <div class="scene-wash" aria-hidden="true"></div>
    <span class="scene-index" aria-hidden="true">{i + 1:02d}</span>
    <div class="chapter-layout">
    <div class="chapter-copy">
      <p class="eyebrow">{topic}</p>
      <h2 id="title-{section_id}">{title}</h2>
      <p>{description}</p>
      <p class="reading-note">{note}</p>
      <div class="chapter-actions">
        <button class="focus-link" data-figure="{file}" data-title="{topic}" data-note="{escape(note)}"><span class="hold-fill" aria-hidden="true"></span>View full figure ↗</button>
        <a href="analysis.html#{section_id}">Data &amp; interpretation ↗</a>
      </div>
    </div>
    <figure class="chapter-figure" data-entrance="{entrance}">
      <picture><source media="(max-width:700px)" srcset="assets/story/{file}-mobile.svg"><img src="assets/story/{file}.svg" alt="{escape(topic + '. ' + description + ' ' + note)}" decoding="async"></picture>
{''.join(f'<div class="figure-shard shard-{n}" aria-hidden="true"><picture><source media="(max-width:700px)" srcset="assets/story/{file}-mobile.svg"><img src="assets/story/{file}.svg" alt="" loading="lazy" decoding="async"></picture></div>' for n in range(4)) if entrance == 'shards' else ''}
    </figure>
    </div>
    <a class="previous-chapter" href="#{previous_id}" aria-label="Previous chapter">← Previous</a>
    <a class="next-chapter" href="#{next_id}">{next_label} <span>↓</span></a>
  </div>
</section>''')

    background = (ROOT / 'scripts/templates/background-material.html').read_text()
    evaluation = (ROOT / 'scripts/templates/evaluation.html').read_text()
    detail = evidence('research-question') + ''.join(evidence(s[0]) for s in scenes)
    detail += evidence('dataset') + evaluation + evidence('retry-intervals') + evidence('midterm-plan')
    toc = ''.join(f'<a href="#{sid}">{escape(topic)}</a>' for sid, _, topic, *_ in scenes)
    analysis = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Analysis &amp; Methods · CS201</title><link rel="stylesheet" href="styles.css"></head><body class="analysis-page" data-surface="paper"><a class="skip" href="#evidence">Skip to analysis</a><header class="topbar"><a href="index.html">← Visual story</a><nav aria-label="Analysis navigation"><a href="#dataset">Dataset</a><a href="#midterm-plan">Methods</a><a href="#evaluation">Evaluation</a></nav></header><main id="evidence" class="evidence-detail"><section><p class="eyebrow">RESEARCH COMPANION</p><h1>Analysis &amp; methods</h1><p>Interpretations, accessible data tables, sources and limitations for the visual story.</p><nav class="analysis-toc" aria-label="Chart analysis">{toc}</nav></section>{detail}</main><footer><a href="index.html#scene-platform-associations">Return to the visual story ↗</a></footer></body></html>'''
    (ROOT/'analysis.html').write_text(analysis.replace('><', '>\n<')+'\n')
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CS201 Learning Process &amp; Midterm Outcomes</title>
<meta name="description" content="Ten actual-data views of CS201 homework behavior and exploratory midterm associations in a partial 26-student cohort.">
<link rel="stylesheet" href="styles.css"><link rel="icon" href="assets/favicon.svg" type="image/svg+xml"></head>
<body data-scene="0" data-surface="paper"><a class="skip" href="#main">Skip to content</a>
{background}<canvas id="cursor-light" aria-hidden="true"></canvas>
<div class="reading-progress" aria-hidden="true"></div><header class="topbar"><a href="#main">CS201 / Process notes</a><nav aria-label="Main navigation"><a href="#scene-timing">Explore</a><a href="#scene-midterm-distribution">Midterm</a><a href="#scene-platform-coverage">Platform</a><a href="analysis.html">Analysis &amp; methods</a><button id="motion-toggle" aria-pressed="true"><svg class="bell" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16V10a7 7 0 0 1 14 0v6l2 3H3zM9 22h6"/></svg><span>Motion on</span></button></nav></header>
<main id="main">
<section class="hero-track" aria-labelledby="hero-title"><div class="hero-stage">
<div class="hero-heading"><div><p class="eyebrow">OJ + Course Pulse + midterm outcomes / STATS 401</p><h1 id="hero-title"><span class="title-line">The score</span><span class="title-line">has a past.</span></h1></div><p class="hero-context">2,101 submissions.<br>Three homeworks.<br>26 matched exam scores.<br>Two behavior sources.<br>Ten views of the evidence.</p></div>
<div class="score-composition" aria-label="HW3 TicTacToe: mean first score 37.95, mean best score 100, same 39 attempters">
<div class="score-start"><p>First submission <span>Mean / 100</span></p><strong>37.95</strong></div>
<svg class="score-arrow" viewBox="0 0 200 80" aria-hidden="true"><path d="M2 40H190M157 8L190 40L157 72"/></svg>
<div class="score-end"><p>Best submission <span>Mean / 100</span></p><strong>100</strong></div></div>
<div class="hero-bottom"><p>HW3 TicTacToe · Same 39 attempters<br><span>First and best scores describe submissions, not a causal learning effect.</span></p><a class="enter" href="#scene-timing">Look behind the score <span>↓</span></a></div>
<p class="byline">Zaozao Wang &amp; Zhengxiang Liu · Updated 21 September 2026</p>
<div class="hero-rule" aria-hidden="true"></div></div></section>
<div id="journey"><div class="journey-opening" aria-hidden="true"><span>Follow the</span><span>submissions.</span></div>{''.join(chapters)}</div>
<section id="evidence" class="story-ending"><p class="eyebrow">CONTINUE THE RESEARCH</p><h2>Behind the figures.</h2><p>Read the detailed analysis, data tables and methods on a separate page.</p><a class="enter" href="analysis.html">Analysis &amp; methods ↗</a></section>
</main>
<footer><p>CS201 Learning Process &amp; Midterm Outcomes · Zaozao Wang &amp; Zhengxiang Liu</p><p>Ten completed static figures. Partial midterm cohort; analytical filters and reader evaluation are planned.</p><p><a href="analysis.html#evaluation">Evaluation plan</a> · <a href="https://github.com/Cis-jujube/STATS-401-Final-Project">Project source ↗</a> · <a href="docs/site-design.md">Design references</a> · <a href="proposal.md">Original proposal (historical)</a></p></footer>
<dialog id="focus-dialog" aria-labelledby="focus-title"><div class="dialog-head"><h2 id="focus-title">Figure focus</h2><button id="close-focus" autofocus>Close ×</button></div><img id="focus-image" alt=""><p id="focus-note"></p></dialog>
<script src="assets/motion-math.js"></script><script src="assets/site.js"></script></body></html>'''
