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

PALETTE = {'blue': '#0F4D92', 'blue_light': '#3775BA', 'green': '#8BCF8B',
           'red': '#B64342', 'gray': '#767676', 'ink': '#272727', 'neutral': '#CFCECE'}
HW_COLORS = [PALETTE['blue'], '#42949E', PALETTE['red']]


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
            'text.color': '#e8eeeb', 'axes.labelcolor': '#b9c5c0',
            'axes.edgecolor': '#8a9690', 'xtick.color': '#b9c5c0',
            'ytick.color': '#b9c5c0', 'grid.color': '#a3b6ac',
            'boxplot.whiskerprops.color': '#c2cdc8',
            'boxplot.capprops.color': '#c2cdc8',
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


def footnote(fig, lines, y=.025, web=False):
    fig.text(.04, y, '\n'.join(lines), fontsize=9, color='#9eaea4' if web else PALETTE['gray'], va='bottom', linespacing=1.55)


def calendar(data, out, mobile=False, private=None, web=False):
    cells = private if private is not None else data['calendar']
    hours = cells[0]['hours']
    dates = sorted({c['date'] for c in cells})
    lookup = {(c['date'], c['hour']): c for c in cells}
    columns = list(range(0, 24, hours))
    fig, axes = plt.subplots(2 if mobile else 1, 1 if mobile else 2,
                             figsize=(7, 15) if mobile else (15, 8.5), squeeze=False)
    cmap = LinearSegmentedColormap.from_list('cs201_blue', ['#f5f8fc', '#a8c5e2', PALETTE['blue']])
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
                    ax.text(ix,iy,str(cell[field]),ha='center',va='center',fontsize=10,
                            color='white' if norm(cell[field])>.55 else PALETTE['ink'])
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
                        markeredgecolor='#9A4D8E',markerfacecolor='white' if marker=='o' else '#9A4D8E',clip_on=False)
    handles=[Patch(facecolor='white',hatch='////',edgecolor='#b5b5b5',label='<5 contributors: masked'),
             Patch(facecolor='#e7e7e7',label='No homework window'),
             Line2D([],[],marker='o',ls='',mfc='white',mec='#9A4D8E',label='Opens'),
             Line2D([],[],marker='D',ls='',color='#9A4D8E',label='Configured deadline')]
    fig.legend(handles=handles[1:] if private else handles,loc='lower left',bbox_to_anchor=(.03,.065),
               ncol=2 if mobile else 4,fontsize=10)
    footnote(fig,['CS201 · HW1–HW3 configured windows · 20 Sep 2026 snapshot.',
                  'PRIVATE hourly view. Do not publish.' if private else 'White/light cells = zero; hatched cells are withheld, not zero. Public cells span four hours.'],web=web)
    fig.tight_layout(pad=2,rect=(0,.15 if not mobile else .13,1,.96),h_pad=4)
    name='01-calendar-private-hourly' if private else '01-calendar'+('-mobile' if mobile else '')
    finalize_figure(fig,out/name,'Submission timing and distinct contributors',web=web)


def attempts(data,out,mobile=False,web=False):
    fig,ax=plt.subplots(figsize=(6.5,6.5) if mobile else (10,6.2))
    stats=[{'label':a['homework'],'med':a['all_attempts']['median'],'q1':a['all_attempts']['q1'],
            'q3':a['all_attempts']['q3'],'whislo':a['all_attempts']['min'],'whishi':a['all_attempts']['max']}
           for a in data['assignments']]
    boxes=ax.bxp(stats,showfliers=False,patch_artist=True,widths=.42,
                 medianprops={'color':'#dce7e1' if web else '#272727','linewidth':2.5},
                 boxprops={'linewidth':2},whiskerprops={'linewidth':1.8},capprops={'linewidth':1.8})
    for box,color in zip(boxes['boxes'],['#8bb9df','#8ccac2','#deaaa4'] if web else HW_COLORS): box.set(facecolor=color,alpha=.25,edgecolor=color)
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


def score_story(data, out, mobile=False):
    """One shared score axis keeps all 23 problem labels readable on the website."""
    fig, ax = plt.subplots(figsize=(6, 13) if mobile else (11, 10))
    positions, labels = [], []
    position = 0
    blue = '#a4c6eb'
    for assignment in data['assignments']:
        rows = [r for r in data['score_progression'] if r['homework'] == assignment['homework']]
        ax.text(0, position - .8, assignment['homework'], fontsize=12, weight='bold')
        for row in rows:
            ax.plot([row['first'], row['best']], [position, position], color='#94adbd', lw=2)
            ax.plot(row['first'], position, 'o', mfc='#0c1012', mec=blue, mew=1.6, ms=6)
            ax.plot(row['best'], position, 'D', color=blue, ms=5)
            ax.text(1.02, position, f"n={row['n']}", transform=ax.get_yaxis_transform(), fontsize=10, va='center')
            positions.append(position)
            labels.append(short_name(row))
            position += 1
        position += 1.7
    ax.set_yticks(positions, labels, fontsize=12)
    ax.set_ylim(position - 1.7, -1.5)
    ax.set_xlim(0, 103)
    ax.set_xticks([0, 25, 50, 75, 100])
    ax.set_xlabel('Normalized score (%)')
    ax.grid(axis='x', alpha=.2)
    ax.spines['left'].set_visible(False)
    ax.tick_params(axis='y', length=0)
    handles = [Line2D([], [], marker='o', ls='', mfc='#0c1012', mec=blue, label='Mean first score'),
               Line2D([], [], marker='D', ls='', color=blue, label='Mean best score')]
    fig.legend(handles=handles, loc='upper right', bbox_to_anchor=(.97, .995), ncol=2, fontsize=10)
    fig.tight_layout(pad=1.5, rect=(0, .06, .94, .96))
    footnote(fig, ['Same attempters at both endpoints; ranked within homework.',
                  'Best scores cannot decrease. Differences are not causal learning effects.'], web=True)
    finalize_figure(fig, out/('03-score-progression'+('-mobile' if mobile else '')),
                    'First versus best normalized scores', web=True)


def scores(data,out,mobile=False,web=False):
    if web:
        score_story(data, out, mobile)
        return
    fig,axes=plt.subplots(3 if mobile else 1,1 if mobile else 3,figsize=(8,15) if mobile else (19,6.8),squeeze=False)
    blue = '#a4c6eb' if web else PALETTE['blue']
    for i,(ax,a) in enumerate(zip(axes.flat,data['assignments'])):
        rows=[r for r in data['score_progression'] if r['homework']==a['homework']]
        for y,r in enumerate(rows):
            ax.plot([r['first'],r['best']],[y,y],color='#b5c5d7',linewidth=2.5,zorder=1)
            ax.plot(r['first'],y,'o',mfc='white',mec=blue,mew=1.8,ms=7,zorder=2)
            ax.plot(r['best'],y,'D',color=blue,ms=6,zorder=2)
            ax.text(1.04,y,f"n={r['n']}",transform=ax.get_yaxis_transform(),fontsize=10,va='center')
        ax.set_yticks(range(len(rows)),[short_name(r) for r in rows],fontsize=10)
        ax.set_ylim(len(rows)-.5,-.7);ax.set_xlim(0,103);ax.set_xticks([0,25,50,75,100])
        ax.set_xlabel('Normalized score (%)');ax.set_title(f"({chr(97+i)})  {a['homework']}",loc='left',pad=17)
        ax.grid(axis='x',alpha=.18);ax.spines['left'].set_visible(False);ax.tick_params(axis='y',length=0)
    fig.legend(handles=[Line2D([],[],marker='o',ls='',mfc='white',mec=blue,mew=1.8,label='Mean first score'),
                        Line2D([],[],marker='D',ls='',color=blue,label='Mean best observed score')],
               loc='upper center',bbox_to_anchor=(.55,.99),ncol=2,fontsize=12)
    fig.tight_layout(pad=2,rect=(0,.10 if mobile else .16,.96,.95 if mobile else .90),h_pad=3,w_pad=3)
    footnote(fig,['Same attempters at both endpoints; rows ranked by difference within each homework.',
                  'Best scores cannot decrease by definition. Differences are not causal learning effects.'],web=web)
    finalize_figure(fig,out/('03-score-progression'+('-mobile' if mobile else '')),'First versus best normalized scores',web=web)


def attempt_scores(data,out,mobile=False,web=False):
    vertical = mobile or web
    size = (7, 16) if mobile and web else (12, 12) if web else (8, 16) if mobile else (18, 6.5)
    fig,axes=plt.subplots(3 if vertical else 1,1 if vertical else 3,figsize=size,squeeze=False)
    visible=[r for r in data['attempt_score_series'] if r['state']=='visible']
    xmax=max(r['attempt'] for r in visible)
    for i,(ax,a,color) in enumerate(zip(axes.flat,data['assignments'],['#8bb9df','#8ccac2','#deaaa4'] if web else HW_COLORS)):
        rows=[r for r in visible if r['homework']==a['homework']]
        x=np.asarray([r['attempt'] for r in rows]); y=np.asarray([r['mean_score'] for r in rows])
        ax.plot(x,y,marker=['o','s','D'][i],color=color,lw=2.5,ms=6)
        for r in (rows[0],rows[-1]):
            ax.annotate(f"{r['mean_score']:.1f}",(r['attempt'],r['mean_score']),xytext=(0,12),textcoords='offset points',ha='center',fontsize=11,color=color)
        if x[-1]<xmax:
            ax.axvspan(x[-1]+.5,xmax+.5,color='#242b2c' if web else '#f0f0f0',zorder=-1)
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
        calendar(data,args.private_hourly.parent,private=private['calendar'])

if __name__=='__main__':main()
