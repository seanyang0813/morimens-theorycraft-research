const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const strings=(value,label)=>{if(!Array.isArray(value)||value.some(item=>typeof item!=='string'||!item.trim())||new Set(value).size!==value.length)throw new Error(`${label} must be unique nonempty strings`);return value;};
const searchable=wheel=>[wheel.name,wheel.realm,wheel.rarity,wheel.mainstatKey,wheel.ownerAwakenerName,...(wheel.searchTags??[])].filter(Boolean).join(' ').toLocaleLowerCase();

// Catalog discovery only. Search tags make candidate Wheels findable but never
// execute, rank or infer their passive effects.
export function searchWheelCatalog(input,catalog){
  const fields=['catalogRevision','query','characterId','ownerMatchOnly','tags','realms','mainstatKeys','limit'];
  if(!exact(input,fields)||input.catalogRevision!==catalog?.source?.revision)throw new Error('Explicit matching Wheel catalog search required');
  if(typeof input.query!=='string'||input.query.length>100)throw new Error('Wheel query must be a string up to 100 characters');
  if(input.characterId!==null&&(typeof input.characterId!=='string'||!catalog.characters.some(row=>row.id===input.characterId)))throw new Error('Known character ID or null required');
  if(typeof input.ownerMatchOnly!=='boolean'||input.ownerMatchOnly&&input.characterId===null)throw new Error('Owner-match search requires a selected character');
  const tags=strings(input.tags,'Wheel tags'),realms=strings(input.realms,'Wheel realms'),mainstatKeys=strings(input.mainstatKeys,'Wheel main stats');
  if(!Number.isSafeInteger(input.limit)||input.limit<1||input.limit>catalog.wheels.length)throw new Error('Wheel result limit must be within the catalog');
  const query=input.query.trim().toLocaleLowerCase(),tagSet=new Set(tags.map(value=>value.toLocaleLowerCase())),realmSet=new Set(realms),mainstatSet=new Set(mainstatKeys);
  const matches=catalog.wheels.filter(wheel=>{
    const wheelTags=new Set((wheel.searchTags??[]).map(value=>value.toLocaleLowerCase()));
    return (!query||searchable(wheel).includes(query))&&(!input.ownerMatchOnly||wheel.ownerAwakenerId===input.characterId)&&[...tagSet].every(tag=>wheelTags.has(tag))&&(!realmSet.size||realmSet.has(wheel.realm))&&(!mainstatSet.size||mainstatSet.has(wheel.mainstatKey));
  }).map(wheel=>({id:wheel.id,name:wheel.name,realm:wheel.realm,rarity:wheel.rarity,mainstatKey:wheel.mainstatKey,ownerAwakenerId:wheel.ownerAwakenerId??null,ownerAwakenerName:wheel.ownerAwakenerName??null,searchTags:[...(wheel.searchTags??[])],ownerMatchesSelectedCharacter:input.characterId!==null&&wheel.ownerAwakenerId===input.characterId}));
  return {status:'CATALOG_DERIVED',analysisTrack:'theorycrafting',catalogRevision:input.catalogRevision,totalMatches:matches.length,truncated:matches.length>input.limit,results:matches.slice(0,input.limit),finalDamage:null,limitations:['Search tags support discovery only and do not execute passive effects','Results are not a ranking, recommendation, legality decision or proof of optimality','Current live availability and gameplay validation are unresolved']};
}
