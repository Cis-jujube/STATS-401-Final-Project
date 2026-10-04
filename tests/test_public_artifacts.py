"""Check published denominators, suppression, and static asset references."""
from html.parser import HTMLParser
import json
from pathlib import Path
import re
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
        self.assertEqual((len(visible), withheld), (37, 979))
        self.assertEqual((peak['date'], peak['hour'], peak['submissions'], peak['contributors']),
                         ('2026-08-29', 12, 153, 12))
        self.assertEqual((len(remaining), len(d['score_progression'])), (10, 31))
        self.assertEqual(max(d['score_progression'], key=lambda r: r['best'] - r['best3'])['problem_name'],
                         '26s3HW3-EvenOrOdd')
        companion = (ROOT/'analysis.html').read_text()
        self.assertIn(f'{withheld} submissions but are masked', companion)
        self.assertIn(f'{len(remaining)} of {len(d["score_progression"])} problem slots', companion)
        self.assertIn('Best through three is a cumulative maximum', companion)
    def test_all_local_page_resources_exist(self):
        parser = References()
        for name in ('index.html', 'analysis.html', 'legacy.html'):
            parser.feed((ROOT/name).read_text())
        for path in parser.paths:
            self.assertTrue((ROOT/urlparse(path).path).is_file(), path)
    def test_story_and_analysis_links_resolve(self):
        pages = {}
        for name in ('index.html', 'analysis.html', 'legacy.html'):
            parser = References()
            parser.feed((ROOT/name).read_text())
            pages[name] = parser
        # the film routes #<scene-id> (legacy), #figure-NN and #<chapter> links in JavaScript; treat them as anchors
        pages['index.html'].ids |= set(re.findall(r"id: '([\w-]+)', title:", ''.join(
            f.read_text() for f in sorted((ROOT/'assets/app/scenes').glob('*.js')))))
        manifest = json.loads((ROOT/'assets/app/figures.json').read_text())
        pages['index.html'].ids |= {f'figure-{fid}' for fid in manifest['figures']}
        pages['index.html'].ids |= set(re.findall(r"key: '([\w-]+)', scene:", (ROOT/'assets/app/routes.js').read_text()))
        story = (ROOT/'legacy.html').read_text()
        companion = (ROOT/'analysis.html').read_text()
        self.assertEqual(story.count('class="story-chapter"'), 10)
        self.assertEqual(companion.count('class="chart-section"'), 12)
        for figure in ('03-score-progression', '06-midterm-associations','11-retry-productivity','12-deadline-progress'):
            self.assertIn(f'assets/story/{figure}.svg', story)
            self.assertIn(f'assets/figures/{figure}.svg', companion)
        for figure in ('05-midterm-distribution', '07-midterm-attempt-groups'):
            self.assertNotIn(f'assets/story/{figure}.svg', story)
            self.assertIn(f'assets/figures/{figure}.svg', companion)
        mobile_score = (ROOT/'assets/story/03-score-progression-mobile.svg').read_text()
        self.assertIn('8 selected: top two remaining gaps within each homework.', mobile_score)
        self.assertIn('All 31 problem slots and values are in the analysis page.', mobile_score)
        for name, parser in pages.items():
            for target, fragment in parser.fragments:
                self.assertIn(fragment, pages[target or name].ids, f'{name} -> {target}#{fragment}')

    def test_film_bundles_current_public_aggregates(self):
        bundle = (ROOT/'assets/app/data.js').read_text()
        payload = json.loads(bundle[bundle.index('=') + 1:].strip().rstrip(';'))
        for key, name in (('homework', 'summary'), ('midterm', 'midterm-summary'), ('platform', 'platform-summary')):
            self.assertEqual(payload[key], json.loads((ROOT/f'data/{name}.json').read_text()), f'rerun scripts/build_app_data.py ({name})')
        film = (ROOT/'index.html').read_text()
        self.assertIn('assets/vendor/d3.v7.min.js', film)
        for scene in sorted((ROOT/'assets/app/scenes').glob('*.js')):
            self.assertIn(f'assets/app/scenes/{scene.name}', film)
        self.assertNotIn('student_id', bundle)

    def test_refreshed_event_totals_and_masked_partitions(self):
        d = json.loads((ROOT/'data/summary.json').read_text())
        self.assertEqual([a['homework'] for a in d['assignments']],['HW1','HW2','HW3','HW4'])
        self.assertEqual((d['cohort_members'],d['window_submissions'],d['window_submitters']),(42,2807,39))
        event = d['event_progress']
        eligible = sum(r['eligible_retries'] for r in event['by_homework'])
        improvements = sum(r['new_bests'] for r in event['by_homework'])
        self.assertEqual(eligible+sum(event['eligibility_counts'].values()),d['window_submissions'])
        self.assertEqual((eligible,improvements),(1222,468))
        self.assertEqual(eligible,sum(r['eligible_retries'] for r in event['by_gap']))
        self.assertEqual(improvements,sum(r['new_bests'] for r in event['by_gap']))
        for name in ('by_homework','by_gap','by_problem','by_phase'):
            for row in event[name]:
                if row['state']=='suppressed':
                    for key in ('eligible_retries','new_bests','contributors','improvement_pct'):
                        self.assertIsNone(row[key])
                elif row['eligible_retries']:
                    self.assertGreaterEqual(row['contributors'],5)
                    self.assertLessEqual(row['new_bests'],row['eligible_retries'])
                    self.assertAlmostEqual(row['improvement_pct'],100*row['new_bests']/row['eligible_retries'])
        for name in ('by_problem','by_phase'):
            for assignment in d['assignments']:
                rows = [r for r in event[name] if r['homework']==assignment['homework']]
                self.assertNotEqual(sum(r['state']=='suppressed' for r in rows),1)
                if all(r['state']=='visible' for r in rows):
                    total = next(r for r in event['by_homework'] if r['homework']==assignment['homework'])
                    self.assertEqual(sum(r['eligible_retries'] for r in rows),total['eligible_retries'])
                    self.assertEqual(sum(r['new_bests'] for r in rows),total['new_bests'])
        self.assertNotIn('student_id',json.dumps(event))
        self.assertNotIn('linkage-key',json.dumps(d))

if __name__ == '__main__':
    unittest.main()
