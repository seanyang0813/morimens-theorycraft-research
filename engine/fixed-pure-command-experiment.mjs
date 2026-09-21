import {snapshot} from './experiments.mjs';
import {calculateDamage,build} from './calculate-damage.mjs';
import {ResearchEffectOrder} from './effect-order.mjs';
import {enqueueCommandRows} from './command-rows.mjs';
import {enqueueActiveDamage} from './active-damage-command.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const effectType={FIXED:'BEFixedDamage',PURE:'BEPureDamage'};

// Restricted command adapter for the original Fixed/Pure repeat shape. Pure's
// third parameter is includeStats rather than a damage subtype; statistics are
// recorded as metadata and remain outside this HP-only execution boundary.
export function runFixedPureCommandExperiment(value,expressionBindings={}){
  if(!expressionBindings||Array.isArray(expressionBindings)||Object.keys(expressionBindings).some(key=>!['allowedFunctions','callFunction'].includes(key)))throw new Error('Explicit expression function bindings required');
  const allowedFunctions=expressionBindings.allowedFunctions??[];
  if(!Array.isArray(allowedFunctions)||allowedFunctions.some(name=>typeof name!=='string'||!name)||new Set(allowedFunctions).size!==allowedFunctions.length||(allowedFunctions.length&&typeof expressionBindings.callFunction!=='function'))throw new Error('Unique allowed functions and explicit resolver required');
  const input=snapshot(value),keys=['schemaVersion','kind','build','category','interveningEffects','rows','variables','effect','targetState','repeatModifiers','immune'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-fixed-pure-command-experiment'||input.build!==build||!Object.hasOwn(effectType,input.category)||input.interveningEffects!=='assumed-absent')throw new Error('Explicit supported Fixed/Pure command experiment required');
  if(typeof input.immune!=='boolean'||!exact(input.targetState,['hp','block'])||!Number.isFinite(input.targetState.hp)||input.targetState.hp<=0||!Number.isFinite(input.targetState.block)||input.targetState.block<0)throw new Error('Explicit immunity and living HP/shield required');
  const effectKeys=input.category==='FIXED'?['dimensionFixPer','fixed1','fixed2','fixed3','fixed4','fixed5']:[];
  if(!exact(input.effect,effectKeys)||Object.values(input.effect).some(value=>!Number.isFinite(value)))throw new Error(`Explicit resolved ${input.category} properties required`);
  if(!input.variables||Array.isArray(input.variables)||Object.entries(input.variables).some(([name,v])=>name==='UpperTarget.hp'||!Number.isFinite(v)))throw new Error('Explicit numeric variables required; UpperTarget.hp is live');
  if(!exact(input.repeatModifiers,['plus','per'])||Object.values(input.repeatModifiers).some(value=>!Number.isFinite(value)))throw new Error('Explicit plus/per repetition modifiers required');
  if(!Array.isArray(input.rows)||input.rows.some(row=>row?.Type!==effectType[input.category]||row.Target!=='UpperTarget'))throw new Error(`Only ${input.category} rows against UpperTarget are supported`);
  let target={...input.targetState},stop=null;const hits=[],dependencies=new Set();
  const scenario=(base,puncture)=>({build,mode:'experimental',damageType:input.category,effect:{build,category:input.category,targetDead:false,baseDamage:base,...input.effect},
    hitResolution:{...target,immune:input.immune,puncture,preventEligible:false,retainHp:0,limit:0,usedLimit:0,deathResist:0}});
  calculateDamage(scenario(1,false));
  const scheduler=new ResearchEffectOrder(),rowMetadata=[];
  const checkedFixed=values=>{
    if(values.length>4||(values.length>=3&&![0,1].includes(values[2]))||(values.length===4&&values[3]!==0))throw new Error('Fixed supports subtype 0/1 and only zero ParaPlus');
    return values;
  };
  const checkedPure=values=>{
    if(values.length>3||(values.length===3&&values[2]!==1))throw new Error('Pure supports only includeStats 1 when the third parameter is present');
    return values;
  };
  const command=enqueueCommandRows({scheduler,rows:input.rows,allowedFunctions,callFunction:expressionBindings.callFunction,
    readVariable:name=>name==='UpperTarget.hp'?target.hp:Object.hasOwn(input.variables,name)?input.variables[name]:undefined,
    resolveTargets:()=>['target'],canContinue:()=>target.hp>0,handlers:{[effectType[input.category]]:({rowId,parameters,readParameters})=>{
      let calculation=null,original=input.category==='FIXED'?checkedFixed(parameters):checkedPure(parameters);
      const meta={rowId,category:input.category,includeStats:input.category==='PURE'?(original[2]??0)===1:null,damageSubType:input.category==='FIXED'?original[2]??0:0};rowMetadata.push(meta);
      const normalized=values=>{original=input.category==='FIXED'?checkedFixed(values):checkedPure(values);return input.category==='FIXED'?original:[original[0],original[1]??null,0];};
      return enqueueActiveDamage({scheduler,initialParameters:normalized(original),...input.repeatModifiers,isTargetDead:()=>target.hp<=0,readParameters:()=>normalized(readParameters()),readCrit:()=>false,
        resolveDamage:base=>{const puncture=input.category==='FIXED'&&meta.damageSubType===1;calculation=calculateDamage(scenario(base,puncture));calculation.unresolvedDependencies.forEach(item=>dependencies.add(item));const model=calculation.experimentalModels.find(item=>Object.hasOwn(item,'preHitDamage'));if(!model)throw new Error(`Missing ${input.category} damage model`);return model.preHitDamage;},
        applyHit:attack=>{const hp=calculation.experimentalModels.find(item=>item.name==='Ordinary HP subtraction');if(!hp||hp.incomingDamage!==attack.damageVal)throw new Error('Damage/HP binding mismatch');const before={...target};target={hp:hp.hpAfter,block:hp.shieldAfter};const hit={id:`${rowId}/hit-${hits.filter(item=>item.rowId===rowId).length+1}`,rowId,before,after:{...target},modeledHpLost:hp.modeledHpLost,calculation};hits.push(hit);if(target.hp<=0)stop={afterHitId:hit.id,reason:'Death handling or retargeting required'};return {hitId:hit.id};}});
    }}});
  scheduler.run();
  return {schemaVersion:1,status:'EXPERIMENTAL',build,category:input.category,finalDamage:null,scope:`Numeric ${input.category} command rows, supplied resolved modifiers, one target, no intervening effects`,completed:command.completed&&stop===null,stop:stop??command.stop,initialTarget:{...input.targetState},targetAfter:target,modeledHpLost:input.targetState.hp-target.hp,hits,rowMetadata,command,
    unresolvedDependencies:[...dependencies,...command.unresolvedDependencies,'No automatic target resolution, state/build property reconstruction, nonzero ParaPlus, events, statistics, caps or death handling','Pure includeStats is retained as metadata but statistics are not executed','Supplied numeric variables except live UpperTarget.hp; no connected original full-command validation or independent gameplay validation']};
}
