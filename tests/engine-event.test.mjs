import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createEventEffectRequest} from '../engine/hp-events.mjs';

const suite=JSON.parse(readFileSync(new URL('./synthetic/original-engine-event.json',import.meta.url)));
test('event-effect request matches original default and preserved auto-operation behavior',()=>{
  for(const fixture of suite.fixtures){
    const supplied=fixture.input.dataMode==='absent'?undefined:fixture.input.dataMode==='noFlag'?{}:{isAutoOp:fixture.input.dataMode==='true'};
    const result=createEventEffectRequest({eventId:203,eventData:supplied,autoBattle:fixture.input.autoBattle});
    assert.deepEqual({effectType:result.effectType,eventId:result.eventId,isAutoOp:result.eventData.isAutoOp,samePayload:supplied===undefined?null:result.eventData===supplied},fixture.expected);
  }
});
