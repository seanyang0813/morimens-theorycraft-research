import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {finishSkillPhase} from '../engine/skill-phase-finish.mjs';
const data=JSON.parse(readFileSync(new URL('./synthetic/original-skill-phase-finish.json',import.meta.url)));
test('phase cleanup and repeated AfterEffect passes match original methods',()=>{
  for(const {input:v,expected} of data.fixtures){
    const command={isDeleted:v.deleted,upperTargets:{target:7},cmdParser:{upperTargets:{target:9}},stats:{damage:200}},trace=[],snapshots=[];
    for(const childrenEmpty of v.emptySequence){
      const returned=finishSkillPhase({command,childrenEmpty,
        emitFinish:cmd=>{assert.equal(cmd,command);assert.equal(cmd.isDeleted,true);assert.deepEqual(cmd.stats,{});trace.push('SkillCmdFinish');},
        runChildren:()=>{trace.push('RunSubEffect');return true;},endEffect:()=>{trace.push('EffectEnd');return false;}});
      snapshots.push({returned,deleted:command.isDeleted,targetsCleared:!Object.hasOwn(command.upperTargets,'target'),statsCleared:!Object.hasOwn(command.stats,'damage'),parserTarget:command.cmdParser.upperTargets.target});
    }
    assert.deepEqual({trace,snapshots},expected);
  }
});
