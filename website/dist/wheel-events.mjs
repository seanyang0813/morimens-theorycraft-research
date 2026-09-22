export function startWheelEventLab({advanceDoomsdayAfterUseCard,advanceLightOfIntellectAfterKeeperSkill,advanceArachneAfterPursuit,runtimeFingerprint},doc=document){
  const $=id=>doc.getElementById(id);
  const examples={
    doomsday:{schemaVersion:1,kind:'morimens-after-use-card-wheel-trigger',build:'pc-res144-build51',wheelId:'wheel-0029',refinementLevel:3,cardType:'Card_Strike',ownerAttack:1000,counter:0,strikecardDamagePlus:0},
    light:{schemaVersion:1,kind:'morimens-after-keeper-skill-wheel-trigger',build:'pc-res144-build51',wheelId:'wheel-0117',refinementLevel:3,counter:0,roll:100,matchingStrikeAvailable:true},
    arachne:{schemaVersion:1,kind:'morimens-after-pursuit-wheel-triggers',build:'pc-res144-build51',ownerUid:56,pursuitOwnerUid:56,basicDamagePer:150,wheels:[{slotId:'wheel-1',wheelId:'wheel-0128',refinementLevel:3,triggersUsed:0},{slotId:'wheel-2',wheelId:'wheel-0132',refinementLevel:3,triggersUsed:0}]}
  };
  const calculate=input=>{
    if(input.kind==='morimens-after-use-card-wheel-trigger')return advanceDoomsdayAfterUseCard(input);
    if(input.kind==='morimens-after-keeper-skill-wheel-trigger')return advanceLightOfIntellectAfterKeeperSkill(input);
    if(input.kind==='morimens-after-pursuit-wheel-triggers')return advanceArachneAfterPursuit(input);
    throw new Error('Unsupported Wheel event request kind');
  };
  const render=input=>{
    const result=calculate(input);let summary;
    if(result.kind==='morimens-after-use-card-wheel-trigger-result')summary=`Strike flat damage ${result.transition.strikecardDamagePlusBefore} → ${result.transition.strikecardDamagePlusAfter}; counter ${result.transition.counterBefore} → ${result.transition.counterAfter}`;
    else if(result.kind==='morimens-after-keeper-skill-wheel-trigger-result')summary=`Move request ${result.transition.moveRequested?'passed':'did not pass'}; ${result.transition.movedCardCount} card moved; counter ${result.transition.counterBefore} → ${result.transition.counterAfter}`;
    else summary=`Team damage amplification ${result.basicDamagePerBefore}% → ${result.basicDamagePerAfter}% (${result.addedBasicDamagePer>=0?'+':''}${result.addedBasicDamagePer})`;
    $('result').hidden=false;$('summary').textContent=summary;$('scope').textContent=`${result.event} · ${result.status} · finalDamage is ${result.finalDamage}`;$('output').textContent=JSON.stringify({...result,runtimeFingerprint},null,2);$('error').textContent='';
  };
  $('run').onclick=()=>{try{render(JSON.parse($('input').value));}catch(error){$('result').hidden=true;$('error').textContent=error.message;}};
  for(const id of Object.keys(examples))$(id).onclick=()=>{$('input').value=JSON.stringify(examples[id],null,2);render(examples[id]);};
  $('runtime-status').textContent=`Verified local engine ${runtimeFingerprint.slice(0,12)}…`;
}
