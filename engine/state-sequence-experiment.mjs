import {compileNumericCommand} from './command-expressions.mjs';
import {constructNumericState} from './state-constructor.mjs';
import {createManagedState} from './state-manager-creation.mjs';
import {mergeStateLayers} from './add-state-layer.mjs';
import {initializeStateProperty,updateStateProperty} from './state-property-contribution.mjs';
import {changeCombatProperty} from './combat-property-mutation.mjs';
import {runActiveCommandExperiment} from './active-command-experiment.mjs';
import {build} from './calculate-damage.mjs';
import {getLiveStateLayer} from './live-state-lookup.mjs';
import {endStateLife} from './state-life-end.mjs';
import {statePropertyRemoval} from './state-property-removal.mjs';
import {planAddStateRequest} from './add-state-request.mjs';
import {calculateStateLayers} from './state-layer-pipeline.mjs';
import {applyDimensionFinalValue} from './dimension-final-value.mjs';
import {limitStateLayers} from './state-layer-limits.mjs';
import {resolveStateImmunity} from './state-immunity.mjs';
import {subtractStateLayer} from './sub-state-layer.mjs';

const actorOffenseBindings={basic_damage_per:'basicDamagePer'};
const actorTargetBindings={crit_damage:'awakerCritDamage'};
const bindings={actor:{...actorOffenseBindings,...actorTargetBindings},target:{be_damage_per:'beDamagePer',be_damage_per2:'beDamagePer2',be_damage_per3:'beDamagePer3',vulnerable_per:'vulnerablePer'}};
const requiredProperties={actor:['basic_damage_per','crit_damage','i_crit_damage_per'],target:Object.keys(bindings.target)};
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
// Within-turn experimental composition. Explicit resolved state additions;
// no claim of original complete battle execution or inferred build attributes.
export function runStateSequenceExperiment(value){
  const input=JSON.parse(JSON.stringify(value));
  if(!exact(input,['schemaVersion','kind','build','otherEvents','crossesTurnBoundary','actorProperties','targetProperties','stateQueries','definitions','steps','attackBase'])||input.schemaVersion!==1||input.kind!=='morimens-state-sequence'||input.build!==build||input.otherEvents!=='assumed-absent'||input.crossesTurnBoundary!==false)throw new Error('Explicit within-turn state sequence with absent other events required');
  for(const [who,props] of [['actor',input.actorProperties],['target',input.targetProperties]])if(!exact(props,requiredProperties[who])||!Object.values(props).every(Number.isFinite))throw new Error('All live bound and amplification properties must be explicit');
  if(!input.stateQueries||Array.isArray(input.stateQueries)||Object.entries(input.stateQueries).some(([name,ids])=>!name||!ids||typeof ids!=='object'||Array.isArray(ids)||
    (Object.hasOwn(ids,'liveOwner')?(!exact(ids,['liveOwner'])||!['actor','target'].includes(ids.liveOwner)||!name.endsWith('.GetStateLayer')):Object.entries(ids).some(([id,n])=>!/^\d+$/.test(id)||!Number.isFinite(n)))))throw new Error('Explicit static state values or live GetStateLayer owner bindings required');
  if(!exact(input.attackBase,['variables','offense','targetModifiers','repeatModifiers','immune','targetState']))throw new Error('Explicit active attack base required');
  if(Object.values(actorOffenseBindings).some(k=>Object.hasOwn(input.attackBase.offense,k))||[...Object.values(actorTargetBindings),...Object.values(bindings.target)].some(k=>Object.hasOwn(input.attackBase.targetModifiers,k)))throw new Error('Live property bindings cannot also be supplied in static attack inputs');
  if(!Array.isArray(input.definitions)||!Array.isArray(input.steps))throw new Error('Definitions and steps required');
  const defs=new Map(),expressions=new Map(),allowedFunctions=Object.keys(input.stateQueries);
  const compile=e=>{if(!expressions.has(e))expressions.set(e,compileNumericCommand(e,{allowedFunctions}));return expressions.get(e);};
  for(const d of input.definitions){
    if(!exact(d,['id','owner','maximum','properties','skillLevel','caster','specialValue','banned'])||!Number.isSafeInteger(d.id)||defs.has(d.id)||!Object.hasOwn(bindings,d.owner)||!Number.isSafeInteger(d.caster)||!Number.isSafeInteger(d.skillLevel)||d.skillLevel<1||typeof d.banned!=='boolean'||!Number.isFinite(d.specialValue)||!Array.isArray(d.properties))throw new Error('Explicit unique state definitions required');
    const seen=new Set();compile(d.maximum);
    for(const p of d.properties){if(!exact(p,['property','expression'])||!Object.hasOwn(bindings[d.owner],p.property)||seen.has(p.property))throw new Error('Unique supported owner property expressions required');seen.add(p.property);compile(p.expression);}
    defs.set(d.id,d);
  }
  for(const step of input.steps){
    if(step?.type==='addState'){
      if(!exact(step,['type','definitionId','resolvedLayers'])||!defs.has(step.definitionId)||!Number.isSafeInteger(step.resolvedLayers))throw new Error('Explicit resolved state addition required');
    }else if(step?.type==='applyState'){
      const r=step.request;
      const requestKeys=['layer','immune','context','modifiers','dimensionStateIds','perLimit','totalLimit'];
      if(r&&Object.hasOwn(r,'dimensionContext'))requestKeys.push('dimensionContext');
      const validLimit=n=>n===null||Number.isFinite(n)||(exact(n,['rules'])&&Array.isArray(n.rules));
      const validImmunity=i=>typeof i==='boolean'||exact(i,['buffType','properties','specificRules']);
      if(!exact(step,['type','definitionId','request'])||!defs.has(step.definitionId)||!exact(r,requestKeys)||!(r.layer===null||Number.isFinite(r.layer))||!validImmunity(r.immune)||![r.perLimit,r.totalLimit].every(validLimit)||!Array.isArray(r.dimensionStateIds)||r.dimensionStateIds.some(id=>!Number.isSafeInteger(id)))throw new Error('Explicit state request, immunity, modifiers and limit rules/results required');
    }else if(step?.type==='removeState'){
      if(!exact(step,['type','definitionId'])||!defs.has(step.definitionId))throw new Error('Explicit known state removal required');
    }else if(step?.type==='subtractState'){
      if(!exact(step,['type','definitionId','amount'])||!defs.has(step.definitionId)||!(step.amount===null||Number.isFinite(step.amount)))throw new Error('Explicit known state layer subtraction required');
    }else if(step?.type==='attack'){
      if(!exact(step,['type','rows'])||!Array.isArray(step.rows))throw new Error('Explicit attack rows required');
    }else throw new Error('Unsupported sequence operation');
  }
  const registry=new Map(),properties={actor:{...input.actorProperties},target:{...input.targetProperties}},trace=[];
  let nextUid=100,target={...input.attackBase.targetState},stop=null;
  const resolveStateQuery=(name,args)=>{
      if(args.length!==1||!Number.isSafeInteger(args[0]))throw new Error('One integer state ID required');
      const query=input.stateQueries[name];
      if(query?.liveOwner)return getLiveStateLayer({registry,ownerUid:query.liveOwner==='actor'?1:2,stateId:args[0]});
      if(!Object.hasOwn(query??{},args[0]))throw new Error('Unresolved external state query');
      return query[args[0]];
  };
  const expressionBindings={allowedFunctions,callFunction:resolveStateQuery};
  const evaluate=(expression,state,log)=>{
    const evaluated=compile(expression)(name=>name==='Layer'?state.layer:name==='ChangedLayer'?state.changedLayer:undefined,resolveStateQuery);
    if(evaluated.values.length!==1)throw new Error('State expressions must resolve one value');
    log.push({expression,...evaluated});return evaluated.values[0];
  };
  const attackInput=rows=>{
    const offense={...input.attackBase.offense},targetModifiers={...input.attackBase.targetModifiers};
    for(const [key,binding] of Object.entries(actorOffenseBindings))offense[binding]=properties.actor[key];
    for(const [key,binding] of Object.entries(actorTargetBindings))targetModifiers[binding]=properties.actor[key];
    for(const [key,binding] of Object.entries(bindings.target))targetModifiers[binding]=properties.target[key];
    return {...input.attackBase,schemaVersion:1,kind:'morimens-active-command-experiment',build,interveningEffects:'assumed-absent',rows,offense,targetModifiers,targetState:target};
  };
  const changeProperties=(d,state,operation,initial)=>{
    for(const p of d.properties){
      const specialValue=p.property==='vulnerable_per'?d.specialValue:null;
      const evaluateProperty=e=>evaluate(e,state,operation.expressions);
      const result=initial?initializeStateProperty({property:p.property,expression:p.expression,evaluate:evaluateProperty,specialValue,skipInit:false}):updateStateProperty({contribution:state.properties[p.property],changedLayer:state.changedLayer,evaluate:evaluateProperty,specialValue});
      state.properties[p.property]=result.contribution;
      if(!d.banned&&result.requestedDelta!==null){
        const mutation=changeCombatProperty({property:p.property,before:properties[d.owner][p.property],delta:result.requestedDelta,critScale:0,critDamageScale:properties.actor.i_crit_damage_per,castValue:null});
        properties[d.owner][p.property]=mutation.after;operation.mutations.push({owner:d.owner,property:p.property,...mutation});
      }
    }
  };
  const endLife=(d,state,operation)=>endStateLife({state,teamUnique:false,removeUniqueStateRole:()=>{throw new Error('Unique state removal unsupported');},
    removeProperty:()=>{
      operation.lifecycleTrace.push('removeProperty');
      for(const p of d.properties){
        const removal=statePropertyRemoval({property:p.property,storedValue:state.properties[p.property].value,apiType:'OTHER',pve:true,playerOwner:false,banned:d.banned,ignoreBan:false,owner:d.owner,awakeners:[]});
        for(const request of removal.mutations){
          const mutation=changeCombatProperty({property:request.property,before:properties[d.owner][request.property],delta:request.delta,critScale:0,critDamageScale:properties.actor.i_crit_damage_per,castValue:null});
          properties[d.owner][request.property]=mutation.after;operation.mutations.push({owner:d.owner,property:request.property,...mutation});
        }
      }
    },onDelState:()=>operation.lifecycleTrace.push('recordDeletion'),log:()=>operation.lifecycleTrace.push('log'),
    createStateLifeEnd:event=>{operation.lifecycleTrace.push('StateLifeEnd');operation.events.push({kind:'StateLifeEnd',stateUid:event.stateUid,handling:'listeners-assumed-absent'});}});
  // Validate attack inputs before changing any state; a false row deals no hits.
  runActiveCommandExperiment(attackInput([{id:'validate',Type:'BEActiveDamage',Target:'UpperTarget',Para:'0',Cond:'false'}]));
  for(const [index,step] of input.steps.entries()){
    if(step.type==='attack'){
      const result=runActiveCommandExperiment(attackInput(step.rows),expressionBindings);target=result.targetAfter;
      trace.push({index,type:'attack',boundProperties:JSON.parse(JSON.stringify(properties)),result});
      if(!result.completed){stop={index,reason:result.stop};break;}
      continue;
    }
    const d=defs.get(step.definitionId),ownerUid=d.owner==='actor'?1:2,operation={index,type:'addState',definitionId:d.id,expressions:[],mutations:[],events:[]};
    let resolvedLayers=step.resolvedLayers;
    if(step.type==='applyState'){
      operation.type='applyState';const request=step.request;
      operation.layerCalculation=null;operation.dimensionTrace=[];operation.limitCalculations=[];operation.immunityCalculation=null;
      let immune=request.immune;
      if(typeof immune!=='boolean'){
        if(Math.ceil(request.layer??1)>0)operation.immunityCalculation=resolveStateImmunity({stateId:d.id,...immune});
        immune=operation.immunityCalculation?.immune??false;
      }
      const limitCallback=(spec,mode)=>spec===null?null:layer=>{
        if(Number.isFinite(spec))return spec;
        const calculation=limitStateLayers({stateId:d.id,layer,mode,rules:spec.rules,getCurrentLayer:stateId=>getLiveStateLayer({registry,ownerUid,stateId})});
        operation.limitCalculations.push({mode,input:layer,...calculation});return calculation.layer;
      };
      operation.request=planAddStateRequest({layer:request.layer,immune,
        calculateLayer:layer=>{
          operation.layerCalculation=calculateStateLayers({layer,stateId:d.id,context:request.context,modifiers:request.modifiers,dimensionStateIds:request.dimensionStateIds,
            applyDimension:value=>{const dimension=applyDimensionFinalValue({value,context:request.dimensionContext});operation.dimensionTrace.push({before:value,...dimension});return dimension.value;}});
          return operation.layerCalculation.layer;
        },limitLayer:limitCallback(request.perLimit,'statistics'),limitTotalLayer:limitCallback(request.totalLimit,'total')});
      if(operation.request.createdLayers.length===0){operation.state=null;operation.managerTrace=[];trace.push(operation);continue;}
      resolvedLayers=operation.request.createdLayers[0];
    }
    if(step.type==='removeState'){
      operation.type='removeState';operation.lifecycleTrace=[];
      const state=registry.get(ownerUid)?.find(s=>!s.isDeleted&&s.stateId===d.id);
      if(state)endLife(d,state,operation);
      operation.state=state?JSON.parse(JSON.stringify(state)):null;operation.removed=Boolean(state);trace.push(operation);continue;
    }
    if(step.type==='subtractState'){
      operation.type='subtractState';operation.lifecycleTrace=[];
      const state=registry.get(ownerUid)?.find(s=>!s.isDeleted&&s.stateId===d.id);
      operation.subtraction=subtractStateLayer({layers:state?.layer??0,amount:step.amount,exists:Boolean(state),casterAttribution:'absent'});
      if(state){state.layer=operation.subtraction.layersAfter;state.changedLayer=operation.subtraction.changedLayer;changeProperties(d,state,operation,false);if(state.layer<=0)endLife(d,state,operation);}
      operation.state=state?JSON.parse(JSON.stringify(state)):null;trace.push(operation);continue;
    }
    const manager=createManagedState({target:{uid:ownerUid,role:'Monster',dead:false},createArgs:{stateId:d.id,layer:resolvedLayers,skipOnAdd:false},registry,deathHandling:'Wipe',teamUnique:false,
      hooks:{construct:(_target,args)=>{
        const raw=args.layer??1,maximum=evaluate(d.maximum,{layer:raw,changedLayer:raw},operation.expressions);
        const constructed=constructNumericState({uid:nextUid++,stateId:d.id,caster:d.caster,layer:args.layer,maximum,recover:false,restoredData:null,skillLevel:d.skillLevel,parameter:null,
          hooks:{initializeParser:()=>{},initializeTriggers:()=>{},logLayers:()=>{}}});
        operation.constructorTrace=constructed.trace;
        return {...constructed.state,hasCreateArgs:true,sources:[]};
      },merge:(state,args)=>{
        const maximum=evaluate(d.maximum,state,operation.expressions);
        const merged=mergeStateLayers({state,add:args.layer,caster:d.caster,maximum,sourceType:null,resolvedCommandCaster:ownerUid,cachedTriggers:[]});
        Object.assign(state,merged);operation.mergeTrace=merged.trace;
        if(merged.trace.some(e=>e.event==='propertyDelta'))changeProperties(d,state,operation,false);
      },afterInit:state=>changeProperties(d,state,operation,true),serialize:state=>({uid:state.uid}),record:()=>{},changeUniqueRole:()=>{throw new Error('Unique state routing unsupported');},
      queueOnAdd:event=>operation.events.push({kind:'StateOnAdd',stateUid:event.stateUid,handling:'listeners-assumed-absent'}),recordStats:()=>{}}});
    operation.managerTrace=manager.trace;operation.state=manager.state?JSON.parse(JSON.stringify(manager.state)):null;trace.push(operation);
  }
  return {schemaVersion:1,status:'EXPERIMENTAL',build,finalDamage:null,completed:stop===null,stop,properties,targetAfter:target,modeledHpLost:input.attackBase.targetState.hp-target.hp,
    states:[...registry.values()].flat(),trace,unresolvedDependencies:['Authored component composition, not connected original full battle execution or independent gameplay validation','addState uses already-resolved layers; applyState uses explicit immunity, modifier mappings, dimension role/player context and supplied limit results, not automatic property/rule derivation','Layer subtraction excludes caster attribution; no trigger listeners, expiry, death handling, team/card property routing or source attribution; within one turn only','State queries use explicit static inputs or explicitly bound live registry owners; no automatic parser target binding or build/skill assembly','Damage eligibility modifiers outside the five bound properties remain explicitly supplied']};
}
