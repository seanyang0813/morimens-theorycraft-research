import {runPreparedSkillRequest} from './prepared-skill-request.mjs';
import {runPreparedSnapshotActiveSkill} from './prepared-snapshot-active-skill.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const clone=value=>JSON.parse(JSON.stringify(value));
const valueAt=(map,key)=>Object.hasOwn(map,key)?map[key]:0;

// Connects two existing catalog-backed boundaries without inventing a build:
// a supported role-state card mutates one role, then that same role casts a
// supported prepared Active card from the resulting property/state snapshot.
export function runPreparedStateActiveSequence(value,source){
  const input=clone(value);
  if(!exact(input,['schemaVersion','kind','build','stateCard','activeSkill','roleBinding'])||input.schemaVersion!==1||input.kind!=='morimens-prepared-state-active-sequence')throw new Error('Exact prepared state-to-Active sequence required');
  if(!exact(input.stateCard,['preparation','execution'])||!input.stateCard.execution)throw new Error('Executable prepared state card required');
  if(!exact(input.roleBinding,['stateRecipientRoleId','activeCasterRoleId'])||!Number.isSafeInteger(input.roleBinding.stateRecipientRoleId)||input.roleBinding.stateRecipientRoleId!==input.roleBinding.activeCasterRoleId)throw new Error('One explicit identical state-recipient and Active-caster role required');
  if(input.activeSkill?.build!==input.build)throw new Error('Active skill must use the sequence build');

  const stateRequest={schemaVersion:2,kind:'morimens-prepared-skill-request',build:input.build,...input.stateCard};
  const stateCard=runPreparedSkillRequest(stateRequest,source,input.build==='pc-res151-build51'?{resource151ExecutionProfile:'role-state-setup'}:{});
  if(stateCard.status!=='EXPERIMENTAL'||stateCard.execution?.calculation?.completed!==true)throw new Error('State card did not complete a supported execution');
  const roleId=input.roleBinding.stateRecipientRoleId;
  const beforeRoles=input.stateCard.execution.experiment?.roles;
  const before=Array.isArray(beforeRoles)?beforeRoles.find(role=>role.id===roleId):null;
  const after=stateCard.execution.calculation.roles?.find(role=>role.id===roleId);
  if(!before||!after||!before.properties||!after.properties)throw new Error('Bound role missing from state-card snapshots');

  const activeInput=clone(input.activeSkill);
  const caster=activeInput.snapshot?.casterProperties;
  if(!caster||typeof caster!=='object'||Array.isArray(caster))throw new Error('Active skill requires caster property snapshot');
  const propertyChanges=[];
  for(const property of new Set([...Object.keys(before.properties),...Object.keys(after.properties)])){
    const beforeValue=valueAt(before.properties,property),afterValue=valueAt(after.properties,property);
    if(!Number.isFinite(beforeValue)||!Number.isFinite(afterValue))throw new Error('Carried role properties must be finite');
    if(beforeValue===afterValue)continue;
    if(valueAt(caster,property)!==beforeValue)throw new Error(`Active caster property drift before state handoff: ${property}`);
    caster[property]=afterValue;
    propertyChanges.push({property,before:beforeValue,after:afterValue});
  }
  if(propertyChanges.length===0)throw new Error('State card produced no carryable property change');

  const query=activeInput.preparation?.stateQueries?.['CmdCaster.GetStateLayer'];
  const stateLayerChanges=[];
  for(const state of stateCard.execution.calculation.states??[]){
    if(state.roleId!==roleId||state.isDeleted)continue;
    if(!query||typeof query!=='object'||Array.isArray(query)||!Object.hasOwn(query,String(state.stateId)))continue;
    if(query[String(state.stateId)]!==0)throw new Error(`Active caster state-layer drift before state handoff: ${state.stateId}`);
    query[String(state.stateId)]=state.layer;
    stateLayerChanges.push({stateId:state.stateId,before:0,after:state.layer});
  }

  const activeSkill=runPreparedSnapshotActiveSkill(activeInput,source);
  return {schemaVersion:1,kind:'morimens-prepared-state-active-sequence-result',analysisTrack:'theorycrafting',status:'EXPERIMENTAL',build:input.build,finalDamage:null,completed:activeSkill.completed,
    roleBinding:input.roleBinding,sourceHashes:{...source.sourceHashes},stateCard,carry:{propertyChanges,stateLayerChanges,activeCasterProperties:activeInput.snapshot.casterProperties},activeSkill,
    modeledHpLost:activeSkill.calculation.modeledHpLost,targetAfter:activeSkill.calculation.targetAfter,
    unresolvedDependencies:['Only one completed catalog-backed role-state card followed by one supported prepared Active skill','The same explicit role must receive the state and cast the Active skill; party/player proxy routing is not inferred','Only resulting numeric role properties and explicitly declared CmdCaster.GetStateLayer queries carry forward','Costs, card zones, callbacks, duration expiry, other actors, target-state mutation, automatic targeting and gameplay validation remain unresolved',...activeSkill.unresolvedDependencies]};
}
