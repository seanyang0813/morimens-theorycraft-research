// BattleUnitPlayer.GetShowTentacleDamage for the ordinary PvE parser alias.
const get=(properties,key)=>{
  const value=properties?.[key]??0;
  if(!Number.isFinite(value))throw new Error(`Nonfinite Tentacle show input ${key}`);
  return value;
};

export function playerTentacleShowDamage({playerProperties,awakerProperties}){
  if(!playerProperties||typeof playerProperties!=='object'||Array.isArray(playerProperties)||!Array.isArray(awakerProperties)
    ||awakerProperties.some(row=>!row||typeof row!=='object'||Array.isArray(row)))
    throw new Error('Player and explicit Awakener property maps required');
  const averageBasic=awakerProperties.length
    ?awakerProperties.reduce((sum,row)=>sum+get(row,'i_basic_damage_per'),0)/awakerProperties.length:0;
  const raw=(get(playerProperties,'tentacle_base_dmg')*(1+get(playerProperties,'basic_damage_per')/100)
    *(1+averageBasic/100)+get(playerProperties,'tentacle_dmg'))
    *(1+get(playerProperties,'tentacle_dmg_per')/100);
  const value=Math.max(1,Math.ceil(raw));
  if(!Number.isSafeInteger(value))throw new Error('Tentacle show damage exceeds safe integer range');
  return {value,raw,averageBasic,scope:'PvE GetShowTentacleDamage parser alias; excludes combat Tentacle modifiers'};
}
