import {snapshot} from './experiments.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const dense=value=>Array.isArray(value)&&value.length>=1&&value.length<=5&&Array.from({length:value.length},(_,index)=>index).every(index=>Object.hasOwn(value,index)&&Number.isFinite(value[index]));

// One non-monster __DoMultiEffect iteration. Later repetition scheduling and the
// requested temporary card's construction/execution are separate boundaries.
export function planAttachPostAction(value){
  const input=snapshot(value),keys=['schemaVersion','kind','build','parameters','casterUid','targetUid','casterSealAttachPost','targetPresent','targetIsMonster'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-attach-post-action'||input.build!=='pc-res144-build51'||!dense(input.parameters)||!Number.isSafeInteger(input.casterUid)||!Number.isSafeInteger(input.targetUid)||!Number.isFinite(input.casterSealAttachPost)||typeof input.targetPresent!=='boolean'||input.targetIsMonster!==false)throw new Error('Explicit resource-144 non-monster attach-post request required');
  const [skillId,repeat=1,triggerFlag=0,showPerform=0,skillLevel=1]=input.parameters;
  if(!Number.isSafeInteger(skillId)||skillId<=0)throw new Error('Positive attached skill ID required');
  const initialization={totalEffectTimes:repeat,leftEffectTimes:repeat};
  const propertyReads=[],records=[],cardRequests=[];
  if(input.targetPresent){
    propertyReads.push('seal_attachpost');
    if(input.casterSealAttachPost<=0){
      records.push({casterUid:input.casterUid,targetUid:input.targetUid,skillId,showPerform});
      cardRequests.push({targetUid:input.targetUid,skillId,skillLevel,attachPostParam:{isTriggerBST:triggerFlag===1}});
    }
  }
  return {schemaVersion:1,status:'SUPPORTED_BY_RUNTIME_TEST',build:input.build,completed:true,initialization,propertyReads,records,cardRequests,returned:true,
    unresolvedDependencies:['One non-monster iteration only; later repetition scheduling is not executed','UseAttachPostCard is a request boundary; temporary card construction, command execution and callbacks remain separate','No monster path, gameplay or independent holdout validation']};
}
