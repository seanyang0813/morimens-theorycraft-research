const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const strings=(value,label)=>{if(!Array.isArray(value)||value.some(item=>typeof item!=='string'||!item.trim())||new Set(value).size!==value.length)throw new Error(`${label} must be unique nonempty strings`);return value;};

// Mechanics-track discovery only. A fingerprint is static potential graph
// metadata and is never treated as an executed passive or build recommendation.
export function searchWheelMechanics(input,catalog){
  const fields=['schemaVersion','kind','requestId','query','mechanicCategories','effectTypes','crosswalkStatuses','hasStaticCycle','limit'];
  if(!exact(input,fields)||input.schemaVersion!==1||input.kind!=='morimens-wheel-mechanics-search')throw new Error('Expected an exact version 1 Wheel mechanics search');
  if(typeof input.requestId!=='string'||!input.requestId||input.requestId.length>128)throw new Error('Nonempty requestId up to 128 characters required');
  if(typeof input.query!=='string'||input.query.length>100)throw new Error('Wheel mechanics query must be a string up to 100 characters');
  const categories=strings(input.mechanicCategories,'Mechanic categories'),effectTypes=strings(input.effectTypes,'Effect types'),statuses=strings(input.crosswalkStatuses,'Crosswalk statuses');
  if(input.hasStaticCycle!==null&&typeof input.hasStaticCycle!=='boolean')throw new Error('hasStaticCycle must be boolean or null');
  if(!Number.isSafeInteger(input.limit)||input.limit<1||input.limit>catalog?.wheels?.length)throw new Error('Wheel mechanics result limit must be within the catalog');
  if(catalog?.analysisTrack!=='mechanics'||catalog?.status!=='STATIC_MECHANICS_FINGERPRINTS')throw new Error('Mechanics-track Wheel capability catalog required');
  const query=input.query.trim().toLocaleLowerCase(),categorySet=new Set(categories),effectSet=new Set(effectTypes),statusSet=new Set(statuses);
  const matches=catalog.wheels.filter(row=>{
    const searchable=[row.wheelId,row.name,...(row.mechanicCategories??[]),...(row.effectTypes??[])].join(' ').toLocaleLowerCase();
    const rowCategories=new Set(row.mechanicCategories??[]),rowEffects=new Set(row.effectTypes??[]);
    return (!query||searchable.includes(query))&&[...categorySet].every(value=>rowCategories.has(value))&&[...effectSet].every(value=>rowEffects.has(value))&&(!statusSet.size||statusSet.has(row.crosswalkStatus))&&(input.hasStaticCycle===null||row.hasStaticCycle===input.hasStaticCycle);
  });
  return {
    schemaVersion:1,
    kind:'morimens-wheel-mechanics-search-response',
    analysisTrack:'mechanics',
    requestId:input.requestId,
    status:'STATIC_MECHANICS_FINGERPRINTS',
    totalMatches:matches.length,
    truncated:matches.length>input.limit,
    results:matches.slice(0,input.limit).map(row=>JSON.parse(JSON.stringify(row))),
    limitations:[
      'Static fingerprints include conditional and mutually exclusive graph paths',
      'Results do not establish activation, magnitude, target, timing, legality, stacking or execution support',
      'This mechanics search does not rank Wheels or create a theorycraft, cheese, budget-scouting, gameplay-validation or holdout result',
    ],
  };
}
