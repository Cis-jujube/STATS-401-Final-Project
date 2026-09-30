"""Eligibility, privacy and cohort-policy regression checks using synthetic inputs."""
import hashlib
import hmac
import importlib.util
import json
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location('prepare', Path(__file__).parents[1]/'scripts/prepare_data.py')
p = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(p)


class EventRules(unittest.TestCase):
    assignments = {95: {'start_time': '2026-08-26 00:00:00', 'end_time': '2026-08-31 00:00:00'}}

    def row(self, event_id, score, when='2026-08-27 00:00:00', status='D', student='a', problem=1):
        return {'submission_id':event_id,'assignment_id':95,'student_id':student,'problem_id':problem,
                'when':p.timestamp(when),'normalized_score':score,'judge_status':status,
                'judge_result':'IE' if status=='IE' else 'CE' if status=='CE' else 'WA'}

    def test_strict_historical_best_not_previous_score_and_post_full(self):
        rows = [self.row(i, score) for i, score in enumerate([20,60,40,60,80,100,0,100])]
        events, counts = p.progress_events(list(reversed(rows)),self.assignments)
        self.assertEqual([r['improved'] for r in events],[True,False,False,True,True])
        self.assertEqual(counts,{'first_scores':1,'internal_errors':0,'after_full_credit':2})

    def test_internal_errors_do_not_set_baseline_best_or_retry_gap(self):
        rows = [self.row(0,100,'2026-08-27 00:00:00','IE'),self.row(1,20,'2026-08-27 00:00:30'),
                self.row(2,100,'2026-08-27 00:01:30','IE'),self.row(3,40,'2026-08-27 00:02:00')]
        events, counts = p.progress_events(rows,self.assignments)
        self.assertEqual(len(events),1)
        self.assertEqual(events[0]['gap_bin'],1)  # 90 s, not 30 s from the IE event
        self.assertTrue(events[0]['improved'])
        self.assertEqual(counts['internal_errors'],2)

    def test_compile_error_is_scored_and_eligibility_is_per_pair(self):
        rows = [self.row(0,0,status='CE'),self.row(1,100,student='b'),
                self.row(2,100,problem=2),self.row(3,40)]
        events, counts = p.progress_events(rows,self.assignments)
        self.assertEqual(counts['first_scores'],3)
        self.assertEqual([r['improved'] for r in events],[True])

    def test_phase_boundary_and_deadline_inclusion(self):
        rows = [self.row(0,0,'2026-08-26 00:00:00'),self.row(1,10,'2026-08-27 00:00:00'),
                self.row(2,20,'2026-08-31 00:00:00')]
        events,_ = p.progress_events(rows,self.assignments)
        self.assertEqual([r['phase'] for r in events],[1,4])
        with self.assertRaises(ValueError):
            p.progress_events([self.row(0,0,'2026-08-31 00:00:01')],self.assignments)

    def test_pending_status_stops_analysis(self):
        with self.assertRaises(ValueError):
            p.progress_events([self.row(0,20,status='P')],self.assignments)

    def test_gap_edges_go_to_next_left_inclusive_bin(self):
        rows = [self.row(0,0,'2026-08-26 00:00:00'),self.row(1,0,'2026-08-26 00:01:00'),
                self.row(2,0,'2026-08-26 00:11:00'),self.row(3,0,'2026-08-26 01:11:00'),
                self.row(4,0,'2026-08-27 01:11:00')]
        events,_ = p.progress_events(rows,self.assignments)
        self.assertEqual([r['gap_bin'] for r in events],[1,2,3,4])

    def test_secondary_suppression_and_zero_are_distinct(self):
        small = [{'student_id':'one','improved':True}]*80
        wide = [{'student_id':str(i),'improved':i%2==0} for i in range(6)]
        cells = p.progress_cells([({'phase':0},small),({'phase':1},wide),({'phase':2},wide*2),({'phase':3},[])],secondary=True)
        self.assertEqual([r['state'] for r in cells],['suppressed','suppressed','visible','visible'])
        for row in cells[:2]:
            for field in ('eligible_retries','new_bests','contributors','improvement_pct'):
                self.assertIsNone(row[field])
        self.assertEqual((cells[2]['eligible_retries'],cells[2]['new_bests'],cells[2]['contributors']),(12,6,6))
        self.assertEqual((cells[3]['eligible_retries'],cells[3]['new_bests']),(0,0))
        self.assertIsNone(cells[3]['improvement_pct'])


class ExclusionRules(unittest.TestCase):
    def test_confirmed_identity_is_matched_and_raw_is_preserved(self):
        key = bytes(range(32))
        pseudo = hmac.new(key,b'7',hashlib.sha256).hexdigest()
        bundle = {'class_id':13,'extra_exclusions_verified':False,'tables':{
            'roster':[{'student_id':pseudo},{'student_id':'keep'}],
            'submissions':[{'student_id':pseudo,'submission_id':1},{'student_id':'keep','submission_id':2}],
            'participations':[{'student_id':pseudo},{'student_id':'keep'}],
            'submission_links':[{'submission_id':1},{'submission_id':2}]}}
        original = json.dumps(bundle)
        clean = p.apply_confirmed_exclusion(bundle,{'class_id':13,'excluded_test_profile_id':7},key.hex())
        self.assertEqual(json.dumps(bundle),original)
        self.assertEqual(clean['tables']['roster'],[{'student_id':'keep'}])
        self.assertEqual(clean['tables']['submission_links'],[{'submission_id':2}])
        self.assertTrue(clean['extra_exclusions_verified'])
        self.assertNotIn(pseudo,json.dumps(clean['exclusion_policy']))
        with self.assertRaises(ValueError):
            p.apply_confirmed_exclusion(bundle,{'class_id':13,'excluded_test_profile_id':8},key.hex())


if __name__ == '__main__':
    unittest.main()
