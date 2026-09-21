import {snapshot} from './experiments.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const ids=value=>Array.isArray(value)&&value.every(Number.isFinite)&&new Set(value).size===value.length;
const supportedBuilds=new Set(['pc-res144-build51','pc-res150-build51']);

// Tested BattleCardMgrServer.AddNewCard subset. Card construction is represented
// by immutable records; listeners and factory-side initialization stay external.
export function applyAddNewCardRequest(value){
  const input=snapshot(value),keys=['schemaVersion','kind','build','extraBout','request','state','allocatedUids','maxHand'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-add-new-card'||!supportedBuilds.has(input.build)||typeof input.extraBout!=='boolean')throw new Error('Explicit AddNewCard request required');
  const request=input.request;
  const configKeys=['enternal','show','cardArgs','castRoleUid','camp','owner','performSkillId','cardTypes'],hasTargetPos=request?.config&&Object.hasOwn(request.config,'targetPos');
  if(!exact(request,['targetIndex','deck','cards','config'])||!Number.isSafeInteger(request.targetIndex)||request.targetIndex<0||!['DrawDeck','HandDeck','DimensionDeck'].includes(request.deck)||!Array.isArray(request.cards)||!exact(request.config,[...configKeys,...(hasTargetPos?['targetPos']:[])]))throw new Error('Supported generated-card manager request required');
  if(!request.cards.every(card=>exact(card,['tid','level'])&&Number.isFinite(card.tid)&&Number.isFinite(card.level))||!Number.isFinite(request.config.camp)||typeof request.config.show!=='boolean'||!Array.isArray(request.config.cardArgs)||!Array.isArray(request.config.cardTypes))throw new Error('Explicit card descriptors and manager metadata required');
  if(!ids(input.allocatedUids)||input.allocatedUids.length!==request.cards.length)throw new Error('One unique allocated UID per requested card required');
  if(!Number.isSafeInteger(input.maxHand)||input.maxHand<0)throw new Error('Explicit nonnegative hand capacity required');
  if(!exact(input.state,['decks','enternalCardUids'])||!exact(input.state.decks,['NoneDeck','DrawDeck','HandDeck','DimensionDeck'])||Object.values(input.state.decks).some(deck=>!ids(deck))||!ids(input.state.enternalCardUids))throw new Error('Explicit supported deck state required');
  const allExisting=Object.values(input.state.decks).flat();
  if(new Set(allExisting).size!==allExisting.length||input.state.enternalCardUids.some(uid=>!allExisting.includes(uid))||input.allocatedUids.some(uid=>allExisting.includes(uid)||input.state.enternalCardUids.includes(uid)))throw new Error('Deck, eternal and allocated UID state is inconsistent');
  if(request.deck==='DimensionDeck'){
    if(!input.extraBout)throw new Error('Ordinary DimensionDeck capacity is unresolved');
    return {schemaVersion:1,status:'EXPERIMENTAL',build:input.build,completed:true,returnedCards:[],createdCards:[],state:input.state,records:[],events:[],unresolvedDependencies:['Ordinary DimensionDeck and MonsterDimensionDeck capacity','Card factory initialization and entry listeners','Gameplay and independent holdout validation']};
  }
  const decks=Object.fromEntries(Object.entries(input.state.decks).map(([name,list])=>[name,[...list]])),enternalCardUids=[...input.state.enternalCardUids],createdCards=[],returnedCards=[],overflowUids=[],events=[];
  for(let index=0;index<request.cards.length;index++){
    const source=request.cards[index],uid=input.allocatedUids[index],overflow=request.deck==='HandDeck'&&decks.HandDeck.length>=input.maxHand,deck=overflow?'NoneDeck':request.deck;
    const card={uid,tid:source.tid,level:source.level,deck,cardArgs:[...request.config.cardArgs],enternal:request.config.enternal,show:request.config.show,camp:request.config.camp,owner:request.config.owner,performSkillId:request.config.performSkillId,cardTypes:[...request.config.cardTypes]};
    createdCards.push(card);
    if(request.config.enternal!==null&&request.config.enternal!==0)enternalCardUids.push(uid);
    if(overflow){decks.NoneDeck.push(uid);overflowUids.push(uid);continue;}
    if(request.config.targetPos===undefined||request.config.targetPos==='BOTTOM')decks[request.deck].push(uid);
    else if(request.config.targetPos==='TOP')decks[request.deck].unshift(uid);
    else throw new Error('Random generated-card placement requires an explicit RNG adapter');
    returnedCards.push(card);events.push({type:'CardDeckChange',cardUid:uid,oldDeck:'NoneDeck',newDeck:request.deck,castRoleUid:request.config.castRoleUid,enternal:request.config.enternal});
  }
  const records=[{type:'OnAddNewCard',cardUids:createdCards.map(card=>card.uid),deck:request.deck,show:request.config.show,camp:request.config.camp}];
  if(overflowUids.length)records.push({type:'OnChangeCardListDeck',cardUids:overflowUids,oldDeck:'NoneDeck',newDeck:'NoneDeck',reason:'NewCard',camp:request.config.camp,show:request.config.show});
  return {schemaVersion:1,status:'EXPERIMENTAL',build:input.build,completed:true,returnedCards,createdCards,state:{decks,enternalCardUids},records,events,
    unresolvedDependencies:['Card factory owner/command/state initialization','Record and CardDeckChange listener execution','Random placement and non-Hand capacity branches','Gameplay and independent holdout validation']};
}
