import {compileCommandCondition,compileNumericCommand} from './command-expressions.mjs';
import {importCommandRows} from './import-command-rows.mjs';
import {getLiveStateLayer} from './live-state-lookup.mjs';
import {calculateDamage} from './calculate-damage.mjs';

const builds=new Set(['pc-res144-build51','pc-res150-build51','pc-res151-build51']);
const owners={CmdCaster:'caster',UpperTarget:'target',PlayerRole:'player',CurCard:'card',OwnerCard:'card'};
const targets=new Set(['UpperTarget','AllEnemy','MaxHpEnemy','MinHpEnemy']);
const callNames=Object.keys(owners).map(name=>`${name}.GetStateLayer`);

function one(items,label){if(items.length!==1)throw new Error(`${label} must resolve once`);return items[0];}
function argsOf(card){
  const value=card.cardArgs;
  if(Array.isArray(value)&&value.every(Number.isFinite))return value;
  if(value&&typeof value==='object'){
    const keys=Object.keys(value).filter(key=>key!=='n').sort((a,b)=>Number(a)-Number(b));
    if(keys.every((key,i)=>key===String(i+1)&&Number.isFinite(value[key])))return keys.map(key=>value[key]);
  }
  throw new Error('Complete finite card arguments required');
}
function stateRegistry(states){
  if(!Array.isArray(states))throw new Error('Complete state list required');
  const registry=new Map();
  for(const state of states){
    if(!Number.isSafeInteger(state?.ownerUid)||!Number.isSafeInteger(state?.stateId)||!Number.isFinite(state?.layer))throw new Error('Complete live state identity and layer required');
    const list=registry.get(state.ownerUid)??[];
    list.push({stateId:state.stateId,layer:state.layer,isDeleted:Boolean(state.isDeleted)});
    registry.set(state.ownerUid,list);
  }
  return registry;
}
function finiteModifier(role,key){
  const value=role.properties?.[key]??0;
  if(!Number.isFinite(value))throw new Error(`Finite ${key} required`);
  return value;
}

// Outcome-blind, first-hit Fixed component. This deliberately supports a
// narrow command shape and a single living enemy; it predicts castDamage, not
// target selection, shield loss, HP loss, callbacks or a whole card action.
export function buildFixedReplayActionCandidate({index,actionIndex,hitIndex,skills,commands,combatBuild='pc-res144-build51'}){
  if(index?.kind!=='MORIMENS_REPLAY_EVENT_INDEX'||index.build!=='pc-res144-build51'||!builds.has(combatBuild))throw new Error('Supported replay protocol and explicit combat build required');
  const action=index.actionSnapshots?.[actionIndex];
  if(!action||action.actionIndex!==actionIndex||action.boundaryStatus!=='COMPLETE')throw new Error('Complete card-use boundary required');
  const snapshots=action.window?.hitSnapshots??[],hits=action.window?.hits??[];
  const snapshot=one(snapshots.filter(item=>item.hitIndex===hitIndex&&item.boundaryStatus==='COMPLETE'),'Complete selected hit snapshot');
  const hit=one(hits.filter(item=>item.recordIndex===snapshot.recordIndex&&item.frameIndex===snapshot.frameIndex),'Matching hit identity');
  if(hit.data?.beHitConfig?.damageType!==6)throw new Error('Fixed hit type 6 required');
  if(hits.some(item=>item.recordIndex<snapshot.recordIndex||(item.recordIndex===snapshot.recordIndex&&item.frameIndex<snapshot.frameIndex)))throw new Error('Prior hit in action could change Fixed inputs');
  const played=action.cards?.[String(action.cardUid)],card=snapshot.cards?.[String(action.cardUid)];
  if(!played||!card||played.tid!==card.tid||played.ownerUid!==card.ownerUid||played.camp!==card.camp)throw new Error('Stable played-card identity required');
  const caster=snapshot.roles?.[String(card.ownerUid)],startCaster=action.roles?.[String(card.ownerUid)];
  const targetUid=hit.data.roleUid,target=snapshot.roles?.[String(targetUid)],startTarget=action.roles?.[String(targetUid)];
  const player=one(Object.values(snapshot.roles??{}).filter(role=>role?.roleType===3&&role.camp===card.camp),'Same-camp player');
  const startPlayer=action.roles?.[String(player.uid)];
  if(!caster||caster.roleType!==1||caster.camp!==card.camp||!startCaster||!target||target.roleType!==2||target.camp===card.camp||!startTarget||!startPlayer)throw new Error('Stable Awakener, player and enemy required');
  if(hit.data.beHitConfig.castRoleUid!==caster.uid||hit.data.beHitConfig.skillConfigId!==card.tid)throw new Error('Hit identity does not match played card');
  const enemies=Object.values(action.roles??{}).filter(role=>role?.roleType===2&&role.camp!==card.camp&&Number.isFinite(role.properties?.hp)&&role.properties.hp>0);
  if(enemies.length!==1||enemies[0].uid!==targetUid)throw new Error('Exactly one living enemy required for outcome-free target binding');
  const skill=skills?.[String(card.tid)],commandId=skill?.CmdList;
  if(skill?.ID!==card.tid||!Number.isSafeInteger(commandId))throw new Error('Scalar Fixed skill command required');
  const imported=importCommandRows(commands?.[String(commandId)]),rows=imported.rows.filter(row=>row.Type==='BEFixedDamage');
  if(!rows.length||imported.rows.some(row=>row.Type!=='BEFixedDamage'&&/Damage/.test(row.Type)))throw new Error('Unambiguous Fixed-only damage command required');
  if(rows.some(row=>!targets.has(row.Target)||Object.keys(row).some(key=>!['id','Type','Target','Para','Cond','VFX','DelayTime'].includes(key))))throw new Error('Supported Fixed row and target required');
  const argumentsList=argsOf(card),startStates=stateRegistry(action.activeStates),hitStates=stateRegistry(snapshot.activeStates);
  const identity={caster:caster.uid,target:targetUid,player:player.uid,card:card.uid};
  const referenced=rows.flatMap(row=>[String(row.Cond??''),String(row.Para??'')].flatMap(expression=>[...expression.matchAll(/(CmdCaster|UpperTarget|PlayerRole|CurCard|OwnerCard)\.GetStateLayer\((\d+)\)/g)].map(match=>[match[1],Number(match[2])])))
    .filter(([owner,stateId],index,items)=>items.findIndex(([otherOwner,otherStateId])=>owner===otherOwner&&stateId===otherStateId)===index);
  for(const [owner,stateId] of referenced){
    const uid=identity[owners[owner]],before=getLiveStateLayer({registry:startStates,ownerUid:uid,stateId}),atHit=getLiveStateLayer({registry:hitStates,ownerUid:uid,stateId});
    if(before!==atHit)throw new Error('Referenced state changed before or during first hit');
  }
  const dimension=finiteModifier(player,'dimension_fix_per');
  if(dimension!==finiteModifier(startPlayer,'dimension_fix_per'))throw new Error('Dimension modifier changed before or during first hit');
  const fixed={};
  for(let n=1;n<=5;n++){
    const key=`be_fixed_damage_per${n}`;
    fixed[`fixed${n}`]=finiteModifier(target,key);
    if(fixed[`fixed${n}`]!==finiteModifier(startTarget,key))throw new Error('Fixed target modifier changed before or during first hit');
  }
  const variables=Object.fromEntries(argumentsList.map((value,i)=>[`Arg${i+1}`,value]));
  const read=name=>{
    if(Object.hasOwn(variables,name))return variables[name];
    if(name==='PlayerRole.dimension_fix_per')return dimension;
    return undefined;
  };
  const call=(name,values)=>{
    const owner=name.slice(0,-'.GetStateLayer'.length);
    if(!Object.hasOwn(owners,owner)||values.length!==1||!Number.isSafeInteger(values[0]))throw new Error('Unsupported Fixed expression function');
    return getLiveStateLayer({registry:hitStates,ownerUid:identity[owners[owner]],stateId:values[0]});
  };
  const eligible=rows.map(row=>({row,condition:row.Cond?compileCommandCondition(row.Cond,{allowedFunctions:callNames})(read,call):null})).filter(item=>item.condition===null||item.condition.passed);
  if(!eligible.length)throw new Error('No eligible Fixed row');
  const alternatives=eligible.map(item=>{
    const parameters=compileNumericCommand(item.row.Para,{allowedFunctions:callNames})(read,call).values;
    if(parameters.length<1||parameters.length>2||!Number.isFinite(parameters[0])||(parameters[1]??1)!==1)throw new Error('One-hit Fixed parameter shape required');
    const effect={build:combatBuild,category:'FIXED',targetDead:false,baseDamage:parameters[0],dimensionFixPer:dimension,...fixed};
    const scenario={mode:'experimental',build:combatBuild,damageType:'FIXED',effect};
    const calculated=calculateDamage(scenario),model=one(calculated.experimentalModels.filter(row=>Number.isFinite(row.preHitDamage)),'Fixed pre-hit model');
    return {rowId:item.row.id,parameters,scenario,model};
  });
  if(new Set(alternatives.map(item=>item.model.preHitDamage)).size!==1)throw new Error('Eligible Fixed rows predict different damage');
  const selected=alternatives[0],{parameters,scenario,model}=selected;
  return {build:combatBuild,status:'CALCULATED_REGRESSION_CANDIDATE',scenario,calculation:{preHitDamage:model.preHitDamage,trace:model.trace},comparison:null,observedHit:null,
    identities:{cardUid:card.uid,skillId:card.tid,casterUid:caster.uid,playerUid:player.uid,targetUid,commandId,rowId:selected.rowId},
    routing:{parameters,eligibleRowIds:alternatives.map(item=>item.rowId),eligibleRowPredictions:alternatives.map(item=>item.model.preHitDamage),targetBindingSource:'single-living-enemy-identity',commandSourceShape:imported.sourceShape,tags:skill.Type??[]},
    repetition:{perExecution:1},unresolvedDependencies:['First-hit Fixed component only','Target, caster and skill identities are frozen inputs','No HP, shield, callback or complete card-action prediction']};
}
