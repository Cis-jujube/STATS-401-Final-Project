"""Three aggregate-only Course Pulse figures, with desktop and mobile variants."""
import json
from pathlib import Path
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from render_figures import apply_publication_style
from render_midterm import colors, finish

ROOT = Path(__file__).resolve().parents[1]


def coverage(d, out, mobile, web):
    accent, gold, muted = colors(web)
    fig, ax = plt.subplots(figsize=(6.6, 7.6) if mobile else (10, 6.6))
    values = [d['eligible_roster'], d['matched'], d['recorded_users'], d['resource_users']]
    labels = ['Eligible OJ\nroster', 'Available grades\n+ platform match', 'Recorded pre-exam\nplatform usage', 'Recorded\nresource opens']
    ax.barh(range(4), values, color=[muted, gold, accent, accent], height=.5)
    for i, value in enumerate(values):
        ax.text(value+.7, i, str(value), va='center', weight='bold')
    ax.set_yticks(range(4), labels)
    ax.set_ylim(3.6, -.6)
    ax.set_xlim(0, 47)
    ax.set_xticks([0, 10, 20, 30, 40])
    ax.set_xlabel('Students / successively smaller subsets')
    ax.spines['left'].set_visible(False)
    ax.tick_params(axis='y', length=0)
    ax.grid(axis='x', alpha=.15)
    ax.set_axisbelow(True)
    fig.text(.04, .94, 'Coverage comes before comparison', fontsize=16, weight='bold')
    fig.text(.04, .87, 'Only 11 of 26 matched students have recorded usage.', fontsize=11, color=muted)
    finish(fig, out, '08-platform-coverage', 'Coverage of the linked platform and grade cohort',
           ['Personal tracking begins 8 Sep 2026, 13:49 Beijing time.',
            'Main cutoff: 16 Sep, 08:00 Beijing; exam begins at 12:00.',
            'No recorded usage does not mean no learning or resource access.'], mobile, web)


def groups(d, out, mobile, web):
    accent, gold, muted = colors(web)
    fig, ax = plt.subplots(figsize=(6.6, 7.4) if mobile else (10, 6.5))
    for i, r in enumerate(d['groups']):
        ax.add_patch(Rectangle((r['q1'], i-.18), r['q3']-r['q1'], .36, facecolor=accent, alpha=.3))
        ax.plot([r['median']]*2, [i-.21, i+.21], color=accent, lw=3)
        ax.plot(r['mean'], i, 'D', color=gold, ms=7)
        ax.text(1.02, i, f"n={r['n']}\n{r['mean']:.2f}", transform=ax.get_yaxis_transform(), va='center', fontsize=11)
    ax.set_yticks(range(2), ['Recorded\nusage', 'No recorded\nusage'])
    ax.set_ylim(1.6, -.6)
    ax.set_xlim(0, 110)
    ax.set_xticks([0, 25, 50, 75, 100])
    ax.set_xlabel('Midterm score / raw points')
    ax.spines['left'].set_visible(False)
    ax.tick_params(axis='y', length=0)
    ax.grid(axis='x', alpha=.15)
    fig.text(.04, .94, 'Different means. No causal estimate.', fontsize=16, weight='bold')
    fig.text(.04, .87, 'Band: middle 50%  ·  Line: median  ·  Diamond: mean', fontsize=11, color=muted)
    finish(fig, out, '09-platform-groups', 'Midterm score dispersion by observed platform usage',
           ['Labels at right: student count and mean raw exam points.',
            'Any positive recorded metric qualifies; exposure can be brief.',
            'Self-selected groups. Prior ability and off-platform study are unknown.'], mobile, web)


def associations(d, out, mobile, web):
    accent, gold, muted = colors(web)
    fig, ax = plt.subplots(figsize=(6.6, 9) if mobile else (10, 7.8))
    rows = d['oj_associations'] + d['associations']
    labels = ['OJ submission\ncount', 'OJ final-24h\nshare', 'Platform active\ntime', 'Platform recorded\ndays', 'Resource\nopens']
    for i, r in enumerate(rows):
        color = gold if i < 2 else accent
        ax.plot(r['bootstrap_interval'], [i, i], color=color, lw=3, solid_capstyle='round')
        ax.plot(r['rho'], i, 'o', color=color, ms=8)
        ax.text(1.03, i, f"{r['rho']:+.2f}", transform=ax.get_yaxis_transform(), va='center', fontsize=12)
    ax.axvline(0, color=muted, ls='--', lw=1)
    ax.set_xlim(-1, 1)
    ax.set_xticks([-1, -.5, 0, .5, 1])
    ax.set_yticks(range(5), labels)
    ax.set_ylim(4.6, -.6)
    ax.spines['left'].set_visible(False)
    ax.tick_params(axis='y', length=0)
    ax.set_xlabel('Spearman correlation with midterm score')
    ax.grid(axis='x', alpha=.12)
    fig.text(.04, .94, 'One cohort. Different behavior signals.', fontsize=16, weight='bold')
    fig.text(.04, .87, '26 students  ·  Dots: correlation  ·  Lines: 95% intervals', fontsize=11, color=muted)
    finish(fig, out, '10-platform-associations', 'OJ and Course Pulse associations with midterm scores',
           ['5,000 paired student bootstrap samples; fixed seed.',
            'Exploratory intervals, without multiple-comparison adjustment.',
            'Tracking windows differ. These are not independent or causal effects.'], mobile, web)


if __name__ == '__main__':
    d = json.loads((ROOT/'data/platform-summary.json').read_text())
    for web in (False, True):
        apply_publication_style(web)
        out = ROOT/('assets/story' if web else 'assets/figures')
        for mobile in (False, True):
            for draw in (coverage, groups, associations):
                draw(d, out, mobile, web)
