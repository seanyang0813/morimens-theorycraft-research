import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runTheorycraftRequest,theorycraftOperations,theorycraftClaimBoundary} from '../engine/theorycraft-api.mjs';
import {neutralShowInputs} from '../engine/show-damage.mjs';
import {targetKeys} from '../engine/active-target.mjs';
import {syntheticCardActionExample} from '../engine/card-action-example.mjs';
import {createHash} from 'node:crypto';

const request=(operation,input)=>({schemaVersion:1,kind:'morimens-theorycraft-request',requestId:'test-1',operation,input});

test('agent API advertises explicit bounded operations',()=>{
  const response=runTheorycraftRequest(request('describe-capabilities',null));
  assert.equal(response.status,'OK');
  assert.equal(response.analysisTrack,'theorycrafting');
  assert.deepEqual(response.claimBoundary,theorycraftClaimBoundary);
  assert.ok(response.claimBoundary.mustNotClaim.includes('observed cheese'));
  assert.deepEqual(response.result.operations,theorycraftOperations);
  assert.ok(response.result.operations.some(row=>row.name==='run-command-damage-prefix'));
  assert.ok(response.result.operations.some(row=>row.name==='calculate-snapshot-active-damage'));
  assert.ok(response.result.operations.some(row=>row.name==='run-snapshot-active-sequence'));
  assert.ok(response.result.operations.some(row=>row.name==='run-prepared-snapshot-active-skill'));
  assert.ok(response.result.operations.some(row=>row.name==='run-prepared-snapshot-block-skill'));
  assert.ok(response.result.operations.some(row=>row.name==='run-ulti-energy-effect'));
  assert.ok(response.result.operations.some(row=>row.name==='run-attached-card-pipeline'));
  assert.ok(response.result.operations.some(row=>row.name==='run-conditional-role-state-suffix'));
  assert.equal(response.result.publicationStatus,'NOT_READY');
});

test('agent API threads repeated complete-property hits through HP and Block',()=>{
  const hit=id=>({id,baseValue:100,skillArgsPlus:0,tags:['Card_Strike'],cardProperties:{},cardContext:{present:false,instructionCard:false,stateTriggerAdd:false},targetContext:{critRoll:null,targetBattleTag:'Boss',targetStateIds:[]},hitContext:{damageSubtype:'Ordinary'}});
  const input={schemaVersion:1,kind:'morimens-snapshot-active-sequence',build:'pc-res150-build51',snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',interveningEffects:'assumed-absent',casterProperties:{crit:0,crit_damage:0,crit_damage_from_strikecard:0,crit_damage_per:0},playerProperties:{dimension_fix_per:0},initialTargetProperties:{hp:250,max_hp:250,block:50,be_damage_per:0,vulnerable_per:0},hits:[hit('one'),hit('two')]};
  const response=runTheorycraftRequest(request('run-snapshot-active-sequence',input));
  assert.equal(response.analysisTrack,'theorycrafting');assert.equal(response.result.modeledHpLost,150);assert.equal(response.result.targetAfter.hp,100);assert.equal(response.result.finalDamage,null);
});

test('agent API runs a complete current-build property snapshot through modeled HP loss',()=>{
  const input={schemaVersion:2,kind:'morimens-battle-property-snapshot-damage',build:'pc-res150-build51',snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',baseValue:100,skillArgsPlus:0,tags:['Card_Strike'],casterProperties:{crit:100,crit_damage:50,crit_damage_from_strikecard:10,crit_damage_per:0,damage_per2monster_boss:20},playerProperties:{dimension_fix_per:0},targetProperties:{hp:1000,max_hp:1000,block:50,be_damage_per:10,vulnerable_per:50},cardProperties:{},cardContext:{present:false,instructionCard:false,stateTriggerAdd:false},targetContext:{critRoll:null,targetBattleTag:'Boss',targetStateIds:[]},hitContext:{damageSubtype:'Ordinary'}};
  const response=runTheorycraftRequest(request('calculate-snapshot-active-damage',input));
  assert.equal(response.analysisTrack,'theorycrafting');
  assert.equal(response.result.build,'pc-res150-build51');
  assert.equal(response.result.preHitDamage,317);
  assert.equal(response.result.modeledHpLost,267);
  assert.equal(response.result.finalDamage,null);
  input.snapshotCompleteness='partial';
  assert.throws(()=>runTheorycraftRequest(request('calculate-snapshot-active-damage',input)),/complete supported/);
});

test('agent API exposes current-build ultimate-energy calculation and capped storage',()=>{
  const input={schemaVersion:1,kind:'morimens-ulti-energy-experiment',build:'pc-res150-build51',otherEvents:'assumed-absent',parameters:[10,1,1],source:{castRoleUid:7,cmdServerUid:2,skillConfigId:3},targetOrder:[7],targets:[{uid:7,role:'Awaker',energy:95,maximumProperties:{ulti_energy_max:100,ulti_energy_cost_per:0,ulti_energy_cost_flat:0,ulti_energy_max_per:0},calculation:{dimension:0,properties:{ulti_energy_per:0,i_ulti_energy_per:0,ulti_energy_efficiency:0,ulti_energy_plus:0,gain_ulti_energy_per:0,gain_ulti_energy_plus:0},card:null,casterEligible:true,skillTags:[]}}]};
  const response=runTheorycraftRequest(request('run-ulti-energy-effect',input));
  assert.equal(response.analysisTrack,'theorycrafting');assert.equal(response.result.build,'pc-res150-build51');assert.equal(response.result.targetsAfter[0].energy,100);assert.equal(response.result.finalDamage,null);
});

test('agent API dispatches the general damage calculator without promoting verification',()=>{
  const target={...Object.fromEntries(targetKeys.map(key=>[key,0])),isCrit:false,enemyStateDmgMultiplier:1};
  const response=runTheorycraftRequest(request('calculate-damage',{mode:'experimental',build:'pc-res144-build51',damageType:'ACTIVE',offense:neutralShowInputs(100),target}));
  assert.equal(response.result.status,'EXPERIMENTAL');
  assert.equal(response.result.finalDamage,null);
  assert.equal(response.result.experimentalModels[0].preHitDamage,100);
});

test('catalog-backed operations require explicit host context',()=>{
  assert.throws(()=>runTheorycraftRequest(request('validate-build-plan',{})),/requires context buildCatalog/);
  const catalog=JSON.parse(readFileSync(new URL('../website/dist/build-catalog.json',import.meta.url),'utf8'));
  const character=catalog.characters[0];
  const response=runTheorycraftRequest(request('validate-build-plan',{schemaVersion:1,kind:'morimens-build-plan',catalogRevision:catalog.source.revision,team:[{slotId:'a',characterId:character.id,level:1,wheelId:null}]}),{buildCatalog:catalog});
  assert.equal(response.result.status,'PLAN_ONLY');
});

test('agent API assembles known build components with both catalogs',()=>{
  const catalog=JSON.parse(readFileSync(new URL('../website/dist/build-catalog.json',import.meta.url),'utf8'));
  const clientBuildData=JSON.parse(readFileSync(new URL('../website/dist/client-build-data.json',import.meta.url),'utf8'));
  const character=catalog.characters.find(row=>clientBuildData.characters.some(client=>client.characterId===row.id));
  const wheel=catalog.wheels[0];
  const talent=clientBuildData.characters.find(row=>row.characterId===character.id).advancementTalents[0];
  const input={schemaVersion:1,kind:'morimens-build-plan',catalogRevision:catalog.source.revision,clientBuild:'pc-res144-build51',team:[{slotId:'one',characterId:character.id,level:90,gnosticRank:5,advancementTalentId:talent.clientTalentId,advancementLevel:10,wheelId:wheel.id,wheelEnhanceLevel:15}]};
  assert.throws(()=>runTheorycraftRequest(request('assemble-build-components',input),{buildCatalog:catalog}),/requires context clientBuildData/);
  const response=runTheorycraftRequest(request('assemble-build-components',input),{buildCatalog:catalog,clientBuildData});
  assert.equal(response.result.assemblyStatus,'KNOWN_COMPONENTS_RESOLVED');
  assert.equal(response.result.finalDamage,null);

  const currentClientBuildData=JSON.parse(readFileSync(new URL('../website/dist/client-build-data-res150.json',import.meta.url),'utf8'));
  const currentCharacter=catalog.characters.find(row=>currentClientBuildData.characters.some(client=>client.characterId===row.id));
  const currentTalent=currentClientBuildData.characters.find(row=>row.characterId===currentCharacter.id).advancementTalents[0];
  const currentInput={schemaVersion:1,kind:'morimens-build-plan',catalogRevision:catalog.source.revision,clientBuild:'pc-res150-build51',team:[{slotId:'current',characterId:currentCharacter.id,level:90,gnosticRank:5,advancementTalentId:currentTalent.clientTalentId,advancementLevel:currentTalent.maximumLevel,wheelId:wheel.id,wheelEnhanceLevel:15}]};
  const currentResponse=runTheorycraftRequest(request('assemble-build-components',currentInput),{buildCatalog:catalog,clientBuildData:currentClientBuildData});
  assert.equal(currentResponse.result.build,'pc-res150-build51');
  assert.equal(currentResponse.result.assemblyStatus,'KNOWN_COMPONENTS_RESOLVED');
  assert.equal(currentResponse.result.members[0].primaryStats.ATK>0,true);
});

test('agent API rejects extra fields and unsupported operations',()=>{
  assert.throws(()=>runTheorycraftRequest({...request('describe-capabilities',null),extra:true}),/exact version 1/);
  assert.throws(()=>runTheorycraftRequest(request('invent-result',{})),/Unsupported/);
});

test('agent API exposes bounded card-order search without a global optimum claim',()=>{
  const input={schemaVersion:1,kind:'morimens-card-order-search',objective:'MAX_MODELED_HP_LOST',timeline:syntheticCardActionExample(),maxEvaluations:10,returnTop:2};
  const response=runTheorycraftRequest(request('search-card-orders',input));
  assert.deepEqual(response.result.best.order,['synthetic-fixed-cost','synthetic-X-cost']);
  assert.equal(response.result.evaluatedPermutations,2);
  assert.match(response.result.unresolvedDependencies.at(-2),/supplied resolved actions/);
});

test('agent API enumerates explicit legal card actions without executing them',()=>{
  const conditions={cardExists:true,inHand:true,judgeCost:true,commandExists:true,dead:false,strike:false,allowIgnoreCost:false,cardUseless:0,ownerUseless:0,coma:0,comaImmunity:0,ownerForbid:0,playerForbid:0,ownerForbidStrike:0,playerForbidStrike:0};
  const input={schemaVersion:1,kind:'morimens-legal-card-actions',build:'pc-res150-build51',energy:2,dispatch:{waiting:false,rootExists:false,finished:false,waitingTimes:0},cards:[{id:'card-a',cardInstanceId:'instance-a',costInput:{cfgCost:'2',originCost:2,delta:0,harmonize:0,fixedSwitches:{},keeper:false,keeperCost:null,pvp:false},conditions}]};
  const response=runTheorycraftRequest(request('enumerate-legal-card-actions',input));
  assert.equal(response.analysisTrack,'theorycrafting');assert.deepEqual(response.result.legalActionIds,['card-a']);assert.equal(response.result.actions[0].energyAfterIfPlayed,0);assert.equal(response.result.finalDamage,null);
});

test('agent API exposes monster intent insertion as theorycraft state mutation',()=>{
  const input={state:{intention:902,intentionRun:false,tempSkillList:[],hasIntentionCommand:true},skillId:60397,changeType:1};
  const response=runTheorycraftRequest(request('apply-monster-skill-change',input));
  assert.equal(response.analysisTrack,'theorycrafting');
  assert.equal(response.result.state.intention,60397);
  assert.deepEqual(response.result.state.tempSkillList,[{intention:902,changeType:1}]);
  assert.ok(!response.result.effects.some(effect=>effect.type==='executeIntention'));
});

test('agent API exposes setup-only role state commands without a damage target',()=>{
  const input={schemaVersion:1,kind:'morimens-role-state-command',build:'pc-res144-build51',otherEvents:'assumed-absent',command:{data_list:{1:{Type:'BEAddState',Target:'CmdCaster',Para:'90001,2'}}},variables:{},targetBindings:{CmdCaster:5},roles:[{id:5,roleType:'Monster',properties:{i_crit_per:0,i_crit_damage_per:0},tentacleContext:{pve:true,ownerMonster:true,maxTentacleCount:0}}],definitions:[{id:90001,maximum:'10',properties:[],skillLevel:1,casterRoleId:5,specialValue:0,banned:false}]};
  const response=runTheorycraftRequest(request('run-role-state-command',input));
  assert.equal(response.analysisTrack,'theorycrafting');assert.equal(response.result.finalDamage,null);assert.deepEqual(response.result.states.map(row=>[row.roleId,row.stateId,row.layer]),[[5,90001,2]]);
});

test('agent API exposes real exported skill preparation through explicit versioned context',()=>{
  const read=name=>{const bytes=readFileSync(new URL(`../research/extracted/config/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
  const skill=read('Skill'),battleApi=read('BattleApi'),command=read('Cmd'),state=read('State');
  const skillCommandData={build:'pc-res144-build51',skills:skill.data,battleApi:battleApi.data,commands:command.data,states:state.data,sourceHashes:{Skill:skill.sha256,BattleApi:battleApi.sha256,Cmd:command.sha256,State:state.sha256}};
  const input={schemaVersion:1,kind:'morimens-prepared-skill-request',preparation:{skillId:4100,skillLevel:1,isAwaker:false,breakSkillLevel:0,potencyLevel:0,overrides:[],variables:{BattleAtkForce:100},conditionResults:{},stateQueries:{}},execution:null};
  assert.throws(()=>runTheorycraftRequest(request('prepare-skill-command',input)),/requires context skillCommandData/);
  const response=runTheorycraftRequest(request('prepare-skill-command',input),{skillCommandData});
  assert.equal(response.result.prepared.commandId,743);
  assert.equal(response.result.status,'PREPARED');
  assert.equal(response.result.finalDamage,null);
});

test('agent API executes the catalog conditional Puncture branch with LastConditionRet tracing',()=>{
  const read=name=>{const bytes=readFileSync(new URL(`../research/extracted/config/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
  const skill=read('Skill'),battleApi=read('BattleApi'),command=read('Cmd'),state=read('State');
  const skillCommandData={build:'pc-res144-build51',skills:skill.data,battleApi:battleApi.data,commands:command.data,states:state.data,sourceHashes:{Skill:skill.sha256,BattleApi:battleApi.sha256,Cmd:command.sha256,State:state.sha256}};
  const example=JSON.parse(readFileSync(new URL('../research/examples/theorycraft-prepared-conditional-active-energy-skill.json',import.meta.url)));
  const response=runTheorycraftRequest(example,{skillCommandData});
  assert.equal(response.analysisTrack,'theorycrafting');assert.equal(response.result.skillId,4203);assert.equal(response.result.command.id,1363);
  assert.deepEqual(response.result.rowExecutions.map(row=>[row.executed,row.condition.passed]),[[true,true],[false,false]]);
  assert.deepEqual(response.result.derivedSequenceInput.hits.map(hit=>hit.hitContext.damageSubtype),['Puncture','Puncture','Puncture','Puncture']);
  assert.deepEqual(response.result.calculation.targetAfter,{hp:932,block:0});assert.equal(response.result.energy.targetsAfter[0].energy,100);assert.equal(response.result.finalDamage,null);
});

test('agent API executes catalog-prepared Defend Block and energy from one snapshot',()=>{
  const read=name=>{const bytes=readFileSync(new URL(`../research/extracted/config/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
  const skill=read('Skill'),battleApi=read('BattleApi'),command=read('Cmd'),state=read('State');
  const skillCommandData={build:'pc-res144-build51',skills:skill.data,battleApi:battleApi.data,commands:command.data,states:state.data,sourceHashes:{Skill:skill.sha256,BattleApi:battleApi.sha256,Cmd:command.sha256,State:state.sha256}};
  const example=JSON.parse(readFileSync(new URL('../research/examples/theorycraft-prepared-snapshot-block-skill.json',import.meta.url)));
  const response=runTheorycraftRequest(example,{skillCommandData});
  assert.equal(response.analysisTrack,'theorycrafting');assert.equal(response.result.command.id,834);assert.equal(response.result.block.blockAfter,10);assert.equal(response.result.energy.targetsAfter[0].energy,100);assert.equal(response.result.finalDamage,null);
});

test('agent API executes a catalog-prepared state-only card without caller state definitions',()=>{
  const read=name=>{const bytes=readFileSync(new URL(`../research/extracted/config/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
  const skill=read('Skill'),battleApi=read('BattleApi'),command=read('Cmd'),state=read('State'),skillCommandData={build:'pc-res144-build51',skills:skill.data,battleApi:battleApi.data,commands:command.data,states:state.data,sourceHashes:{Skill:skill.sha256,BattleApi:battleApi.sha256,Cmd:command.sha256,State:state.sha256}};
  const requestValue=JSON.parse(readFileSync(new URL('../research/examples/theorycraft-prepared-state-card.json',import.meta.url)));
  const response=runTheorycraftRequest(requestValue,{skillCommandData}),target=response.result.execution.calculation.roles.find(role=>role.id===8);
  assert.equal(response.analysisTrack,'theorycrafting');assert.equal(response.result.prepared.commandId,134192);assert.equal(target.properties.crit_damage,105);assert.equal(response.result.finalDamage,null);
});

test('agent API carries a catalog state card into a later prepared Active card',()=>{
  const read=name=>{const bytes=readFileSync(new URL(`../research/extracted/config/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
  const skill=read('Skill'),battleApi=read('BattleApi'),command=read('Cmd'),state=read('State'),skillCommandData={build:'pc-res144-build51',skills:skill.data,battleApi:battleApi.data,commands:command.data,states:state.data,sourceHashes:{Skill:skill.sha256,BattleApi:battleApi.sha256,Cmd:command.sha256,State:state.sha256}};
  const requestValue=JSON.parse(readFileSync(new URL('../research/examples/theorycraft-prepared-state-active-sequence.json',import.meta.url)));
  const response=runTheorycraftRequest(requestValue,{skillCommandData});
  assert.equal(response.analysisTrack,'theorycrafting');assert.equal(response.result.carry.activeCasterProperties.crit_damage,105);assert.equal(response.result.modeledHpLost,3);assert.equal(response.result.finalDamage,null);
});

test('agent API executes an ordered catalog state-to-Active chain',()=>{
  const read=name=>{const bytes=readFileSync(new URL(`../research/extracted/config/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
  const skill=read('Skill'),battleApi=read('BattleApi'),command=read('Cmd'),state=read('State'),skillCommandData={build:'pc-res144-build51',skills:skill.data,battleApi:battleApi.data,commands:command.data,states:state.data,sourceHashes:{Skill:skill.sha256,BattleApi:battleApi.sha256,Cmd:command.sha256,State:state.sha256}};
  const requestValue=JSON.parse(readFileSync(new URL('../research/examples/theorycraft-prepared-state-active-chain.json',import.meta.url)));
  const response=runTheorycraftRequest(requestValue,{skillCommandData});
  assert.equal(response.analysisTrack,'theorycrafting');assert.equal(response.result.executedActions,5);assert.equal(response.result.modeledHpLost,15);assert.deepEqual(response.result.targetAfter,{hp:985,block:0});assert.equal(response.result.finalDamage,null);
});
