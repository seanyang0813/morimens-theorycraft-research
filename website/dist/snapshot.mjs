export function startSnapshotCalculator({calculateSnapshotActiveDamage,runtimeFingerprint}){
  const $=id=>document.getElementById(id);
  const example={schemaVersion:2,kind:'morimens-battle-property-snapshot-damage',build:'pc-res150-build51',snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',baseValue:100,skillArgsPlus:0,tags:['Card_Strike'],casterProperties:{crit:100,crit_damage:50,crit_damage_from_strikecard:10,crit_damage_per:0,damage_per2monster_boss:20,PreventActiveDamage:0},playerProperties:{dimension_fix_per:0},targetProperties:{hp:1000,max_hp:1000,block:50,be_damage_per:10,vulnerable_per:50,immue_damage:0,immue_puncture_damage:0,immue_active_damage:0,PreventBeActiveDamage:0,PreventBeActiveDamageRetainHP:0,be_damage_limit:0,be_damage_statics:0,pvp_death_resist:0},cardProperties:{},cardContext:{present:false,instructionCard:false,stateTriggerAdd:false},targetContext:{critRoll:null,targetBattleTag:'Boss',targetStateIds:[]},hitContext:{damageSubtype:'Ordinary'}};
  const render=input=>{
    const result=calculateSnapshotActiveDamage(input);
    $('result').hidden=false;$('total').textContent=result.preHitDamage.toLocaleString('en-US');
    $('hp-loss').textContent=result.modeledHpLost===null?'Not requested':result.modeledHpLost.toLocaleString('en-US');
    $('summary').textContent=`${result.build} · ${result.snapshotStage} · ${result.reads.length} property reads · finalDamage remains null pending gameplay validation`;
    $('reads').replaceChildren(...result.reads.map(row=>{const li=document.createElement('li');li.textContent=`${row.owner}.${row.property} = ${row.value}${row.present?'':' (GetProperty default)'}`;return li;}));
    $('output').textContent=JSON.stringify({...result,runtimeFingerprint},null,2);$('error').textContent='';
  };
  $('run').onclick=()=>{try{render(JSON.parse($('input').value));}catch(error){$('result').hidden=true;$('error').textContent=error.message;}};
  $('example').onclick=()=>{$('input').value=JSON.stringify(example,null,2);render(example);};
  $('runtime-status').textContent=`Verified local engine ${runtimeFingerprint.slice(0,12)}…`;
}
