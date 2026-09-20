import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {neutralShowInputs} from '../engine/show-damage.mjs';
import {targetKeys} from '../engine/active-target.mjs';
const stateBytes=readFileSync(new URL('../research/extracted/config/State.json',import.meta.url));
const config=JSON.parse(stateBytes.toString('utf8'))['80331'];
const {value,basicDamagePer,...offense}=neutralShowInputs(0);
const targetModifiers={...Object.fromEntries(targetKeys.map(k=>[k,0])),isCrit:false,enemyStateDmgMultiplier:1};
for(const key of ['awakerCritDamage','beDamagePer','beDamagePer2','beDamagePer3','vulnerablePer'])delete targetModifiers[key];
const attack=()=>({type:'attack',rows:[{id:'hit',Type:'BEActiveDamage',Target:'UpperTarget',Para:'100'}]});
const add=()=>({type:'addState',definitionId:80331,resolvedLayers:10});
const example={schemaVersion:1,kind:'morimens-state-sequence',build:'pc-res144-build51',otherEvents:'assumed-absent',crossesTurnBoundary:false,
  actorProperties:{basic_damage_per:0,crit_damage:0,i_crit_damage_per:0},targetProperties:{be_damage_per:0,be_damage_per2:0,be_damage_per3:0,vulnerable_per:0},stateQueries:{'CmdCaster.GetStateLayer':{'133235':0}},
  definitions:[{id:80331,owner:'target',maximum:config.MaxLayer,properties:Object.entries(config.ExistProperty).map(([property,expression])=>({property,expression})),skillLevel:6,caster:1,specialValue:0,banned:false}],
  steps:[attack(),add(),attack(),add(),attack(),add(),attack()],attackBase:{variables:{},offense,targetModifiers,repeatModifiers:{plus:0,per:0},immune:false,targetState:{hp:10000,block:0}}};
writeFileSync(new URL('../research/examples/state-sequence.json',import.meta.url),JSON.stringify(example,null,2)+'\n');
writeFileSync(new URL('../engine/state-sequence-example.mjs',import.meta.url),'// Synthetic example; copied state expressions are sourced in research/examples/state-sequence-provenance.json.\nexport function syntheticStateSequenceExample(){return '+JSON.stringify(example,null,2)+';}\n');
writeFileSync(new URL('../research/examples/state-sequence-provenance.json',import.meta.url),JSON.stringify({kind:'SYNTHETIC_COMPONENT_COMPOSITION',stateId:80331,
  source:'research/extracted/config/State.json',sha256:createHash('sha256').update(stateBytes).digest('hex'),copiedFields:['MaxLayer','ExistProperty'],
  assumptions:['Synthetic attack base 100, target HP 10000, neutral other modifiers and explicit absent caster state 133235','Resolved additions of 10 layers; no layer modifier or immunity calculation','No turn boundary or event listeners; original end-of-turn expiry not executed','No player build or gameplay claim']},null,2)+'\n');
console.log('Wrote synthetic state sequence and source provenance');
