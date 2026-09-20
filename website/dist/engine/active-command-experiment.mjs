import {snapshot} from './experiments.mjs';
import {calculateDamage,build} from './calculate-damage.mjs';
import {ResearchEffectOrder} from './effect-order.mjs';
import {enqueueCommandRows} from './command-rows.mjs';
import {enqueueActiveDamage} from './active-damage-command.mjs';

// JSON entry point for numeric active command rows against one supplied target.
export function runActiveCommandExperiment(value,expressionBindings={}){
  if(!expressionBindings||Array.isArray(expressionBindings)||Object.keys(expressionBindings).some(k=>!['allowedFunctions','callFunction'].includes(k)))throw new Error('Explicit expression function bindings required');
  const allowedFunctions=expressionBindings.allowedFunctions??[];
  if(!Array.isArray(allowedFunctions)||allowedFunctions.some(name=>typeof name!=='string'||!name)||new Set(allowedFunctions).size!==allowedFunctions.length||(allowedFunctions.length&&typeof expressionBindings.callFunction!=='function'))throw new Error('Unique allowed functions and explicit resolver required');
  const input=snapshot(value);
  const keys=['schemaVersion','kind','build','interveningEffects','rows','variables','offense','targetModifiers','targetState','repeatModifiers','immune'];
  if(!input||input.schemaVersion!==1||input.kind!=='morimens-active-command-experiment'||input.build!==build||input.interveningEffects!=='assumed-absent'||keys.some(key=>!Object.hasOwn(input,key))||Object.keys(input).some(key=>!keys.includes(key)))throw new Error('Explicit supported active command experiment required');
  if(typeof input.immune!=='boolean'||!input.targetState||Object.keys(input.targetState).some(key=>!['hp','block'].includes(key))||!Number.isFinite(input.targetState.hp)||input.targetState.hp<=0||!Number.isFinite(input.targetState.block)||input.targetState.block<0)throw new Error('Explicit immunity and living HP/shield required');
  if(!input.offense||Object.hasOwn(input.offense,'value')||input.offense.skillArgsPlus!==0)throw new Error('Resolved offense without value and zero skillArgsPlus required; command ParaPlus is unsupported');
  if(!input.variables||Array.isArray(input.variables)||Object.entries(input.variables).some(([name,v])=>name==='UpperTarget.hp'||!Number.isFinite(v)))throw new Error('Explicit numeric variables required; UpperTarget.hp is live');
  if(!input.repeatModifiers||Object.keys(input.repeatModifiers).length!==2||!Number.isFinite(input.repeatModifiers.plus)||!Number.isFinite(input.repeatModifiers.per))throw new Error('Explicit plus/per repetition modifiers required');
  if(!Array.isArray(input.rows)||input.rows.some(row=>row?.Type!=='BEActiveDamage'||row.Target!=='UpperTarget'))throw new Error('Only ordinary active rows against UpperTarget are supported');
  let target={...input.targetState},stop=null;const hits=[],dependencies=new Set();
  const scenario=base=>({build,mode:'experimental',damageType:'ACTIVE',offense:{...input.offense,value:base},target:input.targetModifiers,
    hitResolution:{...target,immune:input.immune,puncture:false,preventEligible:false,retainHp:0,limit:0,usedLimit:0,deathResist:0}});
  calculateDamage(scenario(1)); // Validate resolved formula inputs before scheduling.
  const scheduler=new ResearchEffectOrder();
  const checkedParams=values=>{
    if(values.length>3||(values.length===3&&values[2]!==0))throw new Error('ParaPlus and nonzero damage subtype are unsupported');
    return values;
  };
  const command=enqueueCommandRows({scheduler,rows:input.rows,allowedFunctions,callFunction:expressionBindings.callFunction,readVariable:name=>name==='UpperTarget.hp'?target.hp:Object.hasOwn(input.variables,name)?input.variables[name]:undefined,
    resolveTargets:()=>['target'],canContinue:()=>target.hp>0,
    handlers:{BEActiveDamage:({rowId,parameters,readParameters})=>{
      let calculation=null;
      const result=enqueueActiveDamage({scheduler,initialParameters:checkedParams(parameters),...input.repeatModifiers,
        isTargetDead:()=>target.hp<=0,readParameters:()=>checkedParams(readParameters()),
        resolveDamage:base=>{
          calculation=calculateDamage(scenario(base));calculation.unresolvedDependencies.forEach(item=>dependencies.add(item));
          const model=calculation.experimentalModels.find(item=>Object.hasOwn(item,'preHitDamage'));
          if(!model)throw new Error('Missing active damage model');return model.preHitDamage;
        },readCrit:()=>input.targetModifiers.isCrit,
        applyHit:attack=>{
          const hp=calculation.experimentalModels.find(item=>item.name==='Ordinary HP subtraction');
          if(!hp||hp.incomingDamage!==attack.damageVal)throw new Error('Damage/HP binding mismatch');
          const before={...target};target={hp:hp.hpAfter,block:hp.shieldAfter};
          const hit={id:`${rowId}/hit-${hits.filter(h=>h.rowId===rowId).length+1}`,rowId,before,after:{...target},modeledHpLost:hp.modeledHpLost,calculation};hits.push(hit);
          if(target.hp<=0)stop={afterHitId:hit.id,reason:'Death handling or retargeting required'};
          return {hitId:hit.id};
        }});
      return result;
    }}});
  scheduler.run();
  return {schemaVersion:1,status:'EXPERIMENTAL',build,finalDamage:null,scope:'Numeric active command rows, supplied resolved modifiers, one target, no intervening effects',
    completed:command.completed&&stop===null,stop:stop??command.stop,initialTarget:{...input.targetState},targetAfter:target,modeledHpLost:input.targetState.hp-target.hp,hits,command,
    unresolvedDependencies:[...dependencies,...command.unresolvedDependencies,'No card costs, automatic skill/build assembly, ParaPlus, state changes, random targeting, caps or death handling','Supplied numeric variables except live UpperTarget.hp; no original command-to-damage execution or independent gameplay validation']};
}
