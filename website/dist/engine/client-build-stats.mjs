import {calculateClientPrimaryStat} from './client-primary-stats.mjs';
export function resolveClientBuildPrimary(input,data){
  const fields=['build','characterId','level','gnosticRank'];
  if(!input||fields.some(k=>!Object.hasOwn(input,k))||Object.keys(input).some(k=>!fields.includes(k)))throw new Error('Explicit build, character, level and Gnostic rank required');
  if(input.build!=='pc-res144-build51'||data.build!==input.build||data.schemaVersion!==1)throw new Error('Unsupported or mismatched client data build');
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
