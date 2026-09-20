import {showDamage} from './show-damage.mjs';
import {activeTargetDamage} from './active-target.mjs';
import {prepareCardPveOffense} from './card-offensive-setup.mjs';
import {resolveHitLimits} from './hit-limits.mjs';
import {normalizeSkillArguments} from './skill-arguments.mjs';
import {subtractOrdinaryHp} from './hp-property.mjs';
import {passivePreHit} from './passive-prehit.mjs';
import {fixedPurePreHit} from './fixed-pure-prehit.mjs';
import {resolveImmunity} from './immunity.mjs';
import {resolveActivePrevention} from './active-prevention.mjs';
import {hitTriggerValues} from './hit-trigger-values.mjs';
export const build='pc-res144-build51';

// Research API. No complete gameplay scenario has passed independent validation.
// Callers cannot opt into a VERIFIED status or suppress required dependencies.
export function calculateDamage(input){
  const allowed=['mode','build','damageType','offense','offenseSetup','skillArgumentSnapshot','target','passive','effect','hitResolution','unresolvedDependencies'];
  if(!input||Object.keys(input).some(k=>!allowed.includes(k)))throw new Error('Unknown or missing scenario input');
  const mode=input.mode??'strict';
  if(!['strict','experimental'].includes(mode))throw new Error('Unknown mode');
  if(input.unresolvedDependencies!==undefined&&(!Array.isArray(input.unresolvedDependencies)||input.unresolvedDependencies.some(x=>typeof x!=='string')))throw new Error('Dependencies must be named strings');
  const unresolved=[...(input.unresolvedDependencies??[])];
  const result={mode,build:input.build,damageType:input.damageType,status:'UNVERIFIED',message:'Exact verified result unavailable.',finalDamage:null,experimentalModels:[],trace:[],evidence:[],unresolvedDependencies:unresolved};
  if(input.build!==build){unresolved.push('Unsupported or unknown combat build');return result;}
  if(['FIXED','PURE'].includes(input.damageType)){
    if(['offense','offenseSetup','skillArgumentSnapshot','target','passive'].some(key=>Object.hasOwn(input,key)))throw new Error('Fixed/Pure path requires category-specific effect inputs');
    if(!input.effect||input.effect.build!==input.build||input.effect.category!==input.damageType)throw new Error('Matching explicit effect build and category required');
    if(input.damageType==='PURE'&&input.hitResolution?.puncture)throw new Error('Original Pure effect uses subtype 0, not Puncture');
    const effect=fixedPurePreHit(input.effect);
    result.trace.push(...effect.trace);result.evidence.push(effect.evidenceFixture);
    unresolved.push(...effect.unresolvedDependencies,'HP-dependent combat callbacks, statistics and death execution are not performed by this API');
    if(effect.preHitDamage===null){
      if(input.hitResolution!==undefined)throw new Error('Skipped effect cannot resolve a hit');
      unresolved.push('Dead target or nonpositive Pure base: effect skipped');return result;
    }
    if(mode==='experimental'){
      result.status='EXPERIMENTAL';
      result.experimentalModels.push({name:'Recovered '+input.damageType+' pre-hit formula',scope:effect.scope,preHitDamage:effect.preHitDamage,trace:effect.trace});
    }
    appendHitModels(result,input,effect.preHitDamage);return result;
  }
  if(Object.hasOwn(input,'effect'))throw new Error('Effect inputs require Fixed/Pure category');
  if(input.damageType==='PASSIVE'){
    if(['offense','offenseSetup','skillArgumentSnapshot','target'].some(key=>Object.hasOwn(input,key)))throw new Error('Passive path does not accept Active offense, crit or target inputs');
    if(!input.passive||input.passive.build!==input.build)throw new Error('Explicit Passive inputs with matching build required');
    const passive=passivePreHit(input.passive);result.evidence.push(...passive.evidence);result.trace.push(...passive.trace);
    unresolved.push('Passive input expression and target properties are supplied, not reconstructed','Independent gameplay holdouts have not passed','HP-dependent combat callbacks, statistics and death execution are not performed by this API');
    if(passive.preHitDamage===null){
      if(input.hitResolution!==undefined)throw new Error('Skipped dead-target Passive effect cannot resolve a living-target hit');
      unresolved.push('Target is dead; Passive effect skipped');return result;
    }
    if(mode==='experimental'){
      result.status='EXPERIMENTAL';
      result.experimentalModels.push({name:'Recovered Passive pre-hit formula',scope:passive.scope,preHitDamage:passive.preHitDamage,trace:passive.trace,evidence:passive.evidence});
    }
    appendHitModels(result,input,passive.preHitDamage);
    return result;
  }
  if(input.damageType!=='ACTIVE'){unresolved.push('This research API supports explicit Active, Passive, Fixed and Pure formula paths');return result;}
  if(Object.hasOwn(input,'passive'))throw new Error('Active path does not accept Passive inputs');
  if((input.offense!==undefined)===(input.offenseSetup!==undefined))throw new Error('Supply exactly one of offense or offenseSetup');
  let offense=input.offense;
  let setup=input.offenseSetup;
  if(input.skillArgumentSnapshot!==undefined){
    const snapshot=input.skillArgumentSnapshot;
    const keys=['raw','overrides','argumentIndex'];
    if(!setup||Object.hasOwn(setup,'value'))throw new Error('Skill argument snapshot requires offenseSetup without value');
    if(!snapshot||keys.some(k=>!Object.hasOwn(snapshot,k))||Object.keys(snapshot).some(k=>!keys.includes(k)))throw new Error('Explicit skill argument snapshot required');
    const args=normalizeSkillArguments(snapshot.raw,snapshot.overrides);
    const index=snapshot.argumentIndex;
    if(!Number.isInteger(index)||index<1||index>args.length)throw new Error('Skill argument index must identify a stored ArgN (one-based)');
    setup={...setup,value:args[index-1]};
    result.skillArgumentSnapshot={arguments:args,argumentIndex:index,value:setup.value};
    result.evidence.push('PC144:SkillArgumentNormalization');
    unresolved.push('Raw skill argument expressions and snapshot timing are supplied, not reconstructed');
  }
  if(input.offenseSetup!==undefined){
    if(input.offenseSetup.build!==input.build)throw new Error('Offense setup build must match scenario');
    result.offenseSetup=prepareCardPveOffense(setup);
    offense=result.offenseSetup.resolvedUtilityInputs;
    result.evidence.push(...result.offenseSetup.evidence);
  }
  const offensive=showDamage(offense);
  result.trace.push(...offensive.trace);
  result.evidence.push(...offensive.evidence);
  result.offensiveUtility=offensive;
  unresolved.push('Resolved inputs have not been tied to a fully reconstructed gameplay scenario','Independent gameplay holdouts have not passed','HP-dependent combat callbacks, statistics and death execution are not performed by this API');
  if(!input.target){unresolved.push('Missing resolved crit and target inputs');return result;}
  const target=activeTargetDamage(offensive.showDamage,input.target);
  result.evidence.push(...target.evidence);
  if(mode==='experimental'){
    result.status='EXPERIMENTAL';
    result.experimentalModels.push({name:'Recovered Active pre-hit formula, explicitly resolved inputs',scope:'Before shield and HP resolution; not a verified gameplay prediction',preHitDamage:target.preHitDamage,trace:[...offensive.trace,...target.trace],evidence:[...result.evidence]});
  }
  appendHitModels(result,input,target.preHitDamage);
  return result;
}

function appendHitModels(result,input,incomingDamage){
  let hit,resolvedImmune,resolvedPrevention;const unresolved=result.unresolvedDependencies;
  if(input.hitResolution!==undefined){
    const h=input.hitResolution, keys=['block','puncture','hp','retainHp','limit','usedLimit','deathResist'];
    if(!h||keys.some(k=>!Object.hasOwn(h,k))||Object.keys(h).some(k=>![...keys,'immune','immunityProperties','preventEligible','preventionProperties'].includes(k)))throw new Error('Explicit hit-resolution state required');
    if(Object.hasOwn(h,'immune')===Object.hasOwn(h,'immunityProperties'))throw new Error('Supply exactly one immunity decision or property snapshot');
    if(Object.hasOwn(h,'immunityProperties')){
      const p=h.immunityProperties;
      if(!p||Object.keys(p).some(k=>!['general','punctureImmunity','categoryImmunities'].includes(k)))throw new Error('Invalid immunity property snapshot');
      const decision=resolveImmunity({...p,build:input.build,category:input.damageType[0]+input.damageType.slice(1).toLowerCase(),puncture:h.puncture});
      resolvedImmune=decision.immune;result.immunity=decision;result.evidence.push(...decision.evidence);
      unresolved.push('Immunity properties are supplied; their state/equipment reconstruction is not performed');
    }else{
      if(typeof h.immune!=='boolean')throw new Error('Explicit immunity boolean required');
      resolvedImmune=h.immune;unresolved.push('Immunity decision is supplied, not reconstructed');
    }
    if(Object.hasOwn(h,'preventEligible')===Object.hasOwn(h,'preventionProperties'))throw new Error('Supply exactly one prevention decision or property snapshot');
    resolvedPrevention=h.preventEligible;
    if(Object.hasOwn(h,'preventionProperties')){
      const p=h.preventionProperties;
      if(!p||Object.keys(p).some(k=>!['casterExists','casterPrevention','targetPrevention'].includes(k)))throw new Error('Invalid prevention snapshot');
      const decision=resolveActivePrevention({...p,build:input.build,damageType:input.damageType,immune:resolvedImmune});
      resolvedPrevention=decision.preventEligible;result.prevention=decision;result.evidence.push(...decision.evidence);
      unresolved.push('Caster presence and prevention properties are supplied, not reconstructed');
    }else unresolved.push('Prevention eligibility is supplied, not reconstructed');
    if(resolvedImmune&&resolvedPrevention)throw new Error('Immune damage cannot be eligible for Active prevention');
    if(input.damageType!=='ACTIVE'&&resolvedPrevention)throw new Error(`${input.damageType==='PASSIVE'?'Passive':input.damageType} damage cannot be eligible for Active prevention`);
    const {immune,immunityProperties,preventEligible,preventionProperties,...properties}=h;
    hit=resolveHitLimits({...properties,preventEligible:resolvedPrevention,damage:resolvedImmune?0:incomingDamage});
    result.evidence.push(...hit.evidence);
    unresolved.push('Limit properties are supplied, not reconstructed');
  }else unresolved.push('Missing shield, immunity and incoming-limit state');
  if(result.mode==='experimental'){
    if(hit)result.experimentalModels.push({name:`${input.damageType} incoming-hit request`,scope:'Resolved immunity decision, shield and limit helpers; before HP mutation and callbacks',incomingDamage,immune:resolvedImmune,shield:hit.shield,afterRetain:hit.afterRetain,converted:hit.converted,hpLossRequest:hit.hpLossRequest,deathResistApplied:hit.deathResistApplied,evidence:hit.evidence});
    if(hit){
      const hpBefore=input.hitResolution.hp;
      const hp=subtractOrdinaryHp({hp:hpBefore,request:hit.hpLossRequest});
      result.hitTriggerValues=hitTriggerValues({incomingDamage,hpBefore,hpAfter:hp.hpAfter,immune:resolvedImmune,preventEligible:resolvedPrevention,hit});
      result.experimentalModels.push({name:'Ordinary HP subtraction',scope:'One explicit ordinary HP mutation; callback descriptors only, no combat event/death execution',incomingDamage,hpLossRequest:hit.hpLossRequest,hpBefore,hpAfter:hp.hpAfter,modeledHpLost:hp.hpLost,shieldAfter:hit.shield[5],overflowDiagnostic:hp.hpAfter<=0?incomingDamage-hit.shield[1]-hpBefore:null,callbackDescriptors:hp.callbacks,evidence:['PC144:OrdinaryHpSubtraction','PC144:HitLimitHelpers']});
      result.evidence.push('PC144:OrdinaryHpSubtraction');
    }
  }
}
