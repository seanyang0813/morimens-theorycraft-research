"""Regression checks for accidentally crediting incomplete/tainted observations."""
import unittest
import tempfile
import json
import hashlib
from pathlib import Path
from verify_research import audit_observation, ROOT

class ObservationAuditTests(unittest.TestCase):
    def row(self):
        return dict(id='synthetic-audit-only',kind='REAL_GAME_OBSERVATION',status='COMPLETE',version={'recordedCombatBuild':'explicit-test-build'},observedDamage=100,predictedDamage=100,holdout=False,evidence=['README.md'])
    def test_missing_and_nonfinite_predictions(self):
        for value in [None,float('nan'),float('inf'),True]:
            with self.subTest(value=value):
                self.assertFalse(audit_observation({**self.row(),'predictedDamage':value})['eligibleForReview'])
    def test_equal_numbers_do_not_override_missing_state(self):
        for update in [dict(status='INCOMPLETE_STATE'),dict(uncertainState=['crit']),dict(assumedState={'crit':True}),dict(version={}),dict(evidence=[]),dict(evidence=['../not-an-evidence-file']),dict(kind='SYNTHETIC')]:
            self.assertFalse(audit_observation({**self.row(),**update})['eligibleForReview'])
    def test_holdout_needs_freeze_evidence(self):
        self.assertFalse(audit_observation({**self.row(),'holdout':True})['eligibleForReview'])
        result=audit_observation({**self.row(),'holdout':True,'predictionFrozenBeforeOutcomeEvidence':'trust me'})
        self.assertTrue(any(reason.startswith('Holdout freeze:') for reason in result['reasons']))
    def test_holdout_freeze_checks_format_and_pre_outcome_hashes(self):
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            directory=Path(directory);evidence=directory/'prehit.txt';evidence.write_text('before',encoding='utf-8')
            prediction={'scenarioFile':'unused.json','scenarioSha256':'0'*64,'runtimeFingerprint':'0'*64,'metric':'preHitDamage'}
            frozen={'schemaVersion':1,'kind':'MORIMENS_PREDICTION_FREEZE','prediction':prediction,'predictedDamage':100,'beforeOutcomeEvidence':[{'path':str(evidence.relative_to(ROOT)),'sha256':hashlib.sha256(evidence.read_bytes()).hexdigest()}]}
            freeze=directory/'freeze.json';freeze.write_text(json.dumps(frozen),encoding='utf-8')
            proof={'path':str(freeze.relative_to(ROOT)),'sha256':hashlib.sha256(freeze.read_bytes()).hexdigest()}
            row={**self.row(),'holdout':True,'prediction':prediction,'predictionFrozenBeforeOutcomeEvidence':proof}
            result=audit_observation(row)
            self.assertFalse(any(reason.startswith('Holdout freeze:') for reason in result['reasons']))
            evidence.write_text('after',encoding='utf-8')
            result=audit_observation(row)
            self.assertIn('Holdout freeze: Pre-outcome evidence hash mismatch',result['reasons'])
    def test_no_implicit_tolerance(self):
        result=audit_observation({**self.row(),'predictedDamage':101})
        self.assertEqual(result['difference'],1)
        self.assertFalse(result['eligibleForReview'])
    def test_matching_reported_numbers_require_actual_replay(self):
        self.assertIn('Prediction replay: No executable prediction contract',audit_observation(self.row())['reasons'])
    def test_replay_checks_inputs_engine_and_reported_number(self):
        build='pc-res144-build51'
        scenario={'build':build,'mode':'experimental','damageType':'FIXED','effect':{'build':build,'category':'FIXED','targetDead':False,'baseDamage':100,'dimensionFixPer':0,'fixed1':0,'fixed2':0,'fixed3':0,'fixed4':0,'fixed5':0}}
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            path=Path(directory)/'scenario.json';path.write_text(json.dumps(scenario),encoding='utf-8')
            manifest=json.loads((ROOT/'website/dist/runtime-manifest.json').read_text(encoding='utf-8'))
            prediction={'scenarioFile':str(path.relative_to(ROOT)),'scenarioSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'metric':'preHitDamage','runtimeFingerprint':manifest['fingerprint']}
            row={**self.row(),'version':{'recordedCombatBuild':build},'prediction':prediction}
            result=audit_observation(row)
            self.assertEqual(result['recomputed']['value'],100)
            # Synthetic audit-only input checks plumbing; never stored as gameplay evidence.
            bad=audit_observation({**row,'predictedDamage':200,'observedDamage':200})
            self.assertIn('Reported prediction differs from executable engine output',bad['reasons'])
            for update in [{'scenarioSha256':'0'*64},{'runtimeFingerprint':'0'*64},{'metric':'finalDamage'}]:
                self.assertFalse(audit_observation({**row,'prediction':{**prediction,**update}})['eligibleForReview'])

if __name__=='__main__':unittest.main()
