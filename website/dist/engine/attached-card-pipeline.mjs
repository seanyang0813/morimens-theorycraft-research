import {snapshot} from './experiments.mjs';
import {planAttachPostAction} from './attach-post-action.mjs';
import {planUseAttachPostCard} from './use-attach-post-card.mjs';
import {prepareCatalogCardCommandPlan} from './catalog-card-command-plan.mjs';
import {runCommandDamagePrefix} from './command-damage-prefix.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));

// Compose three separately tested boundaries without pretending to execute the
// effect queue. A null cardContext is required when the attach request is gated.
export function runAttachedCardPipeline(value,catalogSource=null){
  const input=snapshot(value);
  if(!exact(input,['schemaVersion','kind','build','attach','cardContext','damagePrefix'])||input.schemaVersion!==1||input.kind!=='morimens-attached-card-pipeline')throw new Error('Explicit attached-card pipeline required');
  if(input.attach?.build!==input.build)throw new Error('Attach request and pipeline builds must agree');
  const attachment=planAttachPostAction(input.attach);
  if(attachment.cardRequests.length===0){
    if(input.cardContext!==null||input.damagePrefix!==null)throw new Error('Gated attach request requires null card and damage-prefix contexts');
    return {schemaVersion:1,status:'EXPERIMENTAL',build:input.build,completed:true,attachment,temporaryCard:null,commandResolution:null,damagePrefix:null,
      unresolvedDependencies:[...new Set([...attachment.unresolvedDependencies,'No temporary card is constructed because the attach request is gated','Gameplay and independent holdout validation'])]};
  }
  if(attachment.cardRequests.length!==1)throw new Error('This pipeline supports exactly one attached-card request');
  if(!exact(input.cardContext,['cardUid','camp','targetType','hasPre','preCmdId','progression'])||!Number.isSafeInteger(input.cardContext.cardUid)||!Number.isSafeInteger(input.cardContext.camp)||!Number.isSafeInteger(input.cardContext.targetType)||typeof input.cardContext.hasPre!=='boolean')throw new Error('Explicit temporary-card context required');
  if(Boolean(input.cardContext.preCmdId)!==input.cardContext.hasPre)throw new Error('Pre-command identity and presence must agree');
  const request=attachment.cardRequests[0];
  const temporaryCard=planUseAttachPostCard({schemaVersion:1,kind:'morimens-use-attach-post-card',build:input.build,skillId:request.skillId,skillLevel:request.skillLevel,camp:input.cardContext.camp,ownerUid:request.targetUid,cardUid:input.cardContext.cardUid,targetType:input.cardContext.targetType,hasPre:input.cardContext.hasPre,isTriggerBST:request.attachPostParam.isTriggerBST});
  const resolved=prepareCatalogCardCommandPlan({schemaVersion:1,kind:'morimens-catalog-card-command-plan',build:input.build,card:{uid:input.cardContext.cardUid,tid:request.skillId,level:request.skillLevel,createCardArgs:[],resolvedOwnerUid:request.targetUid},preCmdId:input.cardContext.preCmdId,progression:input.cardContext.progression},catalogSource);
  let damagePrefix=null;
  if(input.damagePrefix!==null){
    const keys=['targetBinding','variables','offense','targetModifiers','targetState','repeatModifiers','immune','presentationPolicy'];
    if(!exact(input.damagePrefix,keys)||Object.keys(input.damagePrefix.variables??{}).some(name=>/^Arg\d+$/.test(name)))throw new Error('Explicit damage-prefix context without Arg overrides required');
    damagePrefix=runCommandDamagePrefix({schemaVersion:1,kind:'morimens-command-damage-prefix',build:input.build,command:catalogSource.commands[String(resolved.commandId)],...input.damagePrefix,variables:{...input.damagePrefix.variables,...resolved.plan.argumentBindings}});
  }
  return {schemaVersion:1,status:'EXPERIMENTAL',build:input.build,planningCompleted:true,completed:damagePrefix===null||damagePrefix.completed,attachment,temporaryCard,commandResolution:{sourceHashes:resolved.sourceHashes,skillId:resolved.skillId,commandId:resolved.commandId,baseArguments:resolved.baseArguments,prepared:resolved.prepared,command:resolved.command,plan:resolved.plan},damagePrefix,
    unresolvedDependencies:[...new Set([...attachment.unresolvedDependencies,...temporaryCard.unresolvedDependencies,...resolved.unresolvedDependencies,...(damagePrefix?.unresolvedDependencies??[]),damagePrefix?'Only the leading supported damage prefix executes; the full command remains incomplete':'Effect requests and command rows are preserved but not executed','Gameplay and independent holdout validation'])]};
}
