import {snapshot} from './experiments.mjs';
import {importCommandRows} from './import-command-rows.mjs';
import {compileNumericCommand} from './command-expressions.mjs';
import {initializeStateProperty,updateStateProperty} from './state-property-contribution.mjs';
import {changeCombatProperty,combatMutableProperties} from './combat-property-mutation.mjs';
import {mergeStateLayers} from './add-state-layer.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const rowFields=new Set(['id','Type','Target','Para','DelayTime']);
const roleTypes=new Set(['Monster','Awakener','Player']);

// Setup-only command execution over an explicit role registry. This boundary is
// intentionally independent of the damage-target model used by state-sequence.
export function runRoleStateCommand(value){
  const input=snapshot(value),keys=['schemaVersion','kind','build','otherEvents','command','variables','targetBindings','roles','definitions'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-role-state-command'||input.build!=='pc-res144-build51'||input.otherEvents!=='assumed-absent')throw new Error('Explicit setup-only role-state command required');
  if(!input.variables||Array.isArray(input.variables)||Object.entries(input.variables).some(([name,v])=>!name||!Number.isFinite(v)))throw new Error('Explicit finite command variables required');
  if(!input.targetBindings||Array.isArray(input.targetBindings)||Object.entries(input.targetBindings).some(([selector,id])=>!selector||!Number.isSafeInteger(id)))throw new Error('Explicit target-selector bindings required');
  if(!Array.isArray(input.roles)||!Array.isArray(input.definitions))throw new Error('Explicit roles and state definitions required');
  const roles=new Map();
  for(const role of input.roles){
    if(!exact(role,['id','roleType','properties','tentacleContext'])||!Number.isSafeInteger(role.id)||roles.has(role.id)||!roleTypes.has(role.roleType)||!role.properties||Array.isArray(role.properties)||Object.values(role.properties).some(v=>!Number.isFinite(v))||!Object.hasOwn(role.properties,'i_crit_per')||!Object.hasOwn(role.properties,'i_crit_damage_per'))throw new Error('Unique explicit role property snapshots required');
    if(role.tentacleContext!==null&&(!exact(role.tentacleContext,['pve','ownerMonster','maxTentacleCount'])||typeof role.tentacleContext.pve!=='boolean'||typeof role.tentacleContext.ownerMonster!=='boolean'||!Number.isFinite(role.tentacleContext.maxTentacleCount)))throw new Error('Explicit tentacle context or null required');
    roles.set(role.id,{...role,properties:{...role.properties},states:new Map()});
  }
  const definitions=new Map();
  for(const definition of input.definitions){
    if(!exact(definition,['id','maximum','properties','skillLevel','casterRoleId','specialValue','banned'])||!Number.isSafeInteger(definition.id)||definitions.has(definition.id)||typeof definition.maximum!=='string'||!Array.isArray(definition.properties)||!Number.isSafeInteger(definition.skillLevel)||definition.skillLevel<1||!roles.has(definition.casterRoleId)||!Number.isFinite(definition.specialValue)||typeof definition.banned!=='boolean')throw new Error('Unique explicit state definitions required');
    const seen=new Set();
    for(const p of definition.properties)if(!exact(p,['property','expression'])||!combatMutableProperties.includes(p.property)||typeof p.expression!=='string'||seen.has(p.property))throw new Error('Unique supported state property expressions required');else seen.add(p.property);
    definitions.set(definition.id,definition);
  }
  const {rows,metadata}=importCommandRows(input.command);
  if(rows.length===0)throw new Error('At least one setup row required');
  for(const row of rows){
    if(!['BEAddState','BEMonsterBubble'].includes(row.Type)||Object.keys(row).some(key=>!rowFields.has(key))||!Object.hasOwn(input.targetBindings,row.Target)||!roles.has(input.targetBindings[row.Target]))throw new Error('Unsupported setup row or unresolved target selector');
    if(Object.hasOwn(row,'DelayTime')&&(!Number.isFinite(row.DelayTime)||row.DelayTime<0))throw new Error('Finite nonnegative delay required');
  }
  const resolve=name=>Object.hasOwn(input.variables,name)?input.variables[name]:undefined;
  const one=expression=>{const result=compileNumericCommand(String(expression))(resolve);if(result.values.length!==1||!Number.isFinite(result.values[0]))throw new Error('Expression must resolve one finite value');return {result,value:result.values[0]};};
  const trace=[];
  for(const row of rows){
    const role=roles.get(input.targetBindings[row.Target]),delay=Object.hasOwn(row,'DelayTime')?row.DelayTime:null;
    if(row.Type==='BEMonsterBubble'){
      const pieces=String(row.Para).split(',');if(pieces.length<1||pieces.length>2||!pieces[0])throw new Error('Monster bubble requires tip and optional display time');
      const show=pieces.length===2?one(pieces[1]):{result:null,value:1000};
      const eligible=role.roleType==='Monster';
      trace.push({rowId:row.id,type:'presentation',effect:'BEMonsterBubble',roleId:role.id,delay,returned:eligible,record:eligible?{kind:'MonsterBubble',roleId:role.id,tipsId:pieces[0],showTime:show.value}:null,evaluation:show.result});continue;
    }
    const evaluation=compileNumericCommand(String(row.Para))(resolve);
    if(evaluation.values.length<1||evaluation.values.length>2||!Number.isSafeInteger(evaluation.values[0])||(evaluation.values.length===2&&!Number.isFinite(evaluation.values[1])))throw new Error('BEAddState requires state ID and optional layer');
    const [stateId,rawLayer=1]=evaluation.values,definition=definitions.get(stateId);if(!definition)throw new Error('State definition required for every add row');
    const expressionLog=[];
    const evaluate=(expression,state)=>{const result=compileNumericCommand(expression)(name=>name==='Layer'?state.layer:name==='ChangedLayer'?state.changedLayer:resolve(name));if(result.values.length!==1||!Number.isFinite(result.values[0]))throw new Error('State expression must resolve one value');expressionLog.push({expression,...result});return result.values[0];};
    let state=role.states.get(stateId),mergeTrace=null,created=false;
    if(!state){
      const seed={layer:rawLayer,changedLayer:rawLayer},maximum=Math.ceil(evaluate(definition.maximum,seed));
      state={stateId,layer:Math.min(Math.ceil(maximum),rawLayer),changedLayer:rawLayer,caster:definition.casterRoleId,hasCreateArgs:true,casterLayers:{[definition.casterRoleId]:rawLayer},sources:[],properties:{},isDeleted:false};created=true;
    }else{
      const maximum=evaluate(definition.maximum,state),merged=mergeStateLayers({state,add:rawLayer,caster:definition.casterRoleId,maximum,sourceType:null,resolvedCommandCaster:definition.casterRoleId,cachedTriggers:[]});
      Object.assign(state,merged);mergeTrace=merged.trace;
    }
    const mutations=[];
    for(const p of definition.properties){
      if(!Object.hasOwn(role.properties,p.property))throw new Error(`Role ${role.id} lacks explicit property ${p.property}`);
      const specialValue=['weak_per','frail_per','vulnerable_per'].includes(p.property)?definition.specialValue:null;
      const contribution=created?initializeStateProperty({property:p.property,expression:p.expression,evaluate:e=>evaluate(e,state),specialValue,skipInit:false}):updateStateProperty({contribution:state.properties[p.property],changedLayer:state.changedLayer,evaluate:e=>evaluate(e,state),specialValue});
      state.properties[p.property]=contribution.contribution;
      if(!definition.banned&&contribution.requestedDelta!==null){
        const mutation=changeCombatProperty({property:p.property,before:role.properties[p.property],delta:contribution.requestedDelta,critScale:role.properties.i_crit_per,critDamageScale:role.properties.i_crit_damage_per,castValue:null,...(p.property==='tentacle_dmg'?{tentacleContext:role.tentacleContext}: {})});
        role.properties[p.property]=mutation.after;mutations.push({property:p.property,...mutation});
      }
    }
    role.states.set(stateId,state);trace.push({rowId:row.id,type:'addState',roleId:role.id,stateId,delay,evaluation,created,mergeTrace,expressions:expressionLog,mutations,state:snapshot(state)});
  }
  return {schemaVersion:1,status:'EXPERIMENTAL',build:input.build,completed:true,finalDamage:null,roles:[...roles.values()].map(({states,...role})=>role),states:[...roles.values()].flatMap(role=>[...role.states.values()].map(state=>({roleId:role.id,...snapshot(state)}))),trace,metadata,unresolvedDependencies:['Setup-only authored composition; no damage, trigger callbacks, state-clear events, death lifecycle or independent gameplay validation','Target selectors are explicit bindings; no automatic parser target acquisition','Only BEAddState and baseline-proven BEMonsterBubble rows are supported','State layers and variables are explicit; immunity, layer modifiers, state limits and special routing are not executed','Presentation records are modeled from the baseline BEMonsterBubble body; no resource-150 runtime claim']};
}
