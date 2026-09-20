"""Regression tests: actual nth score, changing cohorts and person-based suppression."""
import importlib.util
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location('prepare', Path(__file__).parents[1]/'scripts/prepare_data.py')
p = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(p)

def rows(scores):
    return [{'when': p.timestamp('2026-08-29 12:00:00'), 'submission_id': i, 'normalized_score': s}
            for i,s in enumerate(scores)]

class AttemptScores(unittest.TestCase):
    def test_uses_actual_score_not_best_and_stable_order(self):
        groups = {(95,str(i),1): list(reversed(rows([80,20,60]))) for i in range(5)}
        result = p.attempt_score_series(groups)
        self.assertEqual([r['mean_score'] for r in result], [80,20,60])
    def test_stopped_pairs_do_not_carry_forward(self):
        groups = {(95,str(i),1): rows([100]) for i in range(5)}
        groups.update({(95,str(i),1): rows([20,40]) for i in range(5,10)})
        first,second = p.attempt_score_series(groups)
        self.assertEqual((first['mean_score'],first['submissions'],first['contributors']), (60,10,10))
        self.assertEqual((second['mean_score'],second['submissions'],second['contributors']), (40,5,5))
    def test_events_are_weighted_equally_and_students_counted_once(self):
        groups = {(95,str(i),1): rows([0]) for i in range(5)}
        groups[95,'0',2] = rows([100])
        result = p.attempt_score_series(groups)[0]
        self.assertAlmostEqual(result['mean_score'], 100/6)
        self.assertEqual((result['submissions'],result['contributors']), (6,5))
    def test_many_events_from_four_people_stay_suppressed(self):
        groups = {(95,str(i),j): rows([90]) for i in range(4) for j in range(10)}
        result = p.attempt_score_series(groups)[0]
        self.assertEqual(result['state'], 'suppressed')
        for key in ('mean_score','submissions','contributors'): self.assertIsNone(result[key])

if __name__=='__main__': unittest.main()
