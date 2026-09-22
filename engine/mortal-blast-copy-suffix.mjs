import {snapshot} from './experiments.mjs';
import {selectCopyHistoryCards} from './copy-history-card-selection.mjs';
import {runCreateCardCommand} from './create-card-command.mjs';
import {applyAddNewCardRequest} from './add-new-card.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const supportedBuilds=new Set(['pc-res144-build51','pc-res150-build51']);
const markerIds=[123811,124733];
const stateAttachments=[
  {stateId:2948,layer:1,property:'card_cost',delta:-1},
  {stateId:2454,layer:1,property:'consume',delta:1},
  {stateId:2983,layer:1,property:'nothingness',delta:1},
];

// Authored composition of separately original-runtime-matched boundaries for
// rows 2-5 of Mouchette command 122499. This starts after Arg2 > 1 is proven.
export function runMortalBlastCopySuffix(value){
  const input=snapshot(value),keys=['schemaVersion','kind','build','potencyGreaterThanOne','historySelection','castRoleUid','camp','cardManagerState','allocatedCardUid','maxHand'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-mortal-blast-copy-suffix'||!supportedBuilds.has(input.build)||input.potencyGreaterThanOne!==true)throw new Error('Explicit supported Mortal Blast copy suffix with proven potency required');
  if(!Number.isFinite(input.castRoleUid)||!Number.isFinite(input.camp)||!Number.isSafeInteger(input.allocatedCardUid)||!Number.isSafeInteger(input.maxHand)||input.maxHand<0)throw new Error('Explicit caster, camp, allocated card UID and hand capacity required');
  const selector=input.historySelection;
  if(!selector||selector.build!==input.build||selector.cardTypes?.length!==1||selector.cardTypes[0]!=='Card_Strike'||selector.endNum!==0||selector.beginNum!==99||selector.needNum!==1||selector.skipSameId!==0||selector.exceptCardTypes?.length!==0||JSON.stringify(selector.exceptStateIds)!==JSON.stringify(markerIds))throw new Error('Exact Mortal Blast history selector required');
  const selection=selectCopyHistoryCards(selector),trace=[{rowId:'2:selector',selectedUids:selection.selectedUids}];
  if(selection.selectedCards.length===0)return {schemaVersion:1,status:'EXPERIMENTAL',build:input.build,completed:true,selection,creation:null,lastTargetCards:[],attachedStates:[],cardManagerState:input.cardManagerState,trace:[...trace,{rowId:'2',effect:'BECreateCard',targets:[]},{rowId:'3-5',effect:'BEAddState',targets:[]}],finalDamage:null,unresolvedDependencies:['Live command history reconstruction','Generated-card listeners and later card execution','Gameplay and independent holdout validation']};
  const creation=runCreateCardCommand({schemaVersion:1,kind:'morimens-create-card-command',build:input.build,deckExpression:{cardDeck:'HandDeck',camp:input.camp,targetPos:'TOP'},count:1,enternal:null,show:null,explicitCardArgs:null,castRoleUid:input.castRoleUid,targets:selection.selectedCards.map(card=>({id:card.id,level:card.level,specialOwner:card.specialOwner,performSkillId:card.performSkillId,cardTypes:card.cardTypes,createCardArgs:card.createCardArgs}))});
  if(creation.requests.length!==1)throw new Error('Mortal Blast must produce exactly one card-manager request');
  const manager=applyAddNewCardRequest({schemaVersion:1,kind:'morimens-add-new-card',build:input.build,extraBout:false,request:creation.requests[0],state:input.cardManagerState,allocatedUids:[input.allocatedCardUid],maxHand:input.maxHand});
  const lastTargetCards=manager.returnedCards.map(card=>({...card}));
  const attachedStates=lastTargetCards.flatMap(card=>stateAttachments.map(state=>({cardUid:card.uid,...state})));
  const cardsAfter=lastTargetCards.map(card=>({...card,stateIds:stateAttachments.map(row=>row.stateId),propertyDeltas:Object.fromEntries(stateAttachments.map(row=>[row.property,row.delta]))}));
  trace.push({rowId:'2',effect:'BECreateCard',createdCardUids:manager.createdCards.map(card=>card.uid),returnedTargetUids:lastTargetCards.map(card=>card.uid)});
  for(const state of stateAttachments)trace.push({rowId:String(state.stateId===2948?3:state.stateId===2454?4:5),effect:'BEAddState',stateId:state.stateId,targetUids:lastTargetCards.map(card=>card.uid),property:state.property,delta:state.delta});
  return {schemaVersion:1,status:'EXPERIMENTAL',build:input.build,completed:true,selection,creation,manager,lastTargetCards,cardsAfter,attachedStates,cardManagerState:manager.state,trace,finalDamage:null,
    unresolvedDependencies:['Live command history and manager state reconstruction','State listeners, records and events beyond the proven property storage boundary','Copied-card command execution, gameplay and independent holdout validation']};
}
