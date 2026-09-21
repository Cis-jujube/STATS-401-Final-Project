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
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
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
    def test_all_local_page_resources_exist(self):
        parser = References()
        parser.feed((ROOT/'index.html').read_text())
        parser.feed((ROOT/'analysis.html').read_text())
        for path in parser.paths:
            self.assertTrue((ROOT/urlparse(path).path).is_file(), path)

if __name__ == '__main__':
    unittest.main()
