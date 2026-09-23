// Installed resource-151 BattleZoneUtil.GetTentacleCritDmg from resolved properties.
export function tentacleCritDamage(input){
  if(!input||input.build!=='pc-res151-build51'||typeof input.japan!=='boolean'||
      !Number.isFinite(input.outsideCritDamage)||!Array.isArray(input.awakerCritDamage)||
      input.awakerCritDamage.length===0||input.awakerCritDamage.some(value=>!Number.isFinite(value))||
      Object.keys(input).some(key=>!['build','japan','outsideCritDamage','awakerCritDamage'].includes(key)))
    throw new Error('Expected installed Tentacle Crit DMG with explicit region and nonempty Awaker values');
  const average=input.awakerCritDamage.reduce((sum,value)=>sum+value,0)/input.awakerCritDamage.length;
  const value=input.japan?input.outsideCritDamage:Math.ceil(input.outsideCritDamage+average-50);
  return {build:input.build,value,trace:input.japan?
    [{stage:'Japan region: outside critical damage only',value}]:
    [{stage:'average Awaker Crit DMG property',value:average},
      {stage:'outside + average - 50, ceiling',value}],
    evidenceFixture:'tests/synthetic/installed-tentacle-crit-damage.json',
    scope:'Installed BattleZoneUtil.GetTentacleCritDmg from explicit region and Player/Awaker properties',
    unresolvedDependencies:['Region attribution for recorded battles','Property assembly','Critical-roll reconstruction','Independent gameplay validation']};
}
