import {snapshot} from './experiments.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const supportedBuilds=new Set(['pc-res144-build51','pc-res150-build51']);

export function initializeCardCommands(value){
  const input=snapshot(value),keys=['schemaVersion','kind','build','card','preCmdId','cmdId'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-card-command-init'||!supportedBuilds.has(input.build)||!exact(input.card,['uid','tid','level','createCardArgs','resolvedOwnerUid'])||![input.card.uid,input.card.tid,input.card.level,input.card.resolvedOwnerUid,input.cmdId].every(Number.isFinite)||(input.preCmdId!==null&&!Number.isFinite(input.preCmdId))||!Array.isArray(input.card.createCardArgs)||input.card.createCardArgs.some(value=>!Number.isFinite(value)))throw new Error('Explicit card command initialization required');
  const shared={skillLevel:input.card.level,skillConfigId:input.card.tid,cardUid:input.card.uid,castRoleUid:input.card.resolvedOwnerUid,createCardArgs:[...input.card.createCardArgs]},requests=[];
  if(input.preCmdId!==null)requests.push({...shared,cmdId:input.preCmdId,isPreCmd:true});
  requests.push({...shared,cmdId:input.cmdId,isPreCmd:null});
  return {schemaVersion:1,status:'SUPPORTED_BY_RUNTIME_TEST',build:input.build,preCommand:requests.length===2?requests[0]:null,mainCommand:requests[requests.length-1],requests,getSkillArgsCalledOnMain:true,unresolvedDependencies:['BattleCmdServer constructor internals and command expression initialization','Generated-card play, effect execution and listeners','Gameplay and independent holdout validation']};
}
