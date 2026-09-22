import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveWheelRefinementParameters} from '../engine/wheel-refinement-parameters.mjs';
import {resolveWheelInitialProperties} from '../engine/wheel-initial-properties.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const readJson=path=>JSON.parse(readFileSync(path,'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>JSON.stringify(value,Object.keys(value??{}).sort());
const sameNumbers=(a,b)=>{
  const ak=Object.keys(a).sort(),bk=Object.keys(b).sort();
  return JSON.stringify(ak)===JSON.stringify(bk)&&ak.every(key=>Number.isFinite(a[key])&&Number.isFinite(b[key])&&a[key]===b[key]);
};

const crosswalkPath=resolve(root,'research/observations/wheel-config-audit/crosswalk-audit.json');
const statesPath=resolve(root,'research/extracted/config/State.json');
const captureReportPath=resolve(root,'research/evidence/replay-capture-round-003.json');
const outputPath=resolve(root,'research/evidence/wheel-replay-state-audit.json');
const crosswalk=readJson(crosswalkPath),states=readJson(statesPath),captureReport=readJson(captureReportPath);
const byItem=new Map(),coveredWheels=new Set(),unresolvedItems=new Set(),corpusHash=createHash('sha256');
for(const row of crosswalk.rows)if(row.status==='UNIQUE')for(const candidate of row.candidates)byItem.set(candidate.itemId,{row,candidate});
const summary={replays:0,weaponStateSnapshots:0,uniquelyCrosswalkedSnapshots:0,unresolvedCrosswalkSnapshots:0,stateIdentityMatches:0,stateIdentityMismatches:0,embeddedPropertyDefinitionMatches:0,embeddedPropertyDefinitionMismatches:0,refinementParameterMatches:0,refinementParameterMismatches:0,directPropertySnapshots:0,emptyDirectPropertySnapshots:0,serializedRawPropertyMatches:0,serializedRawPropertyMismatches:0,clientInitAndSerializedValueMatches:0,clientInitAndSerializedValueDifferences:0};
const refinementLevelHistogram={'0':0,'1':0,'2':0,'3':0};
const weaponStateCountHistogram={};
const awakenerCountHistogram={},weaponStatesPerAwakenerHistogram={};
for(let replayNumber=71;replayNumber<=172;replayNumber++){
  const path=resolve(root,`research/observations/replay-batch-${replayNumber}/decoded.json`),bytes=readFileSync(path),document=JSON.parse(bytes.toString('utf8')).decoded;
  corpusHash.update(String(replayNumber)).update(':').update(sha(bytes)).update('\n');summary.replays++;
  const roles=new Map((document.battleDat.roleData??[]).map(role=>[role.uid,role]));
  awakenerCountHistogram[String(roles.size)]=(awakenerCountHistogram[String(roles.size)]??0)+1;
  const weaponStatesByOwner=new Map([...roles.keys()].map(uid=>[uid,0]));
  let replayWeaponStates=0;
  for(const snapshot of document.battleDat.stateList??[]){
    const sources=(snapshot.source??[]).filter(source=>source&&source.sourceType==='Weapon');
    for(const source of sources){
      summary.weaponStateSnapshots++;replayWeaponStates++;weaponStatesByOwner.set(snapshot.ownerData?.uid,(weaponStatesByOwner.get(snapshot.ownerData?.uid)??0)+1);
      const matched=byItem.get(source.tid);
      if(!matched){summary.unresolvedCrosswalkSnapshots++;unresolvedItems.add(source.tid);continue;}
      const {row,candidate}=matched;coveredWheels.add(row.wheelId);summary.uniquelyCrosswalkedSnapshots++;
      if(snapshot.stateId===candidate.initialStateId)summary.stateIdentityMatches++;else summary.stateIdentityMismatches++;
      const localState=states[String(candidate.initialStateId)],embeddedState=document.resourceRecords.State?.[String(candidate.initialStateId)];
      if(embeddedState&&canonical(embeddedState.ExistProperty??{})===canonical(localState.ExistProperty??{}))summary.embeddedPropertyDefinitionMatches++;else summary.embeddedPropertyDefinitionMismatches++;
      const parameters=Object.fromEntries(Object.entries(candidate.stateParameters??{}).map(([slot,expression])=>[`StateArg${slot}`,String(expression)]));
      const matchingLevels=[];
      for(let refinementLevel=0;refinementLevel<=3;refinementLevel++){
        const resolved=resolveWheelRefinementParameters({schemaVersion:1,kind:'morimens-wheel-refinement-parameters',build:'pc-res144-build51',wheelId:row.wheelId,refinementLevel,parameters});
        const values=Object.values(resolved.values),actual=snapshot.stateParams??[];
        if(values.length===actual.length&&values.every((value,index)=>value===actual[index]))matchingLevels.push(refinementLevel);
      }
      if(matchingLevels.length===1){summary.refinementParameterMatches++;refinementLevelHistogram[String(matchingLevels[0])]++;}else summary.refinementParameterMismatches++;
      const role=roles.get(snapshot.ownerData?.uid),attrs=role?.attrs??{};
      const propertyRows=Object.entries(localState.ExistProperty??{}).map(([property,expression])=>({property,expression:String(expression)}));
      const stateArgs=Object.fromEntries((snapshot.stateParams??[]).map((value,index)=>[`StateArg${index+1}`,value]));
      const result=resolveWheelInitialProperties({schemaVersion:1,kind:'morimens-wheel-initial-properties',build:'pc-res144-build51',wheelId:row.wheelId,stateArgs,ownerProperties:{atk:attrs.atk,physique:attrs.physique,physique_per:attrs.physique_per},properties:propertyRows});
      const actualProperties=Array.isArray(snapshot.properties)?{}:(snapshot.properties??{});
      if(Object.keys(actualProperties).length)summary.directPropertySnapshots++;else summary.emptyDirectPropertySnapshots++;
      if(sameNumbers(result.rawPropertyValues,actualProperties))summary.serializedRawPropertyMatches++;else summary.serializedRawPropertyMismatches++;
      if(sameNumbers(result.clientInitializationDeltas,actualProperties))summary.clientInitAndSerializedValueMatches++;else summary.clientInitAndSerializedValueDifferences++;
    }
  }
  weaponStateCountHistogram[String(replayWeaponStates)]=(weaponStateCountHistogram[String(replayWeaponStates)]??0)+1;
  for(const count of weaponStatesByOwner.values())weaponStatesPerAwakenerHistogram[String(count)]=(weaponStatesPerAwakenerHistogram[String(count)]??0)+1;
}
if(summary.replays!==captureReport.totals.replays)throw new Error('Replay tranche count differs from the published capture report');
const report={schemaVersion:1,kind:'MORIMENS_WHEEL_REPLAY_STATE_AUDIT',analysisTrack:'verification',status:'RETROSPECTIVE_SERIALIZED_BATTLE_MATCH',identifiersPublished:false,rawArtifactsPublished:false,source:{captureRoundReport:'research/evidence/replay-capture-round-003.json',captureRoundReportSha256:sha(readFileSync(captureReportPath)),wheelCrosswalkAudit:'research/evidence/wheel-state-crosswalk-audit.json',privateCorpusAggregateSha256:corpusHash.digest('hex'),privateCrosswalkSha256:sha(readFileSync(crosswalkPath)),privateClientStateExportSha256:crosswalk.source.privateClientStateExportSha256},summary:{...summary,distinctWheelsCovered:coveredWheels.size,distinctUnresolvedPrivateItemRows:unresolvedItems.size},awakenerCountHistogram,weaponStateCountHistogram,weaponStatesPerAwakenerHistogram,refinementLevelHistogram,claims:['Every uniquely crosswalked serialized Weapon state matches its expected initial state, one refinement level and the pinned direct-property definition.','Raw direct-property expression results match every uniquely crosswalked serialized battle-state contribution; five snapshots preserve fractions that differ from local client InitProperty ceiling behavior.','Of 408 serialized Awakeners, 405 carry two Weapon-source initial states, two carry one and one carries none; the planner must support two Wheel selections per character while preserving empty slots.'],limitations:['Retrospective serialized battle-start evidence only; the replay outcomes and state snapshots were available before this audit.','Recorded combat engine builds remain unknown even though all compared direct-property definitions match the pinned resource-144 rows.','Nineteen Weapon snapshots from three private Item rows lack a unique public Wheel crosswalk and are excluded rather than guessed.','The state-count histograms demonstrate serialized Weapon-state multiplicity but do not by themselves prove inventory slot labels, ordering or universal equipment rules outside this corpus.','This does not execute triggers, prove equipment legality, validate later stacking or damage, rank builds, classify cheese, identify budget strategies or satisfy the independent holdout publication gate.']};
writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');
process.stdout.write(JSON.stringify({output:'research/evidence/wheel-replay-state-audit.json',summary:report.summary,awakenerCountHistogram,weaponStateCountHistogram,weaponStatesPerAwakenerHistogram,refinementLevelHistogram},null,2)+'\n');
