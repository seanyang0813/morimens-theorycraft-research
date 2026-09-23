import {playerTentacleDamage} from './player-tentacle-damage.mjs';
import {tentacleCritDamage} from './tentacle-crit-damage.mjs';
import {tentaclePreHit} from './tentacle-prehit.mjs';

// The exact direct BETentacleAttack row observed in the resource-151 PvE catalog:
// PlayerRole.tentacle_dmg * CmdCaster.occupation_master / 200, 1, 0.
const playerKeys=['tentacle_dmg','tentacle_base_dmg','basic_damage_per','weak_per','tentacle_dmg_per','outside_crit_damage'];
const awakerKeys=['i_basic_damage_per','i_damage_per',...Array.from({length:8},(_,i)=>`i_damage_per${i+1}`),'crit_damage'];
const targetKeys=['beDamagePer','beDamagePer2','beDamagePer3','beTentacleDamagePer','vulnerablePer','beDamagePlus','enemyTypePer','enemyBuffPer','enemyDebuffPer','enemyBlockPer','enemyBarrierPer','paraPlus'];
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const numeric=(value,keys,label)=>{
  if(!exact(value,keys)||keys.some(key=>!Number.isFinite(value[key])))throw new Error(`Exact finite ${label} properties required`);
};

export function calculateDirectTentacleCommand(input){
  const keys=['build','player','awakers','powerStateLayer','dimensionFixPer','casterOccupationMaster','japan','isCrit','target'];
  if(!exact(input,keys)||input.build!=='pc-res151-build51'||typeof input.japan!=='boolean'||typeof input.isCrit!=='boolean')
    throw new Error('Exact installed direct Tentacle command input required');
  numeric(input.player,playerKeys,'Player');
  if(!Array.isArray(input.awakers)||input.awakers.length===0)throw new Error('At least one explicit Awaker is required');
  for(const awaker of input.awakers)numeric(awaker,awakerKeys,'Awaker');
  const stateKey=Object.hasOwn(input.target??{},'enemyStateMultiplier')?'enemyStateMultiplier':'enemyStatePer';
  numeric(input.target,[...targetKeys,stateKey],'target');
  if(input.target.paraPlus!==0)throw new Error('Exact direct Tentacle row has zero third parameter');
  for(const key of ['powerStateLayer','dimensionFixPer','casterOccupationMaster'])
    if(!Number.isFinite(input[key]))throw new Error(`Finite ${key} required`);

  const {outside_crit_damage,...playerProperties}=input.player;
  const awakerProperties=input.awakers.map(({crit_damage,...properties})=>properties);
  const player=playerTentacleDamage({build:input.build,player:playerProperties,awakers:awakerProperties,
    powerStateLayer:input.powerStateLayer,dimensionFixPer:input.dimensionFixPer});
  const effectBeforeCeiling=player.value*input.casterOccupationMaster/200;
  const effectDamage=Math.ceil(effectBeforeCeiling);
  if(!Number.isSafeInteger(effectDamage))throw new Error('Tentacle command effect exceeds safe integer range');
  const critical=tentacleCritDamage({build:input.build,japan:input.japan,outsideCritDamage:outside_crit_damage,
    awakerCritDamage:input.awakers.map(row=>row.crit_damage)});
  const hit=tentaclePreHit({build:input.build,isCrit:input.isCrit,tentacleDamage:effectDamage,
    critDamagePer:critical.value,...input.target});
  return {status:'EXPERIMENTAL',build:input.build,damageType:'TENTACLE',commandExpression:'PlayerRole.tentacle_dmg*CmdCaster.occupation_master/200,1,0',
    player,command:{occupationMaster:input.casterOccupationMaster,denominator:200,beforeCeiling:effectBeforeCeiling,effectDamage},
    critical,hit,preHitDamage:hit.preHitDamage,finalDamage:null,
    scope:'Installed resource-151 ordinary PvE direct BETentacleAttack row with explicit Player, Awaker, caster and target properties',
    unresolvedDependencies:['The selected skill must actually use this exact direct command row and target','Caster/Player/Awaker/target properties and region must be captured at the same action boundary','Critical eligibility and random draw are supplied as isCrit, not predicted','Target category/state bonuses are supplied resolved','Repeats, BeHit, HP, callbacks and independent gameplay validation are outside this operation']};
}
