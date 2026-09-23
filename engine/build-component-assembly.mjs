import {validateBuildPlan,buildPlanWheelSlots} from './build-plan.mjs';
import {resolveClientBuildPrimary,resolveClientAdvancementPrimary} from './client-build-stats.mjs';
import {resolveWheelMainstat} from './wheel-stats.mjs';

const clone=value=>JSON.parse(JSON.stringify(value));

function issue(code,slotId,field,message){return {code,slotId,field,message};}

// Assemble only the build contributions whose lookup and arithmetic are recovered.
// This is deliberately not a final-battle-property assembler: unsupported sources
// stay visible instead of being filled with neutral values.
export function assembleKnownBuildComponents(plan,catalog,clientBuildData){
  const validated=validateBuildPlan(plan,catalog).plan,issues=[],members=[];
  if(!clientBuildData||clientBuildData.schemaVersion!==1||!['pc-res144-build51','pc-res150-build51','pc-res151-build51'].includes(clientBuildData.build)||!Array.isArray(clientBuildData.characters)||validated.clientBuild&&clientBuildData.build!==validated.clientBuild)throw new Error('Unsupported or mismatched client build data');
  for(const member of validated.team){
    const character=catalog.characters.find(row=>row.id===member.characterId);
    const assembled={
      slotId:member.slotId,
      character:{id:character.id,name:character.name,realm:character.realm,rarity:character.rarity,type:character.type},
      primaryBaseStats:null,
      primaryStats:null,
      advancementTalent:null,
      wheelMainstat:null,
      wheelMainstats:[],
      contributionLedger:[],
    };
    let primaryReady=true;
    if(!['pc-res144-build51','pc-res150-build51','pc-res151-build51'].includes(validated.clientBuild)){issues.push(issue('CLIENT_BUILD_REQUIRED',member.slotId,'clientBuild','Select a supported PC client build to resolve character primary stats.'));primaryReady=false;}
    if(member.level===null){issues.push(issue('CHARACTER_LEVEL_REQUIRED',member.slotId,'level','Character level is unknown.'));primaryReady=false;}
    else if(member.level>90){issues.push(issue('CHARACTER_LEVEL_UNSUPPORTED',member.slotId,'level','The recovered client formula currently supports levels 1–90.'));primaryReady=false;}
    if(!Object.hasOwn(member,'gnosticRank')||member.gnosticRank===null){issues.push(issue('GNOSTIC_RANK_REQUIRED',member.slotId,'gnosticRank','Gnostic Potential rank is unknown.'));primaryReady=false;}
    if(!clientBuildData.characters.some(row=>row.characterId===member.characterId)){issues.push(issue('CHARACTER_PRIMARY_UNRESOLVED',member.slotId,'characterId','The character identity or primary-stat talent is not uniquely resolved in this client build.'));primaryReady=false;}
    if(primaryReady){
      const primary=resolveClientBuildPrimary({build:validated.clientBuild,characterId:member.characterId,level:member.level,gnosticRank:member.gnosticRank},clientBuildData);
      assembled.primaryBaseStats={CON:primary.stats.CON,ATK:primary.stats.ATK,DEF:primary.stats.DEF};
      for(const stat of ['CON','ATK','DEF'])assembled.contributionLedger.push({property:stat,value:primary.stats[stat],unit:'flat',sourceKind:'CLIENT_PRIMARY_BASE',sourceId:member.characterId,evidenceStatus:primary.status,trace:clone(primary.trace.find(row=>row.stat===stat))});
    }
    let advancementReady=primaryReady;
    if(!Object.hasOwn(member,'advancementTalentId')||member.advancementTalentId===null){issues.push(issue('ADVANCEMENT_TALENT_REQUIRED',member.slotId,'advancementTalentId','Season/Soulforge advancement talent is unknown.'));advancementReady=false;}
    if(!Object.hasOwn(member,'advancementLevel')||member.advancementLevel===null){issues.push(issue('ADVANCEMENT_LEVEL_REQUIRED',member.slotId,'advancementLevel','Season/Soulforge advancement level is unknown.'));advancementReady=false;}
    const clientCharacter=clientBuildData.characters.find(row=>row.characterId===member.characterId);
    const advancement=clientCharacter?.advancementTalents?.find(row=>row.clientTalentId===member.advancementTalentId);
    if(member.advancementTalentId!==null&&Object.hasOwn(member,'advancementTalentId')&&!advancement){issues.push(issue('ADVANCEMENT_TALENT_UNSUPPORTED',member.slotId,'advancementTalentId','Selected advancement talent does not belong to this character in the pinned client build.'));advancementReady=false;}
    if(advancementReady){
      const resolved=resolveClientAdvancementPrimary({build:validated.clientBuild,characterId:member.characterId,level:member.level,gnosticRank:member.gnosticRank,advancementTalentId:member.advancementTalentId,advancementLevel:member.advancementLevel},clientBuildData);
      assembled.primaryStats={...resolved.stats};
      assembled.advancementTalent={clientTalentId:member.advancementTalentId,level:member.advancementLevel,season:resolved.progression.season,percentages:{...resolved.progression.percentages}};
      for(const row of resolved.trace)assembled.contributionLedger.push({property:row.stat,value:row.value-row.baseValue,unit:'flat',sourceKind:'ADVANCEMENT_PRIMARY_PERCENT',sourceId:String(member.advancementTalentId),evidenceStatus:resolved.status,trace:clone(row)});
    }
    for(const wheelSlot of buildPlanWheelSlots(validated.schemaVersion,member)){
      if(wheelSlot.wheelId===null){if(validated.schemaVersion===1)issues.push(issue('WHEEL_SELECTION_REQUIRED',member.slotId,'wheelId','Wheel selection is unspecified.'));continue;}
      if(wheelSlot.enhanceLevel===null){issues.push(issue('WHEEL_ENHANCEMENT_REQUIRED',member.slotId,validated.schemaVersion===1?'wheelEnhanceLevel':`wheelSlots.${wheelSlot.slotId}.enhanceLevel`,'Wheel enhancement is unknown.'));continue;}
      if(validated.schemaVersion===2&&wheelSlot.refinementLevel===null)issues.push(issue('WHEEL_REFINEMENT_REQUIRED',member.slotId,`wheelSlots.${wheelSlot.slotId}.refinementLevel`,'Wheel refinement is unknown.'));
      const wheel=catalog.wheels.find(row=>row.id===wheelSlot.wheelId),mainstat=resolveWheelMainstat({catalogRevision:validated.catalogRevision,wheelId:wheelSlot.wheelId,enhanceLevel:wheelSlot.enhanceLevel},catalog);
      const resolved={slotId:wheelSlot.slotId,wheelId:wheel.id,wheelName:wheel.name,property:mainstat.stat,value:mainstat.value,unit:mainstat.unit,enhanceLevel:mainstat.enhanceLevel,enhanceLabel:mainstat.enhanceLabel,refinementLevel:wheelSlot.refinementLevel,ownerMatchesSelectedCharacter:member.characterId!==null&&wheel.ownerAwakenerId===member.characterId,catalogOwner:wheel.ownerAwakenerName??null,searchTags:[...(wheel.searchTags??[])]};
      assembled.wheelMainstats.push(resolved);if(assembled.wheelMainstat===null)assembled.wheelMainstat=resolved;
      assembled.contributionLedger.push({property:mainstat.stat,value:mainstat.value,unit:mainstat.unit,sourceKind:'WHEEL_MAINSTAT',sourceId:wheel.id,sourceSlotId:wheelSlot.slotId,evidenceStatus:mainstat.status,trace:clone(mainstat.trace)});
    }
    members.push(assembled);
  }
  return {
    schemaVersion:1,
    kind:'morimens-known-build-components',
    status:'EXPERIMENTAL',
    assemblyStatus:issues.length?'INCOMPLETE_INPUT':'KNOWN_COMPONENTS_RESOLVED',
    build:validated.clientBuild??null,
    catalogRevision:validated.catalogRevision,
    members,
    issues,
    finalDamage:null,
    unresolvedDependencies:[
      'Advancement talent state/passive effects and other character progression',
      'Wheel passive effects, two-slot equipment legality and direct-property assembly',
      'Additional equipment, substats and team-wide properties',
      'Battle-start states, encounter properties and action sequencing',
      'Independent gameplay validation',
    ],
  };
}
