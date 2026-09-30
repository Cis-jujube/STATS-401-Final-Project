"""Render a continuous, fullscreen visual narrative from the public evidence."""
from html import escape
from pathlib import Path
import re
from story_cinema import archive, figure_scenery, portal, strips, title_lines

ROOT = Path(__file__).resolve().parents[1]
def homework_scenes(data):
    assignments = data['assignments']
    visible = [c for c in data['calendar'] if c['state']=='visible' and c['submissions'] > 0]
    peak = max(visible, key=lambda c:c['submissions'])
    day = data['peak_day']
    medians = ', '.join(f"{a['all_attempts']['median']:g}" for a in assignments)
    ranges = ', '.join(f"{a['all_attempts']['min']}–{a['all_attempts']['max']}" for a in assignments)
    remaining = sum(r['best']-r['best3'] > 10 for r in data['score_progression'])
    problems = len(data['score_progression'])
    rates = '; '.join(f"{r['homework']} {r['improvement_pct']:.1f}%" for r in data['event_progress']['by_homework']
                      if r['state']=='visible' and r['eligible_retries'])
    return [
        ('timing', '01-calendar', 'Visible submission peaks', 'A busy window.<br>How many people?',
         f"On {day['date']}, {day['submissions']} submissions came from {day['contributors']} students. The largest publicly visible four-hour cell held {peak['submissions']} submissions from {peak['contributors']} contributors; masked cells keep the overall peak unknown.",
         'Visible cells only · submissions are not study time'),
        ('retries', '02-attempts', 'Retries', 'Similar medians.<br>Different paths.',
         f'Typical counts across HW1–HW4 are {medians}. The observed ranges are {ranges}.',
         'Window submitters only · counts do not measure effort'),
        ('scores', '03-score-progression', 'Problem bottlenecks', 'Which problems<br>keep a gap?',
         f'{remaining} of {problems} problem slots have more than a 10-point gap between mean best through three attempts and best observed. The story selects {len(assignments)*3} rows on desktop and {len(assignments)*2} on mobile; the analysis shows all {problems}.',
         'Same attempters per problem · means do not count students who improved'),
        ('attempt-scores', '04-attempt-scores', 'Actual attempt scores', 'A new attempt.<br>A different cohort.',
         'Each point averages the actual nth submission to a problem. Pairs that stop submitting leave the later points. Four panels now cover HW1–HW4.',
         'N = events · S = students · no carry-forward'),
        ('retry-productivity', '11-retry-productivity', 'Productive retries', 'Another try.<br>A new best?',
         f'Strict improvements among eligible retries: {rates}. First scores establish a baseline; retries after full credit are excluded. Compare the gap bins with their event counts.',
         'New bests / eligible retries · elapsed gaps are not study time'),
        ('deadline-progress', '12-deadline-progress', 'Progress and deadlines', 'A window of time.<br>Where is the progress?',
         'Split each homework window into five equal-duration phases. Read new-best counts alongside the rate and contributors. Hatched cells are withheld, not zero.',
         'Equal-duration bins within homework · configured deadlines · descriptive'),
    ]


def render_page(source: str, midterm: dict, homework: dict) -> str:
    late = next(row for row in midterm['associations'] if row['metric'] == 'late_pct')
    scenes = homework_scenes(homework) + [
        ('midterm-associations', '06-midterm-associations', 'Process and exam', 'How stable is<br>the association?',
         f"Final-day submission share has a negative rank association with exam scores (ρ = {late['rho']:+.2f}). Compare its bootstrap interval, leave-one-out range and two sensitivity cohorts before interpreting it.",
         '26 available grades · sensitivity checks are not adjusted effects'),
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
    art = {
        'timing': ('atlas', 'down', 'copper', 'scan'),
        'retries': ('reverse', 'left', 'ocean', 'push'),
        'scores': ('offset', 'diagonal', 'olive', 'diagonal'),
        'attempt-scores': ('panorama', 'right', 'ink', 'push'),
        'retry-productivity': ('editorial', 'left', 'teal', 'push'),
        'deadline-progress': ('atlas', 'down', 'forest', 'scan'),
        'midterm-associations': ('editorial', 'left', 'teal', 'push'),
        'platform-coverage': ('reverse', 'diagonal', 'forest', 'diagonal'),
        'platform-groups': ('editorial', 'up', 'wine', 'iris'),
        'platform-associations': ('atlas', 'left', 'midnight', 'push'),
    }
    chapters = []
    cinema = {
        'timing': 'perspective', 'retries': 'hinge', 'scores': 'slices',
        'attempt-scores': 'slices', 'midterm-associations': 'focus',
        'retry-productivity': 'focus', 'deadline-progress': 'perspective',
        'platform-coverage': 'stack', 'platform-groups': 'aperture',
        'platform-associations': 'converge',
    }
    for i, (section_id, file, topic, title, description, note) in enumerate(scenes):
        layout, direction, palette, entrance = art[section_id]
        previous_id = 'scene-' + scenes[i - 1][0] if i else 'main'
        next_id = 'scene-' + scenes[i + 1][0] if i < len(scenes) - 1 else 'evidence'
        next_label = 'Next: ' + scenes[i + 1][2] if i < len(scenes) - 1 else 'Methods & evidence'
        focus_label = 'Enlarge this figure ↗' if section_id == 'scores' else 'View full figure ↗'
        analysis_label = f"All {len(homework['score_progression'])} problems & data ↗" if section_id == 'scores' else 'Data & interpretation ↗'
        chapters.append(f'''
<section class="story-chapter" id="scene-{section_id}" data-scene="{i}" data-layout="{layout}" data-direction="{direction}" data-palette="{palette}" data-cinema="{cinema[section_id]}" aria-labelledby="title-{section_id}">
  <div class="chapter-stage">
    <div class="scene-wash" aria-hidden="true"></div>
    <div class="scene-orbit" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="scene-thread" aria-hidden="true"></div>
    <span class="scene-index" aria-hidden="true">{i + 1:02d}</span>
    <div class="chapter-layout">
    <div class="chapter-copy">
      <p class="eyebrow">{topic}</p>
      <h2 id="title-{section_id}">{title_lines(title)}</h2>
      <p>{description}</p>
      <p class="reading-note">{note}</p>
      <div class="chapter-actions">
        <button class="focus-link" data-figure="{file}" data-title="{topic}" data-note="{escape(note)}"><span class="hold-fill" aria-hidden="true"></span>{focus_label}</button>
        <a href="analysis.html#{section_id}">{escape(analysis_label)}</a>
      </div>
    </div>
    <figure class="chapter-figure" data-entrance="{entrance}">
      {figure_scenery()}
      <picture><source media="(max-width:700px)" srcset="assets/story/{file}-mobile.svg"><img src="assets/story/{file}.svg" alt="{escape(topic + '. ' + description + ' ' + note)}" decoding="async"></picture>
{strips(file) if cinema[section_id] == 'slices' else ''}
    </figure>
    </div>
    <a class="previous-chapter" href="#{previous_id}" aria-label="Previous chapter">← Previous</a>
    <a class="next-chapter" href="#{next_id}">{next_label} <span>↓</span></a>
  </div>
</section>''')

    background = (ROOT / 'scripts/templates/background-material.html').read_text()
    evaluation = (ROOT / 'scripts/templates/evaluation.html').read_text()
    analysis_sections = [
        ('timing', 'Visible submission peaks'), ('retries', 'Retries'), ('scores', 'Problem bottlenecks'),
        ('attempt-scores', 'Actual attempt scores'),
        ('retry-productivity', 'Productive retries'), ('deadline-progress', 'Progress and deadlines'),
        ('midterm-distribution', 'Midterm scores'),
        ('midterm-associations', 'Process and exam'),
        ('midterm-attempt-groups', 'Submission groups'),
        ('platform-coverage', 'Platform coverage'),
        ('platform-groups', 'Platform and scores'),
        ('platform-associations', 'Combined evidence'),
    ]
    detail = evidence('research-question') + ''.join(evidence(sid) for sid, _ in analysis_sections)
    detail += evidence('dataset') + evaluation + evidence('retry-intervals') + evidence('midterm-plan')
    toc = ''.join(f'<a href="#{sid}">{escape(topic)}</a>' for sid, topic in analysis_sections)
    analysis = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Analysis &amp; Methods · CS201</title><link rel="stylesheet" href="styles.css"></head><body class="analysis-page" data-surface="paper"><a class="skip" href="#evidence">Skip to analysis</a><header class="topbar"><a href="index.html">← Data film</a><nav aria-label="Analysis navigation"><a href="#dataset">Dataset</a><a href="#midterm-plan">Methods</a><a href="#evaluation">Evaluation</a></nav></header><main id="evidence" class="evidence-detail"><section><p class="eyebrow">RESEARCH COMPANION</p><h1>Analysis &amp; methods</h1><p>Ten featured chapters and twelve downloadable figures, including the midterm distribution and submission-group comparison retained here as context.</p><nav class="analysis-toc" aria-label="Chart analysis">{toc}</nav></section>{detail}</main><footer><a href="index.html#exam">Return to the data film ↗</a></footer></body></html>'''
    (ROOT/'analysis.html').write_text(analysis.replace('><', '>\n<')+'\n')
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CS201 Learning Process &amp; Midterm Outcomes</title>
<meta name="description" content="Ten featured views of CS201 homework behavior and exploratory midterm associations in a partial 26-student cohort.">
<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="assets/cinema.css"><link rel="icon" href="assets/favicon.svg" type="image/svg+xml"></head>
<body data-scene="0" data-surface="paper"><a class="skip" href="#main">Skip to content</a>
{background}<canvas id="cursor-light" aria-hidden="true"></canvas>
<div class="reading-progress" aria-hidden="true"></div><header class="topbar"><a href="#main">CS201 / Process notes</a><nav aria-label="Main navigation"><a href="#scene-timing">Explore</a><a href="#scene-midterm-associations">Midterm</a><a href="#scene-platform-coverage">Platform</a><a href="analysis.html">Analysis &amp; methods</a><button id="motion-toggle" aria-pressed="true"><svg class="bell" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16V10a7 7 0 0 1 14 0v6l2 3H3zM9 22h6"/></svg><span>Motion on</span></button></nav></header>
<main id="main">
<section class="hero-track" aria-labelledby="hero-title"><div class="hero-stage">
{portal()}
<div class="hero-heading"><div><p class="eyebrow">OJ + Course Pulse + midterm outcomes / STATS 401</p><h1 id="hero-title"><span class="title-line">The score</span><span class="title-line">has a past.</span></h1></div><p class="hero-context">{homework['window_submissions']:,} submissions.<br>Four homeworks.<br>26 matched exam scores.<br>Two behavior sources.<br>Ten featured views.</p></div>
<div class="score-composition" aria-label="HW3 TicTacToe: mean first score 37.95, mean best score 100, same 39 attempters">
<div class="score-start"><p>First submission <span>Mean / 100</span></p><strong>37.95</strong></div>
<svg class="score-arrow" viewBox="0 0 200 80" aria-hidden="true"><path d="M2 40H190M157 8L190 40L157 72"/></svg>
<div class="score-end"><p>Best submission <span>Mean / 100</span></p><div class="score-sculpture"><span class="score-echo" aria-hidden="true">100</span><span class="score-echo" aria-hidden="true">100</span><strong>100</strong></div></div></div>
<div class="hero-bottom"><p>HW3 TicTacToe · Same 39 attempters<br><span>First and best scores describe submissions, not a causal learning effect.</span></p><a class="enter" href="#scene-timing">Look behind the score <span>↓</span></a></div>
<p class="byline">Zaozao Wang &amp; Zhengxiang Liu · Homework snapshot: 30 September 2026</p>
<div class="hero-rule" aria-hidden="true"></div></div></section>
<div id="journey"><div class="journey-opening" aria-hidden="true"><canvas id="journey-field"></canvas><div class="journey-type"><span>Follow the</span><span>submissions.</span></div><div class="journey-rule"></div></div>{''.join(chapters)}</div>
<section id="evidence" class="story-ending"><div class="ending-intro"><p class="eyebrow">CONTINUE THE RESEARCH</p><h2>Behind the figures.</h2><p>Read the detailed analysis, data tables and methods on a separate page.</p><a class="enter" href="analysis.html">Analysis &amp; methods ↗</a></div>{archive(scenes)}</section>
</main>
<footer><p>CS201 Learning Process &amp; Midterm Outcomes · Zaozao Wang &amp; Zhengxiang Liu</p><p>Ten featured chapters; twelve downloadable static figures. Partial midterm cohort; analytical filters and reader evaluation are planned.</p><p><a href="analysis.html#evaluation">Evaluation plan</a> · <a href="https://github.com/Cis-jujube/STATS-401-Final-Project">Project source ↗</a> · <a href="docs/site-design.md">Design references</a> · <a href="proposal.md">Original proposal (historical)</a></p></footer>
<dialog id="focus-dialog" aria-labelledby="focus-title"><div class="dialog-head"><h2 id="focus-title">Figure focus</h2><button id="close-focus" autofocus>Close ×</button></div><img id="focus-image" alt=""><p id="focus-note"></p></dialog>
<script src="assets/motion-math.js"></script><script src="assets/cinema.js"></script><script src="assets/site.js"></script></body></html>'''
