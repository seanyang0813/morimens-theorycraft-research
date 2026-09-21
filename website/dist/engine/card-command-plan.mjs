import {snapshot} from './experiments.mjs';
import {initializeCardCommands} from './card-command-init.mjs';
import {normalizeSkillArguments} from './skill-arguments.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));

export function prepareCardCommandPlan(value){
  const input=snapshot(value);
  if(!exact(input,['schemaVersion','kind','build','card','preCmdId','cmdId','rawSkillArguments'])||input.schemaVersion!==1||input.kind!=='morimens-card-command-plan'||!Array.isArray(input.rawSkillArguments))throw new Error('Explicit card command plan required');
  const initialization=initializeCardCommands({schemaVersion:1,kind:'morimens-card-command-init',build:input.build,card:input.card,preCmdId:input.preCmdId,cmdId:input.cmdId});
  const mainArguments=normalizeSkillArguments(input.rawSkillArguments,input.card.createCardArgs),argumentBindings=Object.fromEntries(mainArguments.map((argument,index)=>[`Arg${index+1}`,argument]));
  return {schemaVersion:1,status:'EXPERIMENTAL',build:input.build,initialization,mainArguments,argumentBindings,mainCommand:{...initialization.mainCommand,arguments:mainArguments,argumentBindings},preCommand:initialization.preCommand,
    unresolvedDependencies:['Raw base skill arguments must come from a supported skill/progression calculation','BattleCmdServer constructor, target parser and effect execution','Pre-command argument evaluation is deferred until that command runs','Gameplay and independent holdout validation']};
}
