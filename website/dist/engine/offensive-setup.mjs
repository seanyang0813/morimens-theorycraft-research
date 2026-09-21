import {neutralShowInputs, showDamage} from './show-damage.mjs';
const tagSuffix = {Card_Strike:'strikecard', Card_Skill:'skillcard', Ulti_Skill:'ulti', Card_AttachPost:'attachpost'};
const supportedBuilds=new Set(['pc-res144-build51','pc-res150-build51']);
export const casterSetupKeys = ['o_damage_per','i_basic_damage_per','i_damage_per',
  ...Array.from({length:8},(_,i)=>`i_damage_per${i+1}`), 'damage_plus','awaker_strength_multiple',
  'only_damage_plus','awaker_dmg_power_per_scale','spellbound_dmg_per',
  ...Array.from({length:4},(_,i)=>`spellbound_dmg_per${i+2}`),
  ...Object.values(tagSuffix).flatMap(s=>[`i_damage_per_${s}`,`o_damage_per_${s}`,`damage_per_${s}`]),
  'ulti_damage_plus','ulti_strength_multiple','awaker_ulti_BaseDmg_flat','awaker_ulti_dmg_per',
  'strikecard_damage_plus','awaker_PostAct_BaseDmg_flat'];
export const playerSetupKeys = ['weak_per','basic_damage_per','enhance_per','damage_plus'];
function checkProperties(obj, keys) {
  if (!obj || keys.some(k=>!Object.hasOwn(obj,k) || !Number.isFinite(obj[k])) || Object.keys(obj).some(k=>!keys.includes(k)))
    throw new Error('All resolved properties must be explicit; unknown properties are rejected');
}
// This isolated path has no card instance. It must not stand in for a hand card.
export function prepareNoCardPveOffense(input) {
  const keys=['build','value','caster','player','tags','dimensionFixPer','skillArgsPlus'];
  if (!input || keys.some(k=>!Object.hasOwn(input,k)) || Object.keys(input).some(k=>!keys.includes(k)))
    throw new Error('Missing or unknown setup input');
  if(!supportedBuilds.has(input.build)) throw new Error('Unsupported build');
  for(const k of ['value','dimensionFixPer','skillArgsPlus']) if(!Number.isFinite(input[k])) throw new Error('Invalid '+k);
  checkProperties(input.caster,casterSetupKeys);checkProperties(input.player,playerSetupKeys);
  if(!Array.isArray(input.tags) || input.tags.some(t=>!Object.hasOwn(tagSuffix,t)) || new Set(input.tags).size!==input.tags.length)
    throw new Error('Unsupported or duplicate skill tags');
  const c=input.caster,p=input.player,d=neutralShowInputs(input.value);
  Object.assign(d,{roleWeakPer:p.weak_per,basicDamagePer:p.basic_damage_per,roleEnhancePer:p.enhance_per,
    strength:p.damage_plus+c.damage_plus,skillArgsPlus:input.skillArgsPlus,dimension_fix_per:input.dimensionFixPer,
    awakerOutsideDamagePer:c.o_damage_per,awakerInsideBasicDamagePer:c.i_basic_damage_per,awakerDamagePlus:c.only_damage_plus});
  for(let i=0;i<=8;i++)d[`awakerInsideDamagePer${i||''}`]=c[`i_damage_per${i||''}`];
  for(let i=1;i<=5;i++)d[`spellboundDmgPer${i===1?'':i}`]=c[`spellbound_dmg_per${i===1?'':i}`];
  let ultiStrength=0,ultiBase=0,postBase=0;
  for(const tag of input.tags) {
    const suffix=tagSuffix[tag];
    d.skillTypeInsideDmgPer*=1+c[`i_damage_per_${suffix}`]/100;
    d.skillTypeOutsideDmgPer*=1+c[`o_damage_per_${suffix}`]/100;
    d.skillTypeDmgPer*=1+c[`damage_per_${suffix}`]/100;
    if(tag==='Ulti_Skill') {
      d.ultiDamgePlus=c.ulti_damage_plus;ultiStrength+=c.ulti_strength_multiple;
      ultiBase=c.awaker_ulti_BaseDmg_flat;d.awaker_ulti_dmg_per=c.awaker_ulti_dmg_per;
    }
    if(tag==='Card_Strike') d.strikecard_damage_plus+=c.strikecard_damage_plus;
    if(tag==='Card_AttachPost') postBase=c.awaker_PostAct_BaseDmg_flat;
  }
  if(d.strength>0)d.strength*= (1+c.awaker_strength_multiple/100+ultiStrength/100)*(1+c.awaker_dmg_power_per_scale/100);
  if(d.basicDamagePer>0)d.basicDamagePer+=ultiBase+postBase;
  const output=showDamage(d);
  const evidence=input.build==='pc-res150-build51'?['PC150:BattleCmdServer.OffensiveSetup','PC150:BattleUtilServer.ShowDamageFormula']:['PC144:OffensiveSetup'];
  return {status:'UNVERIFIED',build:input.build,finalDamage:null,scope:'PvE Awakener; no card object; ordinary formula subtype; not state-trigger-add',
    resolvedUtilityInputs:d,showDamage:output.showDamage,diagnosticBaseDamage:output.diagnosticBaseDamage,
    evidence,unresolvedDependencies:['Actual combat properties and tags','Card-instance branches excluded','Target and HP resolution','Independent gameplay validation']};
}
