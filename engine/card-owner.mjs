import {snapshot} from './experiments.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const nullableFinite=value=>value===null||Number.isFinite(value);
const supportedBuilds=new Set(['pc-res144-build51','pc-res150-build51']);

export function resolveCardOwner(value){
  const input=snapshot(value),keys=['schemaVersion','kind','build','camp','skillAwakerId','playerUid','specialOwnerUid','configuredAwakerUid','fromCardUid','fromCard','performSkillId'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-card-owner'||!supportedBuilds.has(input.build)||![input.camp,input.playerUid,input.performSkillId].every(Number.isFinite)||![input.skillAwakerId,input.specialOwnerUid,input.configuredAwakerUid,input.fromCardUid].every(nullableFinite))throw new Error('Explicit card-owner context required');
  if(input.fromCard!==null&&(!exact(input.fromCard,['uid','ownerUid','performSkillId'])||![input.fromCard.uid,input.fromCard.ownerUid,input.fromCard.performSkillId].every(Number.isFinite)))throw new Error('Explicit source-card lookup result required');
  if(input.fromCard!==null&&input.fromCard.uid!==input.fromCardUid)throw new Error('Source-card lookup UID mismatch');
  const trace=[{lookup:'player',camp:input.camp,resultUid:input.playerUid}];
  if(input.skillAwakerId===null)return {schemaVersion:1,status:'SUPPORTED_BY_RUNTIME_TEST',build:input.build,ownerUid:input.playerUid,performSkillId:input.performSkillId,ownerSource:'player-non-awakener-skill',trace};
  if(input.specialOwnerUid!==null)return {schemaVersion:1,status:'SUPPORTED_BY_RUNTIME_TEST',build:input.build,ownerUid:input.specialOwnerUid,performSkillId:input.performSkillId,ownerSource:'special-owner',trace};
  trace.push({lookup:'configured-awakener',awakerId:input.skillAwakerId,camp:input.camp,resultUid:input.configuredAwakerUid});
  if(input.configuredAwakerUid!==null)return {schemaVersion:1,status:'SUPPORTED_BY_RUNTIME_TEST',build:input.build,ownerUid:input.configuredAwakerUid,performSkillId:input.performSkillId,ownerSource:'configured-awakener',trace};
  if(input.fromCardUid!==null){
    trace.push({lookup:'source-card',cardUid:input.fromCardUid,resultUid:input.fromCard?.ownerUid??null});
    if(input.fromCard!==null)return {schemaVersion:1,status:'SUPPORTED_BY_RUNTIME_TEST',build:input.build,ownerUid:input.fromCard.ownerUid,performSkillId:input.fromCard.performSkillId,ownerSource:'source-card',trace};
  }
  return {schemaVersion:1,status:'SUPPORTED_BY_RUNTIME_TEST',build:input.build,ownerUid:input.playerUid,performSkillId:input.performSkillId,ownerSource:'player-fallback',trace};
}
