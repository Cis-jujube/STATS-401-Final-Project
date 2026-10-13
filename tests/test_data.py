import importlib.util
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location("prepare", Path(__file__).parents[1] / "scripts/prepare_data.py")
p = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(p)


class DataRules(unittest.TestCase):
    def test_homework_scope_includes_the_authorized_fifth_assignment(self):
        self.assertEqual(p.HOMEWORKS[189], 'HW5')

    def test_snapshot_calendar_keeps_overlap_pooled_and_future_unobserved(self):
        cutoff = p.timestamp('2026-10-13 06:13:19.647089')
        assignments = [
            {'assignment_id':178, 'start_time':'2026-09-24 02:00:00', 'end_time':'2026-10-02 15:59:00'},
            {'assignment_id':189, 'start_time':'2026-09-30 07:45:00', 'end_time':'2026-10-18 15:59:00'},
        ]
        rows = [{'when':p.timestamp('2026-09-30 08:00:00'), 'student_id':str(i)} for i in range(5)]
        cells = p.calendar(rows, assignments, 4, 5, cutoff=cutoff)
        mixed = next(c for c in cells if c['date']=='2026-09-30' and c['hour']==16)
        self.assertEqual(mixed['homeworks'], ['HW4','HW5'])
        self.assertIsNone(mixed['homework'])
        self.assertEqual((mixed['submissions'], mixed['contributors']), (5,5))
        self.assertNotIn('by_homework', mixed)
        self.assertEqual(max(c['date'] for c in cells), '2026-10-13')
        partial = next(c for c in cells if c['date']=='2026-10-13' and c['hour']==12)
        future = next(c for c in cells if c['date']=='2026-10-13' and c['hour']==16)
        self.assertEqual(partial['observation_status'], 'partial')
        self.assertEqual(future['state'], 'not_observed')
        self.assertIsNone(future['submissions'])
        self.assertIsNone(future['contributors'])

    def test_utc_crosses_beijing_midnight(self):
        self.assertEqual(p.timestamp("2026-08-29 16:00:00").date().isoformat(), "2026-08-30")

    def test_different_point_scales_are_comparable(self):
        self.assertEqual(p.normalized_score(8, 10), p.normalized_score(16, 20))
        self.assertEqual(p.normalized_score(0, 10), 0)
        for score, maximum in ((None, 10), (3, 0), (11, 10), (-1, 10), (float("nan"), 10)):
            with self.assertRaises(ValueError):
                p.normalized_score(score, maximum)

    def test_progress_uses_running_best_and_stable_tie_break(self):
        rows = [{"submission_id": i, "when": p.timestamp("2026-08-29 12:00:00"), "normalized_score": score}
                for i, score in enumerate([20, 60, 40, 60])]
        self.assertEqual(p.problem_progress(list(reversed(rows))), {"first": 20, "best2": 60, "best3": 60, "best": 60})

    def test_single_attempt_remains_in_later_attempt_comparison(self):
        row = {"submission_id": 1, "when": p.timestamp("2026-08-29 12:00:00"), "normalized_score": 80}
        self.assertEqual(p.problem_progress([row]), {"first": 80, "best2": 80, "best3": 80, "best": 80})

    def test_suppression_counts_people_not_attempts(self):
        when = p.timestamp("2026-08-29 12:00:00")
        assignments = [{"start_time": "2026-08-29 10:00:00", "end_time": "2026-08-29 15:59:00"}]
        rows = [{"when": when, "student_id": "one"}] * 200
        cells = p.calendar(rows, assignments, 4, 5)
        cell = next(c for c in cells if c["hour"] == 20)
        self.assertEqual(cell["state"], "suppressed")
        self.assertIsNone(cell["submissions"])
        self.assertIsNone(cell["contributors"])
        self.assertEqual(next(c for c in cells if c["hour"] == 0)["state"], "inactive")

    def test_five_distinct_people_pass_threshold(self):
        when = p.timestamp("2026-08-29 12:00:00")
        cells = p.calendar([{"when": when, "student_id": str(i)} for i in range(5)],
                           [{"start_time": "2026-08-29 10:00:00", "end_time": "2026-08-29 15:59:00"}], 4, 5)
        cell = next(c for c in cells if c["hour"] == 20)
        self.assertEqual((cell["submissions"], cell["contributors"]), (5, 5))


if __name__ == "__main__":
    unittest.main()
