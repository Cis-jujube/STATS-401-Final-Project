"""Read private Course Pulse CSVs and grades; publish only cohort aggregates."""
import argparse
import csv
from collections import Counter, defaultdict
from datetime import datetime
import hashlib
import json
import math
from pathlib import Path
import re
import statistics

import numpy as np
from prepare_midterm import spearman, keyed, SEED

ROOT = Path(__file__).resolve().parents[1]
EXAM = '2026-09-16T04:00:00+00:00'
CUTOFF = '2026-09-16T00:00:00+00:00'
METRICS = [('active_ms', 'Platform active time'), ('active_days', 'Platform recorded days'),
           ('resource_open', 'Resource opens')]


def normalized(value):
    return re.sub(r'[^a-z0-9]', '', value.casefold())


def select_usage(rows, cutoff=CUTOFF, sensitivity=False):
    """Exclude a whole UTC day unless its cell is verified entirely pre-exam."""
    boundary = datetime.fromisoformat(cutoff)
    exam = datetime.fromisoformat(EXAM)
    selected = []
    seen = set()
    for row in rows:
        if row['scope'] != 'course' or row['role'] != 'student':
            continue
        key = tuple(row[k] for k in ('scope', 'account_id', 'day', 'role', 'route', 'metric'))
        if key in seen:
            raise ValueError('Duplicate daily metric cell')
        seen.add(key)
        count = float(row['count'])
        if not math.isfinite(count) or count < 0:
            raise ValueError('Invalid usage count')
        day = datetime.fromisoformat(row['day'] + 'T00:00:00+00:00')
        last = datetime.fromisoformat(row['last_seen_at'].replace('Z', '+00:00'))
        if last.tzinfo is None or last.date() != day.date():
            raise ValueError('Metric day/last-seen mismatch')
        if day < boundary or (sensitivity and day == boundary and last < exam):
            selected.append(row)
    return selected


def aggregate(rows):
    totals = defaultdict(Counter)
    days = defaultdict(set)
    for r in rows:
        if float(r['count']) > 0:
            totals[r['account_id']][r['metric']] += float(r['count'])
            days[r['account_id']].add(r['day'])
    for account, dates in days.items():
        totals[account]['active_days'] = len(dates)
    return totals


def build(accounts, usage, grades, midterm, bootstrap=5000):
    keyed(grades, 'grade')
    if len({r['id'] for r in accounts}) != len(accounts):
        raise ValueError('Duplicate account identity')
    candidates = defaultdict(list)
    for a in accounts:
        if a['scope'] == 'course' and a['role'] == 'student':
            candidates[normalized(a['display_name'])].append(a['id'])
    ids, scores = [], []
    for grade in grades:
        matches = candidates[normalized(grade['name'])]
        if len(matches) != 1 or matches[0] in ids:
            raise ValueError('Unmatched or ambiguous student identity')
        score = float(grade['midterm'])
        if not math.isfinite(score) or score < 0:
            raise ValueError('Invalid exam score')
        ids.append(matches[0])
        scores.append(score)
    if len(ids) != midterm['matched'] or not math.isclose(statistics.mean(scores), midterm['mean'], abs_tol=.005):
        raise ValueError('Grade cohort does not reconcile with midterm summary')
    totals = aggregate(select_usage(usage))
    extended = aggregate(select_usage(usage, sensitivity=True))
    groups = []
    for recorded, label in [(True, 'Recorded usage'), (False, 'No recorded usage')]:
        values = [s for i, s in zip(ids, scores) if bool(totals[i]['active_days']) == recorded]
        if len(values) < 5:
            raise ValueError('Sparse public group: merge or withhold')
        q1, median, q3 = np.quantile(values, [.25, .5, .75])
        groups.append(dict(label=label, n=len(values), mean=round(statistics.mean(values), 2),
                           q1=round(float(q1), 3), median=float(median), q3=round(float(q3), 3)))
    rng = np.random.default_rng(SEED)
    draws = rng.integers(0, len(ids), (bootstrap, len(ids)))
    associations = []
    for metric, label in METRICS:
        x = [totals[i][metric] for i in ids]
        if sum(v > 0 for v in x) < 5 or len(set(x)) < 2:
            raise ValueError('Insufficient metric coverage')
        boot = [spearman([x[k] for k in draw], [scores[k] for k in draw]) for draw in draws]
        boot = [v for v in boot if v is not None]
        associations.append(dict(metric=metric, label=label, n=len(ids), rho=spearman(x, scores),
                                 bootstrap_interval=np.quantile(boot, [.025, .975]).tolist(),
                                 valid_bootstrap_draws=len(boot),
                                 sensitivity_rho=spearman([extended[i][metric] for i in ids], scores)))
    resources = sum(totals[i]['resource_open'] > 0 for i in ids)
    if resources < 5 or len(ids)-resources < 5:
        raise ValueError('Sparse resource coverage')
    return dict(version=1, matched=len(ids), eligible_roster=midterm['eligible_roster'],
                recorded_users=groups[0]['n'], resource_users=resources,
                tracking_started_at='2026-09-08T05:49:32.270Z', cutoff_utc=CUTOFF,
                exam_utc=EXAM, bootstrap_draws=bootstrap, seed=SEED,
                groups=groups, associations=associations,
                oj_associations=[r for r in midterm['associations'] if r['metric'] in ('late_pct', 'attempts')])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--export', type=Path, required=True)
    parser.add_argument('--grades', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=ROOT/'data/platform-summary.json')
    args = parser.parse_args()
    paths = [args.export/'csv/portal/accounts.csv', args.export/'csv/portal/usage_account_daily.csv', args.grades]
    rows = [list(csv.DictReader(p.open(encoding='utf-8-sig'))) for p in paths]
    d = build(*rows, json.loads((ROOT/'data/midterm-summary.json').read_text()))
    # Basenames and hashes provide reproducibility without private paths or identities.
    d['source_sha256'] = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
    args.output.write_text(json.dumps(d, indent=2, allow_nan=False)+'\n')
    print('Wrote aggregate summary for', d['matched'], 'students')


if __name__ == '__main__':
    main()
