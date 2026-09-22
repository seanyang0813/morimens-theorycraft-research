// Bounded source-derived Wheel trigger transitions for supported PC catalogs.
// These functions advance explicit combat state; they do not create cards or calculate damage.
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const refinement=value=>Number.isSafeInteger(value)&&value>=0&&value<=3;
const supportedBuilds=new Set(['pc-res144-build51','pc-res150-build51']);

export function advanceDoomsdayAfterUseCard(input){
  const keys=['schemaVersion','kind','build','wheelId','refinementLevel','cardType','ownerAttack','counter','strikecardDamagePlus'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-after-use-card-wheel-trigger'||!supportedBuilds.has(input.build)||input.wheelId!=='wheel-0029'||!refinement(input.refinementLevel)||typeof input.cardType!=='string'||!Number.isFinite(input.ownerAttack)||input.ownerAttack<0||!Number.isSafeInteger(input.counter)||input.counter<0||input.counter>8||!Number.isFinite(input.strikecardDamagePlus))throw new Error('Explicit supported Doomsday after-card state required');
  const flatPercent=13+input.refinementLevel*4;
  const ownerAttackSourceProperty=input.build==='pc-res150-build51'?'AtkForce':'atk';
  const eligible=input.cardType==='Card_Strike'&&input.counter<8;
  const addedStrikecardDamagePlus=eligible?Math.ceil(input.ownerAttack*flatPercent*0.01):0;
  return {
    schemaVersion:1,kind:'morimens-after-use-card-wheel-trigger-result',analysisTrack:'theorycrafting',status:'SOURCE_DERIVED_TRANSITION',
    event:'BSTAfterUseCard',wheelId:input.wheelId,refinementLevel:input.refinementLevel,ownerAttackSourceProperty,
    damageSnapshot:{counter:input.counter,strikecardDamagePlus:input.strikecardDamagePlus},
    transition:{eligible,flatPercent,addedStrikecardDamagePlus,counterBefore:input.counter,counterAfter:input.counter+(eligible?1:0),strikecardDamagePlusBefore:input.strikecardDamagePlus,strikecardDamagePlusAfter:input.strikecardDamagePlus+addedStrikecardDamagePlus},
    finalDamage:null,
    limitations:['The triggering card has already been used; damageSnapshot is the state available to that card',`Models State123521/Cmd124065/State124066/counter123518 for ${input.build}; ownerAttack must be the live StateOwner.${ownerAttackSourceProperty} value`,'Does not create or play the Strike, calculate damage, clear turn-scoped state, execute callbacks or validate gameplay']
  };
}

export function advanceLightOfIntellectAfterKeeperSkill(input){
  const keys=['schemaVersion','kind','build','wheelId','refinementLevel','counter','roll','matchingStrikeAvailable'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-after-keeper-skill-wheel-trigger'||!supportedBuilds.has(input.build)||input.wheelId!=='wheel-0117'||!refinement(input.refinementLevel)||![0,1].includes(input.counter)||!Number.isSafeInteger(input.roll)||input.roll<1||input.roll>100||typeof input.matchingStrikeAvailable!=='boolean')throw new Error('Explicit supported Light of Intellect keeper-skill state required');
  const chancePercent=55+input.refinementLevel*15,conditionPassed=input.roll<=chancePercent&&input.counter===0;
  return {
    schemaVersion:1,kind:'morimens-after-keeper-skill-wheel-trigger-result',analysisTrack:'theorycrafting',status:'SOURCE_DERIVED_TRANSITION',event:'BSTAfterUseKeeperSkill',wheelId:input.wheelId,refinementLevel:input.refinementLevel,
    transition:{chancePercent,roll:input.roll,counterBefore:input.counter,conditionPassed,moveRequested:conditionPassed,movedCardCount:conditionPassed&&input.matchingStrikeAvailable?1:0,sourceZones:['DrawDeck','GraveyardDeck'],ownerFilter:'WHEEL_OWNER',cardTypeFilter:'Card_Strike',destinationZone:'HandDeck',destinationPosition:'TOP',counterAfter:1,clearEvents:['BSTAfterBoutEnd','BSTBeforeBattleEnd']},
    finalDamage:null,
    limitations:['Models the configured condition, one-card request and unconditional once-per-turn counter only','matchingStrikeAvailable is an explicit aggregate input; exact draw/grave ordering and card identity are not reconstructed','Does not execute deck mutation, consume a Keeper skill, advance the RNG stream, dispatch callbacks or validate gameplay']
  };
}

const arachneWheels=Object.freeze({
  'wheel-0128':{counterStateId:134383,amplification:level=>25+level*5,counterClearEvents:['BSTAfterBoutEnd','BSTBeforeBattleEnd']},
  'wheel-0132':{counterStateId:134382,amplification:level=>9+level*2,counterClearEvents:['BSTBeforeBattleEnd']},
});

export function advanceArachneAfterPursuit(input){
  const keys=['schemaVersion','kind','build','ownerUid','pursuitOwnerUid','basicDamagePer','wheels'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-after-pursuit-wheel-triggers'||!supportedBuilds.has(input.build)||!Number.isSafeInteger(input.ownerUid)||!Number.isSafeInteger(input.pursuitOwnerUid)||!Number.isFinite(input.basicDamagePer)||!Array.isArray(input.wheels)||input.wheels.length>2)throw new Error('Explicit supported Arachne pursuit-Wheel state required');
  const seen=new Set();let basicDamagePer=input.basicDamagePer;
  const transitions=input.wheels.map(wheel=>{
    if(!exact(wheel,['slotId','wheelId','refinementLevel','triggersUsed'])||typeof wheel.slotId!=='string'||!wheel.slotId||seen.has(wheel.slotId)||!Object.hasOwn(arachneWheels,wheel.wheelId)||!refinement(wheel.refinementLevel)||!Number.isSafeInteger(wheel.triggersUsed)||wheel.triggersUsed<0||wheel.triggersUsed>5)throw new Error('Each Arachne Wheel trigger state must be supported and explicit');
    seen.add(wheel.slotId);const definition=arachneWheels[wheel.wheelId],eligible=input.ownerUid===input.pursuitOwnerUid&&wheel.triggersUsed<5,addedBasicDamagePer=eligible?definition.amplification(wheel.refinementLevel):0;
    const result={slotId:wheel.slotId,wheelId:wheel.wheelId,refinementLevel:wheel.refinementLevel,counterStateId:definition.counterStateId,counterClearEvents:[...definition.counterClearEvents],eligible,addedBasicDamagePer,triggersUsedBefore:wheel.triggersUsed,triggersUsedAfter:wheel.triggersUsed+(eligible?1:0),basicDamagePerBefore:basicDamagePer,basicDamagePerAfter:basicDamagePer+addedBasicDamagePer};
    basicDamagePer=result.basicDamagePerAfter;return result;
  });
  return {
    schemaVersion:1,kind:'morimens-after-pursuit-wheel-triggers-result',analysisTrack:'theorycrafting',status:'SOURCE_DERIVED_TRANSITION',event:'BSTAfterAttachPostAction',
    ownerMatched:input.ownerUid===input.pursuitOwnerUid,basicDamagePerBefore:input.basicDamagePer,basicDamagePerAfter:basicDamagePer,addedBasicDamagePer:basicDamagePer-input.basicDamagePer,transitions,finalDamage:null,
    propertyClearEvents:['BSTAfterBoutEnd','BSTBeforeBattleEnd'],
    limitations:['The pursuit must already exist; this operation only advances the two supported Wheel trigger states','Owner identity follows the source judgement, so another character pursuit does not trigger Arachne-owned Wheels','Eternal Weave counter clears after each turn; Rota Fortunae counter persists until battle end; their shared temporary amplification clears after each turn',`Models State134231/Cmd134385 and State134313/Cmd134386 for ${input.build}; the unregistered TriggerCmd2 field is excluded`,'Does not create pursuits, calculate damage, execute lifecycle events or callbacks, or validate gameplay']
  };
}
