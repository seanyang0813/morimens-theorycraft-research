"""Regression checks for accidentally crediting incomplete/tainted observations."""
import unittest
import tempfile
import json
import hashlib
from pathlib import Path
from verify_research import audit_observation, audit_mechanic_regression, ROOT

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
            build_evidence=directory/'build.json';build_evidence.write_text(json.dumps({'schemaVersion':1,'kind':'MORIMENS_PC_COMBAT_BUILD_COMPARISON','currentBuild':'explicit-test-build','currentVersion':{'resVersion':1,'buildVersion':1},'sourceHashes':{'versionManifest':'a'*64,'bundles':{'share.ab':{'sha256':'b'*64,'size':1}}}}),encoding='utf-8')
            prediction={'scenarioFile':'unused.json','scenarioSha256':'0'*64,'runtimeFingerprint':'0'*64,'metric':'preHitDamage'}
            frozen={'schemaVersion':1,'kind':'MORIMENS_PREDICTION_FREEZE','prediction':prediction,'predictedDamage':100,'beforeOutcomeEvidence':[{'path':str(evidence.relative_to(ROOT)),'sha256':hashlib.sha256(evidence.read_bytes()).hexdigest()}],'recordedBuild':{'id':'explicit-test-build','evidence':[{'path':str(build_evidence.relative_to(ROOT)),'sha256':hashlib.sha256(build_evidence.read_bytes()).hexdigest()}]}}
            freeze=directory/'freeze.json';freeze.write_text(json.dumps(frozen),encoding='utf-8')
            proof={'path':str(freeze.relative_to(ROOT)),'sha256':hashlib.sha256(freeze.read_bytes()).hexdigest()}
            row={**self.row(),'holdout':True,'prediction':prediction,'predictionFrozenBeforeOutcomeEvidence':proof}
            result=audit_observation(row)
            self.assertFalse(any(reason.startswith('Holdout freeze:') for reason in result['reasons']))
            frozen['recordedBuild']['id']='different-build';freeze.write_text(json.dumps(frozen),encoding='utf-8');proof['sha256']=hashlib.sha256(freeze.read_bytes()).hexdigest();row['predictionFrozenBeforeOutcomeEvidence']=proof
            self.assertIn('Holdout freeze: Frozen recorded build is missing or differs from the observation',audit_observation(row)['reasons'])
            frozen['recordedBuild']['id']='explicit-test-build';freeze.write_text(json.dumps(frozen),encoding='utf-8');proof['sha256']=hashlib.sha256(freeze.read_bytes()).hexdigest();row['predictionFrozenBeforeOutcomeEvidence']=proof
            evidence.write_text('after',encoding='utf-8')
            result=audit_observation(row)
            self.assertIn('Holdout freeze: Pre-outcome evidence hash mismatch',result['reasons'])
    def test_holdout_rejects_unrecognized_build_evidence(self):
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            directory=Path(directory);evidence=directory/'evidence.json';evidence.write_text('{}',encoding='utf-8')
            prediction={'scenarioFile':'unused.json','scenarioSha256':'0'*64,'runtimeFingerprint':'0'*64,'metric':'preHitDamage'}
            item={'path':str(evidence.relative_to(ROOT)),'sha256':hashlib.sha256(evidence.read_bytes()).hexdigest()}
            frozen={'schemaVersion':1,'kind':'MORIMENS_PREDICTION_FREEZE','prediction':prediction,'predictedDamage':100,'beforeOutcomeEvidence':[item],'recordedBuild':{'id':'explicit-test-build','evidence':[item]}}
            freeze=directory/'freeze.json';freeze.write_text(json.dumps(frozen),encoding='utf-8');proof={'path':str(freeze.relative_to(ROOT)),'sha256':hashlib.sha256(freeze.read_bytes()).hexdigest()}
            result=audit_observation({**self.row(),'holdout':True,'prediction':prediction,'predictionFrozenBeforeOutcomeEvidence':proof})
            self.assertIn('Holdout freeze: No recognized build report identifies the recorded combat build',result['reasons'])
    def test_replay_holdout_requires_reviewed_same_session_capture(self):
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            directory=Path(directory);build='explicit-test-build';container_hash='c'*64
            before=directory/'before.json';before.write_text(json.dumps({'schemaVersion':1,'kind':'MORIMENS_REPLAY_PREOUTCOME_EVIDENCE','inputSha256':container_hash}),encoding='utf-8')
            build_report=directory/'build.json';build_report.write_text(json.dumps({'schemaVersion':1,'kind':'MORIMENS_PC_COMBAT_BUILD_COMPARISON','currentBuild':build,'currentVersion':{'resVersion':1,'buildVersion':1},'sourceHashes':{'versionManifest':'a'*64,'bundles':{'share.ab':{'sha256':'b'*64,'size':1}}}}),encoding='utf-8')
            private_baseline_hash='d'*64
            baseline=directory/'baseline.json';baseline.write_text(json.dumps({'schemaVersion':1,'kind':'MORIMENS_REPLAY_SESSION_BASELINE_COMMITMENT','status':'COMMITTED_PRE_BATTLE_BASELINE','build':{'id':build},'privateBaselineCommitment':{'sha256':private_baseline_hash}}),encoding='utf-8')
            baseline_ref={'path':str(baseline.relative_to(ROOT)),'sha256':hashlib.sha256(baseline.read_bytes()).hexdigest(),'privateBaselineSha256':private_baseline_hash}
            capture=directory/'capture.json';capture.write_text(json.dumps({'schemaVersion':1,'kind':'MORIMENS_REPLAY_SESSION_CAPTURE_EVIDENCE','status':'REVIEWED_SAME_SESSION_CONTROLLED_PVE_CAPTURE','analysisTrack':'verification','build':{'id':build},'containerSha256':container_hash,'combatDomain':'PVE_MONSTER_TARGETS','baselineCommitment':baseline_ref,'sessionChecks':{key:True for key in ('sameProcessStart','sameExecutable','installedBuildUnchanged','newReferenceAbsentFromBaseline','controlledPveBattleConfirmed','containerPreservedBeforeDecode')}}),encoding='utf-8')
            item=lambda path:{'path':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
            prediction={'scenarioFile':'unused.json','scenarioSha256':'0'*64,'runtimeFingerprint':'0'*64,'metric':'preHitDamage'}
            frozen={'schemaVersion':1,'kind':'MORIMENS_PREDICTION_FREEZE','prediction':prediction,'predictedDamage':100,'beforeOutcomeEvidence':[item(before)],'recordedBuild':{'id':build,'evidence':[item(build_report)]}}
            freeze=directory/'freeze.json';freeze.write_text(json.dumps(frozen),encoding='utf-8')
            row={**self.row(),'version':{'recordedCombatBuild':build},'holdout':True,'prediction':prediction,'predictionFrozenBeforeOutcomeEvidence':item(freeze)}
            self.assertIn('Holdout freeze: Replay holdout lacks reviewed same-session controlled-PvE capture evidence',audit_observation(row)['reasons'])
            frozen['recordedBuild']['evidence'].append(item(capture));freeze.write_text(json.dumps(frozen),encoding='utf-8');row['predictionFrozenBeforeOutcomeEvidence']=item(freeze)
            self.assertFalse(any(reason.startswith('Holdout freeze:') for reason in audit_observation(row)['reasons']))
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

    def test_mechanic_regression_is_exact_but_never_publication_credit(self):
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            directory=Path(directory);evidence=directory/'source.txt';evidence.write_text('reviewed',encoding='utf-8')
            row={'id':'synthetic-mechanic-audit','kind':'REAL_GAME_OBSERVATION','version':{'recordedCombatBuild':'pc-res144-build51'},'mechanicRegression':{'schemaVersion':1,'model':'old-embers-active-statistics-v1','status':'COMPLETE_RETROSPECTIVE','retrospective':True,'holdout':False,'observedCreditedDamage':30,'modelInput':{'build':'pc-res144-build51','damageType':'ACTIVE','castDamage':10,'remainingStacks':10,'triggerEligible':True,'hasState66314':False,'hasState62317':False,'targetHpIsZero':False,'immueChangeHp':0,'beChangeHpLimit':0},'evidence':[str(evidence.relative_to(ROOT))]}}
            path=directory/'observation.json';path.write_text(json.dumps(row),encoding='utf-8')
            result=audit_mechanic_regression(row,path)
            self.assertTrue(result['exactMatch'])
            self.assertTrue(result['eligibleForReview'])
            self.assertFalse(result['publicationCredit'])
            row['version']={}
            self.assertIn('Recorded combat build unknown',audit_mechanic_regression(row,path)['reasons'])

if __name__=='__main__':unittest.main()
