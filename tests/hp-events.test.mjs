import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {enqueueHpPropertyEvents} from '../engine/hp-events.mjs';
const fixtures=JSON.parse(readFileSync(new URL('./synthetic/original-hp-events.json',import.meta.url))).fixtures;
for(const f of fixtures){
  const events=[],references=[];
  enqueueHpPropertyEvents({...f.input,uid:7,castRoleUid:9},(eventId,data)=>{
    events.push({eventId,atCreation:{...data}});references.push(data);
  });
  events.forEach((event,i)=>event.afterCallback={...references[i]});
  assert.deepEqual(events,f.events);
  assert.equal(references.length===2&&references[0]===references[1],f.sharedPayload);
}
