"""Protect temporal exclusion, identity linkage and public cohort boundaries."""
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
from prepare_platform import build, select_usage


def cell(account='0', day='2026-09-15', last='2026-09-15T23:00:00Z', metric='page_view'):
    return dict(scope='course', role='student', account_id=account, day=day,
                last_seen_at=last, route='home', metric=metric, count='1')


def fixture():
    accounts = [dict(id=str(i), scope='course', role='student', display_name=f'Private student {i}') for i in range(10)]
    grades = [dict(profile_id=i, name=f'Private student {i}', midterm=80+i) for i in range(10)]
    usage = [cell(str(i), metric=m) for i in range(5) for m in ('active_ms', 'resource_open')]
    meta = dict(matched=10, mean=84.5, eligible_roster=12, associations=[])
    return accounts, usage, grades, meta


class PlatformRules(unittest.TestCase):
    def test_cutoff_and_straddling_cells(self):
        rows = [cell(), cell(day='2026-09-16', last='2026-09-16T03:59:59Z'),
                cell(account='1', day='2026-09-16', last='2026-09-16T04:00:00Z'),
                cell(day='2026-09-17', last='2026-09-17T01:00:00Z')]
        self.assertEqual(len(select_usage(rows)), 1)
        self.assertEqual(len(select_usage(rows, sensitivity=True)), 2)

    def test_ambiguous_identity_and_cohort_mismatch_fail(self):
        a, u, g, m = fixture()
        a.append({**a[0], 'id': 'another'})
        with self.assertRaisesRegex(ValueError, 'ambiguous'):
            build(a, u, g, m, 100)
        a, u, g, m = fixture(); m['mean'] = 99
        with self.assertRaisesRegex(ValueError, 'reconcile'):
            build(a, u, g, m, 100)

    def test_staff_demo_and_after_exam_excluded(self):
        rows = [cell(), {**cell(), 'role': 'professor'}, {**cell(), 'scope': 'demo'}]
        self.assertEqual(len(select_usage(rows)), 1)

    def test_duplicate_or_invalid_events_fail(self):
        for rows in ([cell(), cell()], [{**cell(), 'count': 'nan'}],
                     [{**cell(), 'last_seen_at': '2026-09-14T01:00:00Z'}]):
            with self.assertRaises(ValueError):
                select_usage(rows)

    def test_private_fields_not_published_and_no_record_retained(self):
        result = build(*fixture(), 100)
        self.assertEqual([r['n'] for r in result['groups']], [5, 5])
        self.assertEqual(result, build(*fixture(), 100))
        for text in ('Private student', 'account_id', 'profile_id', 'display_name'):
            self.assertNotIn(text, json.dumps(result))
        a, u, g, m = fixture();u = [r for r in u if r['account_id'] != '4']
        with self.assertRaisesRegex(ValueError, 'Sparse'):
            build(a, u, g, m, 100)

    def test_public_summary_reconciles(self):
        d = json.loads((ROOT/'data/platform-summary.json').read_text())
        self.assertEqual(sum(r['n'] for r in d['groups']), d['matched'])
        self.assertEqual(d['recorded_users'], 11)
        self.assertTrue(all(r['bootstrap_interval'][0] < 0 < r['bootstrap_interval'][1] for r in d['associations']))


if __name__ == '__main__':
    unittest.main()
