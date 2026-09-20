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
    const build='pc-res144-build51',scenario=join(directory,'scenario.json'),evidence=join(directory,'prehit.txt'),output=join(directory,'freeze.json');
    writeFileSync(scenario,JSON.stringify({build,mode:'experimental',damageType:'FIXED',effect:{build,category:'FIXED',targetDead:false,baseDamage:100,dimensionFixPer:0,fixed1:0,fixed2:0,fixed3:0,fixed4:0,fixed5:0}}));
    writeFileSync(evidence,'pre-outcome state');
    const args={scenarioFile:relativeToRoot(scenario),metric:'preHitDamage',evidenceFiles:[relativeToRoot(evidence)],outputFile:relativeToRoot(output),now:()=>new Date('2026-09-20T00:00:00Z')};
    const frozen=freezeGameplayPrediction(args),record=JSON.parse(readFileSync(output,'utf8'));
    assert.equal(frozen.predictedDamage,100);assert.equal(record.predictedDamage,100);assert.equal(record.kind,'MORIMENS_PREDICTION_FREEZE');assert.equal(record.beforeOutcomeEvidence.length,1);
    assert.throws(()=>freezeGameplayPrediction(args),/refusing to overwrite/);
    assert.throws(()=>freezeGameplayPrediction({...args,outputFile:relativeToRoot(join(directory,'bad.json')),evidenceFiles:[args.scenarioFile]}),/separate/);
    const cliOutput=join(directory,'cli-freeze.json'),cli=spawnSync(process.execPath,['tools/freeze_gameplay_prediction.mjs','--scenario',args.scenarioFile,'--metric','preHitDamage','--evidence',args.evidenceFiles[0],'--output',relativeToRoot(cliOutput)],{cwd:root,encoding:'utf8'});
    assert.equal(cli.status,0,cli.stderr);assert.equal(JSON.parse(cli.stdout).predictedDamage,100);assert.equal(JSON.parse(readFileSync(cliOutput,'utf8')).predictedDamage,100);
  }finally{rmSync(directory,{recursive:true,force:true});}
});
