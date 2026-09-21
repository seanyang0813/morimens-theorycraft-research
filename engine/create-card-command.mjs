import {snapshot} from './experiments.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const scalar=value=>value===null||['string','number','boolean'].includes(typeof value);
const supportedBuilds=new Set(['pc-res144-build51','pc-res150-build51']);

// Models the tested BECreateCard -> BattleCardMgrServer.AddNewCard request
// boundary. It deliberately stops before deck/hand mutation.
export function runCreateCardCommand(value){
  const input=snapshot(value),keys=['schemaVersion','kind','build','deckExpression','count','enternal','show','explicitCardArgs','castRoleUid','targets'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-create-card-command'||!supportedBuilds.has(input.build))throw new Error('Explicit create-card command required');
  if(!exact(input.deckExpression,['cardDeck','camp'])||typeof input.deckExpression.cardDeck!=='string'||!input.deckExpression.cardDeck||!Number.isFinite(input.deckExpression.camp))throw new Error('Resolved deck expression and camp required');
  if(!['NoneDeck','DrawDeck','HandDeck','HideDeck','GraveyardDeck','ConsumedDeck','UsingDeck','AwakeDeck','SwallowDeck','DimensionDeck','MonsterDimensionDeck','SelectInitDeck','Activity24Deck','BrainDeck',...Array.from({length:20},(_,index)=>`TempDeck${index+1}`)].includes(input.deckExpression.cardDeck))throw new Error('Unsupported card deck');
  if(input.count!==null&&typeof input.count!=='number')throw new Error('Numeric or omitted create-card count required');
  const parsed=input.count===null?1:input.count,count=Math.ceil(parsed);
  if(!Number.isFinite(count)||!Number.isSafeInteger(count))throw new Error('Finite safe create-card count required');
  if(input.enternal!==null&&!scalar(input.enternal))throw new Error('Scalar or omitted enternal value required');
  if(input.show!==null&&(!Number.isFinite(input.show)))throw new Error('Numeric or omitted show flag required');
  if(input.explicitCardArgs!==null&&(!Array.isArray(input.explicitCardArgs)||input.explicitCardArgs.length>10||input.explicitCardArgs.some(item=>!scalar(item))))throw new Error('At most ten explicit scalar card arguments required');
  if(!Number.isFinite(input.castRoleUid)||!Array.isArray(input.targets))throw new Error('Finite caster and target cards required');
  const useExplicit=input.explicitCardArgs!==null&&input.explicitCardArgs.slice(0,3).some(item=>item!==null&&item!==undefined);
  const requests=input.targets.map((target,index)=>{
    const targetKeys=['id','level','specialOwner','performSkillId','cardTypes','createCardArgs'];
    if(!exact(target,targetKeys)||![target.id,target.level,target.performSkillId].every(Number.isFinite)||(target.specialOwner!==null&&!Number.isFinite(target.specialOwner))||!Array.isArray(target.cardTypes)||!Array.isArray(target.createCardArgs)||target.createCardArgs.some(item=>!scalar(item)))throw new Error(`Explicit generated-card target ${index} required`);
    const cards=Array.from({length:Math.max(0,count)},()=>({tid:target.id,level:target.level}));
    return {targetIndex:index,deck:input.deckExpression.cardDeck,cards,config:{enternal:input.enternal??0,show:input.show===null||input.show!==0,cardArgs:useExplicit?[...input.explicitCardArgs]:[...target.createCardArgs],castRoleUid:input.castRoleUid,camp:input.deckExpression.camp,owner:target.specialOwner,performSkillId:target.performSkillId,cardTypes:[...target.cardTypes]}};
  });
  return {schemaVersion:1,status:'EXPERIMENTAL',build:input.build,completed:true,requests,createdCardCount:requests.reduce((sum,request)=>sum+request.cards.length,0),
    unresolvedDependencies:['BattleCardMgrServer.AddNewCard deck mutation, capacity, triggers and returned card UIDs','Generated-card execution and later targeting','Gameplay and independent holdout validation']};
}
