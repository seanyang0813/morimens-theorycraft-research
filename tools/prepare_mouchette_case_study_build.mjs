import {readFileSync,writeFileSync} from 'node:fs';
import {resolveClientAdvancementPrimary} from '../engine/client-build-stats.mjs';

const data=JSON.parse(readFileSync(new URL('../research/evidence/client-build-data-res150.json',import.meta.url),'utf8'));
const resolve=(characterId,advancementTalentId,advancementLevel)=>resolveClientAdvancementPrimary({build:data.build,characterId,level:90,gnosticRank:5,advancementTalentId,advancementLevel},data);
const pick=result=>({status:result.status,build:result.build,characterId:result.characterId,stats:result.stats,baseStats:result.baseStats,progression:result.progression,trace:result.trace,sourceHashes:result.sourceHashes,finalDamage:result.finalDamage,unresolvedDependencies:result.unresolvedDependencies});
const report={
  schemaVersion:1,
  kind:'MORIMENS_CASE_STUDY_PRIMARY_STATS',
  status:'EXPERIMENTAL',
  scenario:'Mouchette/Arachne five-pair conditional worksheet',
  characters:{
    mouchette:pick(resolve('awakener-0033',122481,10)),
    arachne:pick(resolve('awakener-0056',78642,0)),
  },
  interpretation:'Mouchette uses explicit advancement talent 122481 level 10. Arachne uses explicit level 0 for talent 78642, representing no seasonal primary-stat promotion in this accepted case-study baseline.',
  finalDamage:null,
};
if(report.characters.mouchette.baseStats.ATK!==198||report.characters.mouchette.stats.ATK!==258||report.characters.arachne.baseStats.ATK!==138||report.characters.arachne.stats.ATK!==138)throw new Error('Case-study primary-stat invariant changed');
writeFileSync(new URL('../research/evidence/mouchette-case-study-primary.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({mouchetteAtk:report.characters.mouchette.stats.ATK,arachneAtk:report.characters.arachne.stats.ATK,status:report.status}));
