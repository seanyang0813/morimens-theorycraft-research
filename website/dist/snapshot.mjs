export function startSnapshotCalculator({calculateSnapshotActiveDamage,calculateSnapshotActiveBranches,runSnapshotActiveSequence,runtimeFingerprint},doc=document){
  const $=id=>doc.getElementById(id);
  const example={schemaVersion:2,kind:'morimens-battle-property-snapshot-damage',build:'pc-res151-build51',snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',baseValue:100,skillArgsPlus:0,tags:['Card_Strike'],casterProperties:{crit:100,crit_damage:50,crit_damage_from_strikecard:10,crit_damage_per:0,damage_per2monster_boss:20,PreventActiveDamage:0},playerProperties:{dimension_fix_per:0},targetProperties:{hp:1000,max_hp:1000,block:50,be_damage_per:10,vulnerable_per:50,immue_damage:0,immue_puncture_damage:0,immue_active_damage:0,PreventBeActiveDamage:0,PreventBeActiveDamageRetainHP:0,be_damage_limit:0,be_damage_statics:0,pvp_death_resist:0},cardProperties:{},cardContext:{present:false,instructionCard:false,stateTriggerAdd:false},targetContext:{critRoll:null,targetBattleTag:'Boss',targetStateIds:[]},hitContext:{damageSubtype:'Ordinary'}};
  const sequenceExample={schemaVersion:1,kind:'morimens-snapshot-active-sequence',build:'pc-res151-build51',snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',interveningEffects:'assumed-absent',casterProperties:{crit:0,crit_damage:0,crit_damage_from_strikecard:0,crit_damage_per:0,damage_per2block_enemy:100},playerProperties:{dimension_fix_per:0},initialTargetProperties:{hp:1000,max_hp:1000,block:150,be_damage_per:0,vulnerable_per:0},hits:['hit-1','hit-2'].map(id=>({id,baseValue:100,skillArgsPlus:0,tags:['Card_Strike'],cardProperties:{},cardContext:{present:false,instructionCard:false,stateTriggerAdd:false},targetContext:{critRoll:null,targetBattleTag:'Boss',targetStateIds:[]},hitContext:{damageSubtype:'Ordinary'}}))};
  const chanceExample=JSON.parse(JSON.stringify(example));chanceExample.casterProperties.crit=12;
  const render=input=>{
    const sequence=input.kind==='morimens-snapshot-active-sequence',result=sequence?runSnapshotActiveSequence(input):calculateSnapshotActiveDamage(input);
    const reads=sequence?result.trace.flatMap(hit=>hit.result.reads.map(row=>({...row,hitId:hit.hitId}))):result.reads;
    $('result').hidden=false;$('metric-one-label').textContent=sequence?'Total modeled HP loss':'Pre-hit damage';$('metric-two-label').textContent=sequence?'Executed hits':'Modeled HP loss';
    $('total').textContent=(sequence?result.modeledHpLost:result.preHitDamage).toLocaleString('en-US');
    $('hp-loss').textContent=sequence?`${result.executedHits} / ${input.hits.length}`:result.modeledHpLost===null?'Not requested':result.modeledHpLost.toLocaleString('en-US');
    $('summary').textContent=sequence?`${result.build} · target ${result.initialTarget.hp} HP / ${result.initialTarget.block} Block → ${result.targetAfter.hp} HP / ${result.targetAfter.block} Block · ${reads.length} property reads · finalDamage remains null`:`${result.build} · ${result.snapshotStage} · ${reads.length} property reads · finalDamage remains null pending gameplay validation`;
    $('reads').replaceChildren(...reads.map(row=>{const li=doc.createElement('li');li.textContent=`${row.hitId?row.hitId+' · ':''}${row.owner}.${row.property} = ${row.value}${row.present?'':' (GetProperty default)'}`;return li;}));
    $('output').textContent=JSON.stringify({...result,runtimeFingerprint},null,2);$('error').textContent='';
  };
  $('run').onclick=()=>{try{render(JSON.parse($('input').value));}catch(error){$('result').hidden=true;$('error').textContent=error.message;}};
  $('branches').onclick=()=>{try{
    const result=calculateSnapshotActiveBranches(JSON.parse($('input').value));
    $('result').hidden=false;$('metric-one-label').textContent='Non-critical / critical pre-hit damage';$('metric-two-label').textContent='Crit chance / expected pre-hit damage';
    $('total').textContent=`${result.branches.ordinary.preHitDamage.toLocaleString('en-US')} / ${result.branches.critical.preHitDamage.toLocaleString('en-US')}`;
    $('hp-loss').textContent=`${(result.critProbability*100).toLocaleString('en-US')}% / ${result.expectedPreHitDamage.toLocaleString('en-US')}`;
    $('summary').textContent=`${result.build} · one isolated hit · modeled HP loss: ${result.branches.ordinary.modeledHpLost??'not requested'} / ${result.branches.critical.modeledHpLost??'not requested'} · actual RNG draw unknown · finalDamage remains null`;
    $('reads').replaceChildren(...result.branches.ordinary.calculation.reads.map(row=>{const li=doc.createElement('li');li.textContent=`${row.owner}.${row.property} = ${row.value}${row.present?'':' (GetProperty default)'}`;return li;}));
    $('output').textContent=JSON.stringify({...result,runtimeFingerprint},null,2);$('error').textContent='';
  }catch(error){$('result').hidden=true;$('error').textContent=error.message;}};
  $('example').onclick=()=>{$('input').value=JSON.stringify(example,null,2);render(example);};
  $('chance-example').onclick=()=>{$('input').value=JSON.stringify(chanceExample,null,2);$('branches').click();};
  $('sequence-example').onclick=()=>{$('input').value=JSON.stringify(sequenceExample,null,2);render(sequenceExample);};
  $('runtime-status').textContent=`Verified local engine ${runtimeFingerprint.slice(0,12)}…`;
}
