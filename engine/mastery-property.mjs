// Restricted mastery mutation, with notification descriptors rather than event execution.
export function changeMasteryProperty({build,properties,property,delta}){
  const base='occupation_master',percent='occupation_master_final_per',final='occupation_master_final';
  if(build!=='pc-res144-build51')throw new Error('Unsupported build');
  if(![base,percent].includes(property))throw new Error('Unsupported mastery property');
  for(const key of [base,percent,final])if(typeof properties?.[key]!=='number'||!Number.isFinite(properties[key])||properties[key]<0)throw new Error('Explicit nonnegative stored mastery properties required');
  if(typeof delta!=='number'||!Number.isFinite(delta)||properties[property]+delta<0)throw new Error('Mutation exceeds supported nonnegative domain');
  const after={...properties},callbacks=[];
  function notify(key,old,value,amount){callbacks.push({kind:'owner',property:key,old,new:value},{kind:'send',property:key,delta:amount,new:value});}
  if(delta!==0){
    const previous=after[property];after[property]+=delta;
    const resolved=Math.ceil(after[base]*(100+after[percent])/100);
    if(!Number.isSafeInteger(resolved))throw new Error('Final mastery outside supported range');
    if(resolved!==after[final]){const old=after[final];after[final]=resolved;notify(final,old,resolved,resolved-old);}
    notify(property,previous,after[property],delta);
  }
  return {status:'EXPERIMENTAL',build,properties:after,callbacks,finalDamage:null,
    unresolvedDependencies:['Initial team property reconstruction','Player keeper-skill refresh and actual callback dispatch','Independent gameplay validation']};
}
