import {snapshot} from './experiments.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const supportedBuilds=new Set(['pc-res144-build51','pc-res150-build51']);
const scalar=value=>value===null||['string','number','boolean'].includes(typeof value);
const intersects=(left,right)=>left.some(item=>right.includes(item));

// Original GetBoutHistoryCard traversal for Copy history. Reconstructed-card
// metadata is explicit; this function does not invent or mutate card instances.
export function selectCopyHistoryCards(value){
  const input=snapshot(value),keys=['schemaVersion','kind','build','cardTypes','endNum','beginNum','needNum','skipSameId','exceptCardTypes','exceptStateIds','history'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-copy-history-card-selection'||!supportedBuilds.has(input.build))throw new Error('Explicit supported copy-history selection required');
  for(const [name,list] of [['cardTypes',input.cardTypes],['exceptCardTypes',input.exceptCardTypes],['exceptStateIds',input.exceptStateIds]])if(!Array.isArray(list)||new Set(list).size!==list.length)throw new Error(`Unique ${name} list required`);
  if(!input.cardTypes.length||input.cardTypes.some(item=>typeof item!=='string'||!item)||input.exceptCardTypes.some(item=>typeof item!=='string'||!item)||input.exceptStateIds.some(item=>!Number.isSafeInteger(item)))throw new Error('Typed history filters required');
  if(![input.endNum,input.beginNum,input.needNum].every(Number.isSafeInteger)||input.endNum<0||input.beginNum<0||input.needNum<0||![0,1].includes(input.skipSameId)||!Array.isArray(input.history))throw new Error('Nonnegative history range/count and numeric duplicate policy required');
  const seenUids=new Set(),allCards=[];
  for(const [boutIndex,bout] of input.history.entries()){
    if(!Array.isArray(bout))throw new Error(`History bout ${boutIndex} must be a list`);
    for(const [cardIndex,card] of bout.entries()){
      const cardKeys=['uid','id','level','camp','specialOwner','performSkillId','cardTypes','stateIds','createCardArgs'];
      if(!exact(card,cardKeys)||![card.uid,card.id,card.level,card.camp,card.performSkillId].every(Number.isFinite)||(card.specialOwner!==null&&!Number.isFinite(card.specialOwner))||!Array.isArray(card.cardTypes)||card.cardTypes.some(item=>typeof item!=='string'||!item)||!Array.isArray(card.stateIds)||card.stateIds.some(item=>!Number.isSafeInteger(item))||!Array.isArray(card.createCardArgs)||card.createCardArgs.some(item=>!scalar(item)))throw new Error(`Explicit reconstructed history card required at ${boutIndex}:${cardIndex}`);
      if(seenUids.has(card.uid))throw new Error('History card UIDs must be unique');seenUids.add(card.uid);allCards.push(card);
    }
  }
  let endNum=input.endNum;const parameterAdjustments=[];
  if(endNum>input.beginNum){parameterAdjustments.push({field:'endNum',before:endNum,after:input.beginNum,reason:'Original CheckHistoryCardParam clamps endNum to beginNum'});endNum=input.beginNum;}
  const length=input.history.length,beginIndex=Math.max(0,length-input.beginNum),endIndex=Math.max(0,length-endNum),selected=[],selectedIds=new Set(),trace=[];
  let remaining=input.needNum;
  for(let oneBasedBout=endIndex;oneBasedBout>=beginIndex&&remaining>0;oneBasedBout--){
    if(oneBasedBout===0){trace.push({boutIndex:null,decision:'STOP_MISSING_BOUT_ZERO'});break;}
    const bout=input.history[oneBasedBout-1];
    if(!bout){trace.push({boutIndex:oneBasedBout,decision:'STOP_MISSING_BOUT'});break;}
    for(let cardOffset=bout.length-1;cardOffset>=0&&remaining>0;cardOffset--){
      const card=bout[cardOffset];let decision='SELECT';
      if(input.skipSameId===1&&selectedIds.has(card.id))decision='SKIP_DUPLICATE_ID';
      else if(!intersects(card.cardTypes,input.cardTypes))decision='SKIP_REQUIRED_TYPE';
      else if(intersects(card.cardTypes,input.exceptCardTypes))decision='SKIP_EXCLUDED_TYPE';
      else if(input.exceptStateIds.length&&intersects(card.stateIds,input.exceptStateIds))decision='SKIP_EXCLUDED_STATE';
      trace.push({boutIndex:oneBasedBout,cardIndex:cardOffset+1,uid:card.uid,id:card.id,decision});
      if(decision==='SELECT'){selected.push({...card});selectedIds.add(card.id);remaining--;}
    }
  }
  return {schemaVersion:1,status:'EXPERIMENTAL',build:input.build,completed:true,selectedCards:selected,selectedUids:selected.map(card=>card.uid),requestedCount:input.needNum,unfilledCount:remaining,effectiveRange:{endNum,beginNum:input.beginNum,beginIndex,endIndex},parameterAdjustments,trace,finalDamage:null,
    unresolvedDependencies:['Copy-history entries and their reconstructed card/state metadata must come from the live command boundary','This selects cards only; BECreateCard mutation, LastTarget state attachment and later card execution are separate','Gameplay and independent holdout validation']};
}
