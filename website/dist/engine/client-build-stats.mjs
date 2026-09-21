import {calculateClientPrimaryStat} from './client-primary-stats.mjs';
import {calculateAttributeModifier} from './attribute-modifiers.mjs';
const supportedBuilds=new Set(['pc-res144-build51','pc-res150-build51']);
export function resolveClientBuildPrimary(input,data){
  const fields=['build','characterId','level','gnosticRank'];
  if(!input||fields.some(k=>!Object.hasOwn(input,k))||Object.keys(input).some(k=>!fields.includes(k)))throw new Error('Explicit build, character, level and Gnostic rank required');
  if(!supportedBuilds.has(input.build)||data.build!==input.build||data.schemaVersion!==1)throw new Error('Unsupported or mismatched client data build');
  if(!Number.isSafeInteger(input.level)||input.level<1||input.level>90)throw new Error('Supported character level range is 1–90');
  const character=data.characters.find(c=>c.characterId===input.characterId);
  if(!character)throw new Error('Character client identity is unresolved');
  if(!Number.isSafeInteger(input.gnosticRank)||!Object.hasOwn(character.gnostic.bonusLevelsByRank,input.gnosticRank))throw new Error('Unsupported or unknown Gnostic rank');
  const bonus=character.gnostic.bonusLevelsByRank[input.gnosticRank],stats={},trace=[];
  for(const stat of ['CON','ATK','DEF']){
    const result=calculateClientPrimaryStat({build:input.build,...character.primary[stat],upgradeLevel:input.level+character.qualityLevelOffset,talentBonusLevels:bonus});
    stats[stat]=result.value;trace.push({stat,...result.trace});
  }
  return {status:'EXPERIMENTAL',build:input.build,characterId:input.characterId,clientId:character.clientId,stats,trace,finalDamage:null,
    progression:{level:input.level,qualityLevelOffset:character.qualityLevelOffset,gnosticRank:input.gnosticRank,gnosticTalentId:character.gnostic.clientTalentId,talentBonusLevels:bonus},
    sourceHashes:{...data.sourceHashes},
    unresolvedDependencies:['Progression acquisition and account restrictions','Soulforge, equipment, substats and final battle properties','Independent gameplay validation']};
}

export function resolveClientAdvancementPrimary(input,data){
  const fields=['build','characterId','level','gnosticRank','advancementTalentId','advancementLevel'];
  if(!input||fields.some(k=>!Object.hasOwn(input,k))||Object.keys(input).some(k=>!fields.includes(k)))throw new Error('Explicit client progression and advancement talent inputs required');
  const base=resolveClientBuildPrimary({build:input.build,characterId:input.characterId,level:input.level,gnosticRank:input.gnosticRank},data);
  const character=data.characters.find(row=>row.characterId===input.characterId);
  const talent=character.advancementTalents?.find(row=>row.clientTalentId===input.advancementTalentId);
  if(!talent)throw new Error('Unknown advancement talent for character');
  if(!Number.isSafeInteger(input.advancementLevel)||!Object.hasOwn(talent.percentByLevel,input.advancementLevel))throw new Error('Unsupported advancement talent level');
  const percentages=talent.percentByLevel[input.advancementLevel],stats={},trace=[];
  for(const stat of ['CON','ATK','DEF']){
    const percentage=percentages[stat],increase=input.advancementLevel===0?null:percentage/100;
    const result=calculateAttributeModifier({build:input.build,base:base.stats[stat],increase,breakRate:null,method:'GetAwakerFinalAttr'});
    stats[stat]=result.value;
    trace.push({stat,baseValue:base.stats[stat],advancementPercent:percentage,increaseFraction:increase,modifierTrace:result.trace,value:result.value});
  }
  return {status:'EXPERIMENTAL',build:input.build,characterId:input.characterId,clientId:character.clientId,stats,baseStats:base.stats,baseTrace:base.trace,trace,finalDamage:null,
    progression:{...base.progression,advancementTalentId:talent.clientTalentId,advancementLevel:input.advancementLevel,season:talent.season,percentages},sourceHashes:{...data.sourceHashes},
    unresolvedDependencies:['Advancement talent state and passive effects','Progression acquisition and seasonal availability','Equipment, substats and final battle properties','Independent gameplay validation']};
}
