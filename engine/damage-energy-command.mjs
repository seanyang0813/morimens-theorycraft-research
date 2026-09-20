import {snapshot} from './experiments.mjs';
import {inspectCommandSupport} from './inspect-command-support.mjs';
import {ResearchEffectOrder} from './effect-order.mjs';
import {enqueueCommandRows} from './command-rows.mjs';
import {runActiveCommandExperiment} from './active-command-experiment.mjs';
import {runUltiEnergyExperiment} from './ulti-energy-experiment.mjs';
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export function runDamageEnergyCommand(value){
 const input=snapshot(value);
 if(!exact(input,['schemaVersion','kind','build','otherEvents','command','variables','attackBase','energy'])||input.schemaVersion!==1||input.kind!=='morimens-damage-energy-command'||input.build!=='pc-res144-build51'||input.otherEvents!=='assumed-absent'||!exact(input.energy,['source','target'])||input.energy.source?.castRoleUid!==input.energy.target?.uid)throw new Error('Explicit damage/energy command and caster snapshot required');
 const support=inspectCommandSupport({command:input.command,profile:'damage-and-energy'});
 if(!support.structurallyCompatible)return {status:'UNSUPPORTED_COMMAND',finalDamage:null,support,calculation:null};
 if(!input.variables||Array.isArray(input.variables)||Object.entries(input.variables).some(([k,v])=>['UpperTarget.hp','CmdCaster.ulti_energy'].includes(k)||!Number.isFinite(v)))throw new Error('Numeric variables required; target HP and caster energy are live');
 if(!exact(input.attackBase,['offense','targetModifiers','targetState','repeatModifiers','immune']))throw new Error('Explicit active attack inputs required');
 let target={...input.attackBase.targetState},casterEnergy=input.energy.target.energy,stop=null;
 const actions=[];
 const active=(rows)=>runActiveCommandExperiment({schemaVersion:1,kind:'morimens-active-command-experiment',build:input.build,interveningEffects:'assumed-absent',...input.attackBase,targetState:target,variables:{...input.variables,'CmdCaster.ulti_energy':casterEnergy},rows});
 const energy=(parameters)=>runUltiEnergyExperiment({schemaVersion:1,kind:'morimens-ulti-energy-experiment',build:input.build,otherEvents:'assumed-absent',parameters,source:input.energy.source,targetOrder:[input.energy.target.uid],targets:[{...input.energy.target,energy:casterEnergy}]});
 active([{id:'validate',Type:'BEActiveDamage',Target:'UpperTarget',Para:'0',Cond:'false'}]);energy([0,0]);
 const scheduler=new ResearchEffectOrder();
 const command=enqueueCommandRows({scheduler,rows:support.normalizedRows,readVariable:name=>name==='UpperTarget.hp'?target.hp:name==='CmdCaster.ulti_energy'?casterEnergy:input.variables[name],resolveTargets:selector=>[selector==='CmdCaster'?'caster':'target'],canContinue:()=>stop===null,
 handlers:{
  BEActiveDamage:({rowId})=>{
   const source=support.normalizedRows.find(r=>r.id===rowId),{Cond,...row}=source;
   const result=active([row]);target={...result.targetAfter};if(result.stop)stop=result.stop;
   actions.push({rowId,type:'damage',result});return result;
  },
  BEGainUltiEnergy:({rowId,parameters})=>{
   const result=energy(parameters);casterEnergy=result.targetsAfter[0].energy;
   actions.push({rowId,type:'energy',result});return result;
  }
 }});
 scheduler.run();
 return {status:'EXPERIMENTAL',build:input.build,finalDamage:null,support,completed:command.completed&&stop===null,stop:stop??command.stop,targetAfter:target,casterEnergyAfter:casterEnergy,modeledHpLost:input.attackBase.targetState.hp-target.hp,actions,command,
 unresolvedDependencies:['Authored mixed-command composition, not connected original mixed command or gameplay validation','Explicit caster/build/target snapshots; no automatic targeting, card costs, state changes, triggers, VFX or timing','Only active damage to UpperTarget and energy gain to CmdCaster; death requires separate resolution','Numeric variables with live target HP and caster energy; no external expression functions']};
}
