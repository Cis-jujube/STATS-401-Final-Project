"""Build the public, static progress-check page from the same aggregate evidence."""
from html import escape as e
import json
from pathlib import Path
from render_site import render_page
from midterm_sections import sections as midterm_sections
from platform_sections import sections as platform_sections
from homework_sections import sections as homework_sections

ROOT=Path(__file__).resolve().parents[1]
d=json.loads((ROOT/'data/summary.json').read_text())
def table(headers,rows,caption):
    return '<div class="table-scroll"><table><caption>'+e(caption)+'</caption><thead><tr>'+''.join('<th scope="col">'+e(str(h))+'</th>' for h in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+e(str(v))+'</td>' for v in r)+'</tr>' for r in rows)+'</tbody></table></div>'
def figure(name,alt,caption):
    figure_class = ' class="score-detail"' if name == '03-score-progression' else ''
    return f'<figure{figure_class}><picture><source media="(max-width: 900px)" srcset="assets/figures/{name}-mobile.svg"><img src="assets/figures/{name}.svg" alt="{e(alt)}" loading="lazy"></picture><figcaption>{caption}</figcaption></figure><div class="downloads"><a href="assets/figures/{name}.png" download>Download PNG ↗</a><a href="assets/figures/{name}.svg" download>Download SVG ↗</a><a href="assets/figures/{name}.pdf" download>Download PDF ↗</a></div>'

# All homework captions and tables derive from the refreshed public snapshot.
html = homework_sections(d, table, figure)
midterm = json.loads((ROOT/'data/midterm-summary.json').read_text())
html += midterm_sections(midterm, table, figure)
platform = json.loads((ROOT/'data/platform-summary.json').read_text())
html += platform_sections(platform, table, figure)
(ROOT/'legacy.html').write_text(render_page(html, midterm, d).replace('><', '>\n<')+'\n')
