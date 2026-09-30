"""Presentation controls and factual transition captions, from public aggregates."""
from html import escape

DURATIONS = {
    'timing': 4200, 'scores': 3000, 'attempt-scores': 2000,
    'midterm-associations': 3200, 'platform-associations': 2100,
}

# Full-story edit in milliseconds: entrance, readable dwell, chapter typography.
FILM = {
    'home': (0, 2200, 'THE SCORE'),
    'timing': (6000, 6500, 'TIME'),
    'scores': (4600, 7500, 'THE GAP'),
    'attempt-scores': (3400, 7000, 'AGAIN.'),
    'midterm-associations': (5200, 9000, 'THE TEST'),
    'platform-associations': (3800, 8500, 'SIGNALS'),
    'evidence': (3200, 3200, 'LOOK CLOSER.'),
}


def film_attributes(sid):
    duration, hold, word = FILM[sid]
    return f'data-film-duration="{duration}" data-film-hold="{hold}" data-film-word="{escape(word)}"'


def _effect_surfaces():
    # Only the authored foreground is opaque. The zero's counter is a real hole
    # through both SVG paths, revealing the separate Follow layer underneath.
    aperture = 'M500 405 C440 405 440 595 500 595 C560 595 560 405 500 405Z'
    slices = ''.join(
        f'<div class="press-slab-piece" style="--piece:{i};--piece-x:{x};--piece-y:{y};--piece-turn:{turn}"><strong>THE GAP</strong></div>'
        for i, (x, y, turn) in enumerate([(-1.2, -.4, -24), (.3, -1.4, 17), (1.2, .7, 32)])
    )
    return f'''<div id="presentation-effects" aria-hidden="true" hidden>
  <div id="presentation-spatial-field"><i class="spatial-cover-left"></i><i class="spatial-cover-right"></i></div>
  <canvas id="presentation-energy"></canvas>
  <div id="presentation-aperture" class="shot-surface">
    <svg class="portal-mask" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
      <path class="portal-field" fill-rule="evenodd" d="M-10000-10000H11000V11000H-10000Z {aperture}"/>
      <path class="portal-zero" fill-rule="evenodd" d="M500 355 C385 355 385 645 500 645 C615 645 615 355 500 355Z {aperture}"/>
    </svg>
    <div class="portal-landing-cover"><i></i><i></i></div>
  </div>
  <div id="presentation-press" class="shot-surface">
    <div class="press-slab">{slices}</div>
    <i class="press-jaw-left"></i><i class="press-jaw-right"></i>
    <div class="press-final-cover"><i></i><i></i></div>
  </div>
  <div id="presentation-folio" class="shot-surface">
    <div class="folio-cover"><span>ONE ASSOCIATION / THREE CHECKS</span><strong>THE<br>TEST</strong><i class="folio-edge"></i></div>
    <div class="folio-exit"><span>READ THE EVIDENCE</span></div>
  </div>
  <div id="presentation-archive" class="shot-surface">
    <i class="archive-sheet-left"></i><i class="archive-sheet-right"></i>
    <strong class="archive-word">LOOK<br>CLOSER.</strong><i class="archive-rule"></i>
  </div>
  <div class="film-slate"><span id="film-slate-index"></span><strong id="film-slate-word"></strong><span id="film-slate-caption"></span></div>
  <div class="film-frame"><span>CS201 / PROCESS NOTES</span><span id="film-frame-label"></span></div>
</div>'''


def controls(scenes):
    options = '<option value="home">Opening · The score has a past</option>'
    options += ''.join(
        f'<option value="{sid}">{i + 1:02d} · {escape(topic)}</option>'
        for i, (sid, _, topic, *_) in enumerate(scenes)
    )
    options += '<option value="evidence">Research archive</option>'
    return f'''<section id="presentation-panel" hidden aria-label="Presentation controls" tabindex="-1">
  <div class="presentation-track" aria-hidden="true"><span></span></div>
  <div id="film-transport" hidden>
    <div class="film-time"><span>FULL STORY</span><output id="film-time">0:00</output></div>
    <div class="film-seek-wrap"><label class="film-sr-only" for="film-seek">Full story playback position</label><input id="film-seek" type="range" min="0" max="100" step="10" value="0"><div id="film-markers" aria-hidden="true"></div></div>
    <button id="film-manual">Hold for explanation</button>
  </div>
  <div class="presentation-status"><span class="presentation-kicker" id="presentation-scroll-hint">LIVE STORY / CS201</span><span id="presentation-status" role="status" aria-live="polite" aria-atomic="true"></span></div>
  <div class="presentation-buttons"><button id="presentation-previous" aria-label="Previous figure">← <span>Previous</span></button><button id="presentation-next">Continue →</button>
  <details id="presentation-options"><summary>More</summary><div class="presentation-menu">
    <label for="presentation-jump">Jump to a complete figure</label><select id="presentation-jump">{options}</select>
    <button id="presentation-figure">Open full figure ↗</button><button id="presentation-replay">Replay this entrance</button><button id="presentation-skip">Finish this transition</button>
    <button id="presentation-fullscreen">Enter fullscreen</button><button id="presentation-motion" aria-pressed="true">Motion on</button>
    <button id="film-restart">Play full story from the start</button>
    <p>Space: play / pause · ← →: figures<br>Presentation: each figure waits.<br>Full story: pause or seek at any time.</p>
  </div></details><button id="presentation-exit">Exit</button></div>
  <p id="presentation-message" role="status" hidden></p>
</section>
{_effect_surfaces()}'''


def interludes(summary, midterm):
    # A single real problem explains the stages before the selected ranking.
    row = max(summary['score_progression'], key=lambda r: r['best'] - r['best3'])
    stages = [('First submission', 'first'), ('Best through 3', 'best3'), ('Best observed', 'best')]
    gap_cards = ''.join(
        f'<div class="presentation-card" style="--card:{i}"><span>0{i + 1} / {label}</span>'
        f'<strong>{row[key]:.2f}</strong><small>Mean score / 100</small></div>'
        for i, (label, key) in enumerate(stages)
    )
    late = next(r for r in midterm['associations'] if r['metric'] == 'late_pct')
    # Each mini-plot uses the same fixed [-1, 1] axis and original summary values.
    def x(value):
        return 20 + (value + 1) * 130

    def plot(kind):
        axis = '<path class="mini-axis" d="M20 60H280 M150 20V68"/><text x="20" y="88">−1</text><text x="150" y="88">0</text><text x="280" y="88">1</text>'
        if kind in ('bootstrap_interval', 'leave_one_out_range'):
            lo, hi = late[kind]
            hollow = ' class="mini-hollow"' if kind == 'leave_one_out_range' else ''
            marks = f'<path class="mini-range" d="M{x(lo):.4f} 40H{x(hi):.4f}"/><circle{hollow} cx="{x(late["rho"]):.4f}" cy="40" r="5"/>'
        else:
            a = x(late['complete_problem_coverage']['rho'])
            b = x(late['without_homework_discrepancies']['rho'])
            marks = f'<path d="M{a:.4f} 21l6 6-6 6-6-6Z"/><rect x="{b - 5:.4f}" y="44" width="10" height="10"/>'
        return f'<svg viewBox="0 0 300 100" aria-hidden="true">{axis}{marks}</svg>'

    details = [
        ('A', 'Bootstrap interval', 'bootstrap_interval', '95% interval · n=26',
         f'{late["bootstrap_interval"][0]:+.2f} to {late["bootstrap_interval"][1]:+.2f}'),
        ('B', 'Leave-one-out range', 'leave_one_out_range', 'Range, not a CI · 26 re-fits of n=25',
         f'{late["leave_one_out_range"][0]:+.2f} to {late["leave_one_out_range"][1]:+.2f}'),
        ('C', 'Sensitivity cohorts', 'subsets', '◆ All slots n=23 · ■ Omit discrepancies n=24',
         f'{late["complete_problem_coverage"]["rho"]:+.2f} / {late["without_homework_discrepancies"]["rho"]:+.2f}'),
    ]
    robust_cards = ''.join(
        f'<div class="presentation-card" style="--card:{i}"><span>{letter} / {title}</span>{plot(key)}<strong>{value}</strong><small>{note}</small></div>'
        for i, (letter, title, key, note, value) in enumerate(details)
    )
    return f'''<div id="presentation-interludes" aria-hidden="true">
  <div class="presentation-bridge" data-bridge="scores"><p class="bridge-kicker">ONE PROBLEM / THREE STAGES</p><h2>{escape(row['problem_name'].replace('26s3', ''))}</h2><p>Same {row['n']} attempters · cumulative best, not the actual third attempt</p><div class="presentation-cards">{gap_cards}</div><p class="bridge-foot">Then: compare the selected problem ranking.</p></div>
  <div class="presentation-bridge" data-bridge="midterm-associations"><p class="bridge-kicker">ONE ASSOCIATION / THREE CHECKS</p><h2>How much survives?</h2><p>Final-day submission share × exam score · Spearman ρ</p><div class="presentation-cards">{robust_cards}</div><p class="bridge-foot">Same −1 to +1 scale · exploratory, unadjusted associations</p></div>
</div>'''
