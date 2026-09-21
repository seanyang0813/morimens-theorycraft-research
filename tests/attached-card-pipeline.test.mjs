import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runAttachedCardPipeline} from '../engine/attached-card-pipeline.mjs';

const read=name=>{const bytes=readFileSync(new URL(`../research/extracted/config/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
const skill=read('Skill'),battleApi=read('BattleApi'),command=read('Cmd');
const source={build:'pc-res144-build51',skills:skill.data,battleApi:battleApi.data,commands:command.data,sourceHashes:{Skill:skill.sha256,BattleApi:battleApi.sha256,Cmd:command.sha256}};
const attach={schemaVersion:1,kind:'morimens-attach-post-action',build:'pc-res144-build51',parameters:[123159,1,0,1],casterUid:77,targetUid:99,casterSealAttachPost:0,targetPresent:true,targetIsMonster:false};
const progression={isAwaker:true,breakSkillLevel:0,potencyLevel:0,variables:{BattleAtkForce:1000},conditionResults:{},stateQueries:{'CmdCaster.GetStateLayer':{'122512':2,'124039':1}}};

test('attached-card pipeline reaches Mouchette command rows with explicit live inputs',()=>{
  const input={schemaVersion:1,kind:'morimens-attached-card-pipeline',build:'pc-res144-build51',attach,cardContext:{cardUid:900,camp:3,targetType:456,hasPre:false,preCmdId:null,progression}};
  const before=JSON.stringify(input),result=runAttachedCardPipeline(input,source);
  assert.equal(result.attachment.cardRequests[0].skillId,123159);
  assert.deepEqual(result.temporaryCard.events.map(row=>row.stage),['CreateCardByInfo','OnAddNewCard','SetCurUseCard','CreateEffect','CreateEffect','CreateEffect','CreateEffect']);
  assert.equal(result.commandResolution.commandId,123163);assert.deepEqual(result.commandResolution.baseArguments,[300,6]);
  assert.deepEqual(result.commandResolution.command.effectTypes,['BEActiveDamage','BEAddState','BERemoveState']);
  assert.equal(JSON.stringify(input),before);
});

test('attached-card pipeline stops at a sealed request and rejects ignored card context',()=>{
  const gated={...attach,casterSealAttachPost:1};
  const result=runAttachedCardPipeline({schemaVersion:1,kind:'morimens-attached-card-pipeline',build:'pc-res144-build51',attach:gated,cardContext:null},null);
  assert.equal(result.temporaryCard,null);assert.equal(result.commandResolution,null);
  assert.throws(()=>runAttachedCardPipeline({schemaVersion:1,kind:'morimens-attached-card-pipeline',build:'pc-res144-build51',attach:gated,cardContext:{cardUid:900,camp:3,targetType:456,hasPre:false,preCmdId:null,progression}},source),/null card context/);
});
