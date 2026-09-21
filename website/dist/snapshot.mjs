export function startSnapshotCalculator({calculateSnapshotActiveDamage,runtimeFingerprint}){
  const $=id=>document.getElementById(id);
  const example={schemaVersion:1,kind:'morimens-battle-property-snapshot-damage',build:'pc-res150-build51',snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',baseValue:100,skillArgsPlus:0,tags:['Card_Strike'],casterProperties:{crit:100,crit_damage:50,crit_damage_from_strikecard:10,crit_damage_per:0,damage_per2monster_boss:20},playerProperties:{dimension_fix_per:0},targetProperties:{hp:100,max_hp:100,block:0,be_damage_per:10,vulnerable_per:50},cardProperties:{},cardContext:{present:false,instructionCard:false,stateTriggerAdd:false},targetContext:{critRoll:null,targetBattleTag:'Boss',targetStateIds:[]}};
  const render=input=>{
    const result=calculateSnapshotActiveDamage(input);
    $('result').hidden=false;$('total').textContent=result.preHitDamage.toLocaleString('en-US');
    $('summary').textContent=`${result.build} · ${result.snapshotStage} · ${result.reads.length} property reads · final HP loss unresolved`;
    $('reads').replaceChildren(...result.reads.map(row=>{const li=document.createElement('li');li.textContent=`${row.owner}.${row.property} = ${row.value}${row.present?'':' (GetProperty default)'}`;return li;}));
    $('output').textContent=JSON.stringify({...result,runtimeFingerprint},null,2);$('error').textContent='';
  };
  $('run').onclick=()=>{try{render(JSON.parse($('input').value));}catch(error){$('result').hidden=true;$('error').textContent=error.message;}};
  $('example').onclick=()=>{$('input').value=JSON.stringify(example,null,2);render(example);};
  $('runtime-status').textContent=`Verified local engine ${runtimeFingerprint.slice(0,12)}…`;
}
