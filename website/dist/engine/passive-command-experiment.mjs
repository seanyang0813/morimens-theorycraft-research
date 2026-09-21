import {snapshot} from './experiments.mjs';
import {calculateDamage,build} from './calculate-damage.mjs';
import {ResearchEffectOrder} from './effect-order.mjs';
import {enqueueCommandRows} from './command-rows.mjs';
import {enqueueActiveDamage} from './active-damage-command.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));

// Restricted command adapter for the original BEPassiveDamage repeat shape.
// The original Passive and Active DoEffect bodies share the same repeat
// initialization; the category-specific pre-hit formula remains separate.
export function runPassiveCommandExperiment(value,expressionBindings={}){
  if(!expressionBindings||Array.isArray(expressionBindings)||Object.keys(expressionBindings).some(key=>!['allowedFunctions','callFunction'].includes(key)))throw new Error('Explicit expression function bindings required');
  const allowedFunctions=expressionBindings.allowedFunctions??[];
  if(!Array.isArray(allowedFunctions)||allowedFunctions.some(name=>typeof name!=='string'||!name)||new Set(allowedFunctions).size!==allowedFunctions.length||(allowedFunctions.length&&typeof expressionBindings.callFunction!=='function'))throw new Error('Unique allowed functions and explicit resolver required');
  const input=snapshot(value),keys=['schemaVersion','kind','build','interveningEffects','rows','variables','passive','targetState','repeatModifiers','immune'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-passive-command-experiment'||input.build!==build||input.interveningEffects!=='assumed-absent')throw new Error('Explicit supported Passive command experiment required');
  if(typeof input.immune!=='boolean'||!exact(input.targetState,['hp','block'])||!Number.isFinite(input.targetState.hp)||input.targetState.hp<=0||!Number.isFinite(input.targetState.block)||input.targetState.block<0)throw new Error('Explicit immunity and living HP/shield required');
  if(!exact(input.passive,['passive1','passive2','passive3','dimensionFixPer'])||Object.values(input.passive).some(value=>!Number.isFinite(value)))throw new Error('Explicit resolved Passive target properties required');
  if(!input.variables||Array.isArray(input.variables)||Object.entries(input.variables).some(([name,v])=>name==='UpperTarget.hp'||!Number.isFinite(v)))throw new Error('Explicit numeric variables required; UpperTarget.hp is live');
  if(!exact(input.repeatModifiers,['plus','per'])||Object.values(input.repeatModifiers).some(value=>!Number.isFinite(value)))throw new Error('Explicit plus/per repetition modifiers required');
  if(!Array.isArray(input.rows)||input.rows.some(row=>row?.Type!=='BEPassiveDamage'||row.Target!=='UpperTarget'))throw new Error('Only Passive rows against UpperTarget are supported');
  let target={...input.targetState},stop=null;const hits=[],dependencies=new Set();
  const scenario=base=>({build,mode:'experimental',damageType:'PASSIVE',passive:{build,targetDead:false,baseDamage:base,...input.passive},
    hitResolution:{...target,immune:input.immune,puncture:false,preventEligible:false,retainHp:0,limit:0,usedLimit:0,deathResist:0}});
  calculateDamage(scenario(1));
  const scheduler=new ResearchEffectOrder();
  const checkedParams=values=>{if(values.length>3||(values.length===3&&values[2]!==0))throw new Error('ParaPlus and nonzero Passive damage subtype are unsupported');return values;};
  const command=enqueueCommandRows({scheduler,rows:input.rows,allowedFunctions,callFunction:expressionBindings.callFunction,
    readVariable:name=>name==='UpperTarget.hp'?target.hp:Object.hasOwn(input.variables,name)?input.variables[name]:undefined,
    resolveTargets:()=>['target'],canContinue:()=>target.hp>0,handlers:{BEPassiveDamage:({rowId,parameters,readParameters})=>{
      let calculation=null;
      return enqueueActiveDamage({scheduler,initialParameters:checkedParams(parameters),...input.repeatModifiers,isTargetDead:()=>target.hp<=0,readParameters:()=>checkedParams(readParameters()),readCrit:()=>false,
        resolveDamage:base=>{calculation=calculateDamage(scenario(base));calculation.unresolvedDependencies.forEach(item=>dependencies.add(item));const model=calculation.experimentalModels.find(item=>Object.hasOwn(item,'preHitDamage'));if(!model)throw new Error('Missing Passive damage model');return model.preHitDamage;},
        applyHit:attack=>{const hp=calculation.experimentalModels.find(item=>item.name==='Ordinary HP subtraction');if(!hp||hp.incomingDamage!==attack.damageVal)throw new Error('Damage/HP binding mismatch');const before={...target};target={hp:hp.hpAfter,block:hp.shieldAfter};const hit={id:`${rowId}/hit-${hits.filter(item=>item.rowId===rowId).length+1}`,rowId,before,after:{...target},modeledHpLost:hp.modeledHpLost,calculation};hits.push(hit);if(target.hp<=0)stop={afterHitId:hit.id,reason:'Death handling or retargeting required'};return {hitId:hit.id};}});
    }}});
  scheduler.run();
  return {schemaVersion:1,status:'EXPERIMENTAL',build,finalDamage:null,scope:'Numeric Passive command rows, supplied resolved modifiers, one target, no intervening effects',completed:command.completed&&stop===null,stop:stop??command.stop,initialTarget:{...input.targetState},targetAfter:target,modeledHpLost:input.targetState.hp-target.hp,hits,command,
    unresolvedDependencies:[...dependencies,...command.unresolvedDependencies,'No automatic target resolution, state/build property reconstruction, ParaPlus, nonzero subtype, events, statistics, caps or death handling','Supplied numeric variables except live UpperTarget.hp; no connected original full-command validation or independent gameplay validation']};
}
