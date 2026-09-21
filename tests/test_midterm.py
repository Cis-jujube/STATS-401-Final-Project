"""Regression checks for private linkage, pre-exam scope and public disclosure."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("midterm", ROOT / "scripts/prepare_midterm.py")
p = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(p)


def fixture():
    # Synthetic fixtures test rules; none are written into analytical outputs.
    metrics = [{"profile_id": i+1000, "problems": 22 if i == 1 else 23,
                "attempts": 24+3*i, "first_score": 30+i*2,
                "best_score": 100, "late_pct": 3*i} for i in range(30)]
    # Six low-count students; preserve the minimum group size.
    for i in range(6):
        metrics[i]["attempts"] = 24+i
    grades = [{"profile_id": i+1000, "name": f"PRIVATE_NAME_{i}", "midterm": 70+i*1.3,
               "homework_discrepancy": int(i < 2)} for i in range(30)]
    provenance = {"class_id": 13, "excluded_test_profile_id": 414, "eligible_roster": 41,
                  "homework_window_end": "2026-09-15T23:59:00+08:00",
                  "exam_started_at": "2026-09-16T12:00:00+08:00", "oj_extracted_at": "fixture"}
    return metrics, grades, provenance


class MidtermRules(unittest.TestCase):
    def test_ties_and_rank_direction(self):
        self.assertEqual(p.ranks([10, 20, 20, 30]), [1, 2.5, 2.5, 4])
        self.assertAlmostEqual(p.spearman([1, 2, 3, 4], [9, 7, 5, 1]), -1)
        self.assertIsNone(p.spearman([1, 1, 1], [1, 2, 3]))

    def test_privacy_counts_and_reproducibility(self):
        result = p.build(*fixture(), bootstrap=100)
        self.assertEqual(result, p.build(*fixture(), bootstrap=100))
        self.assertEqual(sum(r["n"] for r in result["distribution"]), 30)
        self.assertTrue(all(r["n"] >= 5 for r in result["attempt_groups"]))
        self.assertTrue(result["pre_exam_verified"])
        self.assertGreater(result["distribution"][-1]["n"], 0)
        for field in ("profile_id", "PRIVATE_NAME", "canvas_hw1"):
            self.assertNotIn(field, json.dumps(result))

    def test_duplicate_or_unmatched_identity_fails(self):
        m, g, meta = fixture()
        for bad in (g+[g[0]], [{**g[0], "profile_id": 9999}]+g[1:]):
            with self.assertRaises(ValueError):
                p.build(copy.deepcopy(m), bad, meta, bootstrap=100)

    def test_exam_overlap_fails_and_unknown_is_not_verified(self):
        m, g, meta = fixture()
        meta["exam_started_at"] = "2026-09-15T12:00:00+08:00"
        with self.assertRaises(ValueError):
            p.build(m, g, meta, bootstrap=100)
        meta["exam_started_at"] = None
        self.assertFalse(p.build(m, g, meta, bootstrap=100)["pre_exam_verified"])

    def test_invalid_source_values_fail(self):
        for field, value in (("first_score", 101), ("best_score", float("nan")),
                             ("late_pct", -1), ("attempts", 0), ("problems", 24)):
            m, g, meta = fixture()
            m[0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                p.build(m, g, meta, bootstrap=100)

    def test_sparse_grade_bin_fails_closed(self):
        m, g, meta = fixture()
        for r in g:
            r["midterm"] = 95
        g[0]["midterm"] = 60
        with self.assertRaisesRegex(ValueError, "sparse grade"):
            p.build(m, g, meta, bootstrap=100)

    def test_test_account_cannot_enter(self):
        m, g, meta = fixture()
        m[0]["profile_id"] = 414
        with self.assertRaisesRegex(ValueError, "Test account"):
            p.build(m, g, meta, bootstrap=100)

    def test_public_artifact_reconciles_and_contains_no_identity_fields(self):
        d = json.loads((ROOT / "data/midterm-summary.json").read_text())
        old = json.loads((ROOT / "data/summary.json").read_text())
        self.assertEqual(d["matched"]+d["grades_not_in_excerpt"], d["eligible_roster"])
        self.assertEqual(d["matched"], 26)
        self.assertEqual(d["window_submissions"], old["window_submissions"])
        self.assertTrue(d["pre_exam_verified"])
        self.assertEqual(sum(r["n"] for r in d["distribution"]), d["matched"])
        self.assertEqual(sum(r["n"] for r in d["attempt_groups"]), d["matched"])
        for r in d["distribution"]+d["attempt_groups"]:
            self.assertGreaterEqual(r["n"], 5)
        for r in d["associations"]:
            self.assertTrue(-1 <= r["rho"] <= 1)
            lo, hi = r["bootstrap_interval"]
            self.assertTrue(-1 <= lo <= hi <= 1)
        for field in ('"profile_id"', '"student_id"', '"username"', '"name"'):
            self.assertNotIn(field, json.dumps(d))


if __name__ == "__main__":
    unittest.main()
