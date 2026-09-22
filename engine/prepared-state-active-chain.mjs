import {runPreparedStateActiveSequence} from './prepared-state-active-sequence.mjs';
import {runPreparedSnapshotActiveSkill} from './prepared-snapshot-active-skill.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const clone=value=>JSON.parse(JSON.stringify(value));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const valueAt=(map,key)=>Object.hasOwn(map,key)?map[key]:0;
const declaredEnergy=action=>{
  const values=[];
  if(Number.isFinite(action?.snapshot?.casterProperties?.ulti_energy))values.push(action.snapshot.casterProperties.ulti_energy);
  if(Number.isFinite(action?.energy?.target?.energy))values.push(action.energy.target.energy);
  if(values.some(value=>value!==values[0]))throw new Error('Active action energy snapshots disagree');
  return values[0]??null;
};
const setEnergy=(action,value)=>{
  if(Object.hasOwn(action.snapshot.casterProperties,'ulti_energy'))action.snapshot.casterProperties.ulti_energy=value;
  if(action.energy?.target&&Object.hasOwn(action.energy.target,'energy'))action.energy.target.energy=value;
};

// Ordered multi-card extension of the one state-card -> one Active boundary.
// Every Active template describes the same pre-sequence target/caster snapshot;
// the runner replaces only explicitly carried state, HP, Block and energy.
export function runPreparedStateActiveChain(value,source){
  const input=clone(value);
  if(!exact(input,['schemaVersion','kind','build','stateCard','activeSkills','roleBinding','targetRoleId'])||input.schemaVersion!==1||input.kind!=='morimens-prepared-state-active-chain'||!Array.isArray(input.activeSkills)||input.activeSkills.length===0||!Number.isSafeInteger(input.targetRoleId))throw new Error('Exact nonempty prepared state-to-Active chain with target identity required');
  const [firstTemplate,...laterTemplates]=input.activeSkills;
  const first=runPreparedStateActiveSequence({schemaVersion:1,kind:'morimens-prepared-state-active-sequence',build:input.build,stateCard:input.stateCard,activeSkill:firstTemplate,roleBinding:input.roleBinding},source);
  const availableCasterStateLayers=first.stateCard.execution.calculation.states.filter(state=>state.roleId===input.roleBinding.activeCasterRoleId&&!state.isDeleted).map(state=>({stateId:state.stateId,layer:state.layer}));
  const targetBaseline=clone(firstTemplate.snapshot.initialTargetProperties),bindingBaseline=clone(firstTemplate.targetBinding),tagBaseline=firstTemplate.snapshot.targetBattleTag,stateIdsBaseline=clone(firstTemplate.snapshot.targetStateIds);
  let target=clone(first.targetAfter),energy=declaredEnergy(firstTemplate),energyBaseline=energy;
  if(first.activeSkill.energy)energy=first.activeSkill.energy.targetsAfter[0].energy;
  const actions=[first.activeSkill],transitions=[{index:0,hpBefore:targetBaseline.hp,blockBefore:targetBaseline.block??0,hpAfter:target.hp,blockAfter:target.block??0,energyAfter:energy,propertyChanges:clone(first.carry.propertyChanges),stateLayerChanges:clone(first.carry.stateLayerChanges)}];
  let stop=first.completed?null:{index:0,reason:first.activeSkill.stop??'First Active action did not complete'};

  for(let index=0;index<laterTemplates.length&&!stop;index++){
    const action=clone(laterTemplates[index]),absoluteIndex=index+1;
    if(action.build!==input.build||!same(action.targetBinding,bindingBaseline)||action.snapshot?.targetBattleTag!==tagBaseline||!same(action.snapshot?.targetStateIds,stateIdsBaseline)||!same(action.snapshot?.initialTargetProperties,targetBaseline))throw new Error('Every Active action must declare the same build, target binding and pre-sequence target snapshot');
    const caster=action.snapshot.casterProperties;
    for(const change of first.carry.propertyChanges){
      if(valueAt(caster,change.property)!==change.before)throw new Error(`Active caster property drift before state handoff: ${change.property}`);
      caster[change.property]=change.after;
    }
    const query=action.preparation?.stateQueries?.['CmdCaster.GetStateLayer'];
    const stateLayerChanges=[];
    for(const state of availableCasterStateLayers){
      if(!query||!Object.hasOwn(query,String(state.stateId)))continue;
      if(query[String(state.stateId)]!==0)throw new Error(`Active caster state-layer drift before state handoff: ${state.stateId}`);
      query[String(state.stateId)]=state.layer;stateLayerChanges.push({stateId:state.stateId,before:0,after:state.layer});
    }
    action.snapshot.initialTargetProperties.hp=target.hp;action.snapshot.initialTargetProperties.block=target.block??0;
    const declared=declaredEnergy(action);
    if(declared!==null){
      if(energyBaseline===null){energyBaseline=declared;energy=declared;}
      if(declared!==energyBaseline)throw new Error('Every Active action must declare the same pre-sequence caster energy');
      setEnergy(action,energy);
    }
    const hpBefore=target.hp,blockBefore=target.block??0,result=runPreparedSnapshotActiveSkill(action,source);
    actions.push(result);target=clone(result.calculation.targetAfter);
    if(result.energy)energy=result.energy.targetsAfter[0].energy;
    transitions.push({index:absoluteIndex,hpBefore,blockBefore,hpAfter:target.hp,blockAfter:target.block??0,energyAfter:energy,propertyChanges:clone(first.carry.propertyChanges),stateLayerChanges});
    if(!result.completed)stop={index:absoluteIndex,reason:result.stop??'Active action did not complete'};
  }
  return {schemaVersion:1,kind:'morimens-prepared-state-active-chain-result',analysisTrack:'theorycrafting',status:'EXPERIMENTAL',build:input.build,finalDamage:null,completed:stop===null,stop,roleBinding:input.roleBinding,targetRoleId:input.targetRoleId,sourceHashes:{...source.sourceHashes},stateCard:first.stateCard,carry:{...first.carry,availableCasterStateLayers},activeSkills:actions,transitions,executedActions:actions.length,unexecutedActions:input.activeSkills.length-actions.length,modeledHpLost:targetBaseline.hp-target.hp,targetAfter:target,casterEnergyAfter:energy,
    unresolvedDependencies:['One completed catalog-backed role-state card followed by an ordered nonempty list of supported prepared Active skills','All Active templates must describe one shared pre-sequence caster and target; only state properties/layers, target HP/Block and exposed caster energy carry','Costs, card zones, duration expiry, callbacks, reactive effects, retargeting, other actors, death execution and gameplay validation remain unresolved']};
}
