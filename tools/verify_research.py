"""Reproducible research checkpoint. Never grants publication automatically."""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
import math
import subprocess

ROOT=Path(__file__).resolve().parents[1]

def number(value):
    return isinstance(value,(int,float)) and not isinstance(value,bool) and math.isfinite(value)

def recognized_build_report(path,recorded_build):
    try:value=json.loads(path.read_text(encoding='utf-8'))
    except (OSError,UnicodeError,json.JSONDecodeError):return False
    version=value.get('currentVersion') if isinstance(value,dict) else None
    source=value.get('sourceHashes') if isinstance(value,dict) else None
    digest=source.get('versionManifest') if isinstance(source,dict) else None
    return value.get('schemaVersion')==1 and value.get('kind')=='MORIMENS_PC_COMBAT_BUILD_COMPARISON' and value.get('currentBuild')==recorded_build and isinstance(version,dict) and isinstance(version.get('resVersion'),int) and isinstance(version.get('buildVersion'),int) and isinstance(digest,str) and len(digest)==64 and all(char in '0123456789abcdef' for char in digest) and isinstance(source.get('bundles'),dict)

def recognized_replay_session_capture(path,recorded_build,input_sha256):
    try:value=json.loads(path.read_text(encoding='utf-8'))
    except (OSError,UnicodeError,json.JSONDecodeError):return False
    if not isinstance(value,dict) or value.get('schemaVersion')!=1 or value.get('kind')!='MORIMENS_REPLAY_SESSION_CAPTURE_EVIDENCE' or value.get('status')!='REVIEWED_SAME_SESSION_CONTROLLED_PVE_CAPTURE':return False
    if value.get('analysisTrack')!='verification' or value.get('build',{}).get('id')!=recorded_build or value.get('containerSha256')!=input_sha256 or value.get('combatDomain')!='PVE_MONSTER_TARGETS':return False
    checks=value.get('sessionChecks')
    required=('sameProcessStart','sameExecutable','installedBuildUnchanged','newReferenceAbsentFromBaseline','controlledPveBattleConfirmed','containerPreservedBeforeDecode')
    if not isinstance(checks,dict) or any(checks.get(key) is not True for key in required):return False
    baseline=value.get('baselineCommitment')
    try:
        baseline_path=(ROOT/baseline['path']).resolve()
        if not baseline_path.is_relative_to(ROOT) or not baseline_path.is_file() or hashlib.sha256(baseline_path.read_bytes()).hexdigest()!=baseline['sha256']:return False
        committed=json.loads(baseline_path.read_text(encoding='utf-8'))
    except (KeyError,TypeError,OSError,UnicodeError,json.JSONDecodeError):return False
    return committed.get('schemaVersion')==1 and committed.get('kind')=='MORIMENS_REPLAY_SESSION_BASELINE_COMMITMENT' and committed.get('status')=='COMMITTED_PRE_BATTLE_BASELINE' and committed.get('build',{}).get('id')==recorded_build and committed.get('privateBaselineCommitment',{}).get('sha256')==baseline.get('privateBaselineSha256')

def replay_prediction(row):
    prediction=row.get('prediction')
    if not isinstance(prediction,dict):return None,'No executable prediction contract'
    try:
        path=(ROOT/prediction['scenarioFile']).resolve()
        if not path.is_relative_to(ROOT) or not path.is_file():raise ValueError('Scenario file missing or outside workspace')
        if hashlib.sha256(path.read_bytes()).hexdigest()!=prediction['scenarioSha256']:raise ValueError('Scenario hash mismatch')
        command=['node',str(ROOT/'tools/replay_observation.mjs'),str(path),prediction['metric'],prediction['runtimeFingerprint']]
        if prediction.get('runtimeContract') is not None:command.append(json.dumps(prediction['runtimeContract'],separators=(',',':')))
        run=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,encoding='utf-8',timeout=30)
        if run.returncode:raise ValueError(run.stderr.strip() or 'Prediction execution failed')
        result=json.loads(run.stdout)
        if result['build']!=row.get('version',{}).get('recordedCombatBuild'):raise ValueError('Scenario and recorded combat build differ')
        if not number(result.get('value')):raise ValueError('Prediction replay returned no finite metric')
        return result,None
    except (KeyError,TypeError,ValueError,OSError,subprocess.TimeoutExpired) as error:return None,str(error)

def audit_observation(row):
    reasons=[]
    if row.get('kind')!='REAL_GAME_OBSERVATION':reasons.append('Not a real gameplay observation')
    if row.get('status')!='COMPLETE':reasons.append('State/sequence reconstruction incomplete')
    if not row.get('version',{}).get('recordedCombatBuild'):reasons.append('Recorded combat build unknown')
    if row.get('uncertainState'):reasons.append('Unresolved input state')
    if row.get('assumedState'):reasons.append('Assumed state requires provenance review before scoring')
    observed,predicted=row.get('observedDamage'),row.get('predictedDamage')
    difference=predicted-observed if number(observed) and number(predicted) else None
    if difference is None:reasons.append('No finite observed/predicted pair')
    elif difference!=0:reasons.append('Nonzero discrepancy requires documented review; not automatically accepted')
    recomputed,replay_error=replay_prediction(row)
    if replay_error:reasons.append('Prediction replay: '+replay_error)
    elif recomputed['value']!=predicted:reasons.append('Reported prediction differs from executable engine output')
    evidence=row.get('evidence',[])
    if not evidence:reasons.append('No evidence files')
    hashes=[]
    for name in evidence:
        path=(ROOT/name).resolve()
        if not path.is_relative_to(ROOT) or not path.is_file():reasons.append('Missing or out-of-workspace evidence: '+name)
        else:hashes.append({'path':name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    if row.get('holdout'):
        proof=row.get('predictionFrozenBeforeOutcomeEvidence')
        try:
            if not isinstance(proof,dict):raise ValueError('A hashed freeze-evidence file is required')
            path=(ROOT/proof['path']).resolve()
            if not path.is_relative_to(ROOT) or not path.is_file():raise ValueError('Freeze evidence missing or outside workspace')
            if hashlib.sha256(path.read_bytes()).hexdigest()!=proof['sha256']:raise ValueError('Freeze evidence hash mismatch')
            frozen=json.loads(path.read_text(encoding='utf-8'))
            if frozen.get('schemaVersion')!=1 or frozen.get('kind')!='MORIMENS_PREDICTION_FREEZE':raise ValueError('Unsupported prediction freeze format')
            if frozen.get('prediction')!=row.get('prediction'):raise ValueError('Frozen contract differs from replayed prediction contract')
            if frozen.get('predictedDamage')!=predicted:raise ValueError('Frozen predicted damage differs')
            before=frozen.get('beforeOutcomeEvidence')
            if not isinstance(before,list) or not before:raise ValueError('Independent evidence of freeze timing missing')
            replay_input_hashes=set()
            for item in before:
                evidence_path=(ROOT/item['path']).resolve()
                if not evidence_path.is_relative_to(ROOT) or not evidence_path.is_file():raise ValueError('Pre-outcome evidence missing or outside workspace')
                if hashlib.sha256(evidence_path.read_bytes()).hexdigest()!=item['sha256']:raise ValueError('Pre-outcome evidence hash mismatch')
                try:before_value=json.loads(evidence_path.read_text(encoding='utf-8'))
                except (UnicodeError,json.JSONDecodeError):before_value=None
                if isinstance(before_value,dict) and before_value.get('kind')=='MORIMENS_REPLAY_PREOUTCOME_EVIDENCE':
                    input_hash=before_value.get('inputSha256')
                    if not isinstance(input_hash,str) or len(input_hash)!=64 or any(char not in '0123456789abcdef' for char in input_hash):raise ValueError('Replay pre-outcome evidence has an invalid container hash')
                    replay_input_hashes.add(input_hash)
                hashes.append({'path':item['path'],'sha256':item['sha256'],'purpose':'pre-outcome state; chronology requires manual review'})
            if len(replay_input_hashes)>1:raise ValueError('Replay pre-outcome evidence refers to multiple containers')
            recorded_build=row.get('version',{}).get('recordedCombatBuild')
            if recorded_build:
                build=frozen.get('recordedBuild')
                if not isinstance(build,dict) or build.get('id')!=recorded_build:raise ValueError('Frozen recorded build is missing or differs from the observation')
                build_evidence=build.get('evidence')
                if not isinstance(build_evidence,list) or not build_evidence:raise ValueError('Frozen recorded build needs pre-outcome evidence')
                recognized_build_evidence=False;recognized_session_capture=False
                for item in build_evidence:
                    evidence_path=(ROOT/item['path']).resolve()
                    if not evidence_path.is_relative_to(ROOT) or not evidence_path.is_file():raise ValueError('Build evidence missing or outside workspace')
                    if hashlib.sha256(evidence_path.read_bytes()).hexdigest()!=item['sha256']:raise ValueError('Build evidence hash mismatch')
                    recognized_build_evidence=recognized_build_evidence or recognized_build_report(evidence_path,recorded_build)
                    if replay_input_hashes:recognized_session_capture=recognized_session_capture or recognized_replay_session_capture(evidence_path,recorded_build,next(iter(replay_input_hashes)))
                    hashes.append({'path':item['path'],'sha256':item['sha256'],'purpose':'pre-outcome recorded combat build; chronology requires manual review'})
                if not recognized_build_evidence:raise ValueError('No recognized build report identifies the recorded combat build')
                if replay_input_hashes and not recognized_session_capture:raise ValueError('Replay holdout lacks reviewed same-session controlled-PvE capture evidence')
            hashes.append({'path':proof['path'],'sha256':proof['sha256'],'purpose':'prediction freeze; chronology requires manual review'})
        except (KeyError,TypeError,ValueError,OSError) as error:reasons.append('Holdout freeze: '+str(error))
    return {'id':row.get('id'),'holdout':row.get('holdout') is True,'observed':observed,'predicted':predicted,'recomputed':recomputed,'difference':difference,'eligibleForReview':not reasons,'reasons':reasons,'evidenceFiles':hashes}

def audit_mechanic_regression(row,path):
    check=row.get('mechanicRegression')
    if not isinstance(check,dict):return None
    reasons=[]
    if check.get('status')!='COMPLETE_RETROSPECTIVE':reasons.append('Mechanic regression status is incomplete')
    if check.get('retrospective') is not True or check.get('holdout') is not False:reasons.append('Must be explicitly retrospective and non-holdout')
    if not row.get('version',{}).get('recordedCombatBuild'):reasons.append('Recorded combat build unknown')
    try:
        run=subprocess.run(['node',str(ROOT/'tools/replay_mechanic_observation.mjs'),str(path)],cwd=ROOT,capture_output=True,text=True,encoding='utf-8',timeout=30)
        if run.returncode:raise ValueError(run.stderr.strip() or 'Mechanic replay failed')
        result=json.loads(run.stdout)
        if not result.get('exactMatch'):reasons.append('Mechanic result is not an exact match')
    except (ValueError,OSError,subprocess.TimeoutExpired,json.JSONDecodeError) as error:
        result=None;reasons.append('Mechanic replay: '+str(error))
    hashes=[]
    for name in check.get('evidence',[]):
        evidence_path=(ROOT/name).resolve()
        if not evidence_path.is_relative_to(ROOT) or not evidence_path.is_file():reasons.append('Missing or out-of-workspace mechanic evidence: '+name)
        else:hashes.append({'path':name,'sha256':hashlib.sha256(evidence_path.read_bytes()).hexdigest()})
    if not hashes:reasons.append('No mechanic evidence files')
    return {'id':row.get('id'),'model':check.get('model'),'retrospective':True,'holdout':False,'result':result,'exactMatch':bool(result and result.get('exactMatch')),'eligibleForReview':not reasons,'reasons':reasons,'evidenceFiles':hashes,'publicationCredit':False}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--check-publication',action='store_true',help='Exit nonzero unless publication review is complete (never automatically granted here)')
    args=parser.parse_args()
    tests=sorted((ROOT/'tests').glob('*.test.mjs'))
    run=subprocess.run(['node','--test',*[str(p) for p in tests]],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
    log=ROOT/'research/evidence/latest-test-suite.tap'
    log.write_text(run.stdout+'\n'+run.stderr,encoding='utf-8')
    observation_paths=sorted((ROOT/'tests/observations').glob('*.json'))
    observation_data=[json.loads(path.read_text(encoding='utf-8')) for path in observation_paths]
    rows=[audit_observation(row) for row in observation_data]
    mechanic_rows=[result for row,path in zip(observation_data,observation_paths) if (result:=audit_mechanic_regression(row,path)) is not None]
    replay_catalog_path=ROOT/'research/evidence/replay-catalog-build-attribution.json'
    replay_catalog=json.loads(replay_catalog_path.read_text(encoding='utf-8'))
    replay_catalog_summary=replay_catalog.get('summary',{})
    current_catalog_path=ROOT/'research/evidence/current-catalog-gameplay-consistency.json'
    current_catalog=json.loads(current_catalog_path.read_text(encoding='utf-8'))
    if current_catalog.get('status')!='RETROSPECTIVE_CURRENT_CATALOG_ENGINE_VERSION_UNCONFIRMED':raise ValueError('Current-catalog consistency status is invalid')
    replay_corpus_path=ROOT/'research/evidence/replay-corpus-active-audit.json'
    replay_corpus=json.loads(replay_corpus_path.read_text(encoding='utf-8'))
    if replay_corpus.get('analysisTrack')!='verification' or replay_corpus.get('publicationCredit') is not False:raise ValueError('Replay corpus track or publication boundary is invalid')
    reviewable=sum(row['eligibleForReview'] for row in rows)
    holdouts=sum(row['eligibleForReview'] and row['holdout'] for row in rows)
    reasons=[]
    if run.returncode:reasons.append('Automated test suite failed')
    if not tests:reasons.append('No automated tests discovered')
    if not reviewable:reasons.append('No fully reconstructed real observation with matching prediction')
    if not holdouts:reasons.append('No independently frozen, reconstructed holdout with matching prediction')
    reasons.append('Supported-scenario core-mechanic coverage and source traceability require a complete evidence review; this checkpoint cannot authorize publication')
    copies=[]
    for name in json.loads((ROOT/'website/engine-modules.json').read_text(encoding='utf-8')):
        engine=ROOT/'engine'/name;website=ROOT/'website/dist/engine'/name
        matches=website.is_file() and engine.read_bytes()==website.read_bytes()
        copies.append({'module':name,'matchesResearchEngine':matches})
        if not matches:reasons.append('Website engine copy missing or stale: '+name)
    out={'generatedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'publicationStatus':'NOT_READY' if len(reasons)>1 else 'REQUIRES_EVIDENCE_REVIEW','publicationAuthorized':False,'automatedSuite':{'testFiles':len(tests),'passed':run.returncode==0 and bool(tests),'exitCode':run.returncode,'log':str(log.relative_to(ROOT)),'logSha256':hashlib.sha256(log.read_bytes()).hexdigest()},'realObservations':{'records':len(rows),'eligibleForReview':reviewable,'holdoutsEligibleForReview':holdouts,'rows':rows},'gameplayMechanicRegressions':{'records':len(mechanic_rows),'exactMatches':sum(row['exactMatch'] for row in mechanic_rows),'eligibleForReview':sum(row['eligibleForReview'] for row in mechanic_rows),'publicationCredit':False,'rows':mechanic_rows},'replayCatalogAttribution':{'report':str(replay_catalog_path.relative_to(ROOT)),'reportSha256':hashlib.sha256(replay_catalog_path.read_bytes()).hexdigest(),'resource144Matches':replay_catalog_summary.get('PC_RES144_BUILD51_CATALOG_MATCH',0),'resource150Matches':replay_catalog_summary.get('PC_RES150_BUILD51_CATALOG_MATCH',0),'unmatchedOrIntermediate':replay_catalog_summary.get('UNMATCHED_OR_INTERMEDIATE_CATALOG',0),'publicationCredit':False},'currentCatalogGameplayConsistency':{'report':str(current_catalog_path.relative_to(ROOT)),'reportSha256':hashlib.sha256(current_catalog_path.read_bytes()).hexdigest(),'status':current_catalog['status'],'auditedReplays':current_catalog.get('totals',{}).get('auditedReplays',0),'exactRngBranchConsistencyChecks':current_catalog.get('totals',{}).get('exactRngBranchConsistencyChecks',0),'mismatches':current_catalog.get('totals',{}).get('rngBranchMismatches',0)+current_catalog.get('totals',{}).get('deterministicMismatches',0),'publicationCredit':False},'websiteEngineCopies':copies,'blockingReasons':reasons,'limitations':['Matching reported values alone cannot establish input provenance or validate a formula','Retrospective mechanic regressions, catalog attribution and current-catalog consistency checks do not count as full damage predictions or blind holdouts','Synthetic runtime comparisons are not gameplay fixtures or holdouts','No browser QA, source coverage review or deployed-site verification is performed by this script']}
    out['retrospectiveReplayCorpus']={'report':str(replay_corpus_path.relative_to(ROOT)),'reportSha256':hashlib.sha256(replay_corpus_path.read_bytes()).hexdigest(),'analysisTrack':'verification','auditedReplays':replay_corpus.get('totals',{}).get('replays',0),'activeCandidates':replay_corpus.get('totals',{}).get('retrospectiveActiveCandidates',0),'deterministicExactChecks':replay_corpus.get('totals',{}).get('deterministicExactChecks',0),'exactRngBranchConsistencyChecks':replay_corpus.get('totals',{}).get('exactRngBranchConsistencyChecks',0),'mismatches':replay_corpus.get('totals',{}).get('deterministicMismatches',0)+replay_corpus.get('totals',{}).get('rngBranchMismatches',0),'publicationCredit':False,'crossTrackClaims':[]}
    path=ROOT/'research/evidence/verification-snapshot.json'
    path.write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps({'suitePassed':out['automatedSuite']['passed'],'testFiles':len(tests),'realObservationRecords':len(rows),'mechanicRegressionExactMatches':out['gameplayMechanicRegressions']['exactMatches'],'resource150CatalogReplayMatches':out['replayCatalogAttribution']['resource150Matches'],'retrospectiveReplayCandidates':out['retrospectiveReplayCorpus']['activeCandidates'],'reviewablePredictions':reviewable,'reviewableHoldouts':holdouts,'publicationStatus':out['publicationStatus'],'report':str(path.relative_to(ROOT))},indent=2))
    return run.returncode or (2 if args.check_publication else 0)

if __name__=='__main__':raise SystemExit(main())
