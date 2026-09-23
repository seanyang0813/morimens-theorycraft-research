const example={build:'pc-res151-build51',player:{tentacle_dmg:38,tentacle_base_dmg:103,basic_damage_per:86,weak_per:0,tentacle_dmg_per:0,outside_crit_damage:84},awakers:[{i_basic_damage_per:0,i_damage_per:0,i_damage_per1:0,i_damage_per2:0,i_damage_per3:0,i_damage_per4:0,i_damage_per5:0,i_damage_per6:0,i_damage_per7:0,i_damage_per8:0,crit_damage:50}],powerStateLayer:0,dimensionFixPer:0,casterOccupationMaster:92,japan:false,isCrit:true,target:{beDamagePer:0,beDamagePer2:0,beDamagePer3:0,beTentacleDamagePer:20,vulnerablePer:0,beDamagePlus:0,enemyTypePer:0,enemyStatePer:0,enemyBuffPer:0,enemyDebuffPer:0,enemyBlockPer:0,enemyBarrierPer:0,paraPlus:0}};
const shown=value=>Number.isFinite(value)?Number(value.toFixed(8)).toLocaleString('en-US'):String(value);
export function startDirectTentacleCalculator({calculateDirectTentacleCommand,runtimeFingerprint},doc=document){
  const $=id=>doc.getElementById(id);
  const render=value=>{
    const input=value?.kind==='morimens-theorycraft-request'&&value.operation==='calculate-direct-tentacle-command'?value.input:value;
    const result=calculateDirectTentacleCommand(input);
    $('result').hidden=false;$('total').textContent=result.preHitDamage.toLocaleString('en-US');
    $('summary').textContent=`${result.build} · ${input.awakers.length} Awakener${input.awakers.length===1?'':'s'} · ${input.isCrit?'critical':'noncritical'} · finalDamage withheld`;
    const stages=[['Player Tentacle damage',result.player.value],['Command effect after occupation mastery and ceiling',result.command.effectDamage],['Regional critical bonus (%)',result.critical.value],['Target pre-hit damage',result.hit.preHitDamage]];
    $('stages').replaceChildren(...stages.map(([label,value])=>{const li=doc.createElement('li');li.textContent=`${label}: ${shown(value)}`;return li;}));
    $('output').textContent=JSON.stringify({...result,runtimeFingerprint,analysisTrack:'theorycrafting'},null,2);$('error').textContent='';
  };
  $('run').onclick=()=>{try{render(JSON.parse($('input').value));}catch(error){$('result').hidden=true;$('error').textContent=error.message;}};
  $('example').onclick=()=>{$('input').value=JSON.stringify(example,null,2);render(example);};
  $('runtime-status').textContent=`Verified local engine ${runtimeFingerprint.slice(0,12)}…`;
}
