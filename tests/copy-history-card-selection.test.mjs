import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectCopyHistoryCards} from '../engine/copy-history-card-selection.mjs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/original-history-card-selection.json',import.meta.url)));
const normalize=card=>({uid:card.uid,id:card.tid,level:1,camp:1,specialOwner:null,performSkillId:card.tid,cardTypes:card.types,stateIds:card.states,createCardArgs:[]});
const request=(row,build='pc-res144-build51')=>({schemaVersion:1,kind:'morimens-copy-history-card-selection',build,cardTypes:row.cardTypes,endNum:row.endNum,beginNum:row.beginNum,needNum:row.needNum,skipSameId:row.skipSameID,exceptCardTypes:row.exceptCardTypes===0?[]:row.exceptCardTypes,exceptStateIds:row.exceptStateTids===0?[]:row.exceptStateTids,history:row.history.map(bout=>bout.map(normalize))});

for(const row of fixture.fixtures)test(`copy-history selection matches original runtime: ${row.input.name}`,()=>{
  const input=request(row.input),before=JSON.stringify(input),result=selectCopyHistoryCards(input);
  assert.deepEqual(result.selectedUids,row.expected.selectedUids);assert.equal(result.finalDamage,null);assert.equal(JSON.stringify(input),before);
});

test('current resource build inherits the exact tested history selection domain',()=>{
  const row=fixture.fixtures.find(item=>item.input.name==='skip-newest-human-explosion'),result=selectCopyHistoryCards(request(row.input,'pc-res150-build51'));
  assert.deepEqual(result.selectedUids,[1]);assert.deepEqual(result.trace.map(item=>item.decision),['SKIP_EXCLUDED_STATE','SELECT']);
});

test('history selection preserves duplicate and range behavior while rejecting incomplete cards',()=>{
  const row=fixture.fixtures[0],input=request(row.input);input.needNum=2;input.skipSameId=1;input.history[0][0].id=input.history[1][0].id;
  const result=selectCopyHistoryCards(input);assert.deepEqual(result.selectedUids,[2]);assert.equal(result.unfilledCount,1);assert.equal(result.trace[1].decision,'SKIP_DUPLICATE_ID');
  const clamp=request(row.input);clamp.endNum=9;clamp.beginNum=1;assert.equal(selectCopyHistoryCards(clamp).parameterAdjustments[0].after,1);
  const invalid=request(row.input);delete invalid.history[0][0].stateIds;assert.throws(()=>selectCopyHistoryCards(invalid),/Explicit reconstructed history card/);
});
