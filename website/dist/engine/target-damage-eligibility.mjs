const monsterRules=[
  ['damage_per2monster_boss','Boss'],
  ['damage_per2monster_elite','Elite'],
  ['damage_per2monster_normal','MonsterGrade1, MonsterGrade2'],
  ['damage_per2monster_grade1','MonsterGrade1'],
  ['damage_per2monster_grade2','MonsterGrade2']
];
const stateRules=[
  ['damage_per2enemy_has_weak',3469],
  ['damage_per2enemy_has_vulnerable',2934],
  ['damage_per2enemy_has_posion',3068],
  ['damage_per2enemy_has_frail',2564],
  ['damage_per2petrify_resist',3792],
  ['damage_per2enemy_has_sculptor',80445],
  ['damage_per2enemy_has_mutated',89575],
  ['damage_per2enemy_has_snow',90659],
  ['damage_per2enemy_has_blood',90650],
  ['damage_per2enemy_has_special1',126417]
];
const blockBarrierStateId=3638;

// Data translation for BattleUnitBase target eligibility. The original monster
// rule uses string.find(api.Data, monster.BattleTag); state rules test live IDs.
export function resolveTargetDamageEligibility(value){
  const keys=['targetBattleTag','targetStateIds','targetHasBuff','targetHasDebuff'];
  if(!value||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).length!==keys.length||!keys.every(key=>Object.hasOwn(value,key)))throw new Error('Exact target eligibility context required');
  if(value.targetBattleTag!==null&&(typeof value.targetBattleTag!=='string'||!value.targetBattleTag))throw new Error('Target battle tag must be null or a nonempty string');
  if(!Array.isArray(value.targetStateIds)||value.targetStateIds.some(id=>!Number.isSafeInteger(id)||id<=0)||new Set(value.targetStateIds).size!==value.targetStateIds.length)throw new Error('Target state IDs must be unique positive safe integers');
  if(typeof value.targetHasBuff!=='boolean'||typeof value.targetHasDebuff!=='boolean')throw new Error('Explicit target buff/debuff flags required');
  const states=new Set(value.targetStateIds);
  return {monsterTypeDamageProperties:value.targetBattleTag===null?[]:monsterRules.filter(([,data])=>data.includes(value.targetBattleTag)).map(([property])=>property),
    targetStateDamageProperties:stateRules.filter(([,id])=>states.has(id)).map(([property])=>property),targetBlockBarrierStatePresent:states.has(blockBarrierStateId),
    targetHasBuff:value.targetHasBuff,targetHasDebuff:value.targetHasDebuff,
    trace:{monsterBattleTag:value.targetBattleTag,activeStateIds:[...value.targetStateIds],monsterRules:monsterRules.map(([property,data])=>({property,data,matched:value.targetBattleTag!==null&&data.includes(value.targetBattleTag)})),stateRules:stateRules.map(([property,stateId])=>({property,stateId,matched:states.has(stateId)})),blockBarrierStateId}};
}
