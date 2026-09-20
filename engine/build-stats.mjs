// Catalog-derived preview, not a reconstruction of final battle properties.
const keys=['CON','ATK','DEF'];
function exact(value,fields,label){
  if(!value||typeof value!=='object'||Array.isArray(value)||fields.some(k=>!Object.hasOwn(value,k))||Object.keys(value).some(k=>!fields.includes(k)))throw new Error(`Expected explicit ${label}`);
}
export function resolvePrimaryStats(input,catalog){
  exact(input,['catalogRevision','characterId','level','gnosticBonusLevels','soulforgeBonusPercent'],'primary-stat inputs');
  if(input.catalogRevision!==catalog.source.revision)throw new Error('Catalog revision mismatch');
  const character=catalog.characters.find(c=>c.id===input.characterId);
  if(!character)throw new Error('Unknown character ID');
  if(!Number.isSafeInteger(input.level)||input.level<1||input.level>90)throw new Error('Supported catalog level range is 1–90; no clamping is applied');
  exact(input.gnosticBonusLevels,keys,'Gnostic bonus levels for every primary stat');
  for(const k of keys)if(!Number.isSafeInteger(input.gnosticBonusLevels[k])||input.gnosticBonusLevels[k]<0)throw new Error('Gnostic bonus levels must be nonnegative integers');
  if(typeof input.soulforgeBonusPercent!=='number'||!Number.isFinite(input.soulforgeBonusPercent)||input.soulforgeBonusPercent<0)throw new Error('Explicit nonnegative Soulforge bonus percentage required');
  if(!Number.isFinite(character.primaryScalingBase))throw new Error('Missing primary scaling base');
  const stats={},trace=[];
  for(const stat of keys){
    const growth=character.statScaling?.[stat];
    if(typeof growth!=='number'||!Number.isFinite(growth)||growth<0)throw new Error(`Missing growth for ${stat}`);
    const effectiveLevel=character.primaryScalingBase+input.level+input.gnosticBonusLevels[stat];
    const rawGrowth=effectiveLevel*growth,roundedGrowth=Math.ceil(rawGrowth-1e-9);
    const rawBonus=roundedGrowth*(1+input.soulforgeBonusPercent/100);
    const result=Math.ceil(rawBonus-1e-9);
    if(!Number.isSafeInteger(result))throw new Error('Stat result outside supported numeric range');
    stats[stat]=result;
    trace.push({stat,scalingBase:character.primaryScalingBase,level:input.level,gnosticBonusLevels:input.gnosticBonusLevels[stat],growth,effectiveLevel,rawGrowth,roundedGrowth,soulforgeBonusPercent:input.soulforgeBonusPercent,rawBonus,result,rounding:'ceil(value - 1e-9) at each stage'});
  }
  return {status:'CATALOG_DERIVED',finalDamage:null,characterId:character.id,stats,trace,
    provenance:JSON.parse(JSON.stringify(catalog.source)),
    unresolvedDependencies:['Catalog epsilon rounding differs from original compiled client formulas at some boundaries; use the separate client formula with resolved client inputs for that scope','Progression-to-bonus mapping and legal combinations','Substats, Wheels, team effects and final battle properties','Independent gameplay validation']};
}
