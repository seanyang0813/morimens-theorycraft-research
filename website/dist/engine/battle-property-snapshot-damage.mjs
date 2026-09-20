import {initializeNumericProperties} from './property-initialization.mjs';
import {prepareNoCardPveOffense,casterSetupKeys,playerSetupKeys} from './offensive-setup.mjs';
import {prepareCardPveOffense,cardCasterKeys,cardPropertyKeys} from './card-offensive-setup.mjs';
import {activeTargetDamage} from './active-target.mjs';
import {resolveCriticalHit} from './crit-resolution.mjs';
import {resolveTargetDamageEligibility} from './target-damage-eligibility.mjs';

const build='pc-res144-build51';
const tags=['Card_Strike','Card_Skill','Ulti_Skill','Card_AttachPost'];
const tagCrit={Card_Strike:'crit_damage_from_strikecard',Ulti_Skill:'crit_damage_from_ulti'};
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const validateMap=(value,label)=>{
  if(!value||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype||Object.entries(value).some(([key,item])=>['__proto__','constructor','prototype'].includes(key)||!Number.isFinite(item)))throw new Error(`${label} must be a finite numeric property map`);
};

// Adapts complete captured property maps to the recovered PvE Active path.
export function calculateSnapshotActiveDamage(value){
  const input=JSON.parse(JSON.stringify(value));
  const keys=['schemaVersion','kind','build','snapshotStage','snapshotCompleteness','baseValue','skillArgsPlus','tags','casterProperties','playerProperties','targetProperties','cardProperties','cardContext','targetContext'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-battle-property-snapshot-damage'||input.build!==build||!['roleData.properties-before-constructor','battle-property-server-live'].includes(input.snapshotStage)||input.snapshotCompleteness!=='complete-map')throw new Error('Explicit complete supported battle-property snapshots required');
  if(!Number.isFinite(input.baseValue)||!Number.isFinite(input.skillArgsPlus)||!Array.isArray(input.tags)||input.tags.some(tag=>!tags.includes(tag))||new Set(input.tags).size!==input.tags.length)throw new Error('Explicit finite base/argument values and unique supported tags required');
  for(const [label,map] of [['Caster',input.casterProperties],['Player',input.playerProperties],['Target',input.targetProperties],['Card',input.cardProperties]])validateMap(map,label);
  const cardContextKeys=['present','instructionCard','stateTriggerAdd'];
  if(!exact(input.cardContext,cardContextKeys)||!cardContextKeys.every(key=>typeof input.cardContext[key]==='boolean')||input.cardContext.stateTriggerAdd||(!input.cardContext.present&&(input.cardContext.instructionCard||Object.keys(input.cardProperties).length)))throw new Error('Explicit ordinary direct card context required');
  const contextKeys=['critRoll','targetBattleTag','targetStateIds','targetHasBuff','targetHasDebuff'];
  const context=input.targetContext;
  if(!exact(context,contextKeys)||!['targetHasBuff','targetHasDebuff'].every(key=>typeof context[key]==='boolean')||(context.critRoll!==null&&(!Number.isInteger(context.critRoll)||context.critRoll<1||context.critRoll>100)))throw new Error('Explicit event-time target context required');
  const targetEligibility=resolveTargetDamageEligibility({targetBattleTag:context.targetBattleTag,targetStateIds:context.targetStateIds,targetHasBuff:context.targetHasBuff,targetHasDebuff:context.targetHasDebuff});
  const constructorTrace={};
  const normalize=(name,map)=>{
    if(input.snapshotStage==='battle-property-server-live')return {...map};
    const initialized=initializeNumericProperties(map);constructorTrace[name]=initialized.trace;return initialized.properties;
  };
  const snapshots={caster:normalize('caster',input.casterProperties),player:normalize('player',input.playerProperties),target:normalize('target',input.targetProperties),card:normalize('card',input.cardProperties)},reads=[];
  const read=(owner,property)=>{const present=Object.hasOwn(snapshots[owner],property),result=present?snapshots[owner][property]:0;reads.push({owner,property,present,value:result});return result;};
  const caster=Object.fromEntries((input.cardContext.present?cardCasterKeys:casterSetupKeys).map(property=>[property,read('caster',property)]));
  const player=Object.fromEntries(playerSetupKeys.map(property=>[property,read('player',property)]));
  const dimensionFixPer=read('player','dimension_fix_per');
  const card=input.cardContext.present?Object.fromEntries(cardPropertyKeys.map(property=>[property,read('card',property)])):null;
  const offense=input.cardContext.present?
    prepareCardPveOffense({build,value:input.baseValue,caster,player,tags:input.tags,dimensionFixPer,skillArgsPlus:input.skillArgsPlus,card,instructionCard:input.cardContext.instructionCard,stateTriggerAdd:false}):
    prepareNoCardPveOffense({build,value:input.baseValue,caster,player,tags:input.tags,dimensionFixPer,skillArgsPlus:input.skillArgsPlus});
  const critResolution=resolveCriticalHit({tags:input.tags,cardPresent:input.cardContext.present,casterIsAwaker:true,casterProperties:snapshots.caster,playerProperties:snapshots.player,targetProperties:snapshots.target,cardProperties:snapshots.card,roll:context.critRoll});
  reads.push(...critResolution.trace);
  if(critResolution.isCrit===null)throw new Error('RNG-dependent critical outcome requires a captured pre-outcome roll');
  const selectedSum=properties=>properties.reduce((sum,property)=>sum+read('caster',property),0);
  const stateMultiplier=targetEligibility.targetStateDamageProperties.reduce((product,property)=>{const amount=read('caster',property);return amount>0?product*(1+amount/100):product;},1);
  const targetBlock=read('target','block');
  const targetData={isCrit:critResolution.isCrit,awakerCritDamage:read('caster','crit_damage'),cardCritDamage:input.cardContext.present?read('card','crit_damage'):0,
    skillTypeCritDamage:input.tags.reduce((sum,tag)=>sum+(tagCrit[tag]?read('caster',tagCrit[tag]):0),0),awakerCardCritDamage:input.cardContext.present?read('caster','card_crit_damage'):0,critDamagePer:read('caster','crit_damage_per'),
    beDamagePer:read('target','be_damage_per'),beDamagePer2:read('target','be_damage_per2'),beDamagePer3:read('target','be_damage_per3'),
    beDamagePer4:input.tags.includes('Ulti_Skill')?read('target','be_damage_per4'):0,beDamagePer5:input.cardContext.present&&input.cardContext.instructionCard?read('target','be_damage_per5'):0,vulnerablePer:read('target','vulnerable_per'),
    enemyTypeDmgPer:selectedSum(targetEligibility.monsterTypeDamageProperties),enemyBuffDmgPer:targetEligibility.targetHasBuff?read('caster','damage_per2buff_enemy'):0,
    enemyDebuffDmgPer:targetEligibility.targetHasDebuff?read('caster','damage_per2debuff_enemy'):0,enemyBlockDmgPer:targetBlock>0?read('caster','damage_per2block_enemy'):0,
    enemyBlockBarrierDmgPer:targetBlock>0||targetEligibility.targetBlockBarrierStatePresent?read('caster','damage_per2block_barrier'):0,cardBlockBarrierPer:input.cardContext.present&&(targetBlock>0||targetEligibility.targetBlockBarrierStatePresent)?read('card','card_damage_per2block_barrier'):0,
    enemyStateDmgMultiplier:stateMultiplier,beDamagePlus:read('target','be_damage_plus')};
  const target=activeTargetDamage(offense.showDamage,targetData);
  return {schemaVersion:1,status:'EXPERIMENTAL',build,finalDamage:null,preHitDamage:target.preHitDamage,scope:`Complete captured property maps; ${input.cardContext.present?'captured card instance':'no card'}; PvE Awakener ordinary direct Active damage; supplied event-time context`,
    snapshotStage:input.snapshotStage,constructorTrace,reads,critResolution,targetEligibility,resolvedUtilityInputs:offense.resolvedUtilityInputs,targetInputs:targetData,offense,target,
    unresolvedDependencies:['Base command value, card identity/type, tags, target battle tag, active target state IDs, buff/debuff presence and any required critical RNG draw must be captured from the same pre-action boundary','A deterministic crit result still consumes an RNG draw in the original chance branch; later RNG-stream reconstruction requires its state/effect','Card-awake skills, state-trigger-add, formula subtype, targeting, HP resolution and callbacks are outside this adapter','Snapshot completeness and provenance require evidence review','Authored composition of separately checked property, offense, critical, eligibility and target boundaries; no connected original execution or independent gameplay validation']};
}
