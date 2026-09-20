"""Aggregate an external, private CS201 export. Never copy student rows to the site.

Usage: python scripts/prepare_data.py --input /private/path/dataset.json
The default public calendar groups four hours and suppresses nonempty cells
with fewer than five distinct contributors. No network or database access.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
import hashlib
import json
import math
from pathlib import Path
import statistics
from zoneinfo import ZoneInfo

HOMEWORKS = {95: "HW1", 120: "HW2", 145: "HW3"}
LOCAL_TZ = ZoneInfo("Asia/Shanghai")
MIN_GROUP = 5


def timestamp(value: str) -> datetime:
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(LOCAL_TZ)


def index(rows: list[dict], field: str) -> dict:
    result = {r[field]: r for r in rows}
    if len(result) != len(rows):
        raise ValueError(f"Duplicate key in {field}")
    return result


def distribution(values: list[int]) -> dict:
    q1, median, q3 = statistics.quantiles(values, n=4, method="inclusive")
    return {"n": len(values), "min": min(values), "q1": q1,
            "median": median, "q3": q3, "max": max(values)}


def normalized_score(score: float, maximum: float) -> float:
    if score is None or maximum is None or not math.isfinite(score) or not math.isfinite(maximum):
        raise ValueError("Missing/nonfinite score or maximum")
    if maximum <= 0 or score < 0 or score > maximum:
        raise ValueError("Score outside the documented assignment scale")
    return 100 * score / maximum


def problem_progress(rows: list[dict]) -> dict:
    ordered = sorted(rows, key=lambda r: (r["when"], r["submission_id"]))
    scores = [r["normalized_score"] for r in ordered]
    return {"first": scores[0], "best2": max(scores[:2]),
            "best3": max(scores[:3]), "best": max(scores)}


def calendar(rows: list[dict], assignments: list[dict], hours: int, minimum: int) -> list[dict]:
    cells = defaultdict(list)
    for row in rows:
        cells[row["when"].date().isoformat(), row["when"].hour // hours * hours].append(row)
    start = min(timestamp(a["start_time"]).date() for a in assignments)
    end = max(timestamp(a["end_time"]).date() for a in assignments)
    output = []
    while start <= end:
        for hour in range(0, 24, hours):
            left = datetime.combine(start, datetime.min.time(), LOCAL_TZ) + timedelta(hours=hour)
            right = left + timedelta(hours=hours)
            active = any(timestamp(a["start_time"]) < right and timestamp(a["end_time"]) >= left for a in assignments)
            records = cells[start.isoformat(), hour]
            distinct = len({r["student_id"] for r in records})
            state = "inactive" if not active else "suppressed" if 0 < distinct < minimum else "visible"
            output.append({"date": start.isoformat(), "hour": hour, "hours": hours,
                           "state": state,
                           "submissions": len(records) if state == "visible" else None,
                           "contributors": distinct if state == "visible" else None})
        start += timedelta(days=1)
    return output


def prepare(bundle: dict) -> tuple[dict, dict]:
    t = bundle["tables"]
    if bundle.get("class_id") != 13 or not bundle.get("extra_exclusions_verified"):
        raise ValueError("Expected class 13 with confirmed account exclusions")
    roster = index(t["roster"], "student_id")
    assignments = index(t["assignments"], "assignment_id")
    links = index(t["submission_links"], "submission_id")
    aps = index(t["assignment_problems"], "assignment_problem_id")
    problems = index(t["problems"], "problem_id")
    parts = index(t["participations"], "participation_id")
    index(t["submissions"], "submission_id")
    selected = []
    all_hw = []
    for s in t["submissions"]:
        if s["assignment_id"] not in HOMEWORKS:
            continue
        if s["student_id"] not in roster:
            raise ValueError("Submission outside roster")
        link = links[s["submission_id"]]
        ap = aps[link["assignment_problem_id"]]
        participation = parts[link["participation_id"]]
        if not (ap["assignment_id"] == participation["assignment_id"] == s["assignment_id"]
                and ap["problem_id"] == s["problem_id"]
                and participation["student_id"] == s["student_id"]):
            raise ValueError("Inconsistent submission linkage")
        row = {**s, "when": timestamp(s["submitted_at"]),
               "normalized_score": normalized_score(link["assignment_submission_score"], ap["max_points"])}
        all_hw.append(row)
        assignment = assignments[s["assignment_id"]]
        if timestamp(assignment["start_time"]) <= row["when"] <= timestamp(assignment["end_time"]):
            selected.append(row)
    selected.sort(key=lambda r: (r["when"], r["submission_id"]))

    counts = Counter((r["assignment_id"], r["student_id"]) for r in selected)
    before_ac = Counter()
    passed = set()
    after_ac = 0
    groups = defaultdict(list)
    for row in selected:
        pair = (row["assignment_id"], row["student_id"])
        key = (*pair, row["problem_id"])
        groups[key].append(row)
        if key in passed:
            after_ac += 1
        else:
            before_ac[pair] += 1
        if row["judge_result"] == "AC":
            passed.add(key)

    summaries = []
    for aid, name in HOMEWORKS.items():
        values = [v for (a, _), v in counts.items() if a == aid]
        if len(values) < MIN_GROUP:
            raise ValueError("Insufficient contributors for distribution")
        parts0 = [p for p in parts.values() if p["assignment_id"] == aid and p["participation_mode"] == 0]
        assigned = [p for p in aps.values() if p["assignment_id"] == aid]
        summaries.append({"homework": name, "assignment_id": aid,
                          "start_local": timestamp(assignments[aid]["start_time"]).isoformat(),
                          "end_local": timestamp(assignments[aid]["end_time"]).isoformat(),
                          "problems": len(assigned), "submissions": sum(values),
                          "outside_window": sum(r["assignment_id"] == aid for r in all_hw) - sum(values),
                          "all_attempts": distribution(values),
                          "through_first_ac": distribution([before_ac[k] for k in counts if k[0] == aid]),
                          "mode0_records": len(parts0),
                          "mode0_full_score_records": sum(p["assignment_score"] == 100 for p in parts0)})

    by_problem = defaultdict(list)
    for (aid, sid, pid), rows in groups.items():
        by_problem[aid, pid].append(problem_progress(rows))
    progression = []
    for (aid, pid), rows in by_problem.items():
        if len(rows) < MIN_GROUP:
            continue
        means = {field: statistics.mean(r[field] for r in rows) for field in ("first", "best2", "best3", "best")}
        if not means["first"] <= means["best2"] <= means["best3"] <= means["best"] + 1e-9:
            raise ValueError("Non-monotone best-score summary")
        order = next(p["problem_order"] for p in aps.values() if p["assignment_id"] == aid and p["problem_id"] == pid)
        progression.append({"homework": HOMEWORKS[aid], "problem_id": pid,
                            "problem_name": problems[pid]["problem_name"], "problem_order": order,
                            "n": len(rows), **means, "gain": means["best"] - means["first"]})
    progression.sort(key=lambda r: (r["homework"], -r["gain"], r["problem_id"]))
    chosen_assignments = [assignments[aid] for aid in HOMEWORKS]
    cal = calendar(selected, chosen_assignments, 4, MIN_GROUP)
    private_cal = calendar(selected, chosen_assignments, 1, 1)
    day_counts = Counter(r["when"].date().isoformat() for r in selected)
    peak_day, peak_count = day_counts.most_common(1)[0]
    peak_people = len({r["student_id"] for r in selected if r["when"].date().isoformat() == peak_day})
    result = {
        "snapshot_utc": t["metadata"][0]["extracted_at_utc"], "timezone": "Asia/Shanghai (UTC+08:00)",
        "cohort_members": len(roster), "all_course_submissions": len(t["submissions"]),
        "all_homework_submissions": len(all_hw), "window_submissions": len(selected),
        "window_submitters": len({r["student_id"] for r in selected}),
        "outside_window": len(all_hw) - len(selected),
        "partial_scores_all_homework": sum(0 < r["normalized_score"] < 100 for r in all_hw),
        "partial_scores_in_window": sum(0 < r["normalized_score"] < 100 for r in selected),
        "submissions_after_first_ac": after_ac,
        "peak_day": {"date": peak_day, "submissions": peak_count, "contributors": peak_people},
        "calendar_policy": {"hours_per_bin": 4, "minimum_distinct_contributors": MIN_GROUP,
                            "suppressed_positive_cells": sum(c["state"] == "suppressed" for c in cal),
                            "visible_positive_cells": sum(c["state"] == "visible" and c["submissions"] > 0 for c in cal)},
        "assignments": summaries, "calendar": cal, "score_progression": progression,
    }
    if sum(a["submissions"] for a in summaries) != len(selected):
        raise ValueError("Assignment totals do not reconcile")
    if sum(before_ac.values()) + after_ac != len(selected):
        raise ValueError("First-AC partition does not reconcile")
    private = {"calendar": private_cal, "hours_per_bin": 1, "privacy": "Private: unsuppressed hourly aggregates. Do not publish."}
    return result, private


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("data/summary.json"))
    parser.add_argument("--private-output", type=Path)
    args = parser.parse_args()
    raw = args.input.read_bytes()
    public, private = prepare(json.loads(raw))
    public["input_sha256"] = hashlib.sha256(raw).hexdigest()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(public, ensure_ascii=False, indent=2) + "\n")
    if args.private_output:
        root = Path(__file__).resolve().parents[1]
        if args.private_output.resolve().is_relative_to(root):
            raise ValueError("Private output must stay outside the public repository")
        args.private_output.parent.mkdir(parents=True, exist_ok=True)
        args.private_output.write_text(json.dumps(private, ensure_ascii=False, indent=2) + "\n")
        args.private_output.chmod(0o600)
    print(json.dumps({k: v for k, v in public.items() if k not in ("calendar", "score_progression")}, indent=2))


if __name__ == "__main__":
    main()
