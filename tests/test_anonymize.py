"""Anonymized source copy: synthetic inputs only; no real student record is read."""
import csv
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).parents[1]
SPEC = importlib.util.spec_from_file_location('anonymize', ROOT/'scripts/anonymize_sources.py')
a = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(a)

NAMES = ['Ada Example', 'Ben Sample']
HEX = ['a1' * 32, 'b2' * 32, 'c3' * 32]


def write_csv(path, rows):
    with path.open('w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)


class AnonymizeSources(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        sub = [{'submission_id': i, 'student_id': HEX[i % 3], 'assignment_id': 95, 'problem_id': 1,
                'submitted_at': f'2026-08-27 0{i % 9}:00:00', 'judge_status': 'D', 'judge_result': 'WA',
                'language_id': 1, 'submission_score': 50} for i in (30, 10, 20, 40, 50)]
        self.bundle = {'class_id': 13, 'extra_exclusions_verified': True, 'tables': {
            'course': [{'class_id': 13, 'class_name': '2026 Fall Prof Ada Example'}],
            'roster': [{'class_id': 13, 'student_id': h} for h in HEX],
            'submissions': sub,
            'participations': [{'participation_id': 900 + i, 'student_id': h, 'assignment_id': 95} for i, h in enumerate(HEX)],
            'submission_links': [{'submission_id': r['submission_id'], 'participation_id': 900 + HEX.index(r['student_id']),
                                  'assignment_problem_id': 7, 'assignment_submission_score': 5} for r in sub]}}
        (self.tmp / 'hw.json').write_text(json.dumps(self.bundle))
        mid = self.tmp / 'mid'
        mid.mkdir()
        with (mid / 'oj_metrics.tsv').open('w', newline='') as f:
            w = csv.writer(f, delimiter='\t')
            w.writerow(['profile_id', 'problems', 'attempts', 'first_score', 'best_score', 'late_pct'])
            w.writerows([[501, 3, 9, 50, 100, 10], [502, 3, 7, 60, 100, 20], [503, 2, 4, 40, 90, 30]])
        write_csv(mid / 'canvas_midterm.csv', [{'profile_id': 501 + i, 'name': n, 'midterm': 90 + i, 'canvas_hw1': 1,
                                                'canvas_hw2': 1, 'canvas_hw3': 1, 'homework_discrepancy': 0} for i, n in enumerate(NAMES)])
        (mid / 'provenance.json').write_text(json.dumps({'class_id': 13, 'excluded_test_profile_id': 414}))
        plat = self.tmp / 'plat'
        plat.mkdir()
        write_csv(plat / 'accounts.csv', [
            {'id': 'acct-ada', 'username': 'aexample', 'display_name': 'Ada Example', 'role': 'student', 'scope': 'course', 'enabled': 1},
            {'id': 'acct-ben', 'username': 'bsample99', 'display_name': 'ben  sample', 'role': 'student', 'scope': 'course', 'enabled': 1},
            {'id': 'acct-prof', 'username': 'prof1', 'display_name': 'Prof Person', 'role': 'professor', 'scope': 'course', 'enabled': 1}])
        write_csv(plat / 'usage_account_daily.csv', [{'scope': 'course', 'account_id': 'acct-ben', 'day': '2026-09-10', 'role': 'student',
                                                      'route': '/', 'metric': 'resource_open', 'count': 2, 'last_seen_at': '2026-09-10T08:00:00Z'}])
        self.out = self.tmp / 'out'
        a.homework(self.tmp / 'hw.json', self.out)
        a.midterm_and_platform(mid, plat, self.out)

    def test_homework_labels_order_and_links(self):
        d = json.loads((self.out / 'homework/analysis-dataset.json').read_text())['tables']
        self.assertEqual(sorted(r['student_id'] for r in d['roster']), ['S01', 'S02', 'S03'])
        # renumbered 1..n in the original id order, so time ties still sort the same way
        original = sorted(self.bundle['tables']['submissions'], key=lambda r: r['submission_id'])
        self.assertEqual([r['submission_id'] for r in d['submissions']], [1, 2, 3, 4, 5])
        self.assertEqual([r['submitted_at'] for r in d['submissions']], [r['submitted_at'] for r in original])
        # each student keeps one label, and links still point at that student's participation
        owner = {r['participation_id']: r['student_id'] for r in d['participations']}
        by_id = {r['submission_id']: r['student_id'] for r in d['submissions']}
        self.assertTrue(all(owner[l['participation_id']] == by_id[l['submission_id']] for l in d['submission_links']))
        self.assertEqual(len({r['student_id'] for r in d['submissions']}), 3)
        self.assertEqual(d['course'][0]['class_name'], 'CS201')

    def test_names_and_identifiers_are_gone(self):
        secrets = set(HEX) | set(NAMES) | {'aexample', 'bsample99', 'prof1', 'acct-ada', 'acct-ben', 'acct-prof', 'Prof Person'}
        self.assertEqual(a.leaks(self.out, secrets), [])
        grades = a.read_csv(self.out / 'midterm/canvas_midterm.csv')
        accounts = a.read_csv(self.out / 'platform/csv/portal/accounts.csv')
        self.assertTrue(all(g['name'].startswith('Student M') for g in grades))
        self.assertTrue(all(int(g['profile_id']) != 414 for g in grades))
        # a graded student keeps the same pseudonym in the grade table and in Course Pulse
        self.assertEqual({g['name'] for g in grades}, {r['display_name'] for r in accounts if r['display_name'].startswith('Student M')})
        self.assertNotIn('username', accounts[0])

    def test_leak_check_and_repository_guard(self):
        (self.out / 'note.txt').write_text('left over: Ada Example')
        self.assertEqual(a.leaks(self.out, {'Ada Example'}), ['note.txt'])
        argv = sys.argv
        sys.argv = ['anonymize', '--homework', str(self.tmp / 'hw.json'), '--midterm', str(self.tmp / 'mid'),
                    '--platform', str(self.tmp / 'plat'), '--output', str(ROOT / 'tmp-anon')]
        try:
            with self.assertRaises(SystemExit):
                a.main()
        finally:
            sys.argv = argv
        self.assertFalse((ROOT / 'tmp-anon').exists())


if __name__ == '__main__':
    unittest.main()
