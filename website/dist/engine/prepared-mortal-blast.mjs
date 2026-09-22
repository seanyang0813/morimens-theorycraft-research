import {snapshot} from './experiments.mjs';
import {runPreparedSnapshotActiveSkill} from './prepared-snapshot-active-skill.mjs';
import {runMortalBlastCopySuffix} from './mortal-blast-copy-suffix.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));

// Joins the catalog-derived row-1 damage prefix to the separately tested rows
// 2-5 copy suffix. It does not play or damage with the generated Strike.
export function runPreparedMortalBlast(value,source){
  const input=snapshot(value);
  if(!exact(input,['schemaVersion','kind','build','direct','copySuffix'])||input.schemaVersion!==1||input.kind!=='morimens-prepared-mortal-blast'||input.direct?.schemaVersion!==4||input.direct?.kind!=='morimens-prepared-snapshot-active-skill'||input.copySuffix?.kind!=='morimens-mortal-blast-copy-suffix'||input.direct.build!==input.build||input.copySuffix.build!==input.build)throw new Error('Exact matching-build prepared Mortal Blast request required');
  if(input.direct.preparation?.skillId!==122483)throw new Error('Prepared Mortal Blast requires Skill 122483');
  const direct=runPreparedSnapshotActiveSkill(input.direct,source);
  if(direct.prepared.commandId!==122499||direct.stop?.beforeRowId!=='2'||direct.stop?.type!=='BECreateCard'||direct.command.rows.length!==5)throw new Error('Catalog command is not the supported Mortal Blast shape');
  const potency=direct.prepared.argumentBindings.Arg2;
  if(!(Number.isFinite(potency)&&potency>1)||input.copySuffix.potencyGreaterThanOne!==true)throw new Error('Supported Mortal Blast composition requires catalog-derived Arg2 > 1');
  const copySuffix=runMortalBlastCopySuffix(input.copySuffix);
  return {schemaVersion:1,kind:'morimens-prepared-mortal-blast-result',analysisTrack:'theorycrafting',status:'EXPERIMENTAL_COMPOSITION',build:input.build,skillId:122483,commandId:122499,sourceHashes:direct.sourceHashes,preparedArguments:direct.prepared.arguments,modeledDirectHpLost:direct.calculation.modeledHpLost,targetAfterDirect:direct.calculation.targetAfter,direct,copySuffix,boundedRowsModeled:['1','2','3','4','5'],generatedPlayableCardUids:copySuffix.lastTargetCards.map(card=>card.uid),completeSkill:false,finalDamage:null,
    unresolvedDependencies:['The damage prefix and copy suffix are composed from separately tested boundaries, not one connected scheduled command','Only one explicitly eligible enemy is supported; AllEnemy multi-target execution remains unresolved','The generated Strike is not played: its legality, payment, owner snapshot, command effects, pursuit and damage remain separate','Callbacks, statistics, death execution, gameplay and independent holdout validation']};
}
