"""Render retry productivity and deadline progress from public aggregates only."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap, Normalize
from matplotlib.patches import Rectangle

from render_figures import (HW_COLORS, WEB_COLORS, PALETTE, apply_publication_style,
                            finalize_figure, footnote, snapshot_label)


def retry_productivity(data, out, mobile=False, web=False):
    event = data['event_progress']
    colors = WEB_COLORS if web else HW_COLORS
    fig, axes = plt.subplots(2 if mobile else 1, 1 if mobile else 2,
                             figsize=(7.6, 12.4) if mobile else (14.8, 7.9), squeeze=False)
    ink = '#f4f2e9' if web else PALETTE['ink']
    muted = '#c4b7aa' if web else PALETTE['gray']
    for ax, rows, title in zip(axes.flat, (event['by_homework'], event['by_gap']),
                               ('(a)  Within each homework', '(b)  By gap since the last valid attempt')):
        for y, row in enumerate(rows):
            color = colors[y] if 'homework' in row else colors[0]
            if row['state'] == 'suppressed':
                ax.text(50, y, 'Withheld', ha='center', va='center', color=muted)
                continue
            pct = row['improvement_pct']
            if pct is None:
                ax.text(50, y, 'No eligible retries', ha='center', va='center', color=muted)
                continue
            ax.hlines(y, 0, pct, color=color, lw=3, alpha=.7)
            ax.scatter(pct, y, marker='D', color=color, s=70, zorder=3)
            ax.text(pct+3, y, f'{pct:.1f}%', va='center', fontsize=12, color=ink, weight='bold')
        labels = []
        for row in rows:
            label = row.get('homework', row.get('label'))
            if row['state'] == 'visible':
                label += f"\n{row['new_bests']}/{row['eligible_retries']} · S={row['contributors']}"
            labels.append(label)
        ax.set_yticks(range(len(rows)), labels, fontsize=11)
        ax.set(xlim=(0, 100), ylim=(len(rows)-.5, -.7), xlabel='Eligible retries setting a new best (%)')
        ax.set_xticks((0, 25, 50, 75, 100))
        ax.set_title(title, loc='left', fontsize=14, pad=19)
        ax.spines['left'].set_visible(False)
        ax.tick_params(axis='y', length=0, pad=12)
        ax.grid(axis='x', alpha=.16)
        ax.set_axisbelow(True)
    fig.text(.04, .97, 'Does a retry set a new personal best?', fontsize=20,
             weight='bold', va='top', color=ink)
    fig.text(.04, .917, 'New best / eligible retries · S = distinct eligible contributors',
             fontsize=11, color=muted, va='top')
    notes = ['Eligible: a scored retry while the prior within-window best is below 100.',
             'Strict improvement only; first scores, internal errors and retries after full credit are excluded.',
             'Gap bins are clock time, not study time. Events repeat within students; no causal comparison.',
             'Long-gap percentages have small denominators. Read counts alongside rates.', snapshot_label(data)]
    if mobile:
        notes[1:2] = ['First scores, internal errors and retries after full credit are excluded.',
                      'Equal scores do not count as new bests.']
    footnote(fig, notes, y=.02, fontsize=9, web=web)
    fig.tight_layout(rect=(.015, .17 if mobile else .23, .99, .87), h_pad=3.5, w_pad=3)
    finalize_figure(fig, out/('11-retry-productivity'+('-mobile' if mobile else '')),
                    'Eligible retries setting new personal best scores', web=web)


def deadline_progress(data, out, mobile=False, web=False):
    rows = data['event_progress']['by_phase']
    homeworks = [a['homework'] for a in data['assignments']]
    lookup = {(r['homework'], r['phase']): r for r in rows}
    fig, ax = plt.subplots(figsize=(8.6, 10.2) if mobile else (14.8, 8.6))
    ink = '#f4f2e9' if web else PALETTE['ink']
    muted = '#c4b7aa' if web else PALETTE['gray']
    # All tiles have a light fill, including on the dark story, so use dark text.
    cmap = LinearSegmentedColormap.from_list('new_best_rate', ['#f7f3e9', '#afd2cb', '#43887f'])
    norm = Normalize(0, 100)
    for h, homework in enumerate(homeworks):
        for phase in range(5):
            row = lookup[homework, phase]
            x, y = (h, phase) if mobile else (phase, h)
            if row['state'] == 'suppressed':
                ax.add_patch(Rectangle((x-.47, y-.46), .94, .92, facecolor='#e4dfd6',
                                       edgecolor='#c3b6a6', hatch='////', lw=.8))
                ax.text(x, y, 'Withheld', ha='center', va='center', fontsize=11, color='#463c33',
                        bbox={'facecolor':'#e4dfd6', 'edgecolor':'none', 'pad':2})
            elif row['eligible_retries'] == 0:
                ax.add_patch(Rectangle((x-.47,y-.46),.94,.92,facecolor='#f7f3e9',edgecolor='#c3b6a6'))
                ax.text(x,y,'No eligible\nretries',ha='center',va='center',fontsize=10,color='#25211e')
            else:
                ax.add_patch(Rectangle((x-.47, y-.46), .94, .92,
                                       facecolor=cmap(norm(row['improvement_pct'])), edgecolor='none'))
                ax.text(x, y-.18, f"{row['improvement_pct']:.1f}%", ha='center', va='center',
                        fontsize=17 if not mobile else 14, weight='bold', color='#172c28')
                ax.text(x, y+.11, f"{row['new_bests']}/{row['eligible_retries']}", ha='center',
                        va='center', fontsize=12, color='#172c28')
                ax.text(x, y+.32, f"S={row['contributors']}", ha='center', va='center',
                        fontsize=10, color='#172c28')
    phase_labels = [f'{i*20}–{(i+1)*20}%' for i in range(5)]
    hw_labels = [f"{hw}\n{lookup[hw,0]['phase_hours']:.1f} h / bin" for hw in homeworks]
    ax.set_xticks(range(4 if mobile else 5), hw_labels if mobile else phase_labels, fontsize=11)
    ax.set_yticks(range(5 if mobile else 4), phase_labels if mobile else hw_labels, fontsize=11)
    ax.set_xlim(-.5, 3.5 if mobile else 4.5)
    ax.set_ylim(4.5 if mobile else 3.5, -.5)
    ax.tick_params(length=0, pad=12)
    for spine in ax.spines.values():
        spine.set_visible(False)
    label = 'Fraction of configured window elapsed · opening → deadline'
    if mobile:
        ax.set_ylabel('Window elapsed · opening → deadline', labelpad=12)
    else:
        ax.set_xlabel(label, labelpad=16)
    fig.text(.04, .97, 'When do retries make progress?' if not mobile else
             'New bests across\nthe homework window', fontsize=21, weight='bold', va='top', color=ink)
    fig.text(.04, .91 if not mobile else .875,
             'Rate = new bests / eligible retries · S = distinct contributors',
             fontsize=11, va='top', color=muted)
    fig.subplots_adjust(left=.17 if mobile else .13, right=.96,
                        top=.78 if mobile else .83, bottom=.25 if mobile else .28)
    cax = fig.add_axes([.60 if not mobile else .55, .165, .34, .012])
    bar = fig.colorbar(plt.cm.ScalarMappable(norm=norm,cmap=cmap), cax=cax, orientation='horizontal')
    bar.set_ticks((0,50,100), labels=('0%', '50%', '100%'))
    bar.ax.tick_params(labelsize=9, length=0)
    bar.outline.set_visible(False)
    fig.text(.04, .17, 'Color: share of retries setting a new best', fontsize=10, color=muted)
    footnote(fig, ['Five equal-duration bins within each homework; bin duration differs between homeworks.',
                   'Strict new bests only, after a baseline and before full credit. Counts are repeated events.',
                   'Hatched cells are withheld, not zero (<5 students or secondary suppression).',
                   'Configured deadlines; individual extensions unavailable. Timing is not a deadline effect.',
                   snapshot_label(data)], y=.025, fontsize=9, web=web)
    finalize_figure(fig, out/('12-deadline-progress'+('-mobile' if mobile else '')),
                    'New personal best retries within equal-duration homework phases', web=web)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=Path('data/summary.json'))
    parser.add_argument('--output', type=Path)
    parser.add_argument('--web', action='store_true')
    args = parser.parse_args()
    data = json.loads(args.input.read_text())
    out = args.output or Path('assets/story' if args.web else 'assets/figures')
    apply_publication_style(web=args.web)
    for mobile in (False, True):
        retry_productivity(data, out, mobile, args.web)
        deadline_progress(data, out, mobile, args.web)


if __name__ == '__main__':
    main()
