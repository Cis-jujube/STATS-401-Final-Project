"""Join private verified grades to private OJ metrics; emit only public aggregates.

Inputs stay outside this repository. No server connection or database writes.
"""
from __future__ import annotations

import argparse
import csv
from datetime import datetime
import hashlib
import json
import math
from pathlib import Path
import statistics

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
MIN_GROUP = 5
SEED = 20260921
METRICS = (
    ("attempts", "Submission count"),
    ("first_score", "Mean first-submission score"),
    ("late_pct", "Share submitted in final 24 hours"),
)


def ranks(values):
    """Average ranks preserve ties in scores and counts."""
    ordered = sorted(range(len(values)), key=lambda i: values[i])
    result = [0.0] * len(values)
    start = 0
    while start < len(values):
        end = start + 1
        while end < len(values) and values[ordered[end]] == values[ordered[start]]:
            end += 1
        for i in ordered[start:end]:
            result[i] = (start + 1 + end) / 2
        start = end
    return result


def spearman(x, y):
    if len(x) != len(y) or len(x) < 3:
        raise ValueError("Paired samples of at least three observations required")
    if len(set(x)) < 2 or len(set(y)) < 2:
        return None
    return statistics.correlation(ranks(x), ranks(y))


def keyed(rows, label):
    result = {}
    for row in rows:
        key = int(row["profile_id"])
        if key in result:
            raise ValueError(f"Duplicate {label} identity")
        result[key] = row
    return result


def numeric(value, label, low=0, high=None):
    value = float(value)
    if not math.isfinite(value) or value < low or (high is not None and value > high):
        raise ValueError(f"Invalid {label}")
    return value


def build(metrics, grades, provenance, bootstrap=5000):
    if bootstrap < 100:
        raise ValueError("At least 100 bootstrap draws required")
    if provenance.get("class_id") != 13 or provenance.get("excluded_test_profile_id") != 414:
        raise ValueError("Confirm course and test-account exclusion")
    end = datetime.fromisoformat(provenance["homework_window_end"])
    exam_value = provenance.get("exam_started_at")
    if end.tzinfo is None:
        raise ValueError("Homework cutoff requires a timezone")
    if exam_value:
        exam = datetime.fromisoformat(exam_value)
        if exam.tzinfo is None or exam <= end:
            raise ValueError("Re-query metrics with an earlier cutoff: exam overlaps homework windows")
    m = keyed(metrics, "OJ")
    g = keyed(grades, "Canvas")
    if 414 in m or 414 in g:
        raise ValueError("Test account must not enter analysis")
    if len(m) > provenance["eligible_roster"] or len(g) > provenance["eligible_roster"]:
        raise ValueError("Cohort exceeds verified roster")
    for r in m.values():
        for field in ("first_score", "best_score", "late_pct"):
            r[field] = numeric(r[field], field, high=100)
        if r["first_score"] > r["best_score"]:
            raise ValueError("First score exceeds best score")
        for field, maximum in (("problems", 23), ("attempts", None)):
            v = numeric(r[field], field, low=1, high=maximum)
            if not v.is_integer():
                raise ValueError("Counts must be integers")
            r[field] = int(v)
        if r["attempts"] < r["problems"]:
            raise ValueError("Fewer submissions than attempted problems")
    joined = []
    for key, row in g.items():
        score = numeric(row["midterm"], "midterm")  # Raw points above 100 remain valid.
        if key not in m:
            raise ValueError("Grade without a verified OJ metrics match; resolve before release")
        if str(row["homework_discrepancy"]) not in ("0", "1"):
            raise ValueError("Invalid discrepancy flag")
        joined.append({**m[key], "midterm": score,
                       "discrepancy": bool(int(row["homework_discrepancy"]))})
    if len(joined) < 2 * MIN_GROUP:
        raise ValueError("Insufficient matched cohort")
    scores = [r["midterm"] for r in joined]
    distribution = []
    for lo, hi, label in ((0, 80, "Below 80"), (80, 90, "80–<90"),
                          (90, 100, "90–<100"), (100, math.inf, "100 or above")):
        n = sum(lo <= score < hi for score in scores)
        # Fail closed: no small bin can be recovered by subtracting from total N.
        if 0 < n < MIN_GROUP:
            raise ValueError("Merge sparse grade bins before publishing")
        distribution.append({"label": label, "n": n})
    associations = []
    rng = np.random.default_rng(SEED)
    draws = rng.integers(0, len(joined), (bootstrap, len(joined)))
    for key, label in METRICS:
        x = [r[key] for r in joined]
        rho = spearman(x, scores)
        if rho is None:
            raise ValueError("Constant predictor: do not draw a correlation")
        boot = [spearman([x[i] for i in ids], [scores[i] for i in ids]) for ids in draws]
        valid = [v for v in boot if v is not None]
        if len(valid) < .95 * bootstrap:
            raise ValueError("Too many degenerate bootstrap samples")
        loo = [spearman(x[:i]+x[i+1:], scores[:i]+scores[i+1:]) for i in range(len(x))]
        complete = [r for r in joined if r["problems"] == 23]
        no_discrepancy = [r for r in joined if not r["discrepancy"]]
        if min(len(complete), len(no_discrepancy)) < MIN_GROUP:
            raise ValueError("Insufficient sensitivity cohort")
        associations.append({
            "metric": key, "label": label, "n": len(x), "rho": round(rho, 4),
            "bootstrap_interval": [round(float(v), 4) for v in np.quantile(valid, [.025, .975])],
            "valid_bootstrap_draws": len(valid),
            "leave_one_out_range": [round(min(loo), 4), round(max(loo), 4)],
            "complete_problem_coverage": {"n": len(complete), "rho": round(spearman([r[key] for r in complete], [r["midterm"] for r in complete]), 4)},
            "without_homework_discrepancies": {"n": len(no_discrepancy), "rho": round(spearman([r[key] for r in no_discrepancy], [r["midterm"] for r in no_discrepancy]), 4)},
        })
    groups = []
    for lo, hi, label in ((0, 35, "Under 35"), (35, 60, "35–59"), (60, math.inf, "60 or more")):
        values = [r["midterm"] for r in joined if lo <= r["attempts"] < hi]
        if len(values) < MIN_GROUP:
            raise ValueError("Merge sparse attempt groups before publishing")
        q1, median, q3 = np.quantile(values, [.25, .5, .75], method="linear")
        groups.append({"label": label, "n": len(values), "mean": round(statistics.mean(values), 2),
                       "q1": round(float(q1), 2), "median": round(float(median), 2), "q3": round(float(q3), 2)})
    return {
        "version": 1, "grade_source": "User-provided Canvas gradebook excerpt, 21 September 2026",
        "oj_extracted_at": provenance["oj_extracted_at"],
        "homework_window_end": provenance["homework_window_end"],
        "exam_started_at": exam_value, "pre_exam_verified": bool(exam_value),
        "eligible_roster": provenance["eligible_roster"], "excluded_test_accounts": 1,
        "available_grades": len(g), "matched": len(joined),
        "grades_not_in_excerpt": provenance["eligible_roster"]-len(g),
        "window_submitters": len(m), "window_submissions": sum(r["attempts"] for r in m.values()),
        "matched_submissions": sum(r["attempts"] for r in joined),
        "homework_discrepancies": sum(r["discrepancy"] for r in joined),
        "mean": round(statistics.mean(scores), 2), "median": round(statistics.median(scores), 2),
        "distribution": distribution, "associations": associations, "attempt_groups": groups,
        "bootstrap": {"draws": bootstrap, "seed": SEED, "unit": "student", "method": "paired percentile 95%"},
        "privacy": "Aggregate-only; group n >= 5; no identifiers, individual marks, minima or maxima. Not a formal privacy guarantee.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--private-input", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=ROOT / "data/midterm-summary.json")
    args = parser.parse_args()
    p = args.private_input.resolve()
    if p.is_relative_to(ROOT):
        raise ValueError("Private input must remain outside repository")
    paths = [p / name for name in ("oj_metrics.tsv", "canvas_midterm.csv", "provenance.json")]
    with paths[0].open() as f:
        metrics = list(csv.DictReader(f, delimiter="\t"))
    with paths[1].open() as f:
        grades = list(csv.DictReader(f))
    result = build(metrics, grades, json.loads(paths[2].read_text()))
    result["input_sha256"] = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in paths}
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False) + "\n")
    print(f"Validated {result['matched']} matched students; wrote aggregate summary")


if __name__ == "__main__":
    main()
