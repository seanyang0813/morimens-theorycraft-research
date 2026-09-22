import {validateBuildPlan,buildPlanWheelSlots} from './build-plan.mjs';
import {resolveWheelRefinementParameters} from './wheel-refinement-parameters.mjs';
import {resolveWheelInitialProperties} from './wheel-initial-properties.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const clone=value=>JSON.parse(JSON.stringify(value));
const add=(target,values)=>{for(const [property,value] of Object.entries(values))target[property]=(target[property]??0)+value;};
const issue=(code,memberSlotId,wheelSlotId,message)=>({code,memberSlotId,wheelSlotId,message});

export function assembleWheelLoadoutProperties(input,catalog,wheelMechanicsData){
  if(!exact(input,['schemaVersion','kind','buildPlan','ownerPropertiesByMember'])||input.schemaVersion!==1||input.kind!=='morimens-wheel-loadout-properties'||!input.ownerPropertiesByMember||typeof input.ownerPropertiesByMember!=='object'||Array.isArray(input.ownerPropertiesByMember))throw new Error('Exact Wheel loadout-property input required');
  const plan=validateBuildPlan(input.buildPlan,catalog).plan;
  if(plan.clientBuild!=='pc-res144-build51')throw new Error('Wheel initial-property reconstruction currently requires pc-res144-build51');
  if(!wheelMechanicsData||wheelMechanicsData.build!=='pc-res144-build51'||!Array.isArray(wheelMechanicsData.crosswalkRows)||!wheelMechanicsData.states)throw new Error('Private resource-144 Wheel mechanics context required');
  const memberIds=new Set(plan.team.map(member=>member.slotId)),ownerIds=Object.keys(input.ownerPropertiesByMember);
  if(ownerIds.some(id=>!memberIds.has(id)))throw new Error('Owner-property map contains an unknown team slot');
  const crosswalk=new Map(wheelMechanicsData.crosswalkRows.map(row=>[row.wheelId,row])),issues=[],members=[];
  for(const member of plan.team){
    const rawPropertyValues={},clientInitializationDeltas={},wheels=[],ownerProperties=Object.hasOwn(input.ownerPropertiesByMember,member.slotId)?input.ownerPropertiesByMember[member.slotId]:null;
    for(const wheelSlot of buildPlanWheelSlots(plan.schemaVersion,member)){
      if(wheelSlot.wheelId===null)continue;
      if(wheelSlot.refinementLevel===null){issues.push(issue('WHEEL_REFINEMENT_REQUIRED',member.slotId,wheelSlot.slotId,'Selected Wheel refinement is unknown.'));continue;}
      const row=crosswalk.get(wheelSlot.wheelId);
      if(!row||row.status!=='UNIQUE'){issues.push(issue('WHEEL_CROSSWALK_UNRESOLVED',member.slotId,wheelSlot.slotId,'Selected Wheel lacks a unique client mechanics crosswalk.'));continue;}
      const candidate=row.candidates[0],parameterExpressions=Object.fromEntries(Object.entries(candidate.stateParameters??{}).map(([slot,expression])=>[`StateArg${slot}`,String(expression)]));
      const parameters=resolveWheelRefinementParameters({schemaVersion:1,kind:'morimens-wheel-refinement-parameters',build:'pc-res144-build51',wheelId:wheelSlot.wheelId,refinementLevel:wheelSlot.refinementLevel,parameters:parameterExpressions});
      const state=wheelMechanicsData.states[String(candidate.initialStateId)];if(!state)throw new Error('Crosswalked Wheel state is absent from mechanics context');
      const properties=Object.entries(state.ExistProperty??{}).map(([property,expression])=>({property,expression:String(expression)}));
      const needsOwner=properties.some(row=>row.expression.includes('StateOwner.'));
      if(needsOwner&&ownerProperties===null){issues.push(issue('OWNER_PROPERTIES_REQUIRED',member.slotId,wheelSlot.slotId,'This Wheel direct property reads explicit owner combat properties.'));continue;}
      const result=resolveWheelInitialProperties({schemaVersion:1,kind:'morimens-wheel-initial-properties',build:'pc-res144-build51',wheelId:wheelSlot.wheelId,stateArgs:parameters.values,ownerProperties,properties});
      add(rawPropertyValues,result.rawPropertyValues);add(clientInitializationDeltas,result.clientInitializationDeltas);
      const publicWheel=catalog.wheels.find(value=>value.id===wheelSlot.wheelId);
      wheels.push({slotId:wheelSlot.slotId,wheelId:wheelSlot.wheelId,wheelName:publicWheel?.name??null,refinementLevel:wheelSlot.refinementLevel,initialStateId:candidate.initialStateId,target:candidate.stateTarget,stateArgs:clone(parameters.values),rawPropertyValues:clone(result.rawPropertyValues),clientInitializationDeltas:clone(result.clientInitializationDeltas),hasTriggerCommands:Object.keys(state).some(key=>/^TriggerCmd\d+$/.test(key)&&state[key]!==null),triggerExecutionStatus:'UNRESOLVED'});
    }
    members.push({slotId:member.slotId,characterId:member.characterId,ownerProperties:ownerProperties===null?null:clone(ownerProperties),wheels,rawPropertyValues,clientInitializationDeltas});
  }
  return {schemaVersion:1,kind:'morimens-wheel-loadout-properties-result',analysisTrack:'theorycrafting',status:issues.length?'INCOMPLETE_INPUT':'DIRECT_PROPERTIES_RESOLVED',build:plan.clientBuild,planSchemaVersion:plan.schemaVersion,members,issues,source:{crosswalkSha256:wheelMechanicsData.sourceHashes?.crosswalk??null,stateSha256:wheelMechanicsData.sourceHashes?.State??null},finalDamage:null,limitations:['Sums initial direct-property contributions only; trigger commands remain unresolved even when present','Raw serialized-battle values and local client initialization deltas remain separate and must not be combined','Owner combat properties are explicit inputs and are not inferred from incomplete build progression','No equipment legality, state attachment order, team-unique enforcement, later updates, stacking interactions, damage, optimality, gameplay validation or holdout credit']};
}
