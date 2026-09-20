import {snapshot} from './experiments.mjs';
import {importCommandRows} from './import-command-rows.mjs';
import {compileNumericCommand} from './command-expressions.mjs';
import {runStateSequenceExperiment} from './state-sequence-experiment.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const allowedRowFields=new Set(['id','Type','Target','Para','Cond','DelayTime']);

// Ordered adapter for the currently connected state-sequence boundary. It keeps
// every behavioral row and only records DelayTime as inert metadata under the
// explicit no-other-events assumption.
export function runOrderedStateCommand(value){
  const input=snapshot(value);
  if(!exact(input,['schemaVersion','kind','build','otherEvents','command','variables','targetBinding','attackBase','state'])||input.schemaVersion!==1||input.kind!=='morimens-ordered-state-command'||input.build!=='pc-res144-build51'||input.otherEvents!=='assumed-absent')throw new Error('Explicit ordered state command required');
  if(!input.variables||Array.isArray(input.variables)||Object.values(input.variables).some(value=>!Number.isFinite(value)))throw new Error('Explicit finite command variables required');
  if(!exact(input.targetBinding,['expression','resolution'])||input.targetBinding.resolution!=='supplied-single-UpperTarget'||typeof input.targetBinding.expression!=='string'||!input.targetBinding.expression)throw new Error('Explicit single-target binding required');
  if(!exact(input.attackBase,['offense','targetModifiers','targetState','repeatModifiers','immune']))throw new Error('Explicit active attack inputs required');
  const imported=importCommandRows(input.command),rows=imported.rows;
  if(rows.length<2||!rows.some(row=>row.Type==='BEAddState')||!rows.some(row=>row.Type==='BEActiveDamage'))throw new Error('At least one state and one damage row required');
  for(const row of rows){
    if(!['BEAddState','BERemoveState','BESubStateLayer','BEActiveDamage'].includes(row.Type))throw new Error(`Unsupported ordered row type ${row.Type??'missing'}`);
    if(Object.keys(row).some(key=>!allowedRowFields.has(key)))throw new Error('Unsupported ordered row field');
    if(row.Type!=='BEActiveDamage'&&Object.hasOwn(row,'Cond'))throw new Error('Conditional state rows are unsupported');
    if(Object.hasOwn(row,'DelayTime')&&(!Number.isFinite(row.DelayTime)||row.DelayTime<0))throw new Error('Finite nonnegative row delay required');
    if(row.Type==='BEActiveDamage'&&row.Target!==input.targetBinding.expression)throw new Error('Damage-row selector does not match supplied target binding');
    if(row.Type!=='BEActiveDamage'&&!['CmdCaster',input.targetBinding.expression].includes(row.Target))throw new Error('State rows must target the caster or supplied damage target');
  }
  const stateRows=rows.filter(row=>row.Type==='BEAddState');
  const stateEvaluations=new Map(rows.filter(row=>row.Type!=='BEActiveDamage').map(row=>[row.id,compileNumericCommand(row.Para)(name=>input.variables[name])]));
  for(const row of rows.filter(row=>row.Type!=='BEActiveDamage')){
    const values=stateEvaluations.get(row.id).values,maximum=row.Type==='BERemoveState'?1:2;
    if(values.length<1||values.length>maximum||!Number.isSafeInteger(values[0])||(values.length===2&&!Number.isFinite(values[1])))throw new Error(`${row.Type} requires a numeric state ID${maximum===2?' and optional layer/amount':''}`);
  }
  const state=input.state;
  if(!exact(state,['definitions','requests','actorProperties','targetProperties','stateQueries'])||!Array.isArray(state.definitions)||!Array.isArray(state.requests)||state.requests.length!==stateRows.length)throw new Error('Explicit ordered state definitions and one request per state row required');
  const definitions=new Map();
  for(const definition of state.definitions){if(!definition||definitions.has(definition.id))throw new Error('Unique ordered state definitions required');definitions.set(definition.id,definition);}
  let stateIndex=0;
  const rowPlan=rows.map(row=>{
    const delay=Object.hasOwn(row,'DelayTime')?row.DelayTime:null;
    if(row.Type==='BEActiveDamage'){
      const {DelayTime,...kept}=row;
      return {rowId:row.id,type:'attack',delay,step:{type:'attack',rows:[{...kept,Target:'UpperTarget'}]}};
    }
    const evaluation=stateEvaluations.get(row.id),[stateId]=evaluation.values,definition=definitions.get(stateId),owner=row.Target==='CmdCaster'?'actor':'target';
    if(!definition||definition.owner!==owner)throw new Error('State row and definition owner/ID must agree');
    if(row.Type==='BERemoveState')return {rowId:row.id,type:'removeState',delay,evaluation,step:{type:'removeState',definitionId:stateId}};
    if(row.Type==='BESubStateLayer'){
      const amount=evaluation.values.length===2?evaluation.values[1]:null;
      return {rowId:row.id,type:'subtractState',delay,evaluation,step:{type:'subtractState',definitionId:stateId,amount}};
    }
    const request=state.requests[stateIndex++],layer=evaluation.values.length===2?evaluation.values[1]:null;
    if(request?.layer!==layer)throw new Error('State row and explicit request layer must agree');
    return {rowId:row.id,type:'applyState',delay,evaluation,step:{type:'applyState',definitionId:stateId,request}};
  });
  const offense={...input.attackBase.offense},targetModifiers={...input.attackBase.targetModifiers};
  const same=(a,b)=>Object.is(a,b);
  if(!same(state.actorProperties.basic_damage_per,offense.basicDamagePer)||!same(state.actorProperties.crit_damage,targetModifiers.awakerCritDamage)||
    !same(state.targetProperties.be_damage_per,targetModifiers.beDamagePer)||!same(state.targetProperties.be_damage_per2,targetModifiers.beDamagePer2)||!same(state.targetProperties.be_damage_per3,targetModifiers.beDamagePer3)||!same(state.targetProperties.vulnerable_per,targetModifiers.vulnerablePer))throw new Error('State live properties must match the initial combat snapshot');
  delete offense.basicDamagePer;
  for(const key of ['awakerCritDamage','beDamagePer','beDamagePer2','beDamagePer3','vulnerablePer'])delete targetModifiers[key];
  const calculation=runStateSequenceExperiment({schemaVersion:1,kind:'morimens-state-sequence',build:input.build,otherEvents:'assumed-absent',crossesTurnBoundary:false,
    actorProperties:state.actorProperties,targetProperties:state.targetProperties,stateQueries:state.stateQueries,definitions:[...definitions.values()],steps:rowPlan.map(item=>item.step),
    attackBase:{variables:input.variables,offense,targetModifiers,targetState:input.attackBase.targetState,repeatModifiers:input.attackBase.repeatModifiers,immune:input.attackBase.immune}});
  return {schemaVersion:1,status:'EXPERIMENTAL',build:input.build,finalDamage:null,completed:calculation.completed,stop:calculation.stop,targetAfter:calculation.targetAfter,
    modeledHpLost:calculation.modeledHpLost,properties:calculation.properties,states:calculation.states,rowPlan:rowPlan.map(({step,...item})=>item),calculation,
    delayPolicy:'DelayTime is recorded but has no observable effect while other events are explicitly absent',
    unresolvedDependencies:[...calculation.unresolvedDependencies,'Only BEAddState, BERemoveState, BESubStateLayer and ordinary BEActiveDamage rows against one supplied target','State-row expressions use supplied numeric variables; live state queries are connected for later damage rows','State layer subtraction excludes caster attribution','DelayTime is inert only under the explicit no-other-events assumption','No automatic targeting, build/state assembly, triggers or connected original full-command validation']};
}
