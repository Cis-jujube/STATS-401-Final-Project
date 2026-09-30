"""Presentation metadata and transient evidence must match the published sources."""
from html.parser import HTMLParser
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from presentation_markup import interludes


class PresentationNodes(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.stops = []
        self.options = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if 'data-present-id' in attrs:
            self.stops.append(attrs)
        if tag == 'option':
            self.options.append(attrs.get('value'))


class PresentationMarkup(unittest.TestCase):
    def test_unique_ids_and_complete_scene_directory(self):
        parser = PresentationNodes()
        parser.feed((ROOT / 'index.html').read_text())
        self.assertEqual(len(parser.ids), len(set(parser.ids)))
        stop_ids = [s['data-present-id'] for s in parser.stops]
        self.assertEqual(stop_ids, ['home', 'timing', 'scores', 'attempt-scores',
                                   'midterm-associations', 'platform-associations',
                                   'evidence'])
        self.assertEqual(parser.options, stop_ids)
        for stop in parser.stops[1:]:
            self.assertGreater(int(stop['data-present-duration']), 0)
            self.assertTrue(stop['data-present-label'])

    def test_transition_captions_use_public_aggregates(self):
        summary = json.loads((ROOT / 'data/summary.json').read_text())
        midterm = json.loads((ROOT / 'data/midterm-summary.json').read_text())
        html = interludes(summary, midterm)
        # Independently identified largest remaining gap, with the same 39 people.
        gap = next(r for r in summary['score_progression'] if r['problem_name'] == '26s3HW3-EvenOrOdd')
        self.assertIn('Same 39 attempters', html)
        for key in ('first', 'best3', 'best'):
            self.assertIn(f'<strong>{gap[key]:.2f}</strong>', html)
        late = next(r for r in midterm['associations'] if r['metric'] == 'late_pct')
        for key in ('bootstrap_interval', 'leave_one_out_range'):
            low, high = late[key]
            self.assertIn(f'{low:+.2f} to {high:+.2f}', html)
        self.assertIn('Range, not a CI', html)
        self.assertIn('Same −1 to +1 scale', html)
        self.assertIn('aria-hidden="true"', html)
        # Changes in the source propagate instead of leaving copied numbers behind.
        gap['first'] = 17.125
        self.assertIn('<strong>17.12</strong>', interludes(summary, midterm))

    def test_native_fallback_and_dependency_order(self):
        html = (ROOT / 'index.html').read_text()
        self.assertIn('id="presentation-start" hidden', html)
        self.assertIn('id="presentation-panel" hidden', html)
        self.assertLess(html.index('src="assets/site.js"'), html.index('src="assets/presentation.js"'))
        self.assertLess(html.index('src="assets/presentation-clock.js"'), html.index('src="assets/presentation.js"'))
        self.assertEqual(html.count('class="story-chapter"'), 5)

    def test_full_story_has_one_complete_timed_edit(self):
        html = (ROOT / 'index.html').read_text()
        parser = PresentationNodes()
        parser.feed(html)
        duration = 0
        for stop in parser.stops:
            entrance = int(stop['data-film-duration'])
            hold = int(stop['data-film-hold'])
            self.assertGreaterEqual(entrance, 0)
            self.assertGreater(hold, 0)
            self.assertTrue(stop['data-film-word'])
            duration += entrance + hold
        self.assertEqual(duration, 70100)
        self.assertIn('id="film-start" hidden', html)
        self.assertIn('for="film-seek"', html)
        for script in ('film-clock.js', 'presentation-choreography.js', 'presentation-effects.js'):
            self.assertLess(html.index(f'src="assets/{script}"'), html.index('src="assets/presentation.js"'))


if __name__ == '__main__':
    unittest.main()
