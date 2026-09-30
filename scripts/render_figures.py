"""Publication figures following figures4papers scientific-figure-making conventions.

Inputs are public aggregates. The optional private hourly export stays external.
"""
from __future__ import annotations

import argparse
from datetime import datetime
import json
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap, Normalize
from matplotlib.lines import Line2D
from matplotlib.patches import Patch, Rectangle
import numpy as np

PALETTE = {'primary': '#BD3D24', 'primary_light': '#CE7158', 'gold': '#C6AB75',
           'stone': '#66584D', 'gray': '#685C52', 'ink': '#25211E', 'neutral': '#D2C8BB'}
HW_COLORS = [PALETTE['primary'], '#967222', PALETTE['stone']]


def apply_publication_style(web=False):
    plt.rcdefaults()
    plt.rcParams.update({
        'font.family': ['DejaVu Sans', 'Helvetica', 'Arial', 'sans-serif'],
        'font.size': 13, 'axes.labelsize': 12, 'axes.titlesize': 15,
        'axes.titleweight': 'bold', 'axes.linewidth': 2,
        'axes.spines.top': False, 'axes.spines.right': False,
        'legend.frameon': False, 'svg.fonttype': 'none', 'pdf.fonttype': 42,
        'svg.hashsalt': 'cs201-figures4papers-v2', 'figure.facecolor': 'white',
        'axes.facecolor': 'white', 'text.color': PALETTE['ink'],
        'axes.labelcolor': PALETTE['ink'], 'xtick.color': PALETTE['ink'],
        'ytick.color': PALETTE['ink'], 'savefig.facecolor': 'white',
    })
    if web:
        plt.rcParams.update({
            'figure.facecolor': 'none', 'axes.facecolor': 'none',
            'text.color': '#f4f2e9', 'axes.labelcolor': '#c4b7aa',
            'axes.edgecolor': '#a99a8c', 'xtick.color': '#c4b7aa',
            'ytick.color': '#c4b7aa', 'grid.color': '#b6a594',
            'boxplot.whiskerprops.color': '#d4c9bd',
            'boxplot.capprops.color': '#d4c9bd',
        })


def finalize_figure(fig, out_path, title, web=False):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    metadata = {'Title': title, 'Creator': 'CS201 Homework Submission Patterns'}
    for extension in (('svg',) if web else ('svg', 'pdf', 'png')):
        md = dict(metadata)
        if extension == 'pdf':
            md.update(CreationDate=None, ModDate=None)
        if extension == 'svg':
            md['Date'] = None
        target = out_path.with_suffix('.'+extension)
        options = {'transparent': True, 'bbox_inches': 'tight', 'pad_inches': .08} if web else {}
        fig.savefig(target, dpi=300, metadata=md, **options)
        if extension == 'svg':
            target.write_text('\n'.join(line.rstrip() for line in target.read_text().splitlines())+'\n')
    plt.close(fig)


def footnote(fig, lines, y=.025, web=False, fontsize=9):
    fig.text(.04, y, '\n'.join(lines), fontsize=fontsize,
             color='#bcb1a7' if web else PALETTE['gray'],
             va='bottom', linespacing=1.55)


def private_calendar(data, out, mobile=False, private=None, web=False):
    cells = private if private is not None else data['calendar']
    hours = cells[0]['hours']
    dates = sorted({c['date'] for c in cells})
    lookup = {(c['date'], c['hour']): c for c in cells}
    columns = list(range(0, 24, hours))
    fig, axes = plt.subplots(2 if mobile else 1, 1 if mobile else 2,
                             figsize=(7, 15) if mobile else (15, 8.5), squeeze=False)
    cmap = LinearSegmentedColormap.from_list('cs201_vermillion', ['#faf5ed', '#dfa38a', PALETTE['primary']])
    for index, (ax, field, title) in enumerate(zip(axes.flat, ('submissions', 'contributors'),
                                                 ('Submission count', 'Distinct contributors'))):
        matrix = np.array([[lookup[d, h][field] if lookup[d, h]['state']=='visible' else np.nan
                            for h in columns] for d in dates], dtype=float)
        norm = Normalize(0, np.nanmax(matrix))
        ax.pcolormesh(np.arange(len(columns)+1)-.5, np.arange(len(dates)+1)-.5,
                      matrix, cmap=cmap, norm=norm, shading='flat', rasterized=False)
        ax.set_ylim(len(dates)-.5, -.5)
        for iy, day in enumerate(dates):
            for ix, hour in enumerate(columns):
                cell = lookup[day, hour]
                if cell['state'] != 'visible':
                    ax.add_patch(Rectangle((ix-.5,iy-.5),1,1,facecolor='#e7e7e7' if cell['state']=='inactive' else '#fff',
                                           edgecolor='#b5b5b5', hatch='////' if cell['state']=='suppressed' else None, linewidth=0))
                elif hours > 1 and cell[field] > 0:
                    rgb = cmap(norm(cell[field]))[:3]
                    linear = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in rgb]
                    luminance = sum(c * w for c, w in zip(linear, (.2126, .7152, .0722)))
                    ax.text(ix,iy,str(cell[field]),ha='center',va='center',fontsize=10,
                            color='white' if luminance <= .18 else '#000000')
        ax.set_xticks([h/hours for h in range(0,24,4)], [f'{h:02d}' for h in range(0,24,4)])
        ax.set_yticks(range(len(dates)),[datetime.fromisoformat(d).strftime('%b %d') for d in dates],fontsize=10)
        ax.set_xlabel('Hour of day (Beijing time; cell start)')
        ax.set_title(f'({chr(97+index)})  {title}',loc='left',pad=42)
        ax.set_xticks(np.arange(-.5,len(columns),1),minor=True)
        ax.set_yticks(np.arange(-.5,len(dates),1),minor=True)
        ax.grid(which='minor',color='white',linewidth=1.5)
        ax.tick_params(which='both',length=0)
        for spine in ax.spines.values(): spine.set_visible(False)
        cax = ax.inset_axes([.55,1.04,.45,.016])
        cb=fig.colorbar(plt.cm.ScalarMappable(norm=norm,cmap=cmap),cax=cax,orientation='horizontal')
        cb.set_ticks([0,round(float(np.nanmax(matrix))/2),int(np.nanmax(matrix))])
        cb.ax.tick_params(labelsize=9,length=2)
        cb.outline.set_linewidth(.6)
        for a in data['assignments']:
            for key, marker in [('start_local','o'),('end_local','D')]:
                dt=datetime.fromisoformat(a[key]); y=dates.index(dt.date().isoformat())
                ax.plot((dt.hour+dt.minute/60)/hours-.5,y,marker=marker,markersize=5,
                        markeredgecolor='#755e25',markerfacecolor='white' if marker=='o' else '#755e25',clip_on=False)
    handles=[Patch(facecolor='white',hatch='////',edgecolor='#b5b5b5',label='<5 contributors: masked'),
             Patch(facecolor='#e7e7e7',label='No homework window'),
             Line2D([],[],marker='o',ls='',mfc='white',mec='#755e25',label='Opens'),
             Line2D([],[],marker='D',ls='',color='#755e25',label='Configured deadline')]
    fig.legend(handles=handles[1:] if private else handles,loc='lower left',bbox_to_anchor=(.03,.065),
               ncol=2 if mobile else 4,fontsize=10)
    footnote(fig,['CS201 · HW1–HW3 configured windows · 20 Sep 2026 snapshot.',
                  'PRIVATE hourly view. Do not publish.' if private else 'White/light cells = zero; hatched cells are withheld, not zero. Public cells span four hours.'],web=web)
    fig.tight_layout(pad=2,rect=(0,.15 if not mobile else .13,1,.96),h_pad=4)
    name='01-calendar-private-hourly' if private else '01-calendar'+('-mobile' if mobile else '')
    finalize_figure(fig,out/name,'Submission timing and distinct contributors',web=web)


def calendar(data, out, mobile=False, web=False):
    """Compare reach, repeat intensity, and clock time in publishable cells only."""
    visible = [cell for cell in data['calendar']
               if cell['state'] == 'visible' and cell['submissions'] > 0]
    if not visible:
        raise ValueError('No publishable positive calendar cells')
    colors = dict(zip(('HW1', 'HW2', 'HW3'),
                      ['#ed977b', '#d9bc7d', '#c5b6a7'] if web else HW_COLORS))
    markers = {'HW1': 'o', 'HW2': 's', 'HW3': 'D'}
    plotted = []
    for cell in visible:
        start = datetime.fromisoformat(f"{cell['date']}T{cell['hour']:02d}:00:00+08:00")
        homework = next((a['homework'] for a in data['assignments']
                         if datetime.fromisoformat(a['start_local']) <= start
                         <= datetime.fromisoformat(a['end_local'])), None)
        # A boundary cell can start before a homework opens; its events still
        # belong to that sole configured window on the date.
        if homework is None:
            homework = next(a['homework'] for a in data['assignments']
                            if a['start_local'][:10] <= cell['date'] <= a['end_local'][:10])
        plotted.append({**cell, 'plot_homework': homework})
    visible = plotted

    fig, axes = plt.subplots(2 if mobile else 1, 1 if mobile else 2,
                             figsize=(7.2, 12) if mobile else (14.5, 7.7),
                             squeeze=False)
    reach, clock = axes.flat
    for homework in ('HW1', 'HW2', 'HW3'):
        rows = [cell for cell in visible if cell['plot_homework'] == homework]
        size = [35 + cell['submissions'] * 2.1 for cell in rows]
        reach.scatter([cell['contributors'] for cell in rows],
                      [cell['submissions'] / cell['contributors'] for cell in rows],
                      s=size, marker=markers[homework], color=colors[homework],
                      edgecolor='#25211E' if not web else '#f4f2e9',
                      linewidth=.7, alpha=.82, label=homework, zorder=3)
        clock.scatter([cell['hour'] + 2 for cell in rows],
                      [cell['submissions'] for cell in rows], s=size,
                      marker=markers[homework], color=colors[homework],
                      edgecolor='#25211E' if not web else '#f4f2e9',
                      linewidth=.7, alpha=.82, zorder=3)

    peak = max(visible, key=lambda cell: cell['submissions'])
    reach.annotate(f"{peak['submissions']} submissions\n{peak['date'][5:]} · {peak['hour']:02d}–{peak['hour']+4:02d}",
                   (peak['contributors'], peak['submissions']/peak['contributors']),
                   xytext=(-10, -42), textcoords='offset points', ha='right',
                   fontsize=10, weight='bold', color=colors[peak['plot_homework']])
    for cell in sorted(visible, key=lambda c: c['submissions'], reverse=True)[:3]:
        clock.annotate(f"{cell['date'][5:]}\n{cell['submissions']} / {cell['contributors']}",
                       (cell['hour']+2, cell['submissions']),
                       xytext=(0, 11), textcoords='offset points', ha='center',
                       fontsize=9, color=colors[cell['plot_homework']])
    reach.set(xlim=(4, 13.5), ylim=(0, max(c['submissions']/c['contributors'] for c in visible)+4),
              xlabel='Distinct contributors in a four-hour cell',
              ylabel='Submissions per active contributor')
    reach.set_xticks(range(5, 13))
    reach.set_title('(a)  Reach versus repeat intensity', loc='left', pad=18)
    reach.legend(loc='upper left', fontsize=10, ncol=3)
    clock.set(xlim=(0, 24), ylim=(0, max(c['submissions'] for c in visible)*1.22),
              xlabel='Beijing time · four-hour cell', ylabel='Submissions in cell')
    clock.set_xticks(range(2, 24, 4), [f'{hour:02d}–{hour+4:02d}' for hour in range(0, 24, 4)],
                     fontsize=9)
    clock.set_title('(b)  When visible bursts occurred', loc='left', pad=18)
    for ax in (reach, clock):
        ax.grid(alpha=.15)
        ax.set_axisbelow(True)
    masked = data['window_submissions'] - sum(cell['submissions'] or 0 for cell in data['calendar'])
    fig.suptitle('Visible submission peaks / reach and intensity', x=.04, y=.98,
                 ha='left', fontsize=18, weight='bold')
    fig.text(.04, .925, f"{len(visible)} publishable positive cells · peak day {data['peak_day']['date']}: "
             f"{data['peak_day']['submissions']} submissions from {data['peak_day']['contributors']} students",
             fontsize=11, color='#c4b7aa' if web else PALETTE['gray'])
    footnote(fig, [f'{masked} submissions fall in masked cells; an overall four-hour peak cannot be inferred from this public view.',
                   'Marker area scales with submissions. Ratios describe active contributors, not all students or study time.'],
             y=.025, web=web)
    fig.tight_layout(rect=(0, .11 if mobile else .12, 1, .88), w_pad=2.8, h_pad=3)
    finalize_figure(fig, out/('01-calendar'+('-mobile' if mobile else '')),
                    'Visible submission peaks and distinct contributors', web=web)


def attempts(data,out,mobile=False,web=False):
    fig,ax=plt.subplots(figsize=(6.5,6.5) if mobile else (10,6.2))
    stats=[{'label':a['homework'],'med':a['all_attempts']['median'],'q1':a['all_attempts']['q1'],
            'q3':a['all_attempts']['q3'],'whislo':a['all_attempts']['min'],'whishi':a['all_attempts']['max']}
           for a in data['assignments']]
    boxes=ax.bxp(stats,showfliers=False,patch_artist=True,widths=.42,
                 medianprops={'color':'#f4f2e9' if web else '#25211E','linewidth':2.5},
                 boxprops={'linewidth':2},whiskerprops={'linewidth':1.8},capprops={'linewidth':1.8})
    for box,color in zip(boxes['boxes'],['#ed977b','#d9bc7d','#c5b6a7'] if web else HW_COLORS): box.set(facecolor=color,alpha=.25,edgecolor=color)
    for i,a in enumerate(data['assignments'],1):
        q=a['all_attempts']
        ax.text(i+.26,q['median'],f"{q['median']:g}",fontsize=13,weight='bold',va='center')
        ax.text(i,q['max']+4,f"{q['min']}–{q['max']}",ha='center',fontsize=11)
    ax.set_xticks([1,2,3],[f"{a['homework']}\nn = {a['all_attempts']['n']} · {a['problems']} problems" for a in data['assignments']],fontsize=10 if mobile else 12)
    ax.set_ylim(0,120);ax.set_yticks(range(0,121,20));ax.set_ylabel('Submissions per student')
    ax.set_title('Attempt-count distributions',loc='left',pad=18)
    ax.grid(axis='y',alpha=.18,linewidth=.8);ax.set_axisbelow(True)
    fig.tight_layout(pad=2,rect=(0,.16,1,1))
    footnote(fig,['Boxes: middle 50% · bold line: median · whiskers: min–max.',
                  'Window submitters only; counts do not measure effort or ability.'],web=web)
    finalize_figure(fig,out/('02-attempts'+('-mobile' if mobile else '')),'Per-student homework attempt counts',web=web)


def short_name(row):
    return row['problem_name'].split('-')[-1].replace('Exercise1.2.15 ','')


def score_story_mobile(data, out):
    """Use a compact gap ranking for the narrow story viewport."""
    ranked = sorted(data['score_progression'],
                    key=lambda row: (-(row['best'] - row['best3']),
                                     row['homework'], row['problem_order']))
    rows = []
    for homework in ('HW1', 'HW2', 'HW3'):
        hw_rows = [row for row in ranked if row['homework'] == homework]
        rows.extend(hw_rows[:2])
    rows.sort(key=lambda row: (-(row['best'] - row['best3']),
                               row['homework'], row['problem_order']))
    fig, ax = plt.subplots(figsize=(6.4, 8.2))
    fig.subplots_adjust(left=.09, right=.91, top=.77, bottom=.18)
    ink, muted, accent = '#f4f2e9', '#c4b7aa', '#ed977b'
    for y, row in enumerate(rows):
        gap = row['best'] - row['best3']
        ax.text(0, y - .12, f"{row['homework']} · {short_name(row)}",
                color=ink, fontsize=14, va='bottom')
        ax.text(40, y - .12, f"+{gap:.1f} pp · n={row['n']}",
                color=accent, fontsize=12, ha='right', va='bottom')
        ax.barh(y + .24, gap, height=.18, color=accent, zorder=3)
        ax.plot(gap, y + .24, 'D', color=accent, ms=6, zorder=4)
    ax.set_xlim(0, 40)
    ax.set_ylim(len(rows) - .13, -.5)
    ax.set_xticks((0, 10, 20, 30, 40))
    ax.tick_params(axis='x', labelsize=12)
    ax.set_yticks([])
    ax.set_xlabel('Remaining mean gap (percentage points)', labelpad=11,
                  fontsize=13)
    ax.spines['left'].set_visible(False)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.grid(axis='x', alpha=.18)
    ax.set_axisbelow(True)
    count = sum(row['best'] - row['best3'] > 10 for row in ranked)
    fig.text(.04, .97, 'Remaining gap after\nthree attempts',
             fontsize=20, weight='bold', color=ink, va='top')
    fig.text(.04, .86, f'{count} of {len(ranked)} problem slots have a >10 pp mean gap',
             fontsize=12, color=muted, va='top')
    footnote(fig, ['Six selected: top two remaining gaps within each homework.',
                   'All 23 problems and exact values are in the analysis page.',
                   'Gap = best observed minus cumulative best through three; no causal claim.'],
             y=.025, web=True, fontsize=10)
    finalize_figure(fig, out/'03-score-progression-mobile',
                    'Selected remaining problem score gaps after three attempts',
                    web=True)


def scores(data,out,mobile=False,web=False):
    """Show which problem gaps remain after the first three attempts.

    First, best-through-three, and best-observed means use the same attempters
    within each problem. The highlighted segment is descriptive, not causal.
    """
    if web and mobile:
        score_story_mobile(data, out)
        return
    all_rows = sorted(data['score_progression'],
                      key=lambda row: (-(row['best']-row['best3']),
                                       row['homework'], row['problem_order']))
    if web:
        # The story selects within each homework; the downloadable figure
        # and accessible table retain every problem slot.
        selected = []
        for homework in ('HW1', 'HW2', 'HW3'):
            hw_rows = [row for row in all_rows if row['homework'] == homework]
            indices = (0, len(hw_rows)//2, -1)
            selected.extend(hw_rows[index] for index in indices)
        rows = sorted(selected, key=lambda row: -(row['best']-row['best3']))
    else:
        rows = all_rows

    fig, ax = plt.subplots(figsize=(7.8, 17) if mobile else
                           (8.5, 8.8) if web else (11.5, 12.0))
    fig.subplots_adjust(left=.40 if mobile else .37 if web else .35,
                        right=.76 if mobile else .77 if web else .79,
                        top=.81 if mobile else .79 if web else .84,
                        bottom=.13)
    ink = '#f4f2e9' if web else PALETTE['ink']
    muted = '#c4b7aa' if web else PALETTE['gray']
    early = '#b9a99c' if web else '#b7a99c'
    gold = '#d9bc7d' if web else '#967222'
    red = '#ed977b' if web else PALETTE['primary']
    for y, row in enumerate(rows):
        ax.plot((row['first'], row['best3']), (y, y), color=early, lw=2,
                solid_capstyle='round', zorder=1)
        ax.plot((row['best3'], row['best']), (y, y), color=red, lw=5,
                solid_capstyle='round', zorder=2)
        ax.plot(row['first'], y, 'o', ms=7, mec=ink, mfc='none', mew=1.5, zorder=4)
        ax.plot(row['best3'], y, 's', ms=7, color=gold, zorder=5)
        ax.plot(row['best'], y, 'D', ms=6, color=red, zorder=5)
        ax.text(1.04, y, f"+{row['best']-row['best3']:.1f} pp · n={row['n']}",
                transform=ax.get_yaxis_transform(), va='center',
                fontsize=10 if web else 9,
                color=red if row['best']-row['best3'] > 10 else muted)
    ax.set_yticks(range(len(rows)),
                  [f"{row['homework']} · {short_name(row)}" for row in rows],
                  fontsize=10 if web or mobile else 11)
    ax.set_ylim(len(rows)-.45, -.65)
    ax.set_xlim(0, 103)
    ax.set_xticks((0, 25, 50, 75, 100))
    ax.set_xlabel('Mean normalized problem score (%)', labelpad=11)
    ax.tick_params(axis='y', length=0, pad=9)
    ax.grid(axis='x', alpha=.16)
    ax.set_axisbelow(True)
    ax.spines['left'].set_visible(False)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    legend = [
        Line2D([], [], marker='o', ls='', mfc='none', mec=ink, mew=1.5,
               color=ink, label='First'),
        Line2D([], [], marker='s', ls='', color=gold, label='Best by 3'),
        Line2D([], [], marker='D', ls='', color=red, label='Best observed'),
    ]
    ax.legend(handles=legend, loc='lower left', bbox_to_anchor=(0, 1.01),
              ncol=3, fontsize=10 if web else 11, handletextpad=.35,
              columnspacing=1.1)
    count = sum(row['best']-row['best3'] > 10 for row in all_rows)
    title = ('Remaining gap after\nthree attempts' if mobile else
             'The remaining gap after three attempts')
    fig.text(.04, .97, title, fontsize=18 if mobile else 21,
             weight='bold', color=ink, va='top')
    fig.text(.04, .90 if mobile else .925,
             f"{count} of {len(all_rows)} problem slots have a >10 pp remaining mean gap",
             fontsize=11, color=muted, va='top')
    note = ('Desktop story: 9 selected rows; full figure: all 23.'
            if web else 'Rows sorted by remaining gap; all 23 problem slots shown.')
    footnote(fig, [note,
                   'Same attempters per row. Red = best observed minus best through three.',
                   'Cumulative best is not the actual third score or a causal gain.'],
             y=.018, web=web)
    finalize_figure(fig,out/('03-score-progression'+('-mobile' if mobile else '')),
                    'Remaining problem score gaps after three attempts',web=web)


def attempt_scores(data,out,mobile=False,web=False):
    vertical = mobile or web
    size = (7, 16) if mobile and web else (12, 12) if web else (8, 16) if mobile else (18, 6.5)
    fig,axes=plt.subplots(3 if vertical else 1,1 if vertical else 3,figsize=size,squeeze=False)
    visible=[r for r in data['attempt_score_series'] if r['state']=='visible']
    xmax=max(r['attempt'] for r in visible)
    for i,(ax,a,color) in enumerate(zip(axes.flat,data['assignments'],['#ed977b','#d9bc7d','#c5b6a7'] if web else HW_COLORS)):
        rows=[r for r in visible if r['homework']==a['homework']]
        x=np.asarray([r['attempt'] for r in rows]); y=np.asarray([r['mean_score'] for r in rows])
        ax.plot(x,y,marker=['o','s','D'][i],color=color,lw=2.5,ms=6)
        for r in (rows[0],rows[-1]):
            ax.annotate(f"{r['mean_score']:.1f}",(r['attempt'],r['mean_score']),xytext=(0,12),textcoords='offset points',ha='center',fontsize=11,color=color)
        if x[-1]<xmax:
            ax.axvspan(x[-1]+.5,xmax+.5,color='#302923' if web else '#f0f0f0',zorder=-1)
        ax.set_xlim(.5,xmax+.5);ax.set_ylim(0,105);ax.set_yticks([0,25,50,75,100])
        ax.set_xticks(range(1,xmax+1));ax.tick_params(axis='x',labelsize=10)
        ax.set_ylabel('Mean score at this attempt (%)')
        ax.set_title(f"({chr(97+i)})  {a['homework']}",loc='left',pad=18)
        ax.grid(axis='y',alpha=.18);ax.set_axisbelow(True)
        ax.set_xlabel('Attempt number within the same problem')
        if web:
            ax.set_xlabel('')
            ax.annotate('Attempt number within the same problem', (.5, 0), xycoords='axes fraction',
                        xytext=(0, -68), textcoords='offset points', ha='center', va='top', fontsize=12)
        else:
            ax.xaxis.set_label_coords(.5, -.49)
        lookup={r['attempt']:r for r in rows}
        for row_index,(key,label) in enumerate([('submissions','N'),('contributors','S')]):
            yy=-.21-row_index*.09
            if web:
                offset = -29-row_index*17
                ax.annotate(label, (-.025, 0), xycoords='axes fraction', xytext=(0, offset),
                            textcoords='offset points', ha='right', va='top', fontsize=11, weight='bold')
            else:
                ax.text(-.025,yy,label,transform=ax.transAxes,ha='right',fontsize=10,weight='bold')
            for k in range(1,xmax+1):
                value = str(lookup[k][key]) if k in lookup else '—'
                if web:
                    ax.annotate(value, (k, 0), xycoords=ax.get_xaxis_transform(), xytext=(0, offset),
                                textcoords='offset points', ha='center', va='top', fontsize=11)
                else:
                    ax.text(k,yy,value,transform=ax.get_xaxis_transform(),ha='center',fontsize=9)
    fig.tight_layout(pad=2,rect=(.01,.065 if mobile else .04,1,.99),h_pad=4)
    footnote(fig,['N = submitted student–problem events; S = distinct students. Equal weight per event.',
                  'Different cohorts at each attempt; no score carry-forward. Later means do not track a fixed group.',
                  'Points with fewer than five students are withheld. No causal claim or independent-sample error bars.'],web=web)
    finalize_figure(fig,out/('04-attempt-scores'+('-mobile' if mobile else '')),'Mean actual score by within-problem attempt number',web=web)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',type=Path,default=Path('data/summary.json'))
    parser.add_argument('--output',type=Path)
    parser.add_argument('--private-hourly',type=Path)
    parser.add_argument('--web', action='store_true', help='Transparent SVGs for the dark fullscreen website')
    args=parser.parse_args()
    if args.web and args.private_hourly:
        parser.error('Web figures use public aggregates only')
    args.output = args.output or Path('assets/story' if args.web else 'assets/figures')
    data=json.loads(args.input.read_text())
    apply_publication_style(web=args.web)
    for mobile in (False,True):
        for draw in (calendar,attempts,scores,attempt_scores): draw(data,args.output,mobile,web=args.web)
    if args.private_hourly:
        if args.private_hourly.resolve().is_relative_to(Path(__file__).resolve().parents[1]):
            raise ValueError('Private hourly input/output must remain outside the repository')
        private=json.loads(args.private_hourly.read_text())
        private_calendar(data,args.private_hourly.parent,private=private['calendar'])

if __name__=='__main__':main()
