import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {freezeGameplayPrediction} from '../tools/freeze_gameplay_prediction.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),relativeToRoot=path=>relative(root,path);
test('prediction freeze pins scenario, runtime and separate pre-outcome evidence without overwrite',()=>{
  const directory=mkdtempSync(join(root,'research/observations/freeze-test-'));
  try{
    const build='pc-res144-build51',scenario=join(directory,'scenario.json'),evidence=join(directory,'prehit.txt'),buildEvidence=join(directory,'build.txt'),output=join(directory,'freeze.json');
    writeFileSync(scenario,JSON.stringify({build,mode:'experimental',damageType:'FIXED',effect:{build,category:'FIXED',targetDead:false,baseDamage:100,dimensionFixPer:0,fixed1:0,fixed2:0,fixed3:0,fixed4:0,fixed5:0}}));
    writeFileSync(evidence,'pre-outcome state');
    writeFileSync(buildEvidence,JSON.stringify({schemaVersion:1,kind:'MORIMENS_PC_COMBAT_BUILD_COMPARISON',currentBuild:build,currentVersion:{resVersion:144,buildVersion:51},sourceHashes:{versionManifest:'a'.repeat(64),bundles:{'share.ab':{sha256:'b'.repeat(64),size:1}}}}));
    const args={scenarioFile:relativeToRoot(scenario),metric:'preHitDamage',evidenceFiles:[relativeToRoot(evidence)],recordedCombatBuild:build,buildEvidenceFiles:[relativeToRoot(buildEvidence)],outputFile:relativeToRoot(output),now:()=>new Date('2026-09-20T00:00:00Z')};
    const frozen=freezeGameplayPrediction(args),record=JSON.parse(readFileSync(output,'utf8'));
    assert.equal(frozen.predictedDamage,100);assert.equal(record.predictedDamage,100);assert.equal(record.kind,'MORIMENS_PREDICTION_FREEZE');assert.equal(record.beforeOutcomeEvidence.length,1);assert.equal(record.recordedBuild.id,build);assert.equal(record.recordedBuild.evidence.length,1);
    assert.equal(record.prediction.runtimeContract.schemaVersion,1);assert.equal(record.prediction.runtimeContract.fullRuntimeFingerprint,record.prediction.runtimeFingerprint);assert.ok(record.prediction.runtimeContract.files['engine/calculate-damage.mjs']);assert.equal(record.prediction.runtimeContract.files['engine/legal-card-actions.mjs'],undefined);
    const replay=spawnSync(process.execPath,['tools/replay_observation.mjs',scenario,'preHitDamage',record.prediction.runtimeFingerprint,JSON.stringify(record.prediction.runtimeContract)],{cwd:root,encoding:'utf8'});
    assert.equal(replay.status,0,replay.stderr);assert.equal(JSON.parse(replay.stdout).value,100);assert.equal(JSON.parse(replay.stdout).runtimeContractFingerprint,record.prediction.runtimeContract.fingerprint);
    assert.throws(()=>freezeGameplayPrediction(args),/refusing to overwrite/);
    assert.throws(()=>freezeGameplayPrediction({...args,outputFile:relativeToRoot(join(directory,'bad.json')),evidenceFiles:[args.scenarioFile]}),/separate/);
    assert.throws(()=>freezeGameplayPrediction({...args,outputFile:relativeToRoot(join(directory,'missing-build-evidence.json')),buildEvidenceFiles:[]}),/supplied together/);
    const unrecognized=join(directory,'unrecognized-build.json');writeFileSync(unrecognized,JSON.stringify({currentBuild:build}));
    assert.throws(()=>freezeGameplayPrediction({...args,outputFile:relativeToRoot(join(directory,'unrecognized.json')),buildEvidenceFiles:[relativeToRoot(unrecognized)]}),/recognized build report/);
    const cliOutput=join(directory,'cli-freeze.json'),cli=spawnSync(process.execPath,['tools/freeze_gameplay_prediction.mjs','--scenario',args.scenarioFile,'--metric','preHitDamage','--evidence',args.evidenceFiles[0],'--recorded-build',build,'--build-evidence',relativeToRoot(buildEvidence),'--output',relativeToRoot(cliOutput)],{cwd:root,encoding:'utf8'});
    assert.equal(cli.status,0,cli.stderr);assert.equal(JSON.parse(cli.stdout).predictedDamage,100);assert.equal(JSON.parse(readFileSync(cliOutput,'utf8')).predictedDamage,100);
  }finally{rmSync(directory,{recursive:true,force:true});}
});
