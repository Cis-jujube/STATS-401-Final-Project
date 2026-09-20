"""Render deterministic, dependency-free statistical SVGs from aggregate JSON."""
import argparse
from datetime import datetime
from html import escape
import json
from pathlib import Path

INK = '#192f38'
TEAL = '#12655f'
PAPER = '#fffefa'
MUTED = '#52636a'
GRID = '#dbe2df'

class SVG:
    def __init__(self, w, h, title):
        self.w, self.h = w, h
        self.parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img"><title>{escape(title)}</title><defs><pattern id="mask" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#f1eee8"/><path d="M0 6L6 0" stroke="#c1bdb4"/></pattern></defs>', f'<rect width="{w}" height="{h}" fill="{PAPER}"/>']
    def text(self, x, y, value, size=14, color=INK, anchor='start', weight='400'):
        self.parts.append(f'<text x="{x}" y="{y}" fill="{color}" text-anchor="{anchor}" font-family="Arial, sans-serif" font-size="{size}" font-weight="{weight}">{escape(str(value))}</text>')
    def rect(self, x,y,w,h,fill,stroke='none'):
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}"/>')
    def line(self,x1,y1,x2,y2,color=GRID,width=1):
        self.parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width}"/>')
    def mark(self,x,y,kind,color=TEAL,r=5):
        if kind == 'circle':
            self.parts.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{PAPER}" stroke="{color}" stroke-width="2"/>')
        else:
            self.parts.append(f'<path d="M{x} {y-r}l{r} {r}l{-r} {r}l{-r} {-r}Z" fill="{color}"/>')
    def save(self,path):
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text('\n'.join(self.parts)+'\n</svg>\n')

def header(s, number, title, subtitle):
    s.text(30,30,number,12,TEAL,weight='700')
    s.text(30,67,title,25,weight='700')
    for i,line in enumerate(subtitle): s.text(30,94+20*i,line,13,MUTED)

def color(value, maximum):
    t=value/maximum if maximum else 0
    start,end=(243,247,244),(18,101,95)
    return '#'+''.join(f'{round(a+(b-a)*t):02x}' for a,b in zip(start,end))

def calendar(data,out,mobile=False,private=None):
    cells=private if private is not None else data['calendar']
    dates=sorted({c['date'] for c in cells}); hours=cells[0]['hours']; cols=24//hours
    w=560 if mobile else (1400 if private else 1120)
    h=1360 if mobile else 800
    s=SVG(w,h,'When submissions happen: count and distinct contributors')
    header(s,'01 / TIMING','When submissions happen', ['Recorded activity in Beijing time (UTC+08:00).', 'Private hourly view — do not publish.' if private else 'Four-hour cells. Small groups are masked; masked does not mean zero.'])
    lookup={(c['date'],c['hour']):c for c in cells}
    panelw=w-60 if mobile else (w-80)/2
    for panel,(field,title) in enumerate([('submissions','Submission count'),('contributors','Distinct contributors')]):
        ox=30 if mobile else 30+panel*(panelw+20)
        oy=170+panel*550 if mobile else 170
        x0=ox+72; cw=(panelw-80)/cols; rh=21
        maximum=max(c[field] or 0 for c in cells)
        s.text(ox,oy-23,title,17,weight='700')
        for k in range(50): s.rect(ox+225+k*3,oy-35,3,10,color(k,49))
        s.text(ox+225,oy-10,'0',10,MUTED); s.text(ox+375,oy-10,maximum,10,MUTED,anchor='end')
        for j in range(cols):
            if hours>1 or j%4==0: s.text(x0+(j+.5)*cw,oy+5,f'{j*hours:02}',11,MUTED,'middle')
        for i,d in enumerate(dates):
            y=oy+16+i*rh
            s.text(x0-10,y+15,datetime.fromisoformat(d).strftime('%b %d'),11,MUTED,'end')
            for j in range(cols):
                c=lookup[d,j*hours]; v=c[field]
                fill=('#e1e3df' if c['state']=='inactive' else 'url(#mask)') if c['state']!='visible' else color(v,maximum)
                s.rect(x0+j*cw,y,cw-2,rh-2,fill)
                if hours>1 and v:
                    s.text(x0+(j+.5)*cw,y+14,v,11,'white' if v/maximum>.55 else INK,'middle')
        for a in data['assignments']:
            for key,shape in [('start_local','circle'),('end_local','diamond')]:
                dt=datetime.fromisoformat(a[key]); di=dates.index(dt.date().isoformat())
                s.mark(x0+(dt.hour+dt.minute/60)/hours*cw,oy+16+(di+.5)*rh,shape,'#a56728',4)
        s.text(x0,oy+482,'Hour of day · cell start',12,MUTED)
    y=h-105

    if not private:
        s.rect(30,y-12,17,17,'url(#mask)'); s.text(55,y+1,'<5 contributors: masked',12,MUTED)
    s.rect(295,y-12,17,17,'#e1e3df'); s.text(320,y+1,'No homework window',12,MUTED)
    s.mark(38,y+28,'circle','#a56728',4); s.text(55,y+32,'Opens',12,MUTED)
    s.mark(300,y+28,'diamond','#a56728',4); s.text(320,y+32,'Configured deadline',12,MUTED)
    s.text(30,h-27,'Source: CS201 OJ · 20 Sep 2026 snapshot · own homework windows only',11,MUTED)
    name='01-calendar-private-hourly' if private else '01-calendar-mobile' if mobile else '01-calendar'
    s.save(out/(name+'.svg'))

def attempts(data,out,mobile=False):
    w,h=(560,720) if mobile else (1120,670)
    s=SVG(w,h,'Per-student homework submission counts: min-max boxplots')
    header(s,'02 / RETRIES','Similar medians, wide ranges',['Per-student counts among window submitters.', 'Box = middle 50%; line = median; whiskers = minimum to maximum.'])
    x0,x1=75,w-35; top,bottom=165,h-150
    scale=lambda v: bottom-v/120*(bottom-top)
    for v in range(0,121,20):
        y=scale(v); s.line(x0,y,x1,y); s.text(x0-12,y+4,v,12,MUTED,'end')
    s.text(x0,top-17,'Submissions',12,MUTED)
    for i,a in enumerate(data['assignments']):
        x=x0+(i+.5)*(x1-x0)/3; q=a['all_attempts']; bw=45 if mobile else 100
        s.line(x,scale(q['min']),x,scale(q['max']),TEAL,2)
        for v in ['min','max']: s.line(x-bw/4,scale(q[v]),x+bw/4,scale(q[v]),TEAL,2)
        s.rect(x-bw/2,scale(q['q3']),bw,scale(q['q1'])-scale(q['q3']),'#cde4da',TEAL)
        s.line(x-bw/2,scale(q['median']),x+bw/2,scale(q['median']),TEAL,3)
        s.text(x,scale(q['max'])-10,f"max {q['max']}",12,TEAL,'middle')
        s.text(x+bw/2+7,scale(q['median'])+4,f"{q['median']:g}",12,TEAL,weight='700')
        s.text(x,bottom+28,a['homework'],16,INK,'middle','700')
        s.text(x,bottom+51,f"n = {q['n']}",12,MUTED,'middle')
        s.text(x,bottom+71,f"{a['problems']} problems",12,MUTED,'middle')
    s.text(30,h-43,'More submissions do not directly measure effort or difficulty.',12,MUTED)
    s.text(30,h-23,'Source: CS201 OJ · inclusive quartiles · no individual student points',11,MUTED)
    s.save(out/(('02-attempts-mobile' if mobile else '02-attempts')+'.svg'))

def scores(data,out,mobile=False):
    w=560 if mobile else 1120; h=1320
    s=SVG(w,h,'First and best observed normalized scores for each homework problem')
    header(s,'03 / SCORE PROGRESSION','High final scores hide different starts', ['Same attempters at both endpoints; means on a 0–100 scale.', 'Rows sorted by first-to-best difference within each homework.'])
    s.mark(40,146,'circle'); s.text(53,150,'Mean first score',12)
    s.mark(245,146,'diamond'); s.text(258,150,'Mean best observed score',12)
    left=110 if mobile else 435; right=w-70; top=200; bottom=1190
    sx=lambda v:left+(right-left)*v/100
    for v in range(0,101,20):
        s.line(sx(v),top-5,sx(v),bottom); s.text(sx(v),top-17,v,12,MUTED,'middle')
    y=220
    for a in data['assignments']:
        s.text(30,y,a['homework'],15,TEAL,weight='700'); y+=34
        for r in [r for r in data['score_progression'] if r['homework']==a['homework']]:
            label=f"P{r['problem_order']}" if mobile else r['problem_name']
            s.text(left-15,y+4,label,12,INK,'end')
            s.line(sx(r['first']),y,sx(r['best']),y,'#91b7aa',3)
            s.mark(sx(r['first']),y,'circle'); s.mark(sx(r['best']),y,'diamond')
            s.text(right+15,y+4,f"n={r['n']}",11,MUTED)
            y+=35
        y+=36
    s.text(left,1230,'Normalized score (%)',13,MUTED)
    s.text(30,1263,'Best scores cannot decrease by definition; this is not causal learning gain.',12,MUTED)
    s.text(30,1286,'P numbers follow assignment order; names and exact means are in the data table.' if mobile else 'Normalized score = submission points within the assignment / problem maximum × 100.',11,MUTED)
    s.save(out/(('03-score-progression-mobile' if mobile else '03-score-progression')+'.svg'))

def main():
    p=argparse.ArgumentParser(); p.add_argument('--input',type=Path,default=Path('data/summary.json')); p.add_argument('--output',type=Path,default=Path('assets/figures')); p.add_argument('--private-hourly',type=Path)
    args=p.parse_args(); d=json.loads(args.input.read_text())
    for mobile in (False,True):
        calendar(d,args.output,mobile); attempts(d,args.output,mobile); scores(d,args.output,mobile)
    if args.private_hourly:
        if args.private_hourly.resolve().is_relative_to(Path(__file__).resolve().parents[1]):
            raise ValueError('Private hourly input/output must stay outside the public repository')
        private=json.loads(args.private_hourly.read_text())
        calendar(d,args.private_hourly.parent,private=private['calendar'] if isinstance(private,dict) else private)
if __name__=='__main__': main()
