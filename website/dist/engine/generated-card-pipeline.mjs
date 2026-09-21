import {snapshot} from './experiments.mjs';
import {runCreateCardCommand} from './create-card-command.mjs';
import {applyAddNewCardRequest} from './add-new-card.mjs';
import {resolveCardOwner} from './card-owner.mjs';
import {prepareCardCommandPlan} from './card-command-plan.mjs';
import {prepareCatalogCardCommandPlan} from './catalog-card-command-plan.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const supportedBuilds=new Set(['pc-res144-build51','pc-res150-build51']);

export function runGeneratedCardPipeline(value,catalogSource=null){
  const input=snapshot(value),keys=['schemaVersion','kind','build','create','manager','ownerContexts','commandContexts'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-generated-card-pipeline'||!supportedBuilds.has(input.build))throw new Error('Explicit generated-card pipeline required');
  if(!exact(input.manager,['extraBout','maxHand','initialState','allocatedUidsByRequest'])||typeof input.manager.extraBout!=='boolean'||!Number.isSafeInteger(input.manager.maxHand)||!Array.isArray(input.manager.allocatedUidsByRequest)||!Array.isArray(input.ownerContexts)||!Array.isArray(input.commandContexts))throw new Error('Explicit generated-card manager context required');
  const creation=runCreateCardCommand(input.create);
  if(creation.build!==input.build||input.manager.allocatedUidsByRequest.length!==creation.requests.length)throw new Error('Creation and manager request counts/build must agree');
  let state=input.manager.initialState;const managerResults=[],createdCards=[];
  for(let index=0;index<creation.requests.length;index++){
    const result=applyAddNewCardRequest({schemaVersion:1,kind:'morimens-add-new-card',build:input.build,extraBout:input.manager.extraBout,request:creation.requests[index],state,allocatedUids:input.manager.allocatedUidsByRequest[index],maxHand:input.manager.maxHand});
    managerResults.push(result);createdCards.push(...result.createdCards);state=result.state;
  }
  if(input.ownerContexts.length!==createdCards.length)throw new Error('One owner-resolution context per constructed card required');
  const cards=createdCards.map((card,index)=>{
    const context=input.ownerContexts[index];
    if(context.build!==input.build||context.camp!==card.camp||context.specialOwnerUid!==card.owner||context.performSkillId!==card.performSkillId)throw new Error(`Owner context ${index} does not match constructed card metadata`);
    const ownership=resolveCardOwner(context);return {...card,resolvedOwnerUid:ownership.ownerUid,resolvedPerformSkillId:ownership.performSkillId,ownerSource:ownership.ownerSource,ownerTrace:ownership.trace};
  });
  if(input.commandContexts.length!==cards.length)throw new Error('One command context per constructed card required');
  const commandPlans=cards.map((card,index)=>{
    const context=input.commandContexts[index],cardInput={uid:card.uid,tid:card.tid,level:card.level,createCardArgs:card.cardArgs,resolvedOwnerUid:card.resolvedOwnerUid};
    if(exact(context,['preCmdId','cmdId','rawSkillArguments']))return prepareCardCommandPlan({schemaVersion:1,kind:'morimens-card-command-plan',build:input.build,card:cardInput,preCmdId:context.preCmdId,cmdId:context.cmdId,rawSkillArguments:context.rawSkillArguments});
    if(exact(context,['preCmdId','progression'])){
      const resolved=prepareCatalogCardCommandPlan({schemaVersion:1,kind:'morimens-catalog-card-command-plan',build:input.build,card:cardInput,preCmdId:context.preCmdId,progression:context.progression},catalogSource);
      return {...resolved.plan,catalogResolution:{sourceHashes:resolved.sourceHashes,skillId:resolved.skillId,commandId:resolved.commandId,baseArguments:resolved.baseArguments,prepared:resolved.prepared,command:resolved.command},unresolvedDependencies:resolved.unresolvedDependencies};
    }
    throw new Error(`Explicit or catalog command context ${index} required`);
  });
  const creationUnresolved=creation.unresolvedDependencies.filter(item=>!item.startsWith('BattleCardMgrServer.AddNewCard'));
  return {schemaVersion:1,status:'EXPERIMENTAL',build:input.build,completed:true,creation,managerResults,cards,commandPlans,state,returnedCardUids:managerResults.flatMap(result=>result.returnedCards.map(card=>card.uid)),
    unresolvedDependencies:[...new Set([...creationUnresolved,...managerResults.flatMap(result=>result.unresolvedDependencies),...commandPlans.flatMap(result=>result.unresolvedDependencies),'Card state initialization and generated-card execution','Gameplay and independent holdout validation'])]};
}
