"""Write an anonymized copy of the private source data for private submission.

The three private inputs behind the public aggregates are rewritten with random labels:
  homework  analysis-dataset.json  (OJ snapshot after the confirmed test-account exclusion)
  midterm   oj_metrics.tsv, canvas_midterm.csv, provenance.json
  platform  csv/portal/accounts.csv, usage_account_daily.csv (Course Pulse)

Students get random labels that are never written down, names and usernames are replaced,
and database identifiers are renumbered in their original order. Labels are not shared across
the three sources, so the copy cannot join homework events to grades. Timestamps, scores and
grades are kept, because the published analysis needs them; the copy is pseudonymous, not
anonymous to someone who knows the class, and must not be published.

The output directory must lie outside this repository. Running prepare_data.py,
prepare_midterm.py and prepare_platform.py on the copy reproduces data/*.json apart from their
input fingerprints (see --verify).

Usage:
  uv run python scripts/anonymize_sources.py \\
    --homework /private/CS201-readonly-export-2026-10-13/analysis-dataset.json \\
    --midterm /private/CS201-midterm-private-2026-09-21 \\
    --platform /private/course-pulse-20260921-161438/csv/portal \\
    --output /private/CS201-anonymized-source --verify
"""
from __future__ import annotations

import argparse
import csv
import json
import random
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RNG = random.SystemRandom()  # labels must not be reproducible from the source


def labels(keys, prefix: str, width: int = 2) -> dict:
    """Random, non-reversible label per key; the mapping exists only in memory."""
    keys = sorted(set(keys), key=str)
    numbers = list(range(1, len(keys) + 1))
    RNG.shuffle(numbers)
    return {k: f"{prefix}{n:0{width}d}" for k, n in zip(keys, numbers)}


def renumber(rows: list[dict], field: str) -> dict:
    """Sequential identifiers that keep the original order (ties in time sort by this id)."""
    return {old: new for new, old in enumerate(sorted({r[field] for r in rows}), start=1)}


def normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.casefold())


def homework(source: Path, out: Path) -> dict:
    bundle = json.loads(source.read_text())
    if not bundle.get("extra_exclusions_verified"):
        raise ValueError("Use the filtered analysis input, after the confirmed test-account exclusion")
    t = bundle["tables"]
    student = labels([r["student_id"] for r in t["roster"]], "S")
    if {r["student_id"] for r in t["submissions"] + t["participations"]} - student.keys():
        raise ValueError("A submission or participation belongs to no roster member")
    sub, part = renumber(t["submissions"], "submission_id"), renumber(t["participations"], "participation_id")
    tables = dict(t)
    # the OJ class name ends with the instructor's name; the analysis only needs class_id
    tables["course"] = [{**c, "class_name": "CS201"} for c in t["course"]]
    tables["roster"] = [{**r, "student_id": student[r["student_id"]]} for r in t["roster"]]
    tables["submissions"] = sorted(({**r, "submission_id": sub[r["submission_id"]], "student_id": student[r["student_id"]]}
                                    for r in t["submissions"]), key=lambda r: r["submission_id"])
    tables["participations"] = sorted(({**r, "participation_id": part[r["participation_id"]], "student_id": student[r["student_id"]]}
                                       for r in t["participations"]), key=lambda r: r["participation_id"])
    tables["submission_links"] = sorted(({**r, "submission_id": sub[r["submission_id"]], "participation_id": part[r["participation_id"]]}
                                         for r in t["submission_links"]), key=lambda r: r["submission_id"])
    anonymized = {**bundle, "tables": tables, "anonymization": {
        "students": "random labels S01–S%02d; the mapping was not stored" % len(student),
        "identifiers": "submission and participation ids renumbered from 1 in their original order",
        "course": "class name reduced to CS201 (the original named the instructor)",
        "kept": "timestamps, homework and problem ids, judge results, scores; assignment and problem tables unchanged"}}
    (out / "homework").mkdir(parents=True)
    (out / "homework/analysis-dataset.json").write_text(json.dumps(anonymized, indent=1, ensure_ascii=False) + "\n")
    with (out / "homework/submissions.csv").open("w", newline="") as f:
        fields = ["submission_id", "student_id", "assignment_id", "problem_id", "submitted_at",
                  "judge_status", "judge_result", "language_id", "submission_score"]
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(tables["submissions"])
    return {"students": len(student), "submissions": len(tables["submissions"])}


def read_csv(path: Path, delimiter: str = ",") -> list[dict]:
    with path.open(encoding="utf-8-sig") as f:
        return list(csv.DictReader(f, delimiter=delimiter))


def write_csv(path: Path, rows: list[dict], fields: list[str], delimiter: str = ",") -> None:
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, delimiter=delimiter, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)


def midterm_and_platform(midterm: Path, platform: Path, out: Path) -> dict:
    metrics = read_csv(midterm / "oj_metrics.tsv", "\t")
    grades = read_csv(midterm / "canvas_midterm.csv")
    provenance = json.loads((midterm / "provenance.json").read_text())
    test = provenance["excluded_test_profile_id"]
    # random integer profile labels, never the excluded test account's id
    pool = [n for n in range(1001, 1001 + 3 * len(metrics)) if n != test]
    RNG.shuffle(pool)
    profile = {k: pool[i] for i, k in enumerate(sorted({r["profile_id"] for r in metrics + grades}))}

    accounts = read_csv(platform / "accounts.csv")
    usage = read_csv(platform / "usage_account_daily.csv")
    # each graded student keeps one pseudonymous name in both the grade table and Course Pulse
    student_accounts = {}
    for a in accounts:
        if a["scope"] == "course" and a["role"] == "student":
            student_accounts.setdefault(normalized(a["display_name"]), []).append(a["id"])
    name, account_name = {}, {}
    graded = labels([r["profile_id"] for r in grades], "Student M")
    for g in grades:
        name[g["profile_id"]] = graded[g["profile_id"]]
        match = student_accounts.get(normalized(g["name"]), [])
        if len(match) == 1:
            account_name[match[0]] = graded[g["profile_id"]]
    others = labels([a["id"] for a in accounts if a["id"] not in account_name], "Account ", 3)
    account_id = labels([a["id"] for a in accounts], "A", 3)

    (out / "midterm").mkdir(parents=True)
    write_csv(out / "midterm/oj_metrics.tsv", [{**r, "profile_id": profile[r["profile_id"]]} for r in metrics],
              ["profile_id", "problems", "attempts", "first_score", "best_score", "late_pct"], "\t")
    write_csv(out / "midterm/canvas_midterm.csv",
              [{**r, "profile_id": profile[r["profile_id"]], "name": name[r["profile_id"]]} for r in grades],
              ["profile_id", "name", "midterm", "canvas_hw1", "canvas_hw2", "canvas_hw3", "homework_discrepancy"])
    (out / "midterm/provenance.json").write_text(json.dumps(provenance, indent=1, ensure_ascii=False) + "\n")

    portal = out / "platform/csv/portal"  # the layout prepare_platform.py --export expects
    portal.mkdir(parents=True)
    write_csv(portal / "accounts.csv",
              [{"id": account_id[a["id"]], "display_name": account_name.get(a["id"], others.get(a["id"])),
                "role": a["role"], "scope": a["scope"], "enabled": a["enabled"]} for a in accounts],
              ["id", "display_name", "role", "scope", "enabled"])
    write_csv(portal / "usage_account_daily.csv", [{**r, "account_id": account_id[r["account_id"]]} for r in usage],
              ["scope", "account_id", "day", "role", "route", "metric", "count", "last_seen_at"])
    return {"oj_metrics": len(metrics), "grades": len(grades), "accounts": len(accounts), "usage_rows": len(usage),
            "graded_accounts_named": len(account_name)}


def leaks(out: Path, secrets: set[str]) -> list[str]:
    """Any original name, username or identifier that survived into the copy."""
    found = []
    for path in out.rglob("*"):
        if path.is_file():
            text = path.read_text(encoding="utf-8", errors="ignore").casefold()
            found += [f"{path.relative_to(out)}" for s in secrets if s and s.casefold() in text]
    return found


def verify(out: Path) -> dict:
    """Rebuild the three public aggregates from the copy and compare them with data/*.json."""
    tmp = Path(tempfile.mkdtemp())
    py = [sys.executable]
    subprocess.run(py + [str(ROOT / "scripts/prepare_data.py"), "--input", str(out / "homework/analysis-dataset.json"),
                         "--output", str(tmp / "summary.json")], check=True, capture_output=True)
    subprocess.run(py + [str(ROOT / "scripts/prepare_midterm.py"), "--private-input", str(out / "midterm"),
                         "--output", str(tmp / "midterm-summary.json")], check=True, capture_output=True)
    subprocess.run(py + [str(ROOT / "scripts/prepare_platform.py"), "--export", str(out / "platform"),
                         "--grades", str(out / "midterm/canvas_midterm.csv"), "--output", str(tmp / "platform-summary.json")],
                   check=True, capture_output=True)
    result = {}
    for name in ("summary.json", "midterm-summary.json", "platform-summary.json"):
        rebuilt, published = (json.loads(p.read_text()) for p in (tmp / name, ROOT / "data" / name))
        for d in (rebuilt, published):
            d.pop("input_sha256", None)
            d.pop("source_sha256", None)
        result[name] = rebuilt == published
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--homework", type=Path, required=True)
    parser.add_argument("--midterm", type=Path, required=True)
    parser.add_argument("--platform", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--verify", action="store_true")
    a = parser.parse_args()
    out = a.output.resolve()
    if out == ROOT or ROOT in out.parents:
        raise SystemExit("Write the anonymized copy outside the public repository")
    if out.exists():
        raise SystemExit(f"{out} already exists; choose a new directory")
    report = {"homework": homework(a.homework, out), **midterm_and_platform(a.midterm, a.platform, out)}

    # nothing identifying may survive: original names, usernames and every original identifier
    original = json.loads(a.homework.read_text())["tables"]
    secrets = {r["student_id"] for r in original["roster"]}
    secrets |= {r["name"] for r in read_csv(a.midterm / "canvas_midterm.csv")}
    for acc in read_csv(a.platform / "accounts.csv"):
        secrets |= {acc["username"], acc["display_name"], acc["id"]}
    report["leaks"] = leaks(out, {s for s in secrets if len(s) >= 4})
    if report["leaks"]:
        raise SystemExit(f"Identifying values survived: {sorted(set(report['leaks']))}")
    if a.verify:
        report["reproduces_public_aggregates"] = verify(out)
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
