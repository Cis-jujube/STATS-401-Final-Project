"""Core / Showcase content routes: the shared figure manifest, evidence links and return paths."""
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((ROOT/'assets/app/figures.json').read_text())
CORE = ['01', '03', '11', '12', '06']


class Sections(HTMLParser):
    """Collect each chart section's id and the hrefs inside it."""
    def __init__(self):
        super().__init__()
        self.sections, self.current = {}, None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'section' and 'chart-section' in (a.get('class') or ''):
            self.current = a['id']; self.sections[self.current] = []
        elif tag == 'a' and self.current and a.get('href'):
            self.sections[self.current].append(a['href'])
    def handle_endtag(self, tag):
        if tag == 'section':
            self.current = None


class ContentRoutes(unittest.TestCase):
    def test_route_membership(self):
        routes = MANIFEST['routes']
        self.assertEqual(routes['core']['figures'], CORE)
        showcase = routes['showcase']['figures']
        self.assertEqual(sorted(showcase), sorted(MANIFEST['figures']))
        self.assertEqual(len(showcase), 12)
        self.assertLess(showcase.index('08'), showcase.index('09'))  # coverage before platform results
        self.assertLess(showcase.index('08'), showcase.index('10'))
        self.assertTrue(set(CORE) <= set(showcase))

    def test_film_bundle_matches_manifest(self):
        bundle = (ROOT/'assets/app/figures.js').read_text()
        payload = json.loads(bundle[bundle.index('=') + 1:].strip().rstrip(';'))
        self.assertEqual(payload, MANIFEST, 'rerun scripts/build_app_data.py')
        film = (ROOT/'index.html').read_text()
        for name in ('figures.js', 'routes.js', 'reel.js', 'player.js'):
            self.assertIn(f'assets/app/{name}', film)

    def test_every_figure_has_evidence_methods_and_downloads(self):
        parser = Sections()
        parser.feed((ROOT/'analysis.html').read_text())
        for fid, fig in MANIFEST['figures'].items():
            self.assertIn(fig['anchor'], parser.sections, fid)
            self.assertTrue((ROOT/fig['methods']).is_file(), fig['methods'])
            self.assertTrue((ROOT/fig['data']).is_file(), fig['data'])
            for ext in ('png', 'svg', 'pdf'):
                self.assertTrue((ROOT/f'assets/figures/{fig["stem"]}.{ext}').is_file(), (fid, ext))
            self.assertTrue((ROOT/f'assets/figures/{fig["stem"]}-mobile.svg').is_file(), fid)

    def test_evidence_sections_return_to_the_right_figure_and_route(self):
        parser = Sections()
        parser.feed((ROOT/'analysis.html').read_text())
        for fid, fig in MANIFEST['figures'].items():
            hrefs = parser.sections[fig['anchor']]
            showcase = f'index.html?content=showcase#figure-{fid}'
            core = f'index.html?content=core#figure-{fid}'
            self.assertIn(showcase, hrefs, fid)
            if fid in CORE:
                self.assertIn(core, hrefs, fid)
            else:
                self.assertNotIn(core, hrefs, f'{fid} is not a Core figure')
        companion = (ROOT/'analysis.html').read_text()
        self.assertNotIn('Ten featured chapters', companion)
        self.assertNotIn('index.html#exam', companion)
        for data in ('data/summary.json', 'data/midterm-summary.json', 'data/platform-summary.json'):
            self.assertIn(f'href="{data}"', companion)
        self.assertIn('assets/analysis-return.js', companion)
        self.assertTrue((ROOT/'assets/analysis-return.js').is_file())

    def test_legacy_page_keeps_its_ten_chapters(self):
        story = (ROOT/'legacy.html').read_text()
        self.assertEqual(story.count('class="story-chapter"'), 10)
        self.assertNotIn('film-return', story)


if __name__ == '__main__':
    unittest.main()
