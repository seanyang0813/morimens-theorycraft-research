// Installed resource-151 BattleUnitPlayer.GetTentacleDamage, ordinary PvE only.
const playerKeys=['tentacle_dmg','tentacle_base_dmg','basic_damage_per','weak_per','tentacle_dmg_per'];
const awakerKeys=['i_basic_damage_per','i_damage_per',...Array.from({length:8},(_,i)=>`i_damage_per${i+1}`)];
const exactNumbers=(value,keys,label)=>{
  if(!value||keys.some(key=>!Object.hasOwn(value,key))||Object.keys(value).some(key=>!keys.includes(key)))
    throw new Error(`Missing or unknown ${label} input`);
  for(const key of keys)if(!Number.isFinite(value[key]))throw new Error(`Invalid ${label} number: ${key}`);
};

export function playerTentacleDamage(input){
  if(!input||input.build!=='pc-res151-build51'||Object.keys(input).some(key=>!['build','player','awakers','powerStateLayer','dimensionFixPer'].includes(key)))
    throw new Error('Expected resource-151 PvE Player Tentacle input');
  exactNumbers(input.player,playerKeys,'player');
  if(!Array.isArray(input.awakers))throw new Error('Explicit Awaker list required');
  for(const row of input.awakers)exactNumbers(row,awakerKeys,'Awaker');
  for(const key of ['powerStateLayer','dimensionFixPer'])if(!Number.isFinite(input[key]))throw new Error('Invalid numeric input: '+key);
  const average=key=>input.awakers.length?input.awakers.reduce((sum,row)=>sum+row[key],0)/input.awakers.length:0;
  const p=input.player;
  const basic=p.tentacle_base_dmg*(1+p.basic_damage_per/100)*(1+average('i_basic_damage_per')/100);
  let value=basic+p.tentacle_dmg+input.powerStateLayer*(1-100/100);
  const trace=[{stage:'basic Tentacle contribution',value:basic},
    {stage:'stored Tentacle flat and Power term (installed constant -100%)',value}];
  const factors=[['Weak',1-p.weak_per/100],
    ['average general inside damage',1+average('i_damage_per')/100],
    ...Array.from({length:8},(_,i)=>[`average inside damage ${i+1}`,1+average(`i_damage_per${i+1}`)/100]),
    ['Dimension',1+input.dimensionFixPer/100],['Tentacle damage bonus',1+p.tentacle_dmg_per/100]];
  for(const [stage,factor] of factors){value*=factor;trace.push({stage,factor,value});}
  value=Math.max(1,Math.ceil(value));
  if(!Number.isSafeInteger(value))throw new Error('Result exceeds safe integer range');
  trace.push({stage:'ceiling and minimum 1',value});
  return {build:input.build,value,trace,
    evidenceFixture:'tests/synthetic/installed-player-tentacle-damage.json',
    scope:'Installed BattleUnitPlayer.GetTentacleDamage, ordinary PvE, explicit player/Awaker properties',
    unresolvedDependencies:['Player and Awaker property assembly','Power-state source state','Independent gameplay validation']};
}
