import importlib.util
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location("prepare", Path(__file__).parents[1] / "scripts/prepare_data.py")
p = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(p)


class DataRules(unittest.TestCase):
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
