"""Check published denominators, suppression, and static asset references."""
from html.parser import HTMLParser
import json
from pathlib import Path
import unittest
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]

class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []
        self.ids = set()
        self.fragments = []
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key == 'id' and value:
                self.ids.add(value)
            if key == 'href' and value:
                target = urlparse(value)
                if not target.scheme and target.fragment and target.path in ('', 'index.html', 'analysis.html'):
                    self.fragments.append((target.path, target.fragment))
            if key in ('src', 'href', 'srcset') and value and not urlparse(value).scheme and not value.startswith('#'):
                self.paths.append(value)

class PublicArtifacts(unittest.TestCase):
    def test_counts_and_score_cohorts_reconcile(self):
        d = json.loads((ROOT/'data/summary.json').read_text())
        self.assertEqual(sum(a['submissions'] for a in d['assignments']), d['window_submissions'])
        self.assertEqual(d['window_submissions']+d['outside_window'], d['all_homework_submissions'])
        self.assertLessEqual(d['window_submitters'], d['cohort_members'])
        for r in d['score_progression']:
            self.assertGreaterEqual(r['n'], 5)
            self.assertTrue(0 <= r['first'] <= r['best2'] <= r['best3'] <= r['best'] <= 100)
    def test_suppressed_cells_do_not_publish_numeric_values(self):
        d = json.loads((ROOT/'data/summary.json').read_text())
        for c in d['calendar']:
            if c['state'] == 'visible':
                self.assertTrue(c['contributors'] == 0 or c['contributors'] >= 5)
            else:
                self.assertIsNone(c['submissions'])
                self.assertIsNone(c['contributors'])
        for row in d['attempt_score_series']:
            if row['state'] == 'visible':
                self.assertGreaterEqual(row['contributors'], 5)
                self.assertGreaterEqual(row['submissions'], row['contributors'])
                self.assertTrue(0 <= row['mean_score'] <= 100)
            else:
                for field in ('mean_score', 'submissions', 'contributors'):
                    self.assertIsNone(row[field])
        self.assertNotIn('student_id', json.dumps(d))
    def test_featured_chart_claims_reconcile_with_public_aggregates(self):
        d = json.loads((ROOT/'data/summary.json').read_text())
        visible = [c for c in d['calendar'] if c['state'] == 'visible' and c['submissions'] > 0]
        withheld = d['window_submissions'] - sum(c['submissions'] or 0 for c in d['calendar'])
        peak = max(visible, key=lambda c: c['submissions'])
        remaining = [r for r in d['score_progression'] if r['best'] - r['best3'] > 10]
        self.assertEqual((len(visible), withheld), (29, 677))
        self.assertEqual((peak['date'], peak['hour'], peak['submissions'], peak['contributors']),
                         ('2026-08-29', 12, 153, 12))
        self.assertEqual((len(remaining), len(d['score_progression'])), (9, 23))
        self.assertEqual(max(d['score_progression'], key=lambda r: r['best'] - r['best3'])['problem_name'],
                         '26s3HW3-EvenOrOdd')
        companion = (ROOT/'analysis.html').read_text()
        self.assertIn('677 submissions but are masked', companion)
        self.assertIn('Nine of 23 problem slots', companion)
        self.assertIn('Best through three is a cumulative maximum', companion)
    def test_all_local_page_resources_exist(self):
        parser = References()
        parser.feed((ROOT/'index.html').read_text())
        parser.feed((ROOT/'analysis.html').read_text())
        for path in parser.paths:
            self.assertTrue((ROOT/urlparse(path).path).is_file(), path)
    def test_story_and_analysis_links_resolve(self):
        pages = {}
        for name in ('index.html', 'analysis.html'):
            parser = References()
            parser.feed((ROOT/name).read_text())
            pages[name] = parser
        story = (ROOT/'index.html').read_text()
        companion = (ROOT/'analysis.html').read_text()
        self.assertEqual(story.count('class="story-chapter"'), 5)
        self.assertEqual(companion.count('class="chart-section"'), 10)
        for figure in ('03-score-progression', '06-midterm-associations'):
            self.assertIn(f'assets/story/{figure}.svg', story)
            self.assertIn(f'assets/figures/{figure}.svg', companion)
        for figure in ('02-attempts', '05-midterm-distribution', '07-midterm-attempt-groups',
                       '08-platform-coverage', '09-platform-groups'):
            self.assertNotIn(f'assets/story/{figure}.svg', story)
            self.assertIn(f'assets/figures/{figure}.svg', companion)
        mobile_score = (ROOT/'assets/story/03-score-progression-mobile.svg').read_text()
        self.assertIn('Six selected: top two remaining gaps within each homework.', mobile_score)
        self.assertIn('All 23 problems and exact values are in the analysis page.', mobile_score)
        for name, parser in pages.items():
            for target, fragment in parser.fragments:
                self.assertIn(fragment, pages[target or name].ids, f'{name} -> {target}#{fragment}')

if __name__ == '__main__':
    unittest.main()
