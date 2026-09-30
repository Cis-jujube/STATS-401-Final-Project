"""Data-driven homework captions and accessible tables for the analysis page."""
from html import escape

from render_figures import snapshot_label


def sections(data, table, figure):
    assignments = data['assignments']
    scores = sorted(data['score_progression'], key=lambda r: -(r['best']-r['best3']))
    visible = [r for r in data['calendar'] if r['state'] == 'visible' and r['submissions'] > 0]
    peak = max(visible, key=lambda r: r['submissions'])
    withheld = data['window_submissions'] - sum(r['submissions'] or 0 for r in data['calendar'])
    participation = '; '.join(f"{a['homework']}: {a['mode0_full_score_records']}/{a['mode0_records']}" for a in assignments)
    html = f'''<section class="opening" id="research-question"><p class="eyebrow">THE QUESTION</p>
<h2>What do near-perfect scores leave out?</h2><p>In the <code>participation_mode=0</code> records, full-score counts are {participation}.
The official grading interpretation of this field still needs confirmation. These records motivate a process-focused analysis.</p>
<p>The current homework snapshot retains <strong>{data['window_submissions']:,} submissions from {data['window_submitters']} students</strong>,
including {data['partial_scores_in_window']} partial-credit submissions. It covers {len(assignments)} homeworks and {len(scores)} problem slots.</p>
<p>{snapshot_label(data)}. Midterm and Course Pulse figures retain their separate, pre-exam cohorts. HW4 occurred after the exam and is excluded from those associations.</p></section>'''

    def chart(section_id, number, topic, title, reading, filename, alt, caption, headers, rows, table_caption):
        return f'''<section class="chart-section" id="{section_id}"><div class="section-heading"><span class="number">{number}</span>
<div><p class="eyebrow">{topic}</p><h2>{title}</h2></div></div><p class="reading">{reading}</p>''' + figure(filename, alt, caption) + \
            '<details><summary>Accessible data table</summary>' + table(headers, rows, table_caption) + '</details></section>'

    day = data['peak_day']
    peak_text = (f"The peak day is {day['date']}: {day['submissions']} submissions from {day['contributors']} students. "
                 f"The busiest publicly visible four-hour cell is {peak['date']}, {peak['hour']:02d}:00–{peak['hour']+4:02d}:00 Beijing time: "
                 f"{peak['submissions']} submissions from {peak['contributors']} contributors ({peak['submissions']/peak['contributors']:.2f} per active contributor).")
    html += chart('timing', '01', 'TIMING / VISIBLE CELLS', 'When does a burst reflect<br>broad participation?', peak_text,
                  '01-calendar', 'Reach versus repeat intensity, and submissions by Beijing time. '+peak_text,
                  f"Shape identifies homework; marker area scales with submissions. Only {len(visible)} positive cells with at least five contributors appear. "
                  f"The other {data['calendar_policy']['suppressed_positive_cells']} positive cells contain {withheld} submissions but are masked. "
                  'The overall busiest four-hour cell cannot be inferred. Ratios describe active contributors, not study time.',
                  ['Date','Hours (Beijing)','Status','Submissions','Distinct contributors'],
                  [[r['date'],f"{r['hour']:02d}:00–{r['hour']+4:02d}:00",r['state'],r['submissions'] if r['submissions'] is not None else '—',
                    r['contributors'] if r['contributors'] is not None else '—'] for r in data['calendar']],
                  'Four-hour cells: suppressed means 1–4 contributors; inactive means no configured homework window.')

    distribution_text = '; '.join(f"{a['homework']}: median {a['all_attempts']['median']:g}, range {a['all_attempts']['min']}–{a['all_attempts']['max']}" for a in assignments)
    html += chart('retries','02','RETRIES','A typical count hides a wide range.', distribution_text+'. Only window submitters enter each distribution.',
                  '02-attempts', 'Four per-student submission-count distributions. '+distribution_text,
                  f"Boxes show inclusive quartiles; whiskers are the observed min–max, not 1.5×IQR. No individual points are published. "
                  f"{data['submissions_after_first_ac']} in-window events followed a first AC verdict. Acceptance is distinct from normalized full score. "
                  'Problem counts and difficulty differ; counts do not measure effort or ability.',
                  ['Homework','Problems','Submitters','Events','Min','Q1','Median','Q3','Max'],
                  [[a['homework'],a['problems'],a['all_attempts']['n'],a['submissions'],
                    *[f"{a['all_attempts'][k]:g}" for k in ('min','q1','median','q3','max')]] for a in assignments],
                  'One observation per student–homework with at least one in-window event.')

    largest = scores[0]
    remaining = sum(r['best']-r['best3'] > 10 for r in scores)
    score_reading = (f"{remaining} of {len(scores)} problem slots retain a mean gap above 10 percentage points after three attempts. "
                     f"{largest['homework']} {escape(largest['problem_name'])} has the largest gap: "
                     f"{largest['best3']:.2f} through three versus {largest['best']:.2f} best observed, "
                     f"a {largest['best']-largest['best3']:.2f}-point difference among the same {largest['n']} attempters. "
                     'This suggests a question for reviewing feedback; it does not establish why the problem was difficult.')
    html += chart('scores','03','PROBLEM BOTTLENECKS','Which problems keep a gap<br>after three attempts?', score_reading,
                  '03-score-progression', f'All {len(scores)} problem slots ranked by the remaining mean gap after three attempts.',
                  'Open circles show first means, squares best through three, and diamonds best observed. The red segment is the remaining gap. '
                  'Best through three is a cumulative maximum, not the actual third score. One-attempt pairs remain in every stage. '
                  'Means use the same attempters per problem; they do not count students who improved or establish causal gains.',
                  ['Homework','Problem','Name','Attempters','First','Best by 2','Best by 3','Best observed','Remaining gap (pp)'],
                  [[r['homework'],f"P{r['problem_order']}",r['problem_name'],r['n'],
                    *[f"{r[k]:.2f}" for k in ('first','best2','best3','best')],f"{r['best']-r['best3']:.2f}"] for r in scores],
                  'Mean normalized scores across the same attempters; sorted by best observed minus best through three.')

    attempt_rows = [r for r in data['attempt_score_series'] if r['state']=='visible']
    first, second = [next(r for r in attempt_rows if r['homework']=='HW1' and r['attempt']==i) for i in (1,2)]
    attempt_reading = (f"HW1's actual mean falls from {first['mean_score']:.2f} on attempt 1 to {second['mean_score']:.2f} on attempt 2. "
                       f"Event counts change from {first['submissions']} to {second['submissions']}; distinct students from {first['contributors']} to {second['contributors']}. "
                       'Only pairs reaching a later attempt contribute to that point. A lower mean does not mean the same group got worse. HW1–HW4 have separate panels.')
    html += chart('attempt-scores','04','MEAN SCORE BY ATTEMPT','What does each successive<br>submission actually score?',attempt_reading,
                  '04-attempt-scores','Four panels of actual nth-attempt means, with event counts N and distinct student counts S.',
                  'Equal weight per observed student–problem event; a student retrying several problems contributes several events. '
                  'All recorded attempts, including post-AC attempts, remain eligible for this descriptive view. '
                  'No score carry-forward. Points with fewer than five students are withheld; the line breaks at missing positions. No independent-event error bars.',
                  ['Homework','Attempt','Mean actual score (%)','Events (N)','Students (S)'],
                  [[r['homework'],r['attempt'],f"{r['mean_score']:.2f}",r['submissions'],r['contributors']] for r in attempt_rows],
                  'Actual event scores; each attempt has a changing cohort. Suppressed points do not publish numeric values.')

    events = data['event_progress']
    def event_rows(rows, labels):
        return [[*[r[key] for key in labels],r['state'],
                 *(['—']*4 if r['state']=='suppressed' else [r['new_bests'],r['eligible_retries'],r['contributors'],
                    f"{r['improvement_pct']:.2f}" if r['improvement_pct'] is not None else '—'])] for r in rows]
    event_headers = ['Status','New bests','Eligible retries','Students (S)','Rate (%)']
    hw_rates = '; '.join(f"{r['homework']} {r['improvement_pct']:.1f}% ({r['new_bests']}/{r['eligible_retries']})"
                         if r['state']=='visible' and r['eligible_retries'] else f"{r['homework']}: withheld or empty"
                         for r in events['by_homework'])
    html += chart('retry-productivity','11','PRODUCTIVE RETRIES','Does the next attempt<br>set a new personal best?',
                  'Among eligible retries: '+hw_rates+'. These are event rates; students can contribute multiple retries.',
                  '11-retry-productivity','Rates of setting a new personal best, by homework and elapsed retry gap. '+hw_rates,
                  'Eligible retries follow a valid baseline while the prior best is below full credit. A strict increase counts; ties do not. '
                  'First scores, internal-error judgements and attempts after full credit are excluded. Compilation-error scores remain. '
                  'Labels show new bests / eligible retries and distinct contributors S. Long gaps have small denominators; elapsed time is not study time. '
                  'No adjustment for problem mix, prior score or student differences is made, and the gap comparisons are not causal.',
                  ['Homework',*event_headers],event_rows(events['by_homework'],['homework']),
                  'One outcome per eligible retry, not per student. Read numerator and denominator together.')
    extra = ('<details><summary>Accessible data table · retry gaps</summary>'+table(['Gap',*event_headers],event_rows(events['by_gap'],['label']),
             'Left-inclusive, right-exclusive gap bins; gaps are measured since the previous valid same-pair event.')+'</details>')
    extra += ('<details><summary>Accessible data table · individual problem slots</summary>'+table(['Homework','Problem',*event_headers],
              event_rows(events['by_problem'],['homework','problem_name']),
              'Problem-level eligible retry rates. Small groups and secondary cells are withheld; no event identities are published.')+'</details>')
    # Insert the supplemental tables inside the newly added chart section.
    html = html.removesuffix('</section>') + extra + '</section>'
    phase_rows = [[r['homework'],r['label'],f"{r['phase_hours']:.2f}",*event_rows([r],[])[0]] for r in events['by_phase']]
    html += chart('deadline-progress','12','PROGRESS / DEADLINE PHASE','When does a retry<br>make progress?',
                  'Each window is split into five equal-duration phases. Color shows the share of eligible retries setting a new best; '
                  'each cell reports new-best counts, eligible retries and distinct contributors. Different phases can contain different students, problems and prior scores.',
                  '12-deadline-progress','New-best retry rates across five equal-duration phases of HW1–HW4. Hatched cells are withheld.',
                  'Opening is 0%; the exact deadline is in the last phase. Bin durations differ across homeworks; raw counts are not equal hourly rates across rows. '
                  'Hatched cells mean fewer than five contributors or secondary suppression, not zero. '
                  'Configured deadlines are used; individual extensions are unavailable. Timing does not identify a deadline effect.',
                  ['Homework','Window elapsed','Hours per phase',*event_headers],phase_rows,
                  'Disjoint, equal-duration phases within each homework. Numerators count strict improvements among eligible retries.')

    windows = table(['Homework','Opens (Beijing)','Configured deadline (Beijing)','Excluded outside window'],
                    [[a['homework'],a['start_local'][:16].replace('T',' '),a['end_local'][:16].replace('T',' '),a['outside_window']] for a in assignments],
                    'Inclusive configured assignment windows. Individual extensions are not incorporated.')
    counts = events['eligibility_counts']
    html += f'''<section id="dataset" class="methods"><p class="eyebrow">DATASET &amp; PROCESSING</p><h2>From private logs<br>to reproducible summaries.</h2>
<p>{snapshot_label(data)}. The read-only export contains nine source tables. A previously confirmed test account was matched privately and excluded locally;
the analysis contains {data['cohort_members']} roster members and {data['all_course_submissions']:,} course events.
The original export remains unchanged. This is a snapshot, and the website has no production connection.</p>
<p>The four homeworks contain {data['all_homework_submissions']:,} events; their configured windows retain {data['window_submissions']:,}
from {data['window_submitters']} students and exclude {data['outside_window']} outside-window events. Zero-submitters remain in the roster count.</p>
<p>Unique keys, roster membership, assignment–problem links, finite scores and positive maxima are validated before aggregation.
UTC is converted to Asia/Shanghai. Normalized score is <code>100 × assignment_submission_score / problem_max_points</code>.
Events are ordered by timestamp then submission ID. Raw scores on different point scales are never pooled.</p>
<p>For the two event-progress charts, {counts['first_scores']:,} first valid scores set baselines, {counts['internal_errors']} internal-error judgements are skipped,
and {counts['after_full_credit']} attempts after full credit are ineligible. Other completed attempts are checked against the earlier running best.
The four descriptive homework figures retain all recorded in-window attempts, including internal-error and post-acceptance events.</p>{windows}
<p>The <a href="data/summary.json">public aggregate JSON</a> contains no student identifiers or event-level records.
Positive bins require at least five distinct contributors; event partitions use secondary masking when needed to avoid a lone recoverable small cell.
Raw logs, private pseudonyms, scores and linkage keys stay outside this repository. Suppression reduces disclosure; it is not a formal anonymity guarantee.</p>
<p>HW4 is after the 16 September exam. The midterm and Course Pulse inputs retain their pre-exam HW1–HW3 evidence and 26 supplied grades from 41 eligible members.
The current 42-member homework cohort is a later roster snapshot, not a relabeling of that exam cohort.</p>
<p><a href="docs/methods.md">Methods and reproduction</a> · <a href="docs/event-methods.md">Event eligibility and masking</a></p></section>
<section class="next" id="retry-intervals"><p class="eyebrow">INTERPRETATION / NEXT STEPS</p><h2>A recorded gain is not a causal effect.</h2>
<p>Retry productivity and deadline phases are now computed from ordered events. Further comparisons by prior score, verdict or problem mix would require
fresh privacy checks. Any uncertainty estimate must account for repeated observations within students. No independent-event confidence intervals,
study-time estimates or causal learning claims are made. Analytical filters and the reader evaluation remain planned.</p></section>'''
    return html
