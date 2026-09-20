import {initializeNumericProperties} from './property-initialization.mjs';
import {prepareNoCardPveOffense,casterSetupKeys,playerSetupKeys} from './offensive-setup.mjs';
import {activeTargetDamage} from './active-target.mjs';

const build='pc-res144-build51';
const tags=['Card_Strike','Card_Skill','Ulti_Skill','Card_AttachPost'];
const tagCrit={Card_Strike:'crit_damage_from_strikecard',Ulti_Skill:'crit_damage_from_ulti'};
const monsterProperties=['damage_per2monster_boss','damage_per2monster_elite','damage_per2monster_normal','damage_per2monster_grade1','damage_per2monster_grade2'];
const stateProperties=['damage_per2enemy_has_weak','damage_per2enemy_has_vulnerable','damage_per2enemy_has_posion','damage_per2enemy_has_frail','damage_per2petrify_resist','damage_per2enemy_has_sculptor','damage_per2enemy_has_mutated','damage_per2enemy_has_snow','damage_per2enemy_has_blood'];
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const validateMap=(value,label)=>{
  if(!value||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype||Object.entries(value).some(([key,item])=>['__proto__','constructor','prototype'].includes(key)||!Number.isFinite(item)))throw new Error(`${label} must be a finite numeric property map`);
};
const validateSelection=(value,allowed,label)=>{
  if(!Array.isArray(value)||value.some(item=>!allowed.includes(item))||new Set(value).size!==value.length)throw new Error(`${label} must contain unique supported property names`);
};

// Adapts complete captured property maps to the recovered no-card PvE Active path.
// Event-time target-state decisions remain explicit because they are not properties.
export function calculateSnapshotActiveDamage(value){
  const input=JSON.parse(JSON.stringify(value));
  const keys=['schemaVersion','kind','build','snapshotStage','snapshotCompleteness','baseValue','skillArgsPlus','tags','casterProperties','playerProperties','targetProperties','targetContext'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-battle-property-snapshot-damage'||input.build!==build||!['roleData.properties-before-constructor','battle-property-server-live'].includes(input.snapshotStage)||input.snapshotCompleteness!=='complete-map')throw new Error('Explicit complete supported battle-property snapshots required');
  if(!Number.isFinite(input.baseValue)||!Number.isFinite(input.skillArgsPlus)||!Array.isArray(input.tags)||input.tags.some(tag=>!tags.includes(tag))||new Set(input.tags).size!==input.tags.length)throw new Error('Explicit finite base/argument values and unique supported tags required');
  for(const [label,map] of [['Caster',input.casterProperties],['Player',input.playerProperties],['Target',input.targetProperties]])validateMap(map,label);
  const contextKeys=['isCrit','monsterTypeDamageProperties','targetHasBuff','targetHasDebuff','targetBlockBarrierStatePresent','targetStateDamageProperties'];
  const context=input.targetContext;
  if(!exact(context,contextKeys)||!['isCrit','targetHasBuff','targetHasDebuff','targetBlockBarrierStatePresent'].every(key=>typeof context[key]==='boolean'))throw new Error('Explicit event-time target context required');
  validateSelection(context.monsterTypeDamageProperties,monsterProperties,'Monster-type selection');validateSelection(context.targetStateDamageProperties,stateProperties,'Target-state selection');
  const constructorTrace={};
  const normalize=(name,map)=>{
    if(input.snapshotStage==='battle-property-server-live')return {...map};
    const initialized=initializeNumericProperties(map);constructorTrace[name]=initialized.trace;return initialized.properties;
  };
  const snapshots={caster:normalize('caster',input.casterProperties),player:normalize('player',input.playerProperties),target:normalize('target',input.targetProperties)},reads=[];
  const read=(owner,property)=>{const present=Object.hasOwn(snapshots[owner],property),result=present?snapshots[owner][property]:0;reads.push({owner,property,present,value:result});return result;};
  const caster=Object.fromEntries(casterSetupKeys.map(property=>[property,read('caster',property)]));
  const player=Object.fromEntries(playerSetupKeys.map(property=>[property,read('player',property)]));
  const dimensionFixPer=read('player','dimension_fix_per');
  const offense=prepareNoCardPveOffense({build,value:input.baseValue,caster,player,tags:input.tags,dimensionFixPer,skillArgsPlus:input.skillArgsPlus});
  const selectedSum=properties=>properties.reduce((sum,property)=>sum+read('caster',property),0);
  const stateMultiplier=context.targetStateDamageProperties.reduce((product,property)=>{const amount=read('caster',property);return amount>0?product*(1+amount/100):product;},1);
  const targetBlock=read('target','block');
  const targetData={isCrit:context.isCrit,awakerCritDamage:read('caster','crit_damage'),cardCritDamage:0,
    skillTypeCritDamage:input.tags.reduce((sum,tag)=>sum+(tagCrit[tag]?read('caster',tagCrit[tag]):0),0),awakerCardCritDamage:0,critDamagePer:read('caster','crit_damage_per'),
    beDamagePer:read('target','be_damage_per'),beDamagePer2:read('target','be_damage_per2'),beDamagePer3:read('target','be_damage_per3'),
    beDamagePer4:input.tags.includes('Ulti_Skill')?read('target','be_damage_per4'):0,beDamagePer5:0,vulnerablePer:read('target','vulnerable_per'),
    enemyTypeDmgPer:selectedSum(context.monsterTypeDamageProperties),enemyBuffDmgPer:context.targetHasBuff?read('caster','damage_per2buff_enemy'):0,
    enemyDebuffDmgPer:context.targetHasDebuff?read('caster','damage_per2debuff_enemy'):0,enemyBlockDmgPer:targetBlock>0?read('caster','damage_per2block_enemy'):0,
    enemyBlockBarrierDmgPer:targetBlock>0||context.targetBlockBarrierStatePresent?read('caster','damage_per2block_barrier'):0,cardBlockBarrierPer:0,
    enemyStateDmgMultiplier:stateMultiplier,beDamagePlus:read('target','be_damage_plus')};
  const target=activeTargetDamage(offense.showDamage,targetData);
  return {schemaVersion:1,status:'EXPERIMENTAL',build,finalDamage:null,preHitDamage:target.preHitDamage,scope:'Complete captured property maps; no-card PvE Awakener ordinary direct Active damage; supplied event-time context',
    snapshotStage:input.snapshotStage,constructorTrace,reads,resolvedUtilityInputs:offense.resolvedUtilityInputs,targetInputs:targetData,offense,target,
    unresolvedDependencies:['Base command value, tags, critical result and target-state eligibility must be captured from the same pre-action boundary','No card instance properties, state-trigger-add, formula subtype, targeting, HP resolution or callbacks','Snapshot completeness and provenance require evidence review','Authored composition of separately runtime-checked property, offense and target boundaries; no connected original execution or independent gameplay validation']};
}
