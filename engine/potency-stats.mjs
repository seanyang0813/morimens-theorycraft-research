// Additional potency attributes only; chain must come from resolved client configuration.
export function calculatePotencyAttributes({build,targetPotencyId,chain}){
  if(build!=='pc-res144-build51')throw new Error('Unsupported build');
  if(!Number.isSafeInteger(targetPotencyId)||targetPotencyId<0||!Array.isArray(chain))throw new Error('Explicit potency endpoint and ordered chain required');
  const ids=new Set();
  for(const row of chain){
    if(!Number.isSafeInteger(row.id)||ids.has(row.id)||!Array.isArray(row.effects))throw new Error('Invalid potency chain');ids.add(row.id);
    for(const effect of row.effects)if(typeof effect.property!=='string'||!effect.property||typeof effect.value!=='number'||!Number.isFinite(effect.value))throw new Error('Invalid potency attribute');
  }
  if(targetPotencyId!==0&&!ids.has(targetPotencyId))throw new Error('Unknown potency endpoint');
  const first=chain.findIndex(r=>r.potencyType==='Attr_Promote');
  const last=chain.findIndex(r=>r.id===targetPotencyId&&r.effectType==='Attr_Promote');
  const attributes=Object.create(null),trace=[];
  if(targetPotencyId!==0&&first>=0&&last>=first){
    for(let i=first;i<=last;i++)for(const effect of chain[i].effects){
      const before=attributes[effect.property]??0,after=before+effect.value;
      if(!Number.isFinite(after))throw new Error('Potency attribute overflow');
      attributes[effect.property]=after;trace.push({potencyId:chain[i].id,property:effect.property,before,addition:effect.value,after});
    }
  }
  return {status:'EXPERIMENTAL',build,attributes:{...attributes},trace,finalDamage:null,
    unresolvedDependencies:['Progression availability and acquisition','Level growth, equipment and final battle property assembly','Independent gameplay validation']};
}
