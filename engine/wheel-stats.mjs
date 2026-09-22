function scalar(value){
  if(typeof value!=='string')throw new Error('Missing Wheel scaling scalar');
  const match=/^(-?\d+(?:\.\d+)?)(%?)$/.exec(value);
  if(!match)throw new Error('Unsupported Wheel scaling scalar');
  return {value:Number(match[1]),unit:match[2]==='%'?'percent':'flat'};
}
export function resolveWheelMainstat(input,catalog){
  const fields=['catalogRevision','wheelId','enhanceLevel'];
  if(!input||fields.some(k=>!Object.hasOwn(input,k))||Object.keys(input).some(k=>!fields.includes(k)))throw new Error('Explicit Wheel identity, revision and enhancement required');
  if(input.catalogRevision!==catalog.source.revision)throw new Error('Catalog revision mismatch');
  if(!Number.isSafeInteger(input.enhanceLevel)||input.enhanceLevel<0||input.enhanceLevel>15)throw new Error('Wheel enhancement must be 0–15 (E0 through E3 + 12)');
  const wheel=catalog.wheels.find(w=>w.id===input.wheelId);
  if(!wheel)throw new Error('Unknown Wheel ID');
  const seriesKey=`${wheel.rarity}:${wheel.mainstatKey}`;
  const scaling=catalog.wheelMainstatScaling,series=scaling?.series.find(s=>s.seriesKey===seriesKey);
  if(!series)throw new Error(`Unsupported Wheel scaling series ${seriesKey}`);
  if(!Number.isSafeInteger(scaling.growthStartLevel)||scaling.growthStartLevel<0)throw new Error('Invalid growth start level');
  const base=scalar(series.baseValue),growth=scalar(series.perLevel);
  if(base.unit!==growth.unit)throw new Error('Mismatched Wheel stat units');
  const growthSteps=Math.max(0,input.enhanceLevel-scaling.growthStartLevel+1);
  const rawValue=base.value+growth.value*growthSteps;
  if(!Number.isFinite(rawValue))throw new Error('Nonfinite Wheel stat');
  const value=Number(rawValue.toFixed(2));
  return {status:'CATALOG_DERIVED',finalDamage:null,wheelId:wheel.id,wheel:{name:wheel.name,realm:wheel.realm,rarity:wheel.rarity,ownerAwakenerId:wheel.ownerAwakenerId??null,ownerAwakenerName:wheel.ownerAwakenerName??null,searchTags:[...(wheel.searchTags??[])]},stat:wheel.mainstatKey,value,unit:base.unit,
    enhanceLevel:input.enhanceLevel,enhanceLabel:input.enhanceLevel<=3?`E${input.enhanceLevel}`:`E3 + ${input.enhanceLevel-3}`,
    descriptionRank:Math.min(input.enhanceLevel,3)+1,
    trace:{seriesKey,baseValue:base.value,perLevel:growth.value,growthStartLevel:scaling.growthStartLevel,growthSteps,rawValue,displayValue:value,rounding:'SKeyDB display formatting: at most two decimal places'},
    provenance:JSON.parse(JSON.stringify(catalog.source)),
    unresolvedDependencies:['Search tags are discovery metadata, not executable passive effects or proof of optimality','Equipment legality and activation conditions','Wheel passive effects','Combination with character and team battle properties','Independent gameplay validation']};
}
