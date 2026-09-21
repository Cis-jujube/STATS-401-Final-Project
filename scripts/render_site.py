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


def render_page(source: str) -> str:
    sections = re.findall(r'<section\b.*?</section>', source, re.S)

    def evidence(section_id):
        section = next(s for s in sections if f'id="{section_id}"' in s)
        return section.replace('<br>', ' ')

    entrances = ("scan", "curtain", "trace", "layers")
    chapters = []
    for i, (section_id, file, topic, title, description, note) in enumerate(SCENES):
        next_id = 'scene-' + SCENES[i + 1][0] if i < len(SCENES) - 1 else 'evidence'
        next_label = 'Next: ' + SCENES[i + 1][2] if i < len(SCENES) - 1 else 'Methods & evidence'
        chapters.append(f'''
<section class="story-chapter" id="scene-{section_id}" data-scene="{i}" aria-labelledby="title-{section_id}">
  <div class="chapter-stage">
    <div class="chapter-copy">
      <p class="eyebrow">{topic}</p>
      <h2 id="title-{section_id}">{title}</h2>
      <p>{description}</p>
      <p class="reading-note">{note}</p>
      <div class="chapter-actions">
        <button class="focus-link" data-figure="{file}" data-title="{topic}" data-note="{escape(note)}"><span class="hold-fill" aria-hidden="true"></span>View full figure ↗</button>
        <a href="#{section_id}">Data &amp; interpretation ↗</a>
      </div>
    </div>
    <figure class="chapter-figure" data-entrance="{entrances[i]}">
      <picture><source media="(max-width:700px)" srcset="assets/story/{file}-mobile.svg"><img src="assets/story/{file}.svg" alt="{escape(topic + '. ' + description + ' ' + note)}" decoding="async"></picture>
    </figure>
    <a class="next-chapter" href="#{next_id}">{next_label} <span>↓</span></a>
  </div>
</section>''')

    background = (ROOT / 'scripts/templates/background-material.html').read_text()
    evaluation = (ROOT / 'scripts/templates/evaluation.html').read_text()
    detail = evidence('research-question') + ''.join(evidence(s[0]) for s in SCENES)
    detail += evidence('dataset') + evaluation + evidence('retry-intervals') + evidence('midterm-plan')
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CS201 Homework Submission Patterns</title>
<meta name="description" content="Four actual-data visualizations of CS201 homework submission timing, retries, and score progression.">
<link rel="stylesheet" href="styles.css"><link rel="icon" href="assets/favicon.svg" type="image/svg+xml"></head>
<body data-scene="0" data-surface="paper"><a class="skip" href="#main">Skip to content</a>
{background}<canvas id="cursor-light" aria-hidden="true"></canvas>
<div class="reading-progress" aria-hidden="true"></div><header class="topbar"><a href="#main">CS201 / Process notes</a><nav aria-label="Main navigation"><a href="#scene-timing">Explore</a><a href="#dataset">Dataset</a><a href="#evaluation">Evaluation</a><button id="motion-toggle" aria-pressed="true"><svg class="bell" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16V10a7 7 0 0 1 14 0v6l2 3H3zM9 22h6"/></svg><span>Motion on</span></button></nav></header>
<main id="main">
<section class="hero-track" aria-labelledby="hero-title"><div class="hero-stage">
<div class="hero-heading"><div><p class="eyebrow">Homework submission patterns / STATS 401</p><h1 id="hero-title"><span class="title-line">The score</span><span class="title-line">has a past.</span></h1></div><p class="hero-context">2,101 submissions.<br>39 window submitters.<br>Three homeworks.<br>Four views of the process.</p></div>
<div class="score-composition" aria-label="HW3 TicTacToe: mean first score 37.95, mean best score 100, same 39 attempters">
<div class="score-start"><p>First submission <span>Mean / 100</span></p><strong>37.95</strong></div>
<svg class="score-arrow" viewBox="0 0 200 80" aria-hidden="true"><path d="M2 40H190M157 8L190 40L157 72"/></svg>
<div class="score-end"><p>Best submission <span>Mean / 100</span></p><strong>100</strong></div></div>
<div class="hero-bottom"><p>HW3 TicTacToe · Same 39 attempters<br><span>First and best scores describe submissions, not a causal learning effect.</span></p><a class="enter" href="#scene-timing">Look behind the score <span>↓</span></a></div>
<p class="byline">Zaozao Wang &amp; Zhengxiang Liu · 20 September 2026</p>
<div class="hero-rule" aria-hidden="true"></div></div></section>
<div id="journey"><div class="journey-opening" aria-hidden="true"><span>Follow the</span><span>submissions.</span></div>{''.join(chapters)}</div>
<div id="evidence" class="evidence-detail">{detail}</div>
</main>
<footer><p>CS201 Homework Submission Patterns · Zaozao Wang &amp; Zhengxiang Liu</p><p>Four completed static figures. Analytical filters and reader evaluation are planned.</p><p><a href="https://github.com/Cis-jujube/STATS-401-Final-Project">Project source ↗</a> · <a href="docs/site-design.md">Design references</a> · <a href="proposal.md">Original proposal (historical)</a></p></footer>
<dialog id="focus-dialog" aria-labelledby="focus-title"><div class="dialog-head"><h2 id="focus-title">Figure focus</h2><button id="close-focus" autofocus>Close ×</button></div><img id="focus-image" alt=""><p id="focus-note"></p></dialog>
<script src="assets/site.js"></script></body></html>'''
