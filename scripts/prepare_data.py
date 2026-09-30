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
import hmac
import json
import math
from pathlib import Path
import statistics
from zoneinfo import ZoneInfo

HOMEWORKS = {95: "HW1", 120: "HW2", 145: "HW3", 178: "HW4"}
LOCAL_TZ = ZoneInfo("Asia/Shanghai")
MIN_GROUP = 5


def apply_confirmed_exclusion(bundle: dict, provenance: dict, key_hex: str) -> dict:
    """Apply a previously confirmed test-account policy to a new private snapshot.

    Work on a copy. Never serialize the key, source identity or matched pseudonym
    into the public aggregate. Fail if the historical policy cannot be matched.
    """
    if bundle.get("class_id") != 13 or provenance.get("class_id") != 13:
        raise ValueError("Exclusion provenance must refer to class 13")
    profile = provenance.get("excluded_test_profile_id")
    if type(profile) is not int or profile <= 0:
        raise ValueError("Expected a previously confirmed test profile")
    key = bytes.fromhex(key_hex.strip())
    if len(key) != 32:
        raise ValueError("Expected a 32-byte private linkage key")
    excluded = hmac.new(key, str(profile).encode(), hashlib.sha256).hexdigest()
    tables = bundle["tables"]
    if sum(row["student_id"] == excluded for row in tables["roster"]) != 1:
        raise ValueError("Confirmed test account did not match exactly one roster member")
    removed = {r["submission_id"] for r in tables["submissions"] if r["student_id"] == excluded}
    filtered = dict(tables)
    for name in ("roster", "submissions", "participations"):
        filtered[name] = [r for r in tables[name] if r["student_id"] != excluded]
    filtered["submission_links"] = [r for r in tables["submission_links"] if r["submission_id"] not in removed]
    return {**bundle, "tables": filtered, "extra_exclusions_verified": True,
            "exclusion_policy": {"basis": "Previously confirmed test account, matched by private HMAC linkage",
                                 "excluded_roster_members": 1,
                                 "excluded_submission_events": len(removed)}}


GAP_BINS = (("Under 1 min", 60), ("1–10 min", 600), ("10–60 min", 3600),
            ("1–24 hours", 86400), ("24 hours or more", math.inf))


def progress_events(rows: list[dict], assignments: dict) -> tuple[list[dict], dict]:
    """Private eligible retries; first scores set baselines, ties are not gains."""
    previous = {}
    events = []
    counts = Counter(first_scores=0, internal_errors=0, after_full_credit=0)
    for row in sorted(rows, key=lambda r: (r["when"], r["submission_id"])):
        if row["judge_status"] == "IE" or row["judge_result"] == "IE":
            counts["internal_errors"] += 1
            continue
        if row["judge_status"] not in ("D", "CE"):
            raise ValueError("Event progress requires completed judgements")
        aid, sid, pid = row["assignment_id"], row["student_id"], row["problem_id"]
        start, end = (timestamp(assignments[aid][key]) for key in ("start_time", "end_time"))
        if end <= start or not start <= row["when"] <= end:
            raise ValueError("Event outside a valid homework window")
        score = row["normalized_score"]
        key = aid, sid, pid
        if key not in previous:
            counts["first_scores"] += 1
        else:
            when, best = previous[key]
            if best >= 100:
                counts["after_full_credit"] += 1
            else:
                seconds = (row["when"] - when).total_seconds()
                phase = min(4, int(5 * (row["when"] - start) / (end - start)))
                gap = next(i for i, (_, upper) in enumerate(GAP_BINS) if seconds < upper)
                events.append({"assignment_id": aid, "student_id": sid, "problem_id": pid,
                               "phase": phase, "gap_bin": gap, "improved": score > best})
        previous[key] = row["when"], max(score, previous.get(key, (None, score))[1])
    if sum(counts.values()) + len(events) != len(rows):
        raise ValueError("Event eligibility partition does not reconcile")
    return events, dict(counts)


def progress_cells(groups: list[tuple[dict, list[dict]]], secondary: bool = False) -> list[dict]:
    """Only release cells with >=5 distinct eligible contributors (or empty cells).

    Hide a second cell when one primary mask could be recovered from a published
    marginal total. None of the suppressed cell's numeric fields is released.
    """
    output = []
    for labels, rows in groups:
        people = len({r["student_id"] for r in rows})
        improved = sum(r["improved"] for r in rows)
        output.append({**labels, "state": "suppressed" if 0 < people < MIN_GROUP else "visible",
                       "eligible_retries": len(rows), "new_bests": improved, "contributors": people,
                       "improvement_pct": 100 * improved / len(rows) if rows else None})
    if secondary and sum(r["state"] == "suppressed" for r in output) == 1:
        candidates = [r for r in output if r["state"] == "visible" and r["eligible_retries"]]
        if candidates:
            min(candidates, key=lambda r: r["eligible_retries"])["state"] = "suppressed"
    for row in output:
        if row["state"] == "suppressed":
            for field in ("eligible_retries", "new_bests", "contributors", "improvement_pct"):
                row[field] = None
    return output


def event_progress(rows: list[dict], assignments: dict, problems: dict) -> dict:
    events, counts = progress_events(rows, assignments)
    by_hw = progress_cells([({"homework": name}, [r for r in events if r["assignment_id"] == aid])
                            for aid, name in HOMEWORKS.items()], secondary=True)
    by_gap = progress_cells([({"gap_bin": i, "label": label}, [r for r in events if r["gap_bin"] == i])
                             for i, (label, _) in enumerate(GAP_BINS)], secondary=True)
    by_problem, by_phase = [], []
    for aid, name in HOMEWORKS.items():
        hw = [r for r in events if r["assignment_id"] == aid]
        pids = sorted({r["problem_id"] for r in rows if r["assignment_id"] == aid})
        by_problem.extend(progress_cells([
            ({"homework": name, "problem_id": pid, "problem_name": problems[pid]["problem_name"]},
             [r for r in hw if r["problem_id"] == pid]) for pid in pids], secondary=True))
        start, end = (timestamp(assignments[aid][key]) for key in ("start_time", "end_time"))
        phase_hours = (end - start).total_seconds() / 3600 / 5
        by_phase.extend(progress_cells([
            ({"homework": name, "phase": i, "label": f"{i*20}–{(i+1)*20}%", "phase_hours": phase_hours},
             [r for r in hw if r["phase"] == i]) for i in range(5)], secondary=True))
    # Counts here describe eligibility classes, never the contents of a masked bin.
    return {"policy": {"minimum_distinct_contributors": MIN_GROUP,
                       "eligibility": "A completed in-window retry after a valid baseline with prior best below 100",
                       "new_best": "Normalized score strictly exceeds the prior within-window best; ties do not count",
                       "internal_error": "IE judgements are skipped; compilation errors remain scored attempts",
                       "gap": "Clock time since the previous valid same-student homework-problem submission",
                       "phase": "Five equal-duration intervals from configured opening to deadline; deadline is in the last bin",
                       "secondary_suppression": "A second nonempty cell is hidden if a partition has exactly one primary mask",
                       "weighting": "Equal weight per eligible retry; students can contribute multiple retries"},
            "eligibility_counts": counts, "by_homework": by_hw, "by_gap": by_gap,
            "by_problem": by_problem, "by_phase": by_phase}


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


def attempt_score_series(groups: dict) -> list[dict]:
    """Actual nth-attempt scores; equal weight per observed student-problem event.

    Each point's cohort changes. Do not carry forward scores for stopped pairs.
    Suppress the entire point when fewer than five distinct students contribute.
    """
    bins = defaultdict(list)
    for (aid, sid, _), rows in groups.items():
        ordered = sorted(rows, key=lambda r: (r["when"], r["submission_id"]))
        for attempt, row in enumerate(ordered, 1):
            bins[aid, attempt].append((sid, row["normalized_score"]))
    output = []
    for (aid, attempt), values in sorted(bins.items()):
        students = len({sid for sid, _ in values})
        visible = students >= MIN_GROUP
        output.append({"homework": HOMEWORKS[aid], "attempt": attempt,
                       "state": "visible" if visible else "suppressed",
                       "submissions": len(values) if visible else None,
                       "contributors": students if visible else None,
                       "mean_score": statistics.mean(score for _, score in values) if visible else None})
    return output


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
        "attempt_score_series": attempt_score_series(groups),
        "event_progress": event_progress(selected, assignments, problems),
        "exclusion_policy": bundle.get("exclusion_policy", {"basis": "Confirmed in input bundle"}),
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
    parser.add_argument("--exclusion-provenance", type=Path)
    parser.add_argument("--linkage-key", type=Path)
    args = parser.parse_args()
    raw = args.input.read_bytes()
    bundle = json.loads(raw)
    if bool(args.exclusion_provenance) != bool(args.linkage_key):
        parser.error("Exclusion provenance and private linkage key must be supplied together")
    if args.exclusion_provenance:
        bundle = apply_confirmed_exclusion(bundle, json.loads(args.exclusion_provenance.read_text()),
                                           args.linkage_key.read_text())
    public, private = prepare(bundle)
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
    print(json.dumps({k: v for k, v in public.items() if k not in ("calendar", "score_progression", "attempt_score_series", "event_progress")}, indent=2))


if __name__ == "__main__":
    main()
